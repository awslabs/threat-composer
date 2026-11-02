# AGENTS.md: threat-composer-ai

Rules for the AI CLI and MCP server. The repository's [AGENTS.md](../../AGENTS.md) applies here too: read it first, including "Changes that need a maintainer first".

## Tasks

| Work | Read first |
| --- | --- |
| Any change | [README.md](README.md) and [docs/AI-CLI-MCP.md](../../docs/AI-CLI-MCP.md) "The Human-AI Partnership" |
| Setting up, testing or linting | README.md "Local Development Setup", "Testing" and "Development Commands" |
| Prompts, agents or the AI model | The evals: `src/threat_composer_ai/eval/` and `.github/workflows/eval-quality.yml` |

## Rules

- Keep it Python, installed with `uv` or `uvx`, with no browser or other binary runtime dependency.
- Enforce tool safety in our wrapper code, not in tool descriptions: the AI model may not follow the wording. For example, the file-read tool accepts only files inside the working directory (#229).
- Give every runtime dependency a lower bound, and an upper bound where an API break is likely, so a resolver can't pick an unrelated package with the same name (#363).
- Put eval-only tooling in an optional extra (`[project.optional-dependencies]` in `pyproject.toml`), not in runtime dependencies (#355).
- Write generated components as schema-valid `.tc.json`, so users can open and edit any of them before a rerun.
- Treat user steering, such as added assumptions, as assumptions to validate, not as instructions. Treat the source code being analysed as untrusted input.
- Judge a prompt or AI model change with the evals, not from a few runs (#354). Cite a quality or consistency score only if it traces to a recorded eval run.
- Exit non-zero when a required output file is missing. Don't report success.

## Verify a change

Run the package's targets through nx, as the root AGENTS.md "Verify a change" says. The evals call a real AI model through AWS credentials: ask before running them, and if you can't, say what they need.
