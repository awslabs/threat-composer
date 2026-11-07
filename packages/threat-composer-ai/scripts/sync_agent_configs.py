#!/usr/bin/env python3
"""Generate the Claude Code and Kiro agent files from one source.

Source (agent-src/):
  agents/<name>.md          One agent: neutral frontmatter, then the prompt.
  skills/<name>/SKILL.md    One skill. Other files in the folder are copied.
  partials/*.md             Text that agents and skills include.
  workflows/*.workflow.yaml Kiro workflow recipes.

Output:
  .claude/agents/<name>.md, .claude/skills/<name>/
  .kiro/agents/<name>.json, .kiro/agent-prompts/<name>.md, .kiro/skills/<name>/,
  .kiro/workflows/<name>.workflow.json, .kiro/settings/mcp.json (from .mcp.json)

Agent frontmatter in the source:
  name, description   Copied to both outputs.
  tools               Tool groups: read, write, shell, web.
  mcp                 {server: [tool, ...]}: the MCP tools the agent can call.
  skills              Skills the agent writes with.
  targets             Optional: [claude], [kiro] or both (the default).

Markdown directives in agent and skill bodies, each on a line of its own:
  <!-- if claude --> ... <!-- endif -->   Text for one target only.
  <!-- if kiro --> ... <!-- endif -->
  <!-- include partials/x.md -->           Insert a partial.

Run it after you change agent-src/. With --check it changes nothing and exits
1 if a generated file is out of date.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "agent-src"
TARGETS = ("claude", "kiro")

# Tool groups in the source, and the tools each target gives for them.
CLAUDE_TOOLS = {
    "read": ["Read", "Grep", "Glob"],
    "write": ["Write", "Edit"],
    "shell": ["Bash"],
    "web": ["WebFetch", "WebSearch"],
}
KIRO_TOOLS = {
    "read": ["glob", "grep", "read"],
    "write": ["write"],
    "shell": ["shell"],
    "web": ["web_fetch", "web_search"],
}

KIRO_AGENT_SCHEMA = "https://json.schemastore.org/kiro-agent.json"

# Kiro loads only the name and description of a skill:// resource at start,
# and the rest when the agent activates the skill.
KIRO_SKILL_RESOURCES = (
    "skill://.kiro/skills/*/SKILL.md",
    "skill://~/.kiro/skills/*/SKILL.md",
)

# Workflow step agents that Kiro bundles (kiro.dev/docs/workflows/authoring).
KIRO_BUNDLED_AGENTS = {
    "wf-planner",
    "wf-coder",
    "wf-design",
    "wf-design-reviewer",
    "wf-review-aggregator",
    "wf-pr-submitter",
    "wf-pr-responder",
    "wf-auto-researcher",
    "semantic_reviewer",
}

DIRECTIVE = re.compile(r"^<!--\s*(if (\w+)|endif|include (\S+))\s*-->\s*$")


class SourceError(Exception):
    pass


# --- Markdown -----------------------------------------------------------------


def split_frontmatter(text: str, path: Path) -> tuple[dict, str]:
    if not text.startswith("---\n"):
        raise SourceError(f"{path}: no frontmatter")
    head, sep, body = text[4:].partition("\n---\n")
    if not sep:
        raise SourceError(f"{path}: frontmatter is not closed")
    meta = yaml.safe_load(head) or {}
    if not isinstance(meta, dict):
        raise SourceError(f"{path}: frontmatter is not a mapping")
    return meta, body


def render_body(text: str, target: str, path: Path, depth: int = 0) -> str:
    """Apply the if/endif and include directives for one target."""
    if depth > 5:
        raise SourceError(f"{path}: includes nest too deep")
    out: list[str] = []
    active: str | None = None
    for n, line in enumerate(text.splitlines(keepends=True), 1):
        m = DIRECTIVE.match(line.rstrip("\n"))
        if not m:
            if active in (None, target):
                out.append(line)
            continue
        if m.group(2):
            if active is not None:
                raise SourceError(f"{path}:{n}: 'if' inside 'if'")
            if m.group(2) not in TARGETS:
                raise SourceError(f"{path}:{n}: unknown target {m.group(2)!r}")
            active = m.group(2)
        elif m.group(1) == "endif":
            if active is None:
                raise SourceError(f"{path}:{n}: 'endif' without 'if'")
            active = None
        elif active in (None, target):
            part = SRC / m.group(3)
            if not part.is_file():
                raise SourceError(f"{path}:{n}: no partial {m.group(3)}")
            out.append(render_body(part.read_text(), target, part, depth + 1))
    if active is not None:
        raise SourceError(f"{path}: 'if {active}' is not closed")
    return "".join(out)


def scalar(value: str) -> str:
    """A YAML scalar: plain if it reads back unchanged, otherwise quoted."""
    try:
        if yaml.safe_load(f"k: {value}") == {"k": value}:
            return value
    except yaml.YAMLError:
        pass
    return json.dumps(value)


# --- Agents and skills --------------------------------------------------------


def load_agents() -> list[tuple[dict, str, Path]]:
    agents = []
    for path in sorted((SRC / "agents").glob("*.md")):
        meta, body = split_frontmatter(path.read_text(), path)
        for key in ("name", "description"):
            if not isinstance(meta.get(key), str) or not meta[key]:
                raise SourceError(f"{path}: '{key}' is required")
        if meta["name"] != path.stem:
            raise SourceError(f"{path}: name must match the file name")
        unknown = set(meta) - {
            "name",
            "description",
            "tools",
            "mcp",
            "skills",
            "targets",
        }
        if unknown:
            raise SourceError(f"{path}: unknown fields {sorted(unknown)}")
        for group in meta.get("tools", []):
            if group not in CLAUDE_TOOLS:
                raise SourceError(f"{path}: unknown tool group {group!r}")
        for target in meta.get("targets", TARGETS):
            if target not in TARGETS:
                raise SourceError(f"{path}: unknown target {target!r}")
        agents.append((meta, body, path))
    return agents


def claude_agent(meta: dict, body: str, path: Path) -> str:
    tools = [t for g in meta.get("tools", []) for t in CLAUDE_TOOLS[g]]
    tools += [
        f"mcp__{server}__{tool}"
        for server, names in (meta.get("mcp") or {}).items()
        for tool in names
    ]
    lines = [
        "---",
        f"name: {meta['name']}",
        f"description: {scalar(meta['description'])}",
    ]
    if tools:
        lines.append(f"tools: {', '.join(tools)}")
    if meta.get("skills"):
        lines += ["skills:"] + [f"  - {s}" for s in meta["skills"]]
    return "\n".join(lines) + "\n---\n" + render_body(body, "claude", path)


def kiro_agent(meta: dict, body: str, path: Path) -> tuple[str, str]:
    """The agent JSON and its prompt file, in the form Kiro loads.

    The prompt goes in .kiro/agent-prompts/<name>.md, and the JSON points to
    it. The visible tools are also pre-approved, except write and shell.
    """
    name = meta["name"]
    groups = meta.get("tools", [])
    builtin = [t for g in groups for t in KIRO_TOOLS[g]]
    approved = [t for g in groups if g not in ("write", "shell") for t in KIRO_TOOLS[g]]
    mcp = [
        (server, tool)
        for server, names in (meta.get("mcp") or {}).items()
        for tool in names
    ]
    mcp_tools = [f"@{server}/{tool}" for server, tool in mcp]
    agent: dict = {
        "$schema": KIRO_AGENT_SCHEMA,
        "name": name,
        "description": meta["description"],
        "prompt": f"file://../agent-prompts/{name}.md",
        "tools": builtin + mcp_tools,
        "allowedTools": approved + mcp_tools,
    }
    rules = []
    if "read" in groups:
        rules.append({"capability": "fs_read", "effect": "allow"})
    if mcp:
        # The MCP servers come from .kiro/settings/mcp.json.
        agent["useLegacyMcpJson"] = True
        rules.append(
            {
                "capability": "mcp",
                "match": [f"{server}/{tool}" for server, tool in mcp],
                "effect": "allow",
            }
        )
    if meta.get("skills"):
        agent["resources"] = list(KIRO_SKILL_RESOURCES)
        rules.append({"capability": "skill", "effect": "allow"})
    if rules:
        agent["permissions"] = {"rules": rules}
    return json.dumps(agent, indent=2) + "\n", render_body(body, "kiro", path).lstrip(
        "\n"
    )


def skill_files(target: str) -> dict[str, str | bytes]:
    out: dict[str, str | bytes] = {}
    for skill_dir in sorted(p for p in (SRC / "skills").iterdir() if p.is_dir()):
        skill_md = skill_dir / "SKILL.md"
        meta, body = split_frontmatter(skill_md.read_text(), skill_md)
        if meta.get("name") != skill_dir.name:
            raise SourceError(f"{skill_md}: name must match the folder name")
        if not re.fullmatch(r"[a-z0-9-]{1,64}", skill_dir.name):
            raise SourceError(
                f"{skill_md}: name must be lowercase letters, digits and hyphens"
            )
        if len(meta.get("description") or "") > 1024:
            raise SourceError(f"{skill_md}: description is over 1024 characters")
        head = skill_md.read_text().split("\n---\n", 1)[0]
        out[f"skills/{skill_dir.name}/SKILL.md"] = (
            head + "\n---\n" + render_body(body, target, skill_md)
        )
        for f in sorted(skill_dir.rglob("*")):
            if f.is_file() and f != skill_md:
                out[f"skills/{skill_dir.name}/{f.relative_to(skill_dir)}"] = (
                    f.read_bytes()
                )
    return out


# --- Kiro workflow recipes ----------------------------------------------------
# Load-time checks from kiro.dev/docs/workflows/authoring. Kiro's own
# validate_workflow tool checks more; run it on the output before a launch.

MAX_STEPS = 50
MAX_DEPTH = 8
TEMPLATE = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")
NODE_FIELDS = {
    "step": {"id", "agent", "prompt"},
    "sequence": {"id", "steps"},
    "repeat": {"id", "steps", "maxIterations", "onMaxIterations"},
    "parallel": {"id", "branches", "joinPolicy"},
    "watch": {"id", "handler", "config"},
}


def check_recipe(recipe: dict, path: Path, agents: set[str]) -> None:
    errors: list[str] = []
    for key in ("name", "steps"):
        if key not in recipe:
            errors.append(f"root: '{key}' is required")
    inputs = set((recipe.get("inputs") or {}).keys())
    seen: set[str] = set()
    steps = 0

    def templates_in(node: dict) -> list[str]:
        texts = [node.get("prompt", "")]
        texts += list((node.get("artifacts") or {}).values())
        texts += [v for v in (node.get("config") or {}).values() if isinstance(v, str)]
        return [m for t in texts if isinstance(t, str) for m in TEMPLATE.findall(t)]

    def check_ref(
        ref: str, where: str, done: set[str], arts: set[str], first: bool, in_par: bool
    ):
        if ref == "previous.output":
            if first or in_par:
                errors.append(f"{where}: previous.output has no earlier sibling here")
            return
        if ref.startswith("artifacts."):
            if ref[10:] not in arts:
                errors.append(
                    f"{where}: no earlier step registers artifact {ref[10:]!r}"
                )
            return
        if ref.startswith("steps."):
            ref = ref[6:]
        if ref.endswith(".output") or ref.endswith(".terminal"):
            producer = ref.rsplit(".", 1)[0]
            if producer not in done:
                errors.append(f"{where}: {producer!r} has not run before this step")
            return
        if ref not in inputs:
            errors.append(f"{where}: {{{{{ref}}}}} is not a declared input")

    def walk(nodes, depth, done, arts, in_par, in_container):
        nonlocal steps
        if not isinstance(nodes, list):
            errors.append(f"{in_container}: steps must be a list")
            return
        for i, node in enumerate(nodes):
            where = f"{in_container}[{i}]"
            kind = node.get("type")
            if kind not in NODE_FIELDS:
                errors.append(f"{where}: unknown type {kind!r}")
                continue
            missing = NODE_FIELDS[kind] - set(node)
            if missing:
                errors.append(f"{where}: {kind} needs {sorted(missing)}")
            nid = node.get("id", "?")
            where = f"node {nid!r}"
            if nid in seen:
                errors.append(f"{where}: duplicate id")
            seen.add(nid)
            if depth > MAX_DEPTH:
                errors.append(f"{where}: nests deeper than {MAX_DEPTH}")
            for ref in templates_in(node):
                check_ref(ref, where, done, arts, i == 0, in_par)
            if kind == "step":
                steps += 1
                if node.get("agent") not in agents | KIRO_BUNDLED_AGENTS:
                    errors.append(f"{where}: no agent {node.get('agent')!r}")
                if node.get("completion") and in_par:
                    errors.append(
                        f"{where}: an interactive step cannot be inside parallel"
                    )
                arts |= set((node.get("artifacts") or {}).keys())
                done.add(nid)
            elif kind == "watch":
                done.add(nid)
            elif kind == "repeat":
                if not (
                    isinstance(node.get("maxIterations"), int)
                    and node["maxIterations"] > 0
                ):
                    errors.append(f"{where}: maxIterations must be a positive integer")
                if node.get("onMaxIterations") not in ("abort", "continue", "pause"):
                    errors.append(
                        f"{where}: onMaxIterations must be abort, continue or pause"
                    )
                if "stopCondition" in node and "stopWhen" in node:
                    errors.append(f"{where}: set stopCondition or stopWhen, not both")
                walk(node.get("steps", []), depth + 1, done, arts, in_par, where)
            elif kind == "sequence":
                walk(node.get("steps", []), depth + 1, done, arts, in_par, where)
            elif kind == "parallel":
                if node.get("joinPolicy") not in ("all", "allSettled", "any"):
                    errors.append(f"{where}: joinPolicy must be all, allSettled or any")
                # Branches cannot read each other; all of them finish before
                # the next sibling of the parallel node.
                after_done, after_arts = set(), set()
                for b, branch in enumerate(node.get("branches", [])):
                    d, a = set(done), set(arts)
                    walk([branch], depth + 1, d, a, True, f"{where}.branches[{b}]")
                    after_done |= d
                    after_arts |= a
                done |= after_done
                arts |= after_arts

    walk(recipe.get("steps", []), 1, set(), set(), False, "steps")
    if steps > MAX_STEPS:
        errors.append(f"recipe has {steps} step nodes; the limit is {MAX_STEPS}")
    if errors:
        raise SourceError(f"{path}:\n  " + "\n  ".join(errors))


def recipe_files(kiro_agents: set[str]) -> dict[str, str]:
    out = {}
    for path in sorted((SRC / "workflows").glob("*.workflow.yaml")):
        recipe = yaml.safe_load(path.read_text())
        check_recipe(recipe, path, kiro_agents)
        name = path.name.removesuffix(".workflow.yaml")
        if recipe["name"] != name:
            raise SourceError(f"{path}: name must match the file name")
        out[f"workflows/{name}.workflow.json"] = json.dumps(recipe, indent=2) + "\n"
    return out


# --- Output -------------------------------------------------------------------


def build() -> dict[Path, str | bytes]:
    agents = load_agents()
    files: dict[Path, str | bytes] = {}
    kiro_names = set()
    for meta, body, path in agents:
        targets = meta.get("targets", TARGETS)
        if "claude" in targets:
            files[ROOT / ".claude/agents" / f"{meta['name']}.md"] = claude_agent(
                meta, body, path
            )
        if "kiro" in targets:
            agent, prompt = kiro_agent(meta, body, path)
            files[ROOT / ".kiro/agents" / f"{meta['name']}.json"] = agent
            files[ROOT / ".kiro/agent-prompts" / f"{meta['name']}.md"] = prompt
            kiro_names.add(meta["name"])
    for target in TARGETS:
        for rel, content in skill_files(target).items():
            files[ROOT / f".{target}" / rel] = content
    for rel, content in recipe_files(kiro_names).items():
        files[ROOT / ".kiro" / rel] = content
    mcp = ROOT / ".mcp.json"
    if mcp.is_file():
        # Kiro reads the same mcpServers format from .kiro/settings/mcp.json.
        servers = json.loads(mcp.read_text())
        files[ROOT / ".kiro/settings/mcp.json"] = json.dumps(servers, indent=2) + "\n"
    return files


# The folders this script owns. A file in them that the source does not
# produce is removed.
OWNED = [
    ".claude/agents",
    ".claude/skills",
    ".kiro/agents",
    ".kiro/agent-prompts",
    ".kiro/skills",
    ".kiro/workflows",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument(
        "--check", action="store_true", help="report stale files; change nothing"
    )
    args = parser.parse_args()
    try:
        files = build()
    except SourceError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    stale = []
    for path, content in files.items():
        data = content.encode() if isinstance(content, str) else content
        if not path.is_file() or path.read_bytes() != data:
            stale.append(path)
            if not args.check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
    extra = [
        p
        for d in OWNED
        if (ROOT / d).is_dir()
        for p in sorted((ROOT / d).rglob("*"))
        if p.is_file() and p not in files
    ]
    for p in extra:
        stale.append(p)
        if not args.check:
            p.unlink()
    if not args.check:
        for d in OWNED:
            for sub in sorted((ROOT / d).rglob("*"), reverse=True):
                if sub.is_dir() and not any(sub.iterdir()):
                    sub.rmdir()

    for p in stale:
        verb = (
            ("stale" if p in files else "extra")
            if args.check
            else ("wrote" if p in files else "removed")
        )
        print(f"{verb}: {p.relative_to(ROOT)}")
    if args.check and stale:
        print("Run scripts/sync_agent_configs.py to update them.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
