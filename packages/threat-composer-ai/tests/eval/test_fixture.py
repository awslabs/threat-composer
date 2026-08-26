"""Tests for fixture pinning.

The pin is what makes the quality eval able to attribute a regression. If the
fixture can drift, a score change is ambiguous between the agent getting worse and
the input changing. These tests cover the hashing itself, and one guard that the
exclusion list has not diverged from what the repository actually tracks.

Most of these need nothing beyond the standard library, so they run whether or not
the eval extra is installed. The exception is the gate tests at the end, which
exercise main() and therefore pull in the evaluators; those skip without the extra.
"""

import json
import subprocess
from pathlib import Path

import pytest

from threat_composer_ai.eval.fixture import (
    EXCLUDED_DIRS,
    GENERATED_TRACKED_DIRS,
    identify,
    verify,
)

REPO_ROOT = Path(__file__).resolve().parents[4]
CONFIG = Path(__file__).resolve().parents[2] / "eval" / "browser-extension.json"


@pytest.fixture
def tree(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "a.ts").write_text("export const a = 1;\n")
    (tmp_path / "src" / "b.ts").write_text("export const b = 2;\n")
    (tmp_path / "package.json").write_text('{"name": "x"}\n')
    return tmp_path


class TestIdentify:
    def test_is_repeatable(self, tree):
        assert identify(tree).tree_sha256 == identify(tree).tree_sha256

    def test_is_independent_of_location(self, tree, tmp_path_factory):
        import shutil

        other = tmp_path_factory.mktemp("elsewhere") / "copy"
        shutil.copytree(tree, other)
        assert identify(tree).tree_sha256 == identify(other).tree_sha256

    def test_changes_when_content_changes(self, tree):
        before = identify(tree).tree_sha256
        (tree / "src" / "a.ts").write_text("export const a = 999;\n")
        assert identify(tree).tree_sha256 != before

    def test_changes_when_a_file_is_renamed(self, tree):
        # Paths are hashed, not just bytes, so a rename is a change even though the
        # set of file contents is identical.
        before = identify(tree).tree_sha256
        (tree / "src" / "a.ts").rename(tree / "src" / "renamed.ts")
        assert identify(tree).tree_sha256 != before

    def test_changes_when_a_file_is_added(self, tree):
        before = identify(tree).tree_sha256
        (tree / "src" / "c.ts").write_text("export const c = 3;\n")
        assert identify(tree).tree_sha256 != before

    def test_ignores_build_output(self, tree):
        before = identify(tree).tree_sha256
        for excluded in ("node_modules", "dist", ".output"):
            directory = tree / excluded
            directory.mkdir()
            (directory / "junk.js").write_text("whatever\n")
        assert identify(tree).tree_sha256 == before, (
            "build output must not affect the pin, or the hash would depend on "
            "whether anyone had run a build"
        )

    def test_counts_only_hashed_files(self, tree):
        (tree / "node_modules").mkdir()
        (tree / "node_modules" / "junk.js").write_text("x\n")
        assert identify(tree).file_count == 3


class TestVerify:
    def test_passes_on_a_match(self, tree):
        expected = identify(tree).tree_sha256
        ok, message, _ = verify(tree, expected)
        assert ok
        assert "matches its pin" in message

    def test_fails_on_drift_and_says_the_input_moved(self, tree):
        expected = identify(tree).tree_sha256
        (tree / "src" / "a.ts").write_text("changed\n")
        ok, message, _ = verify(tree, expected)
        assert not ok
        # The message must distinguish a changed input from a quality drop, since
        # confusing the two is the misattribution this whole mechanism prevents.
        assert "input changed" in message
        assert "not the same as quality dropping" in message
        assert "re-baseline" in message

    def test_an_absent_pin_is_not_a_pass(self, tree):
        # An unpinned fixture is exactly the condition that makes results
        # unattributable, so it must not be reported as fine.
        ok, message, identity = verify(tree, None)
        assert not ok
        assert "not pinned" in message
        # Reports the measured hash, so pinning it is a copy and paste.
        assert identity.tree_sha256 in message or "Record that hash" in message


class TestRecordedPinMatchesTheFixture:
    """The pin in the expectations file describes the fixture in this repository."""

    def test_config_records_a_pin(self):
        config = json.loads(CONFIG.read_text())
        assert config["fixture"]["tree_sha256"]
        assert config["fixture"]["path"]

    def test_config_declares_a_commit_key_even_when_unset(self):
        """The commit pin is what supplies the source, so its absence should be
        visible in the config rather than implicit.

        A null value is legitimate while this stack is unmerged: the fixture the
        bands were measured against only reaches main as a squash commit that does
        not exist yet, and this repository deletes branches on merge so a branch
        commit would be orphaned. Null means the workflow analyses the checked-out
        tree and the hash is the only thing holding the input still, which it warns
        about. The key must still be present so that state is explicit.
        """
        config = json.loads(CONFIG.read_text())
        assert "commit" in config["fixture"], (
            "fixture.commit must be declared, even as null, so an unpinned source is "
            "an explicit state rather than a missing key"
        )

    def test_fixture_matches_its_recorded_pin(self):
        config = json.loads(CONFIG.read_text())
        target = REPO_ROOT / config["fixture"]["path"]
        if not target.is_dir():
            pytest.skip(f"fixture not present at {target}")
        ok, message, identity = verify(target, config["fixture"]["tree_sha256"])
        assert ok, message
        assert identity.file_count == config["fixture"]["file_count"]
        assert identity.byte_count == config["fixture"]["byte_count"]

    def test_hashed_files_match_what_git_tracks(self):
        """Guards the exclusion list against diverging from the repository.

        If someone commits a file inside a directory this module excludes, the agent
        would read it while the pin ignored it, leaving a gap where the input could
        change without the hash noticing. That happened during development with
        `.wxt/`, which WXT generates but the repository commits.
        """
        config = json.loads(CONFIG.read_text())
        relative = config["fixture"]["path"]
        target = REPO_ROOT / relative
        if not target.is_dir():
            pytest.skip(f"fixture not present at {target}")
        try:
            tracked = subprocess.run(
                ["git", "ls-files", relative],
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
                check=True,
            ).stdout.split()
        except (subprocess.CalledProcessError, FileNotFoundError):
            pytest.skip("git not available")
        expected = {Path(p).relative_to(relative).as_posix() for p in tracked}

        from threat_composer_ai.eval.fixture import _source_files

        hashed = {
            p.relative_to(target.resolve()).as_posix() for p in _source_files(target)
        }

        # Tracked paths under a deliberately excluded generated directory are
        # expected to be absent, and are documented as such in fixture.py.
        expected = {
            p
            for p in expected
            if not GENERATED_TRACKED_DIRS.intersection(Path(p).parts)
        }

        missed = sorted(expected - hashed)
        assert not missed, (
            f"tracked but not hashed, so the agent reads them while the pin ignores them: {missed}. "
            f"Either remove the containing directory from EXCLUDED_DIRS ({sorted(EXCLUDED_DIRS)}), "
            f"or if it is regenerated by a build or install, add it to GENERATED_TRACKED_DIRS "
            f"with the reason."
        )

    def test_generated_tracked_dirs_are_actually_excluded(self):
        """The documented exception must match the behaviour.

        GENERATED_TRACKED_DIRS exists to record a deliberate gap in the pin. If it
        drifted out of EXCLUDED_DIRS the exception would be documented but not
        applied, which is worse than either.
        """
        assert GENERATED_TRACKED_DIRS
        assert GENERATED_TRACKED_DIRS.issubset(EXCLUDED_DIRS)


class TestTheGateRefusesBeforeSpendingAnything:
    """The pre-flight must block before the CLI runs, not after.

    A drifted fixture makes the whole run unattributable, so discovering it after
    eighteen minutes and a million tokens would be pointless. These assert on
    whether run_cli was reached, which is the only thing that actually costs money.

    Unlike the rest of this module, these do require strands-agents-evals, because
    they exercise main(), which imports the evaluators. Guarded rather than left to
    fail: without the extra installed these should skip, not error.
    """

    @pytest.fixture(autouse=True)
    def _requires_the_eval_extra(self):
        pytest.importorskip(
            "strands_evals",
            reason="strands-agents-evals ships in the 'eval' extra: uv sync --extra eval",
        )

    @pytest.fixture
    def pinned(self, tmp_path):
        """A fixture tree plus a config file pinning it."""
        target = tmp_path / "fixture"
        (target / "src").mkdir(parents=True)
        (target / "src" / "a.ts").write_text("export const a = 1;\n")
        (target / "package.json").write_text('{"name": "x"}\n')
        config = tmp_path / "config.json"
        config.write_text(
            json.dumps(
                {
                    "fixture": {
                        "path": "fixture",
                        "tree_sha256": identify(target).tree_sha256,
                    },
                    "bands": {"threats": [1, 100]},
                }
            )
        )
        return target, config

    def _run(self, monkeypatch, target, config, extra=()):
        """Invoke main() with the CLI and the evaluation stubbed out."""
        from threat_composer_ai.eval import quality

        reached = {"cli": 0, "evaluate": 0}

        def fake_run_cli(**kwargs):
            reached["cli"] += 1
            return 0

        def fake_evaluate(*args, **kwargs):
            reached["evaluate"] += 1
            return object()

        monkeypatch.setattr(quality, "run_cli", fake_run_cli)
        monkeypatch.setattr(quality, "evaluate", fake_evaluate)
        monkeypatch.setattr(quality, "render", lambda *a, **k: ("stubbed", True, True))
        code = quality.main(["--target", str(target), "--config", str(config), *extra])
        return code, reached

    def test_refuses_and_never_invokes_the_cli_on_drift(self, monkeypatch, pinned):
        target, config = pinned
        (target / "src" / "a.ts").write_text("export const a = 2;\n")
        code, reached = self._run(monkeypatch, target, config)
        assert code == 1
        assert reached["cli"] == 0, "spent inference on a fixture that had drifted"

    def test_refuses_when_the_config_has_no_pin(self, monkeypatch, tmp_path, pinned):
        target, _ = pinned
        config = tmp_path / "unpinned.json"
        config.write_text(json.dumps({"bands": {"threats": [1, 100]}}))
        code, reached = self._run(monkeypatch, target, config)
        assert code == 1
        assert reached["cli"] == 0

    def test_opens_when_the_fixture_matches_its_pin(self, monkeypatch, pinned):
        target, config = pinned
        code, reached = self._run(monkeypatch, target, config)
        assert reached["cli"] == 1
        assert reached["evaluate"] == 1
        assert code == 0

    def test_override_is_available_but_must_be_asked_for(self, monkeypatch, pinned):
        target, config = pinned
        (target / "src" / "a.ts").write_text("export const a = 3;\n")
        code, reached = self._run(
            monkeypatch, target, config, ["--allow-fixture-drift"]
        )
        assert reached["cli"] == 1, "the escape hatch should let a run proceed"
        assert code == 0
