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


# --- Models ---------------------------------------------------------------------


@pytest.fixture
def kiro_version(monkeypatch):
    monkeypatch.setattr(sync, "KIRO_MODEL_VERSION", "9.9")


def test_every_source_agent_names_its_model():
    """A missing tier would silently use the session's (most costly) model."""
    agents = {meta["name"]: meta.get("model") for meta, _, _ in sync.load_agents()}
    assert all(t in sync.TIERS for t in agents.values()), agents
    assert agents["system-modeler"] == "opus"


def test_claude_agent_gets_the_tier_as_an_alias():
    meta = {"name": "a", "description": "d", "model": "sonnet"}
    assert "\nmodel: sonnet\n" in sync.claude_agent(meta, "x\n", Path("a.md"))
    meta.pop("model")
    assert "model:" not in sync.claude_agent(meta, "x\n", Path("a.md"))


def test_kiro_id_is_claude_tier_version(kiro_version):
    assert sync.kiro_model_id("opus") == "claude-opus-9.9"
    assert sync.kiro_model_id("sonnet") == "claude-sonnet-9.9"
    assert sync.kiro_model_id("haiku") == "claude-haiku-9.9"
    assert sync.kiro_model_id(None) is None
    assert sync.kiro_model_id("inherit") is None
    with pytest.raises(sync.SourceError, match="unknown model tier"):
        sync.kiro_model_id("gpt")


def test_kiro_agent_gets_the_id_for_its_tier(kiro_version):
    meta = {"name": "a", "description": "d", "model": "opus"}
    assert json.loads(sync.kiro_agent(meta, "x\n", Path("a.md"))[0])["model"] == (
        "claude-opus-9.9"
    )


def test_kiro_agent_has_no_model_without_a_tier():
    for model in (None, "inherit"):
        meta = {"name": "a", "description": "d", "model": model}
        assert "model" not in json.loads(sync.kiro_agent(meta, "x\n", Path("a.md"))[0])


def test_the_shipped_kiro_files_use_the_expected_ids():
    """The ids are the ones `/model` lists in Kiro."""
    expected = {
        "opus": "claude-opus-5.5",
        "sonnet": "claude-sonnet-5.5",
        "haiku": "claude-haiku-5.5",
    }
    assert {t: sync.kiro_model_id(t) for t in sync.TIERS} == expected
    for meta, _, _ in sync.load_agents():
        path = sync.ROOT / ".kiro/agents" / f"{meta['name']}.json"
        if path.exists():
            assert json.loads(path.read_text())["model"] == expected[meta["model"]]


def test_unknown_tier_in_an_agent_is_an_error(tmp_path, monkeypatch):
    (tmp_path / "agents").mkdir()
    (tmp_path / "agents" / "a.md").write_text(
        "---\nname: a\ndescription: d\nmodel: gpt\n---\nbody\n"
    )
    monkeypatch.setattr(sync, "SRC", tmp_path)
    with pytest.raises(sync.SourceError, match="model must be one of"):
        sync.load_agents()


def model_steps():
    return [
        {**step("scope"), "agent": "coord"},
        {**step("system"), "agent": "modeler"},
        {**step("override"), "agent": "analyst", "model": "opus"},
        {**step("keep"), "agent": "modeler", "model": "inherit"},
        {
            "type": "parallel",
            "id": "par",
            "joinPolicy": "all",
            "branches": [{**step("branch"), "agent": "analyst"}],
        },
        {
            "type": "sequence",
            "id": "seq",
            "steps": [{**step("nested"), "agent": "modeler"}],
        },
    ]


TIER_BY_AGENT = {"coord": "haiku", "modeler": "opus", "analyst": "sonnet"}


def model_ids(steps):
    found = {}

    def walk(nodes):
        for n in nodes:
            if n.get("type") == "step":
                found[n["id"]] = n.get("modelId")
                assert "model" not in n  # the neutral key never reaches Kiro
            walk((n.get("steps") or []) + (n.get("branches") or []))

    walk(steps)
    return found


def test_steps_use_their_step_tier_then_their_agents_tier(kiro_version):
    steps = model_steps()
    sync.apply_models(steps, TIER_BY_AGENT)
    assert model_ids(steps) == {
        "scope": "claude-haiku-9.9",
        "system": "claude-opus-9.9",  # the agent's tier
        "override": "claude-opus-9.9",  # the step's tier beats the agent's sonnet
        "keep": None,  # inherit beats the agent's tier
        "branch": "claude-sonnet-9.9",  # inside parallel
        "nested": "claude-opus-9.9",  # inside sequence
    }


def test_the_real_workflow_and_agents_get_their_models(kiro_version):
    """Build the real source with fake ids: the system step runs the model of
    its agent's tier, and so do the others."""
    files = {p.relative_to(sync.ROOT): c for p, c in sync.build().items()}
    recipe = json.loads(files[Path(".kiro/workflows/threat-model.workflow.json")])
    tiers = {m["name"]: m["model"] for m, _, _ in sync.load_agents()}

    seen = {}

    def walk(nodes):
        for n in nodes:
            if n.get("type") == "step":
                seen[n["id"]] = (n["agent"], n.get("modelId"))
            walk((n.get("steps") or []) + (n.get("branches") or []))

    walk(recipe["steps"])
    assert seen
    for step_id, (agent, model_id) in seen.items():
        assert model_id == f"claude-{tiers[agent]}-9.9", step_id
    assert {a for a, _ in seen.values()} >= {"system-modeler", "threat-analyst"}

    modeler = json.loads(files[Path(".kiro/agents/system-modeler.json")])
    assert modeler["model"] == "claude-opus-9.9"
    assert "model: opus\n" in files[Path(".claude/agents/system-modeler.md")]


@pytest.mark.parametrize(
    "node, error",
    [
        ({**step("a"), "model": "gpt"}, "must be one of"),
        ({**step("a"), "modelId": "x"}, "not 'modelId'"),
        (
            {"type": "sequence", "id": "s", "steps": [], "model": "opus"},
            "only for a step",
        ),
    ],
)
def test_recipe_model_errors(node, error):
    with pytest.raises(sync.SourceError, match=error):
        sync.check_recipe({"name": "r", "steps": [node]}, Path("r.yaml"), {"a"})


def test_recipe_accepts_a_step_model():
    for model in ("opus", "sonnet", "haiku", "inherit"):
        sync.check_recipe(
            {"name": "r", "steps": [{**step("a"), "model": model}]},
            Path("r.yaml"),
            {"a"},
        )
