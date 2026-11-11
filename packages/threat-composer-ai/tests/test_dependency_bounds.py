"""Runtime dependency bounds exclude releases the code can't import.

`uv tool install` and `uvx` ignore uv.lock and resolve the newest versions the
bounds in pyproject.toml allow, so a bound that is too loose only shows in an
install from git, not in development or CI.
"""

from pathlib import Path

import pytest
from packaging.requirements import Requirement

tomllib = pytest.importorskip("tomllib")

PYPROJECT = Path(__file__).resolve().parents[1] / "pyproject.toml"


def runtime_requirements() -> dict[str, Requirement]:
    data = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))
    requirements = (Requirement(r) for r in data["project"]["dependencies"])
    return {r.name: r for r in requirements}


def test_strands_agents_tools_excludes_releases_without_file_read():
    # 0.9.0 removed strands_tools.file_read, which the file read tool wraps.
    specifier = runtime_requirements()["strands-agents-tools"].specifier
    assert specifier.contains("0.8.6")
    assert not specifier.contains("0.9.0")
