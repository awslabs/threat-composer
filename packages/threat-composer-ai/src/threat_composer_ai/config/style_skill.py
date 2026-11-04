"""
Writing style for agent-written prose: the asd-ste100 skill.

Threat models are read by people and by other tools, so the text the agents
write follows ASD-STE100 Simplified Technical English. The rules come from the
asd-ste100 Claude Code skill (https://github.com/danyuchn/asd-ste100-skill),
which is an external prerequisite, like Graphviz. The Claude Code agents load
the same skill, so both runtimes follow one source.

The skill is found at, in order:

1. THREAT_COMPOSER_AI_STYLE_SKILL: a skill directory or its SKILL.md. Set it
   to "none" to run without the writing rules.
2. ~/.claude/skills/asd-ste100/SKILL.md
3. An organization-synced copy under ~/.claude/skills/synced/*/asd-ste100/

The skill was written for rewriting text on request, so only the sections that
state rules are put into prompts. Its process, output format and linter
sections do not apply to an agent that writes through tools.
"""

import hashlib
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

ENV_VAR = "THREAT_COMPOSER_AI_STYLE_SKILL"
DISABLED_VALUES = {"none", "off", "disabled"}
SKILL_NAME = "asd-ste100"
SOURCE_URL = "https://github.com/danyuchn/asd-ste100-skill"
INSTALL_COMMAND = f"git clone {SOURCE_URL} ~/.claude/skills/{SKILL_NAME}"

# The sections of SKILL.md that state rules, in prompt order.
RULE_SECTIONS = ("Two Modes", "Core Rewrite Rules", "Scan Checklist", "Boundaries")

PROMPT_PREAMBLE = """WRITING RULES (ASD-STE100 Simplified Technical English, from the asd-ste100 skill):
Write all text that goes into the threat model with these rules: descriptions, threat fields, comments, mitigations and assumptions.
- Use Strict mode for threat fields and mitigation content.
- Use STE-flavored mode for descriptions, comments and assumptions.
- The skill was written for rewriting text on request. Here, apply its rules as you write. Its process, output format and linter script do not apply.
- Keep every condition, hedge and file reference when you apply a rule.
"""


class StyleSkillError(RuntimeError):
    """The writing skill is missing or not in the expected form."""


@dataclass(frozen=True)
class StyleSkill:
    path: Path
    name: str
    version: str
    sha256: str
    sections: dict[str, str] = field(repr=False)

    def provenance(self) -> dict[str, str]:
        return {
            "skill": self.name,
            "version": self.version,
            "path": str(self.path),
            "sha256": self.sha256,
        }

    def prompt_section(self) -> str:
        body = "\n\n".join(self.sections[name] for name in RULE_SECTIONS)
        return f"{PROMPT_PREAMBLE}\n{body}"


def is_disabled() -> bool:
    return os.environ.get(ENV_VAR, "").strip().lower() in DISABLED_VALUES


def candidate_paths() -> list[Path]:
    """Where to look for SKILL.md, in order."""
    configured = os.environ.get(ENV_VAR, "").strip()
    if configured:
        path = Path(configured).expanduser()
        return [path / "SKILL.md" if path.is_dir() else path]
    skills = Path.home() / ".claude" / "skills"
    return [
        skills / SKILL_NAME / "SKILL.md",
        *sorted((skills / "synced").glob(f"*/{SKILL_NAME}/SKILL.md")),
    ]


def _frontmatter_value(frontmatter: str, key: str) -> str:
    match = re.search(rf"^{key}:\s*(.+?)\s*$", frontmatter, re.MULTILINE)
    return match.group(1).strip().strip("'\"") if match else ""


def _sections(body: str) -> dict[str, str]:
    """Split markdown into level-2 sections, keyed by heading text."""
    sections: dict[str, str] = {}
    current = None
    for line in body.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = line
        elif current is not None:
            sections[current] += "\n" + line
    return {k: v.strip() for k, v in sections.items()}


def load(path: Path) -> StyleSkill:
    """Read and check a SKILL.md file."""
    try:
        raw = path.read_bytes()
    except OSError as e:
        raise StyleSkillError(f"cannot read {path}: {e}") from e
    text = raw.decode("utf-8")
    parts = text.split("---", 2)
    if not text.startswith("---") or len(parts) < 3:
        raise StyleSkillError(f"{path} has no frontmatter")
    frontmatter, body = parts[1], parts[2]

    name = _frontmatter_value(frontmatter, "name")
    if name != SKILL_NAME:
        raise StyleSkillError(f"{path} is the '{name}' skill, not '{SKILL_NAME}'")

    sections = _sections(body)
    missing = [s for s in RULE_SECTIONS if s not in sections]
    if missing:
        raise StyleSkillError(
            f"{path} has no section named {missing}. This version of the skill "
            f"is not supported; install the one from {SOURCE_URL}"
        )
    return StyleSkill(
        path=path,
        name=name,
        version=_frontmatter_value(frontmatter, "version") or "unknown",
        sha256=hashlib.sha256(raw).hexdigest(),
        sections={s: sections[s] for s in RULE_SECTIONS},
    )


@lru_cache(maxsize=1)
def get_style_skill() -> StyleSkill | None:
    """The writing skill, or None when it is disabled.

    Raises StyleSkillError with install instructions when it cannot be found.
    """
    if is_disabled():
        return None
    candidates = candidate_paths()
    for path in candidates:
        if path.is_file():
            return load(path)
    looked = ", ".join(str(p) for p in candidates)
    raise StyleSkillError(
        f"The {SKILL_NAME} writing skill was not found (looked in: {looked}).\n"
        f"Install it with:\n  {INSTALL_COMMAND}\n"
        f"or set {ENV_VAR} to its directory. To run without the writing rules, "
        f"set {ENV_VAR}=none."
    )


def writing_rules_section() -> str:
    """The prompt section for agents that write prose; empty when disabled."""
    skill = get_style_skill()
    return skill.prompt_section() if skill else ""


def provenance() -> dict[str, str]:
    skill = get_style_skill()
    return skill.provenance() if skill else {"skill": "disabled"}
