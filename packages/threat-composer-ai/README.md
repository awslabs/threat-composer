# Threat Composer AI

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
