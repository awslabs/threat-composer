"""Pin the eval's input so the agent is the only thing that moves.

The quality eval exists to make regressions attributable. That only works if the
source code it analyses is held still. If the fixture drifts, a score change means
either the agent got worse or the input changed, and there is no way to tell which
from the result. That ambiguity is the failure mode this module exists to prevent.

Pinning by commit is the obvious approach and is not enough on its own. A pinned
SHA can be orphaned by a squash merge, and it says nothing about whether the tree
that was actually materialised is the tree that was measured. So the guarantee here
is a content hash: the expectations file records the hash of the fixture the bands
were derived from, and the eval refuses to draw conclusions from anything else.

The point is not to forbid the fixture from ever changing. It is to make changing
it a deliberate act with a visible cost, and to ensure the resulting failure says
"the input moved" rather than "quality dropped".
"""

import hashlib
from dataclasses import dataclass
from pathlib import Path

# Build output and dependency trees, which are not properties of the fixture:
# hashing them would make the pin depend on whether anyone had run a build.
#
# The test to apply when adding to this list is not "is it generated" but "could the
# analyser read it". Anything the agent can see is part of its input and belongs in
# the hash, however it came to exist. `.wxt/` is a case in point: WXT generates those
# type declarations, but they are committed, so the agent reads them and they are
# hashed. Excluding them would leave a gap where the fixture could change without the
# pin noticing, which is the one thing this module exists to prevent.
#
# tests/eval/test_fixture.py asserts that the hashed set matches the set of
# git-tracked files for the fixture, so a drift between these exclusions and what the
# repository actually holds fails rather than passing quietly.
EXCLUDED_DIRS = frozenset(
    {
        ".git",
        ".nx",
        ".output",
        ".turbo",
        ".venv",
        "__pycache__",
        "build",
        "coverage",
        "dist",
        "node_modules",
        "playwright-report",
        "test-results",
    }
)
EXCLUDED_SUFFIXES = frozenset({".pyc", ".pyo", ".log"})


@dataclass
class FixtureIdentity:
    """What the fixture is, so a run can prove it measured the right thing."""

    path: Path
    tree_sha256: str
    file_count: int
    byte_count: int

    def summary(self) -> str:
        return (
            f"{self.file_count} files, {self.byte_count:,} bytes, "
            f"sha256 {self.tree_sha256[:16]}"
        )


def _source_files(root: Path) -> list[Path]:
    found = []
    for path in root.rglob("*"):
        if not path.is_file() or path.is_symlink():
            continue
        if EXCLUDED_DIRS.intersection(path.relative_to(root).parts):
            continue
        if path.suffix in EXCLUDED_SUFFIXES:
            continue
        found.append(path)
    # Sorted by POSIX relative path so the hash does not depend on filesystem
    # iteration order or on the platform's path separator.
    return sorted(found, key=lambda p: p.relative_to(root).as_posix())


def identify(root: Path) -> FixtureIdentity:
    """Hash a fixture tree.

    Covers relative paths as well as contents, so a rename changes the hash. Reads
    bytes rather than text, so line ending normalisation cannot quietly alter it.
    """
    root = root.resolve()
    digest = hashlib.sha256()
    files = _source_files(root)
    total = 0
    for path in files:
        relative = path.relative_to(root).as_posix()
        data = path.read_bytes()
        total += len(data)
        # Length prefixed, so that concatenating a path and its contents cannot
        # collide with a different split of the same bytes.
        digest.update(f"{relative}\0{len(data)}\0".encode())
        digest.update(data)
    return FixtureIdentity(
        path=root,
        tree_sha256=digest.hexdigest(),
        file_count=len(files),
        byte_count=total,
    )


def verify(
    root: Path, expected_sha256: str | None
) -> tuple[bool, str, FixtureIdentity]:
    """Check a fixture against its recorded hash.

    Returns (ok, message, identity). An absent expectation is reported as not
    verified rather than as a pass, because an unpinned fixture is precisely the
    condition that makes results unattributable.
    """
    identity = identify(root)
    if not expected_sha256:
        return (
            False,
            (
                f"fixture is not pinned: no fixture.tree_sha256 in the expectations file. "
                f"Measured {identity.summary()}. Record that hash to pin it."
            ),
            identity,
        )
    if identity.tree_sha256 == expected_sha256:
        return True, f"fixture matches its pin ({identity.summary()})", identity
    return (
        False,
        (
            "fixture does not match its pin, so results are not comparable to the "
            "recorded bands.\n"
            f"  expected sha256 {expected_sha256}\n"
            f"  measured sha256 {identity.tree_sha256}\n"
            f"  measured        {identity.summary()}\n"
            f"  path            {identity.path}\n"
            "The input changed, which is not the same as quality dropping. Either "
            "restore the fixture, or re-baseline deliberately: re-run the eval, "
            "confirm the new figures are sane, then update fixture.tree_sha256 and "
            "the bands together in one reviewable change."
        ),
        identity,
    )
