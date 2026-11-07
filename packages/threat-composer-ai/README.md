# Threat Composer AI

![Status: Experimental](https://img.shields.io/badge/Status-Experimental-orange)

AI-powered threat modeling tools including a CLI for automated threat model generation and an MCP server for AI assistant integration.

> **For user documentation, installation guides, and usage examples, see [docs/AI-CLI-MCP.md](../../docs/AI-CLI-MCP.md)**

## Package Overview

This package provides:
- **CLI Tool** (`threat-composer-ai-cli`) - Automated threat modeling from source code analysis
- **MCP Server** (`threat-composer-ai-mcp`) - Model Context Protocol server for AI assistants

## Quick Install

```bash
# Install with uv
uv tool install --from "git+https://github.com/awslabs/threat-composer.git#subdirectory=packages/threat-composer-ai" threat-composer-ai

# Use the tools
threat-composer-ai-cli /path/to/codebase
threat-composer-ai-mcp
```

## Local Development Setup

### Prerequisites
- Python 3.10 or higher
- UV package manager
- AWS credentials (for Bedrock access)
- Graphviz (for diagram generation)
- The asd-ste100 writing skill (see below)

**⚠️ Cost Note**: This tool uses Amazon Bedrock for AI inference, which incurs costs. By default, it uses Claude Sonnet 4 with standard on-demand pricing. See [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/) for details.

#### Installing Graphviz

Graphviz is required for generating Architecture and Data Flow Diagrams. Install it using your system's package manager:

```bash
# macOS (Homebrew)
brew install graphviz

# Ubuntu/Debian
sudo apt-get install graphviz

# Fedora/RHEL
sudo dnf install graphviz
```

After installation, verify Graphviz is available by running:
```bash
dot -V
```

For more information, see: https://graphviz.org/download/

#### Installing the asd-ste100 writing skill

The agents write the text of the threat model with the rules of ASD-STE100 Simplified Technical English. The rules come from the [asd-ste100 skill](https://github.com/danyuchn/asd-ste100-skill). The CLI, the MCP workflow and the Claude Code `/threat-model` skill all use it, and they do not start without it.

Install it in the default location:

```bash
git clone https://github.com/danyuchn/asd-ste100-skill ~/.claude/skills/asd-ste100
```

The tools look for the skill in this order:

1. `THREAT_COMPOSER_AI_STYLE_SKILL`, if you set it to the skill directory or to its `SKILL.md`.
2. `~/.claude/skills/asd-ste100/SKILL.md`.
3. A copy that your Claude organization synced to `~/.claude/skills/synced/`.

To run without the writing rules, set `THREAT_COMPOSER_AI_STYLE_SKILL=none`. Each run records the skill path, version and file hash in `config/run-metadata.json`.

### Setup

```bash
# Navigate to package directory
cd packages/threat-composer-ai

# Install dependencies
uv sync

# Run tools locally
uv run threat-composer-ai-cli /path/to/codebase
uv run threat-composer-ai-mcp
```

## MCP builder tools

The `tm_*` and `sys_*` MCP tools build a threat model one item at a time (see `src/threat_composer_ai/mcp/builder_tools.py`). Set `THREAT_COMPOSER_AI_MCP_TOOLS=builder` to expose only these tools. Every write validates the whole document and changes nothing if it would become invalid.

| Tool | Purpose |
| --- | --- |
| `tm_get` | Compact view of the model. Each threat shows its `elements` (the tags that are system model ids) apart from its other `tags`. Filter with `priority`, `element`, `threat_status` and `mitigation_status`. A threat filter also limits mitigations to those linked to a selected threat. |
| `tm_add_tags` | Add tags to threats, mitigations or assumptions, for example `task:3.2`. Changes only `tags`; content, status, metadata and links stay the same. A tag the item already has is not added again. |
| `tm_remove_tags` | Remove tags from threats, mitigations or assumptions. Changes only `tags`. A tag the item does not have is ignored. |

Both take `model`, `kind` (`threat`, `mitigation` or `assumption`), `ids` and `tags`, and return `{"updated": n}`. Each tag is 1 to 30 characters after whitespace is stripped. If an id is unknown or a tag is invalid, nothing changes. Use these instead of `tm_update_mitigation` to change tags: `tm_update_mitigation` replaces the whole mitigation, including its threat links.

## Claude Code and Kiro agents

The agents, the `threat-model` skill and the Kiro workflow recipe come from one source in `agent-src/`. Do not edit the generated files in `.claude/` and `.kiro/`. Change `agent-src/`, then run:

```bash
uv run python scripts/sync_agent_configs.py          # write .claude/ and .kiro/
uv run python scripts/sync_agent_configs.py --check  # exit 1 if they are out of date
```

A test runs the check, so a stale file fails the test suite. The script writes:

| Output | Claude Code | Kiro |
| --- | --- | --- |
| Agents | `.claude/agents/*.md` | `.kiro/agents/*.md` |
| `threat-model` skill | `.claude/skills/threat-model/` | `.kiro/skills/threat-model/` |
| Workflow recipe | none | `.kiro/workflows/threat-model.workflow.json` |
| MCP server | `.mcp.json` (the source) | `.kiro/settings/mcp.json` |

In Kiro, install the asd-ste100 skill in `~/.kiro/skills/asd-ste100`. To run the recipe, turn on workflows, then run `/workflow run threat-model` in Kiro CLI or `/workflow-run` in Kiro IDE. Before the first run, ask Kiro to run `validate_workflow` on the recipe. The run pauses twice, to confirm the system model and to review the threats. Answer in the paused step's session.

## Project Structure

```
src/threat_composer_ai/
├── __init__.py                      # Package initialization
├── __main__.py                      # CLI entry point
├── mcp_server.py                    # MCP server entry point
├── agents/                          # Specialized threat modeling agents
│   ├── application_info.py
│   ├── architecture.py
│   ├── dataflow.py
│   ├── threats.py
│   ├── mitigations.py
│   └── threat_model.py
├── mcp/                             # MCP server implementation
│   ├── server.py
│   └── tools.py
├── models/                          # Pydantic models
│   └── threat_composer_v1.py
├── tools/                           # Agent tools
├── workflows/                       # Workflow orchestration
└── utils/                           # Utilities
```

## Testing

```bash
# Run tests
cd packages/threat-composer-ai
uv run pytest

# Run with coverage
uv run pytest --cov=threat_composer_ai

# Test MCP server
uv run python test_mcp_server.py
```

## Development Commands

```bash
# Format code
uv run ruff format .

# Lint code
uv run ruff check .

# Type checking
uv run mypy src/

# Run CLI with verbose logging
uv run threat-composer-ai-cli /path/to/code --verbose

# Run MCP server with debug logging
PYTHONPATH=src uv run python -m threat_composer_ai.mcp_server
```

## Contributing

When contributing to this package:

1. Follow the established agent patterns
2. Maintain Threat Composer schema compatibility
3. Add comprehensive logging
4. Include proper error handling
5. Update documentation in [docs/AI-CLI-MCP.md](../../docs/AI-CLI-MCP.md)
6. Test with various codebase types

## Documentation

- **User Guide**: [docs/AI-CLI-MCP.md](../../docs/AI-CLI-MCP.md)
- **Main README**: [README.md](../../README.md)
- **Development Guide**: [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md)

## License

Licensed under Apache-2.0. See [LICENSE](../../LICENSE) for details.
