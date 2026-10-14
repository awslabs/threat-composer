"""Pin the eval's input so the agent is the only thing that moves.

If the fixture drifts, a score change could mean the agent got worse or the input
changed, and the result cannot say which. The expectations file pins it two ways.
``fixture.commit`` supplies the source: the workflow checks that commit out, so
later edits on main do not move the input. ``fixture.tree_sha256``, checked here,
verifies the tree that was actually materialised is the one the bands were
measured on, and is checked before the CLI runs so a mismatch costs nothing.

The fixture may still change, but deliberately: re-run the eval and update the
commit, hash and bands together, so the failure says "the input moved" rather than
"quality dropped".
"""

import hashlib
from dataclasses import dataclass
from pathlib import Path

# Directories that git tracks but a build or install regenerates, so their committed
# content is not what is on disk after ordinary work. Excluded from the hash, and
# named separately from the rest so the exception is visible and so
# tests/eval/test_fixture.py can account for it when comparing against git.
#
# `.wxt` is the browser extension's case. Some of its files are committed, but the
# package's `postinstall: wxt prepare` rewrites them, so hashing them would make the
# pin depend on whether an install had run. The agent does read these files, so the
# pin does not describe the input in full. Their content derives from configuration
# that is hashed, and the pinned checkout is analysed without an install.
GENERATED_TRACKED_DIRS = frozenset({".wxt"})

# Paths that are not stable properties of the fixture. The test to apply is whether
# the content is reproducible from the commit alone: anything a build or an install
# can rewrite makes the pin depend on what has been run, which defeats it.
#
# Most of these are untracked build output and so never reach the hash anyway. They
# are listed for the case where the eval is pointed at a tree someone has built in.
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
        *GENERATED_TRACKED_DIRS,
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
