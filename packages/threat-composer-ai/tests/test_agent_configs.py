"""The Claude Code and Kiro files are generated from agent-src/."""

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "sync_agent_configs.py"
spec = importlib.util.spec_from_file_location("sync_agent_configs", SCRIPT)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def test_generated_files_are_current():
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--check"], capture_output=True, text=True
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_target_blocks(tmp_path):
    text = "a\n<!-- if claude -->\nc\n<!-- endif -->\n<!-- if kiro -->\nk\n<!-- endif -->\nz\n"
    assert sync.render_body(text, "claude", tmp_path) == "a\nc\nz\n"
    assert sync.render_body(text, "kiro", tmp_path) == "a\nk\nz\n"
    with pytest.raises(sync.SourceError, match="not closed"):
        sync.render_body("<!-- if kiro -->\nx\n", "kiro", tmp_path)


def test_tool_names_per_target():
    meta = {
        "name": "a",
        "description": "d",
        "tools": ["read"],
        "mcp": {"srv": ["t1"]},
        "skills": ["s"],
    }
    claude = sync.claude_agent(meta, "body\n", Path("a.md"))
    assert "tools: Read, Grep, Glob, mcp__srv__t1\n" in claude
    assert "skills:\n  - s\n" in claude

    agent_json, prompt = sync.kiro_agent(meta, "body\n", Path("a.md"))
    agent = json.loads(agent_json)
    assert prompt == "body\n"
    assert agent["prompt"] == "file://../agent-prompts/a.md"
    assert (
        agent["tools"] == agent["allowedTools"] == ["glob", "grep", "read", "@srv/t1"]
    )
    assert agent["useLegacyMcpJson"] is True
    assert "skill://~/.kiro/skills/*/SKILL.md" in agent["resources"]
    assert agent["permissions"]["rules"] == [
        {"capability": "fs_read", "effect": "allow"},
        {"capability": "mcp", "match": ["srv/t1"], "effect": "allow"},
        {"capability": "skill", "effect": "allow"},
    ]


def test_kiro_does_not_preapprove_write_or_shell():
    meta = {"name": "a", "description": "d", "tools": ["read", "write", "shell"]}
    agent = json.loads(sync.kiro_agent(meta, "", Path("a.md"))[0])
    assert "write" in agent["tools"] and "shell" in agent["tools"]
    assert "write" not in agent["allowedTools"] and "shell" not in agent["allowedTools"]


def step(sid, prompt="p", **extra):
    return {"type": "step", "id": sid, "agent": "wf-coder", "prompt": prompt, **extra}


@pytest.mark.parametrize(
    ("steps", "error"),
    [
        ([step("a"), step("a")], "duplicate id"),
        ([step("a", "{{nope}}")], "not a declared input"),
        ([step("a", "{{b.output}}"), step("b")], "has not run"),
        ([step("a", "{{previous.output}}")], "no earlier sibling"),
        ([step("a", "{{artifacts.x}}")], "artifact 'x'"),
        (
            [
                {
                    "type": "parallel",
                    "id": "p",
                    "joinPolicy": "all",
                    "branches": [step("a", completion={"completionSignal": "success"})],
                }
            ],
            "cannot be inside parallel",
        ),
        (
            [
                {
                    "type": "parallel",
                    "id": "p",
                    "joinPolicy": "all",
                    "branches": [step("a"), step("b", "{{a.output}}")],
                }
            ],
            "has not run",
        ),
        (
            [
                {
                    "type": "repeat",
                    "id": "r",
                    "maxIterations": 0,
                    "onMaxIterations": "x",
                    "steps": [],
                }
            ],
            "positive integer",
        ),
        ([{**step("a"), "agent": "ghost"}], "no agent 'ghost'"),
        ([step(f"s{i}") for i in range(51)], "limit is 50"),
    ],
)
def test_recipe_errors(steps, error):
    with pytest.raises(sync.SourceError, match=error):
        sync.check_recipe({"name": "r", "steps": steps}, Path("r.yaml"), set())


def test_recipe_accepts_valid_handoffs():
    recipe = {
        "name": "r",
        "inputs": {"task": "prompt"},
        "steps": [
            step("a", "{{task}}", artifacts={"plan": "plan.md"}),
            step("b", "{{previous.output}} {{a.output}} {{artifacts.plan}}"),
        ],
    }
    sync.check_recipe(recipe, Path("r.yaml"), set())
