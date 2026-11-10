"""scripts/install.sh fetches the package from a git URL and runs the installer."""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

PACKAGE = Path(__file__).resolve().parent.parent
SCRIPT = PACKAGE / "scripts" / "install.sh"

pytestmark = pytest.mark.skipif(
    shutil.which("git") is None or shutil.which("python3") is None,
    reason="needs git and python3",
)


def git(cwd, *args):
    subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
    )


@pytest.fixture
def remote(tmp_path):
    """A git repository that holds a copy of the package files the installer uses."""
    repo = tmp_path / "remote"
    pkg = repo / "packages" / "threat-composer-ai"
    (pkg / "scripts").mkdir(parents=True)
    shutil.copy(PACKAGE / "scripts" / "install_agents.py", pkg / "scripts")
    shutil.copy(PACKAGE / ".mcp.json", pkg)
    for folder in (".claude", ".kiro"):
        shutil.copytree(PACKAGE / folder, pkg / folder)
    (repo / "docs").mkdir()
    (repo / "docs" / "other.md").write_text("not part of the sparse checkout")
    git(repo, "init", "-q", "-b", "main")
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "init")
    return repo


def run(tmp_path, remote, *args):
    env = {
        "PATH": os.environ["PATH"],
        "HOME": str(tmp_path / "home"),
        "THREAT_COMPOSER_HOME": str(tmp_path / "checkout"),
        "THREAT_COMPOSER_REPO": f"file://{remote}",
    }
    (tmp_path / "home").mkdir(exist_ok=True)
    return subprocess.run(
        ["sh", str(SCRIPT), *args], env=env, capture_output=True, text=True
    )


def test_clone_then_install(tmp_path, remote):
    project = tmp_path / "project"
    project.mkdir()
    result = run(tmp_path, remote, "--project", str(project))
    assert result.returncode == 0, result.stderr
    assert (project / ".claude/agents/defender.md").is_file()
    assert (project / ".kiro/workflows/threat-model.workflow.json").is_file()
    checkout = tmp_path / "checkout"
    assert not (checkout / "docs").exists()
    entry = json.loads((project / ".mcp.json").read_text())["mcpServers"]
    assert (
        str(checkout / "packages/threat-composer-ai")
        in (entry["threat-composer"]["args"][1])
    )


def test_second_run_updates_the_checkout(tmp_path, remote):
    project = tmp_path / "project"
    project.mkdir()
    assert run(tmp_path, remote, "--project", str(project)).returncode == 0
    marker = remote / "packages/threat-composer-ai/.claude/agents/defender.md"
    marker.write_text(marker.read_text() + "\nnew line\n")
    git(remote, "commit", "-q", "-am", "change")
    result = run(tmp_path, remote, "--project", str(project))
    assert result.returncode == 0, result.stderr
    assert "new line" in (project / ".claude/agents/defender.md").read_text()


def test_refuses_a_directory_that_is_not_its_checkout(tmp_path, remote):
    (tmp_path / "checkout").mkdir()
    (tmp_path / "checkout" / "mine.txt").write_text("mine")
    result = run(tmp_path, remote)
    assert result.returncode == 1
    assert "not a checkout from this script" in result.stderr
    assert (tmp_path / "checkout" / "mine.txt").read_text() == "mine"
