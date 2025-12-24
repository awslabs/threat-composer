# Threat Composer AI - CLI & MCP Server

An AI-powered threat modeling assistant that helps you get started quickly by analyzing your codebase and generating a starter threat model, so you never face a blank page. Use from your AI coding assistance via the MCP Server, or directly via the CLI.

![Status: Experimental](https://img.shields.io/badge/Status-Experimental-orange)

## Overview

Threat Composer AI is designed to **help humans, not replace them**. It provides two interfaces to jumpstart your threat modeling process:

1. **CLI Tool** (`threat-composer-ai-cli`) - Run directly from your terminal
2. **MCP Server** (`threat-composer-ai-mcp`) - Use from AI coding assistants like Kiro, Cline, or Claude Desktop

Both interfaces use the same underlying workflow and produce identical outputs - the MCP server wraps the CLI functionality and exposes it through the Model Context Protocol.

### The Human-AI Partnership

The AI-generated threat model is a **starting point, not the final product**. Your expertise, organizational context, and iterative refinement are essential to create a meaningful threat model. The AI helps you:

- **Avoid the blank page problem** - Start with a structured foundation rather than from scratch
- **Identify initial threats** - Get a baseline set of threats to review, refine, and expand
- **Understand your system** - See an AI's interpretation of your architecture and data flows
- **Save time on initial analysis** - Focus your expertise on validation, refinement, and adding organizational context

**Your involvement is crucial**: Review the generated threats, validate assumptions, add company-specific context, incorporate compliance requirements, and iterate on the model to reflect your organization's unique security posture.

### Extensibility Through Forking

The threat modeling workflow provided by these tools can serve as a **foundation for customization**. If you need to adapt the workflow to your organization's specific needs, you can fork the repository and modify:

- **Agent workflow logic** - Adjust the multi-agent architecture to match your threat modeling methodology
- **Organizational context** - Integrate company-specific threat libraries, compliance requirements, and security standards
- **Analysis depth and focus** - Customize what the agents analyze and how they prioritize findings
- **Custom agents** - Add specialized agents for industry-specific threats or organizational policies

**Note**: Customization requires forking and modifying the source code - the tools are not configurable through configuration files alone. The provided workflow follows established threat modeling methodologies and produces outputs compatible with the Threat Composer schema.

### 💡 Best Experience with VS Code Extension

For the best experience when using the CLI from VS Code or Kiro terminal, or when using AI assistants via MCP, we recommend installing the [AWS Toolkit extension](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode) which includes the Threat Composer VS Code extension. This provides:

- **Visual Editing**: View and edit generated `.tc.json` files with full visual editing capabilities
- **Integrated Workflow**: Seamlessly work with AI-generated threat models in your IDE
- **Rich UI**: Access all Threat Composer features including diagrams, insights, and threat grammar
- **Works in VS Code and Kiro**: The extension is supported in both VS Code and Kiro environments

Without the extension, you can still view and edit the generated JSON files as text, but you'll miss out on the rich visual editing experience.

## Installation

### Prerequisites

- Python 3.10 or higher
- UV package manager
- AWS credentials configured (for CLI tool and MCP workflow execution - Bedrock access required)
- Graphviz (for diagram generation)

### ⚠️ Cost Considerations

Threat Composer AI uses **Amazon Bedrock** for AI inference, which incurs costs based on token usage. By default, the tool uses:

- **Model**: Claude Sonnet 4 (`global.anthropic.claude-sonnet-4-20250514-v1:0`)
- **Service Tier**: Standard on-demand (default)

**Estimated costs** vary based on codebase size and complexity. A typical threat model generation may use 500,000-1,500,000+ tokens depending on the project.

For current pricing information, see:
- [Amazon Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [Bedrock Service Tiers & Inference Types](https://docs.aws.amazon.com/bedrock/latest/userguide/service-tiers-inference.html)

**Tips to manage costs**:
- Start with smaller codebases to understand token usage patterns
- Use `--verbose` to monitor workflow progress
- Consider using cross-region inference (global model IDs) for better availability
- Review the `run-metadata.json` in output for session details

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

After installation, verify Graphviz is available:
```bash
dot -V
```

For more information, see: https://graphviz.org/download/

### Install with uv tool install (Recommended)

Install the tools for repeated use - this is the recommended approach:

```bash
# Install the package (provides both CLI and MCP server)
uv tool install --from "git+https://github.com/awslabs/threat-composer.git#subdirectory=packages/threat-composer-ai" threat-composer-ai

threat-composer-ai-cli /path/to/codebase
```

### Quick Start with uvx

Use `uvx` to run tools directly without persistent installation:

```bash
# Run the CLI tool directly
uvx --from "git+https://github.com/awslabs/threat-composer.git#subdirectory=packages/threat-composer-ai" threat-composer-ai-cli /path/to/codebase
```

### Key Capabilities

Both the CLI and MCP server provide the same core capabilities:

- **Automated Code Analysis**: Deep analysis of codebases to understand application architecture and data flows
- **Multi-Agent Architecture**: 8 specialized agents working together to perform different aspects of threat modeling
- **STRIDE Analysis**: Systematic application of STRIDE methodology for threat identification
- **Structured Output**: Generates complete Threat Composer JSON schemas with proper validation
- **Comprehensive Documentation**: Creates detailed markdown documentation alongside structured data

### Agent-Based System

The workflow uses 8 specialized agents orchestrated through a Strands Graph:

1. **Application Info Agent** - Analyzes codebase to determine application name, description, and key characteristics
2. **Architecture Agent** - Identifies system components, technologies, deployment patterns, and security-relevant features
3. **Architecture Diagram Agent** - Creates visual representations of system architecture
4. **Dataflow Agent** - Maps data flows, identifies trust boundaries, and catalogs system elements (actors, processes, data stores)
5. **Dataflow Diagram Agent** - Creates visual representations of data flows
6. **Threats Agent** - Applies STRIDE-per-element analysis to identify security threats
7. **Mitigations Agent** - Develops comprehensive mitigation strategies from a defender perspective
8. **Threat Model Agent** - Assembles all components into final Threat Composer schema

## CLI Tool Usage

### CLI Examples

```bash
# If installed with uv tool install
threat-composer-ai-cli /path/to/codebase

# View command line arguments supported
threat-composer-ai-cli --help

# Custom output directory and AWS configuration
threat-composer-ai-cli /path/to/codebase \
  --output-dir ./analysis-results \
  --aws-profile pineapple
  --aws-region us-west-2 \
  --aws-model-id global.anthropic.claude-sonnet-4-5-20250929-v1:0 \

# Basic usage with uvx
uvx --from "git+https://github.com/awslabs/threat-composer.git#subdirectory=packages/threat-composer-ai" threat-composer-ai-cli /path/to/codebase
```

## MCP Server Usage

The MCP server wraps the CLI workflow and exposes it through the Model Context Protocol, allowing AI coding assistants to run threat modeling workflows on your behalf.

### MCP Client Configuration

Configure your MCP client to use the threat-composer-ai-mcp server. Below are examples for common clients.

#### Using Local Installation (Recommended)

If you've installed the package with `uv tool install`, use the local executable directly:

```json
{
  "mcpServers": {
    "threat-composer-ai": {
      "command": "threat-composer-ai-mcp"
    }
  }
}
```

#### Using uvx (No Installation Required)

Alternatively, use `uvx` to run the server without a persistent installation:

```json
{
  "mcpServers": {
    "threat-composer-ai": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/awslabs/threat-composer.git#subdirectory=packages/threat-composer-ai",
        "threat-composer-ai-mcp"
      ]
    }
  }
}
```

#### Configuration with AWS Profile and Region

Add environment variables to specify your AWS profile and region:

```json
{
  "mcpServers": {
    "threat-composer-ai": {
      "command": "threat-composer-ai-mcp",
      "env": {
        "AWS_PROFILE": "your-profile-name",
        "AWS_REGION": "us-west-2"
      }
    }
  }
}
```

Configuration file locations:

- **Kiro**: `.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json` (global)
- **Cline**: VS Code settings or `.cline/mcp.json`
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

### Using the MCP Server

Work with your AI coding assistant with a prompt like _"create a threat model for this code project using tools"_.

### MCP Tools Reference

The MCP server provides five tools for workflow management and schema validation:

| Tool Name | Purpose |
|-----------|---------|
| `threat_modeling_start_workflow` | Start a new AI threat modeling workflow or re-run from a previous session |
| `threat_modeling_get_workflow_logs` | Monitor running or completed workflows by retrieving log content |
| `threat_modeling_list_workflow_sessions` | Discover and list all available workflow sessions in a directory |
| `threat_modeling_validate_tc_schema` | Validate JSON data against the Threat Composer v1 schema |
| `threat_modeling_get_tc_schema` | Retrieve the complete Threat Composer v1 schema JSON definition |

## Output Structure

Both the CLI and MCP workflows generate structured outputs in JSON format following the Threat Composer v1 schema:

```
output/
├── threatmodel.tc.json              # Final assembled threat model
├── components/                      # Generated threat model components
│   ├── applicationInfo.tc.json
│   ├── architectureDescription.tc.json
│   ├── architectureDiagram.tc.json
│   ├── dataflowDescription.tc.json
│   ├── dataflowDiagram.tc.json
│   ├── threats.tc.json
│   └── mitigations.tc.json
├── logs/                            # Workflow execution logs
│   └── workflow_YYYYMMDD_HHMMSS.log
├── config/                          # Runtime configuration
│   └── run-metadata.json
└── session_YYYYMMDD_HHMMSS_xxxxx/  # Session data
    ├── session.json
    ├── agents/                      # Individual agent outputs
    └── multi_agents/                # Multi-agent outputs
```

### Output Content

Each component file contains:

- **Structured Data**: JSON objects following Threat Composer schema
- **Assumptions**: Documented assumptions made during analysis with agent attribution
- **Metadata**: Additional context and supporting information
- **UUIDs**: Proper UUID generation for all entities and relationships

## Architecture

### CLI Workflow Execution

```
Application Info → Architecture → Dataflow → Threats → Mitigations
                      ↓              ↓
                Architecture    Dataflow
                 Diagram        Diagram
                      ↓              ↓
                      └──────────────┴→ Threat Model Assembly
```

The workflow uses intelligent dependency management to ensure agents execute in the correct sequence and all prerequisites are met before final assembly.

## Troubleshooting

### CLI Issues

#### AWS Credential Issues
- Ensure AWS credentials are configured: `aws configure`
- Verify Bedrock access in your region
- Use `--skip-validation` for testing (not recommended for production)

#### Timeout Issues
- Increase `--execution-timeout` for large codebases
- Increase `--node-timeout` for complex analysis
- Monitor progress with `--verbose` flag

### MCP Server Issues

#### Workflow Start Failures
- Verify AWS credentials are configured
- Check Bedrock access permissions
- Ensure directory path exists and is accessible
- Review error message in returned JSON

#### Connection Issues
- Verify MCP client configuration
- Check server startup logs
- Ensure proper command and arguments in MCP client config

#### Session Not Found
- Use `threat_modeling_list_workflow_sessions` to find available sessions
- Verify `search_directory` path is correct
- Check session ID format

### Common Issues

#### Installation Issues
- Ensure `uv` is installed and available
- Check network connectivity for git+ssh URLs
- Verify SSH key access to GitLab

#### Permission Issues
- Ensure output directory is writable
- Check file permissions
- Verify disk space availability

#### Concurrent Workflow Error
- Only one workflow can run at a time
- Wait for current workflow to complete
- Check for stale lock files if workflow was interrupted

## Telemetry

Threat Composer AI supports OpenTelemetry tracing to help you observe and debug workflow execution. When enabled, traces are exported to an OTLP-compatible endpoint (default: `localhost:4318`).

### Enabling Telemetry

Use the `--enable-telemetry` flag or set the environment variable:

```bash
# CLI flag
threat-composer-ai-cli /path/to/codebase --enable-telemetry

# Environment variable
export THREAT_COMPOSER_ENABLE_TELEMETRY=true
threat-composer-ai-cli /path/to/codebase
```

For MCP server configuration, add the environment variable:

```json
{
  "mcpServers": {
    "threat-composer-ai": {
      "command": "threat-composer-ai-mcp",
      "env": {
        "THREAT_COMPOSER_ENABLE_TELEMETRY": "true"
      }
    }
  }
}
```

### Using Jaeger for Trace Visualization

[Jaeger](https://www.jaegertracing.io/) is an open-source distributed tracing platform that works well with Threat Composer AI. It provides a web UI for visualizing traces, analyzing latency, and debugging workflow execution.

To get started with Jaeger, see the [Jaeger Getting Started guide](https://www.jaegertracing.io/docs/latest/getting-started/). Ensure the OTLP endpoint is available on port 4318 and the UI on port 16686.

Once Jaeger is running, enable telemetry and look for the "threat-composer-ai" service in the Jaeger UI to view workflow traces.

### Local Development Setup

```bash
# Navigate to the package directory
cd packages/threat-composer-ai

# Install dependencies
uv sync

# Run tools locally
uv run threat-composer-ai-cli /path/to/codebase
uv run threat-composer-ai-mcp
```

## Support

For issues and questions:

- **GitHub Issues**: [threat-composer/issues](https://github.com/awslabs/threat-composer/issues)
- **Discussions**: [threat-composer/discussions](https://github.com/awslabs/threat-composer/discussions)

## Related Resources

- [Threat Composer Web Application](./WEB-APP.md)
- [Threat Composer VS Code Extension](./VSCODE-EXTENSION.md)
- [Threat Composer Browser Extension](./BROWSER-EXTENSION.md)
- [Development Guide](./DEVELOPMENT.md)
