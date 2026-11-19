"""Tests for gitignore filtering and directory pruning in the file listing tool."""

import os
import shutil
import tempfile
from pathlib import Path

import pathspec
import pytest

from threat_composer_ai.tools.threat_composer_list_workdir_files_gitignore_filtered import (
    _negated_prefixes,
    collect_files,
    find_gitignore_files,
    get_hardcoded_exclusions,
    load_gitignore_patterns,
)


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests and clean up after."""
    d = tempfile.mkdtemp()
    yield Path(d)
    shutil.rmtree(d)


def _create_file(base: Path, rel_path: str, content: str = "x") -> Path:
    """Helper to create a file with parent directories."""
    fp = base / rel_path
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(content)
    return fp


class TestLoadGitignorePatterns:
    """Tests for subdirectory .gitignore pattern adjustment."""

    def test_root_gitignore_patterns_unchanged(self, temp_dir):
        _create_file(temp_dir, ".gitignore", "node_modules\n*.log\n")
        gi_files = find_gitignore_files(temp_dir)
        spec = load_gitignore_patterns(gi_files, temp_dir)
        assert spec.match_file("node_modules/pkg/index.js")
        assert spec.match_file("error.log")
        assert not spec.match_file("src/app.py")

    def test_subdirectory_anchored_pattern_stripped(self, temp_dir):
        """Leading '/' in subdirectory .gitignore should be stripped."""
        _create_file(temp_dir, "subdir/.gitignore", "/node_modules\n/dist\n")
        _create_file(temp_dir, "subdir/app.js")
        gi_files = find_gitignore_files(temp_dir)
        spec = load_gitignore_patterns(gi_files, temp_dir)
        # Should match: subdir/node_modules (not subdir//node_modules)
        assert spec.match_file("subdir/node_modules")
        assert spec.match_file("subdir/dist")
        assert not spec.match_file("subdir/app.js")

    def test_subdirectory_unanchored_pattern(self, temp_dir):
        """Patterns without leading '/' should also work in subdirectories."""
        _create_file(temp_dir, "subdir/.gitignore", "*.pyc\n__pycache__\n")
        gi_files = find_gitignore_files(temp_dir)
        spec = load_gitignore_patterns(gi_files, temp_dir)
        assert spec.match_file("subdir/module.pyc")
        assert spec.match_file("subdir/__pycache__")

    def test_subdirectory_negation_pattern(self, temp_dir):
        _create_file(temp_dir, "subdir/.gitignore", "/node_modules\n!node_modules/keep\n")
        gi_files = find_gitignore_files(temp_dir)
        spec = load_gitignore_patterns(gi_files, temp_dir)
        # node_modules is ignored
        assert spec.match_file("subdir/node_modules/pkg/index.js")
        # but the negation re-includes "keep"
        assert not spec.match_file("subdir/node_modules/keep")


class TestNegatedPrefixes:
    """Tests for _negated_prefixes extraction."""

    def test_no_negations_returns_empty(self):
        spec = pathspec.PathSpec.from_lines("gitwildmatch", ["node_modules", "dist"])
        assert _negated_prefixes(spec) == set()

    def test_extracts_ancestor_directories(self):
        spec = pathspec.PathSpec.from_lines(
            "gitwildmatch", ["node_modules", "!node_modules/special"]
        )
        prefixes = _negated_prefixes(spec)
        assert "node_modules" in prefixes

    def test_nested_negation_extracts_all_ancestors(self):
        spec = pathspec.PathSpec.from_lines(
            "gitwildmatch", ["!subdir/node_modules/special"]
        )
        prefixes = _negated_prefixes(spec)
        assert "subdir" in prefixes
        assert "subdir/node_modules" in prefixes
        # Leaf should NOT be included
        assert "subdir/node_modules/special" not in prefixes

    def test_none_spec_returns_empty(self):
        assert _negated_prefixes(None) == set()


class TestCollectFilesWithPruning:
    """Tests for directory pruning during os.walk."""

    def test_prunes_gitignored_directory(self, temp_dir):
        _create_file(temp_dir, "src/app.py")
        _create_file(temp_dir, "node_modules/pkg/index.js")
        _create_file(temp_dir, ".gitignore", "node_modules\n")
        gi_files = find_gitignore_files(temp_dir)
        gi_spec = load_gitignore_patterns(gi_files, temp_dir)
        hc_spec = get_hardcoded_exclusions(temp_dir)

        files = collect_files(temp_dir, False, False, gi_spec, hc_spec)
        rel_paths = {str(f.relative_to(temp_dir)) for f in files}

        assert "src/app.py" in rel_paths
        # node_modules should be pruned — its files should not appear
        assert "node_modules/pkg/index.js" not in rel_paths

    def test_negation_prevents_pruning(self, temp_dir):
        _create_file(temp_dir, "node_modules/regular/index.js")
        _create_file(temp_dir, "node_modules/special/index.js")
        _create_file(temp_dir, "src/app.py")
        _create_file(temp_dir, ".gitignore", "node_modules\n!node_modules/special\n")
        gi_files = find_gitignore_files(temp_dir)
        gi_spec = load_gitignore_patterns(gi_files, temp_dir)
        hc_spec = get_hardcoded_exclusions(temp_dir)

        files = collect_files(temp_dir, False, False, gi_spec, hc_spec)
        rel_paths = {str(f.relative_to(temp_dir)) for f in files}

        # node_modules should NOT be pruned because of the negation
        # (both files will be in the collected set; filtering happens later)
        assert "node_modules/special/index.js" in rel_paths
        assert "src/app.py" in rel_paths

    def test_hardcoded_exclusions_pruned(self, temp_dir):
        _create_file(temp_dir, "src/app.py")
        _create_file(temp_dir, ".git/config", "x")
        _create_file(temp_dir, "cdk.out/manifest.json")
        hc_spec = get_hardcoded_exclusions(temp_dir)

        files = collect_files(temp_dir, False, False, None, hc_spec)
        rel_paths = {str(f.relative_to(temp_dir)) for f in files}

        assert "src/app.py" in rel_paths
        assert ".git/config" not in rel_paths
        assert "cdk.out/manifest.json" not in rel_paths

    def test_no_specs_collects_everything(self, temp_dir):
        _create_file(temp_dir, "src/app.py")
        _create_file(temp_dir, "node_modules/pkg/index.js")

        files = collect_files(temp_dir, False, False, None, None)
        rel_paths = {str(f.relative_to(temp_dir)) for f in files}

        assert "src/app.py" in rel_paths
        assert "node_modules/pkg/index.js" in rel_paths

    def test_subdirectory_gitignore_with_negation(self, temp_dir):
        """End-to-end: subdirectory .gitignore with anchored pattern + negation."""
        _create_file(temp_dir, "subdir/src/app.js")
        _create_file(temp_dir, "subdir/node_modules/regular/index.js")
        _create_file(temp_dir, "subdir/node_modules/special/index.js")
        _create_file(
            temp_dir, "subdir/.gitignore", "/node_modules\n!node_modules/special\n"
        )
        _create_file(temp_dir, "root.txt")

        gi_files = find_gitignore_files(temp_dir)
        gi_spec = load_gitignore_patterns(gi_files, temp_dir)
        hc_spec = get_hardcoded_exclusions(temp_dir)

        all_files = collect_files(temp_dir, False, False, gi_spec, hc_spec)

        # Apply the same filter as the main tool
        result = []
        for fp in all_files:
            rel = str(fp.relative_to(temp_dir)).replace("\\", "/")
            if gi_spec.match_file(rel):
                continue
            if hc_spec.match_file(rel):
                continue
            result.append(rel)

        assert "root.txt" in result
        assert "subdir/src/app.js" in result
        assert "subdir/node_modules/special/index.js" in result
        assert "subdir/node_modules/regular/index.js" not in result
