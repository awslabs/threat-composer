"""The built wheel contains every file the package needs at runtime.

Development and the quality eval run from the source tree, where every file
exists, so a file missing from the wheel only shows in an install from it,
for example `uv tool install` or `uvx` from git. This builds the wheel and
checks it.
"""

import shutil
import subprocess
import zipfile
from pathlib import Path

import pytest

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PACKAGE_ROOT / "src" / "threat_composer_ai"


# Files in the source tree that are not read at runtime: compiled bytecode, and
# Markdown written for developers, such as eval/consistency/README.md.
NOT_RUNTIME_SUFFIXES = (".py", ".pyc", ".md")


def runtime_data_files() -> set[str]:
    """Non-Python files in the source package that the code reads, as wheel paths."""
    return {
        f"threat_composer_ai/{path.relative_to(SOURCE).as_posix()}"
        for path in SOURCE.rglob("*")
        if path.is_file()
        and path.suffix not in NOT_RUNTIME_SUFFIXES
        and "__pycache__" not in path.parts
    }


@pytest.mark.skipif(shutil.which("uv") is None, reason="uv is not installed")
def test_wheel_contains_runtime_data_files(tmp_path):
    expected = runtime_data_files()
    assert "threat_composer_ai/assets/dfd/dfd-human_actor.png" in expected

    # Build from a clean copy. setuptools keeps a build/ directory between
    # builds, and a file left there by an earlier build can hide one that the
    # configuration leaves out. Building here also leaves nothing in the tree.
    source = tmp_path / "source"
    shutil.copytree(
        PACKAGE_ROOT,
        source,
        ignore=shutil.ignore_patterns(
            ".venv", "build", "dist", "*.egg-info", "__pycache__", ".pytest_cache"
        ),
    )
    subprocess.run(
        ["uv", "build", "--wheel", "--out-dir", str(tmp_path / "dist")],
        cwd=source,
        check=True,
        capture_output=True,
    )
    (wheel,) = (tmp_path / "dist").glob("*.whl")
    shipped = set(zipfile.ZipFile(wheel).namelist())

    missing = sorted(expected - shipped)
    assert not missing, f"left out of the wheel: {missing}"
