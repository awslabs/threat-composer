"""Evaluation harnesses for threat-composer-ai.

Built on strands-agents-evals, which ships from the `eval` extra:

    uv sync --extra eval

quality
    Given one completed run, is the threat model structurally sound and
    recognisably about the codebase that was analysed?

Nothing here is imported by the CLI or the MCP server, so the shipped package does
not require the eval extra to be installed.
"""

from .session import LoadedSession, load_session, resolve_session_dir

__all__ = [
    "LoadedSession",
    "load_session",
    "resolve_session_dir",
]
