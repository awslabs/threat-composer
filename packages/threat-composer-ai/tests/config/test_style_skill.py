"""The asd-ste100 writing skill: found, checked, loaded into prompts, recorded."""

from pathlib import Path

import pytest

from threat_composer_ai.config import style_skill as ss

SKILL = """---
name: asd-ste100
description: test copy
version: '9.9.9'
---

# Simplified Technical English

## When to Use This Skill
Not for prompts.

## Two Modes
Strict and STE-flavored.

## Core Rewrite Rules
### Structural rules
Use the active voice.

## Scan Checklist
1. Synonym rotation.

## Process
Rewrite on request.

## Output Format
Rewritten text only.

## Boundaries
Keep every hedge.
"""


@pytest.fixture(autouse=True)
def fresh(monkeypatch, tmp_path):
    """No cached skill, and a home with no skills unless a test adds one."""
    ss.get_style_skill.cache_clear()
    monkeypatch.delenv(ss.ENV_VAR, raising=False)
    monkeypatch.setattr(Path, "home", lambda: tmp_path / "home")
    yield
    ss.get_style_skill.cache_clear()


def write_skill(directory: Path, text: str = SKILL) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "SKILL.md").write_text(text, encoding="utf-8")
    return directory


def test_missing_skill_gives_install_instructions():
    with pytest.raises(ss.StyleSkillError) as e:
        ss.get_style_skill()
    assert ss.INSTALL_COMMAND in str(e.value)
    assert f"{ss.ENV_VAR}=none" in str(e.value)


def test_opt_out(monkeypatch):
    monkeypatch.setenv(ss.ENV_VAR, "none")
    assert ss.get_style_skill() is None
    assert ss.writing_rules_section() == ""
    assert ss.provenance() == {"skill": "disabled"}


def test_found_in_user_skills(tmp_path):
    write_skill(tmp_path / "home/.claude/skills/asd-ste100")
    skill = ss.get_style_skill()
    assert skill.version == "9.9.9"
    assert skill.provenance()["sha256"] and skill.provenance()["skill"] == "asd-ste100"


def test_found_in_org_synced_skills(tmp_path):
    write_skill(tmp_path / "home/.claude/skills/synced/org-123/asd-ste100")
    assert ss.get_style_skill().path.parts[-3] == "org-123"


@pytest.mark.parametrize("as_file", [False, True])
def test_env_var_points_at_dir_or_file(monkeypatch, tmp_path, as_file):
    directory = write_skill(tmp_path / "elsewhere")
    monkeypatch.setenv(
        ss.ENV_VAR, str(directory / "SKILL.md" if as_file else directory)
    )
    assert ss.get_style_skill().path == directory / "SKILL.md"


def test_env_var_wins_and_is_not_silently_ignored(monkeypatch, tmp_path):
    write_skill(tmp_path / "home/.claude/skills/asd-ste100")
    monkeypatch.setenv(ss.ENV_VAR, str(tmp_path / "typo"))
    with pytest.raises(ss.StyleSkillError, match="not found"):
        ss.get_style_skill()


def test_prompt_has_only_rule_sections(tmp_path):
    write_skill(tmp_path / "home/.claude/skills/asd-ste100")
    prompt = ss.writing_rules_section()
    assert prompt.startswith("WRITING RULES")
    for kept in (
        "## Two Modes",
        "### Structural rules",
        "## Scan Checklist",
        "## Boundaries",
    ):
        assert kept in prompt
    for dropped in ("When to Use", "## Process", "## Output Format"):
        assert dropped not in prompt


def test_wrong_skill_rejected(tmp_path):
    write_skill(
        tmp_path / "home/.claude/skills/asd-ste100",
        SKILL.replace("name: asd-ste100", "name: other"),
    )
    with pytest.raises(ss.StyleSkillError, match="'other' skill"):
        ss.get_style_skill()


def test_unsupported_version_rejected(tmp_path):
    write_skill(
        tmp_path / "home/.claude/skills/asd-ste100",
        SKILL.replace("## Scan Checklist", "## Checklist"),
    )
    with pytest.raises(ss.StyleSkillError, match="Scan Checklist"):
        ss.get_style_skill()


def test_prose_agents_get_the_rules(tmp_path):
    """All five agents that write prose put the skill's rules in their prompt."""
    from threat_composer_ai.agents import (
        application_info,
        architecture,
        dataflow,
        mitigations,
        threats,
    )
    from threat_composer_ai.config import AppConfig, register_global_config

    write_skill(tmp_path / "home/.claude/skills/asd-ste100")
    cfg = AppConfig.create(
        working_directory=tmp_path, output_directory=tmp_path / "out"
    )
    register_global_config(cfg)
    for agent in (application_info, architecture, dataflow, threats, mitigations):
        text = agent.create_system_prompt(cfg)[0]["text"]
        assert "## Core Rewrite Rules" in text, agent.__name__
        assert text.index("WRITING RULES") < text.index("FINAL RESPONSE")


def test_runner_refuses_to_start_without_the_skill(tmp_path):
    from threat_composer_ai.core.runner import WorkflowRunner

    runner = WorkflowRunner.__new__(WorkflowRunner)  # setup() checks the skill first
    ok, message = runner.setup(invocation_args={}, skip_validation=True)
    assert not ok and ss.INSTALL_COMMAND in message


INSTALLED = Path.home() / ".claude/skills/asd-ste100/SKILL.md"


@pytest.mark.skipif(not INSTALLED.is_file(), reason="asd-ste100 not installed")
def test_installed_skill_is_supported():
    """The real skill has every section the loader needs."""
    skill = ss.load(INSTALLED)
    assert set(skill.sections) == set(ss.RULE_SECTIONS)
