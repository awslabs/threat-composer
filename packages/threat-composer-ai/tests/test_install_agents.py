"""The install script copies the generated agent files and registers the MCP server."""

import importlib.util
import json
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "install_agents.py"
spec = importlib.util.spec_from_file_location("install_agents", SCRIPT)
install = importlib.util.module_from_spec(spec)
spec.loader.exec_module(install)


@pytest.fixture
def env(tmp_path, monkeypatch):
    home = tmp_path / "home"
    project = tmp_path / "project"
    home.mkdir()
    project.mkdir()
    monkeypatch.setenv("HOME", str(home))
    # Keep the tests away from the real `claude` command and the network.
    monkeypatch.setattr(install.shutil, "which", lambda name: None)
    return home, project


def run(*args):
    return install.main([*args])


def test_project_install(env):
    _, project = env
    assert run("--project", str(project)) == 0
    assert (project / ".claude/agents/defender.md").is_file()
    assert (project / ".claude/skills/threat-model/SKILL.md").is_file()
    assert (project / ".kiro/agents/threat-model-coordinator.json").is_file()
    assert (project / ".kiro/agent-prompts/defender.md").is_file()
    assert (project / ".kiro/workflows/threat-model.workflow.json").is_file()
    for path in (project / ".mcp.json", project / ".kiro/settings/mcp.json"):
        entry = json.loads(path.read_text())["mcpServers"]["threat-composer"]
        assert str(install.PACKAGE) in entry["args"][1]
        assert entry["env"]["THREAT_COMPOSER_AI_MCP_TOOLS"] == "builder"


def test_mcp_merge_keeps_other_servers_and_is_idempotent(env, capsys):
    _, project = env
    (project / ".mcp.json").write_text(
        json.dumps({"mcpServers": {"other": {"command": "x"}}})
    )
    run("--project", str(project), "--tool", "claude")
    servers = json.loads((project / ".mcp.json").read_text())["mcpServers"]
    assert set(servers) == {"other", "threat-composer"}
    capsys.readouterr()
    run("--project", str(project), "--tool", "claude")
    out = capsys.readouterr().out
    assert "update" not in out and "create" not in out


def test_invalid_mcp_json_changes_nothing_in_it(env):
    _, project = env
    (project / ".mcp.json").write_text("{nope")
    assert run("--project", str(project), "--tool", "claude") == 1
    assert (project / ".mcp.json").read_text() == "{nope"


def test_dry_run_writes_nothing(env):
    _, project = env
    assert run("--project", str(project), "--dry-run") == 0
    assert list(project.iterdir()) == []


def test_user_scope_and_no_mcp(env):
    home, project = env
    assert run("--scope", "user", "--tool", "kiro", "--no-mcp") == 0
    assert (home / ".kiro/agents/defender.json").is_file()
    assert not (home / ".kiro/settings/mcp.json").exists()
    assert list(project.iterdir()) == []


def test_uninstall_removes_only_its_files(env):
    _, project = env
    (project / ".claude/agents").mkdir(parents=True)
    (project / ".claude/agents/mine.md").write_text("mine")
    (project / ".mcp.json").write_text(json.dumps({"mcpServers": {"other": {}}}))
    run("--project", str(project))
    assert run("--project", str(project), "--uninstall") == 0
    assert (project / ".claude/agents/mine.md").read_text() == "mine"
    assert not (project / ".claude/agents/defender.md").exists()
    assert not (project / ".claude/skills").exists()
    assert not (project / ".kiro/agents").exists()
    kiro_mcp = json.loads((project / ".kiro/settings/mcp.json").read_text())
    assert kiro_mcp == {"mcpServers": {}}
    assert json.loads((project / ".mcp.json").read_text()) == {
        "mcpServers": {"other": {}}
    }


def test_refuses_to_install_into_the_package(env):
    assert run("--project", str(install.PACKAGE)) == 1
