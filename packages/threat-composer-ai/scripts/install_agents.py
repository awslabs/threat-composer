#!/usr/bin/env python3
"""Install the Claude Code and Kiro agents, the threat-model skill, the Kiro
workflow and the MCP server entry into a project or into your home directory.

It copies the generated files in .claude/ and .kiro/ (see
scripts/sync_agent_configs.py) and registers the threat-composer MCP server so
that it runs from this checkout.

  python3 scripts/install_agents.py                 # both tools, into the current directory
  python3 scripts/install_agents.py --project ~/src/app
  python3 scripts/install_agents.py --scope user    # into ~/.claude and ~/.kiro
  python3 scripts/install_agents.py --tool kiro --dry-run
  python3 scripts/install_agents.py --uninstall

It uses only the Python standard library. Run it again to update: files that
this script installs are overwritten, and files it does not know are not touched.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PACKAGE = Path(__file__).resolve().parent.parent
SERVER = "threat-composer"
STYLE_SKILL = "asd-ste100"
STYLE_SKILL_REPO = "https://github.com/danyuchn/asd-ste100-skill"

# Folders of generated files, relative to the package, for each tool.
SOURCES = {
    "claude": [".claude/agents", ".claude/skills/threat-model"],
    "kiro": [
        ".kiro/agents",
        ".kiro/agent-prompts",
        ".kiro/skills/threat-model",
        ".kiro/workflows",
    ],
}


class InstallError(Exception):
    """A problem the user can fix. Nothing is written when it is raised."""


class Reporter:
    def __init__(self, dry_run: bool):
        self.dry_run = dry_run
        self.warnings: list[str] = []

    def say(self, verb: str, what: object) -> None:
        prefix = "would " if self.dry_run else ""
        print(f"  {prefix}{verb:<10} {what}")

    def warn(self, text: str) -> None:
        self.warnings.append(text)


def source_files(tool: str) -> list[Path]:
    """Paths, relative to the package, of every file to install for a tool."""
    found: list[Path] = []
    for folder in SOURCES[tool]:
        base = PACKAGE / folder
        if not base.is_dir():
            raise InstallError(
                f"{folder} is missing. Run scripts/sync_agent_configs.py first."
            )
        found.extend(
            p.relative_to(PACKAGE) for p in sorted(base.rglob("*")) if p.is_file()
        )
    if not found:
        raise InstallError(f"No files to install for {tool}.")
    return found


def tool_root(tool: str, scope: str, project: Path) -> Path:
    base = Path.home() if scope == "user" else project
    return base / f".{tool}"


def mcp_entry() -> dict:
    """The server entry, with a command that runs from any directory.

    The source entry assumes the repository that holds this package is the
    project. For another project the command points at this checkout, and it
    runs from the root of the git repository it is started in, so the models
    go in that repository's threat-models directory.
    """
    source = json.loads((PACKAGE / ".mcp.json").read_text())["mcpServers"][SERVER]
    launch = (
        'cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" && '
        f"exec uv run --quiet --project {shlex.quote(str(PACKAGE))} "
        "threat-composer-ai-mcp"
    )
    return {**source, "args": ["-c", launch]}


def write_atomic(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        os.unlink(tmp)
        raise


def copy_file(src: Path, dest: Path, out: Reporter) -> None:
    data = src.read_bytes()
    if dest.exists():
        if dest.read_bytes() == data:
            out.say("unchanged", dest)
            return
        verb = "update"
    else:
        verb = "create"
    out.say(verb, dest)
    if not out.dry_run:
        write_atomic(dest, data)


def load_mcp_file(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as err:
        raise InstallError(
            f"{path} is not valid JSON ({err}). Fix it, then run again."
        ) from err
    if not isinstance(data, dict) or not isinstance(data.get("mcpServers", {}), dict):
        raise InstallError(f"{path} has no usable `mcpServers` object.")
    return data


def merge_mcp_file(path: Path, out: Reporter, remove: bool = False) -> None:
    data = load_mcp_file(path)
    servers = data.setdefault("mcpServers", {})
    if remove:
        if SERVER not in servers:
            out.say("absent", f"{SERVER} in {path}")
            return
        del servers[SERVER]
        out.say("remove", f"{SERVER} from {path}")
    else:
        if servers.get(SERVER) == mcp_entry():
            out.say("unchanged", f"{SERVER} in {path}")
            return
        out.say("update" if SERVER in servers else "add", f"{SERVER} in {path}")
        servers[SERVER] = mcp_entry()
    if not out.dry_run:
        write_atomic(path, (json.dumps(data, indent=2) + "\n").encode())


def claude_user_mcp(out: Reporter, remove: bool = False) -> None:
    """Register the server in the user scope of Claude Code, with its own CLI.

    ~/.claude.json holds much more than MCP servers, and Claude Code rewrites
    it while it runs, so this script does not edit it.
    """
    claude = shutil.which("claude")
    add = [
        "claude", "mcp", "add-json", "--scope", "user", SERVER,
        json.dumps(mcp_entry()),
    ]  # fmt: skip
    drop = ["claude", "mcp", "remove", "--scope", "user", SERVER]
    commands = [drop] if remove else [drop, add]
    if claude is None:
        out.warn(
            "The `claude` command is not on PATH, so the MCP server is not "
            "registered for Claude Code. Run:\n    "
            + " ".join(shlex.quote(part) for part in commands[-1])
        )
        return
    out.say("remove" if remove else "register", f"{SERVER} in Claude Code (user scope)")
    if out.dry_run:
        return
    for command in commands:
        result = subprocess.run(command, capture_output=True, text=True)
        # `remove` fails when the server is not there, and that is fine.
        if result.returncode != 0 and command is not drop:
            raise InstallError(f"`claude mcp add-json` failed: {result.stderr.strip()}")


def install_tool(
    tool: str, scope: str, project: Path, mcp: bool, out: Reporter
) -> None:
    root = tool_root(tool, scope, project)
    print(f"{tool} -> {root}")
    for rel in source_files(tool):
        copy_file(PACKAGE / rel, root / rel.relative_to(f".{tool}"), out)
    if tool == "kiro" and scope == "user":
        out.warn(
            "The Kiro workflow recipe reads itself from `.kiro/workflows/` in the "
            "workspace to add parallel analyst branches. For runs with more than "
            "one analyst group, install it in the project too."
        )
    if not mcp:
        return
    if tool == "kiro":
        merge_mcp_file(root / "settings" / "mcp.json", out)
    elif scope == "project":
        merge_mcp_file(project / ".mcp.json", out)
    else:
        claude_user_mcp(out)


def uninstall_tool(
    tool: str, scope: str, project: Path, mcp: bool, out: Reporter
) -> None:
    root = tool_root(tool, scope, project)
    print(f"{tool} <- {root}")
    for rel in source_files(tool):
        dest = root / rel.relative_to(f".{tool}")
        if dest.exists():
            out.say("remove", dest)
            if not out.dry_run:
                dest.unlink()
    if not out.dry_run:
        # Remove the folders that this script emptied, from the deepest up.
        # Only folders that held its files: other folders are not its own.
        folders = {
            parent
            for rel in source_files(tool)
            for parent in (root / rel.relative_to(f".{tool}")).parents
            if root in parent.parents
        }
        for folder in sorted(folders, key=lambda p: -len(p.parts)):
            if folder.is_dir() and not any(folder.iterdir()):
                folder.rmdir()
    if not mcp:
        return
    if tool == "kiro":
        path = root / "settings" / "mcp.json"
        if path.exists():
            merge_mcp_file(path, out, remove=True)
    elif scope == "project":
        path = project / ".mcp.json"
        if path.exists():
            merge_mcp_file(path, out, remove=True)
    else:
        claude_user_mcp(out, remove=True)


def check_prerequisites(tools: list[str], install_style: bool, out: Reporter) -> None:
    if shutil.which("uv") is None:
        out.warn(
            "`uv` is not on PATH. The MCP server starts with `uv run`. See https://docs.astral.sh/uv/"
        )
    if shutil.which("dot") is None:
        out.warn(
            "Graphviz (`dot`) is not on PATH. `sys_render` needs it to draw diagrams."
        )
    for tool in tools:
        skill = Path.home() / f".{tool}" / "skills" / STYLE_SKILL
        if (skill / "SKILL.md").is_file():
            continue
        if install_style:
            if shutil.which("git") is None:
                raise InstallError("`git` is needed to install the writing skill.")
            out.say("clone", f"{STYLE_SKILL_REPO} -> {skill}")
            if not out.dry_run:
                skill.parent.mkdir(parents=True, exist_ok=True)
                result = subprocess.run(
                    ["git", "clone", "--depth", "1", STYLE_SKILL_REPO, str(skill)],
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    raise InstallError(f"git clone failed: {result.stderr.strip()}")
        else:
            out.warn(
                f"The {STYLE_SKILL} writing skill is missing from {skill.parent}. "
                "The agents need it. Run this script with --install-style-skill, or:\n"
                f"    git clone {STYLE_SKILL_REPO} {skill}"
            )


def parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install the threat-composer agents, skill, workflow and MCP server."
    )
    parser.add_argument(
        "--tool", choices=["claude", "kiro", "all"], default="all",
        help="what to install (default: all)",
    )  # fmt: skip
    parser.add_argument(
        "--scope", choices=["project", "user"], default="project",
        help="project: <project>/.claude and .kiro. user: ~/.claude and ~/.kiro (default: project)",
    )  # fmt: skip
    parser.add_argument(
        "--project", type=Path, default=Path.cwd(),
        help="the project for --scope project (default: the current directory)",
    )  # fmt: skip
    parser.add_argument(
        "--no-mcp", action="store_true", help="do not register the MCP server"
    )
    parser.add_argument(
        "--install-style-skill", action="store_true",
        help=f"clone the {STYLE_SKILL} writing skill if it is missing",
    )  # fmt: skip
    parser.add_argument(
        "--uninstall", action="store_true", help="remove what this script installs"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="show the changes and write nothing"
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    project = args.project.expanduser().resolve()
    tools = ["claude", "kiro"] if args.tool == "all" else [args.tool]
    out = Reporter(args.dry_run)
    try:
        if args.scope == "project":
            if not project.is_dir():
                raise InstallError(f"{project} is not a directory.")
            if project == PACKAGE:
                raise InstallError(
                    "The project is this package, which already has these files."
                )
        elif Path.home() == PACKAGE:
            raise InstallError("The home directory is this package.")
        for tool in tools:
            if args.uninstall:
                uninstall_tool(tool, args.scope, project, not args.no_mcp, out)
            else:
                install_tool(tool, args.scope, project, not args.no_mcp, out)
        if not args.uninstall:
            check_prerequisites(tools, args.install_style_skill, out)
    except InstallError as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    for text in out.warnings:
        print(f"warning: {text}", file=sys.stderr)
    if not args.dry_run and not args.uninstall:
        print("Done. Start a new Claude Code or Kiro session to load the agents.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
