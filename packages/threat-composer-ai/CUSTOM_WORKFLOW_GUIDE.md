# Custom Workflow Guide

This guide explains how to create and use custom threat modeling workflows with threat-composer-ai.

## Overview

The threat-composer-ai CLI now supports multiple workflows through the `--workflow` parameter. You can select between different workflow implementations or create your own.

## Using Custom Workflows

### Command Line Usage

```bash
# Use the baseline workflow (default)
threat-composer-ai-cli /path/to/project --output-dir ./docs/threat-model

# Use a custom workflow
threat-composer-ai-cli /path/to/project --output-dir ./docs/threat-model --workflow custom

# List available workflows
threat-composer-ai-cli --help  # Shows available workflow choices
```

## Available Workflows

### 1. Baseline Workflow (default)
- **Name**: `baseline`
- **Description**: Comprehensive threat modeling with full STRIDE analysis and diagram generation
- **Workflow**: Code Analysis → System Modeling → STRIDE Analysis → Threat Identification → Mitigation Planning → Quality Assessment → Threat Composer Output
- **Agents**: application_info, architecture, architecture_diagram, dataflow, dataflow_diagram, threats, mitigations, threat_model
- **Best for**: Complete, thorough threat modeling with visual diagrams

### 2. Custom Workflow
- **Name**: `custom`
- **Description**: Simplified workflow without diagram generation for faster execution
- **Workflow**: Code Analysis → Architecture → Threats → Mitigations → Output
- **Agents**: application_info, architecture, threats, mitigations, threat_model
- **Best for**: Quick threat assessments, iterative development, CI/CD pipelines

## Creating Your Own Workflow

### Step 1: Create Workflow File

Create a new file in `src/threat_composer_ai/workflows/` (e.g., `my_workflow.py`):

```python
"""My Custom Threat Modeling Workflow"""

from strands.multiagent import GraphBuilder
from strands.session.file_session_manager import FileSessionManager

from ..agents import (
    create_application_info_agent,
    create_architecture_agent,
    create_threats_agent,
    create_mitigations_agent,
    create_threat_model_agent,
)
from ..config import AppConfig
from ..logging import clear_agent_context, log_success


def create_my_workflow(
    config: AppConfig | None = None,
    session_manager: FileSessionManager | None = None,
    previous_session_path: str | None = None,
):
    """Create my custom workflow."""
    
    # Create agents you need
    application_info = create_application_info_agent(config, previous_session_path)
    architecture = create_architecture_agent(config, previous_session_path)
    threats = create_threats_agent(config, previous_session_path)
    mitigations = create_mitigations_agent(config, previous_session_path)
    threat_model = create_threat_model_agent(config, previous_session_path)

    # Build workflow graph
    builder = GraphBuilder()
    
    # Add nodes
    builder.add_node(application_info, "application_info")
    builder.add_node(architecture, "architecture")
    builder.add_node(threats, "threats")
    builder.add_node(mitigations, "mitigations")
    builder.add_node(threat_model, "threat_model")

    # Define workflow edges (execution order)
    builder.add_edge("application_info", "architecture")
    builder.add_edge("architecture", "threats")
    builder.add_edge("threats", "mitigations")
    builder.add_edge("mitigations", "threat_model")

    # Set entry point
    builder.set_entry_point("application_info")
    builder.set_session_manager(session_manager)

    # Configure timeouts
    if config:
        builder.set_execution_timeout(config.execution_timeout)
        builder.set_node_timeout(config.node_timeout)
    else:
        builder.set_execution_timeout(2400.0)
        builder.set_node_timeout(1200.0)

    builder.reset_on_revisit(True)
    
    graph = builder.build()
    clear_agent_context()
    log_success("My custom workflow created successfully")
    
    return graph
```

### Step 2: Register Workflow

1. Update `src/threat_composer_ai/workflows/__init__.py`:

```python
from .baseline_threat_modeling import create_baseline_threat_modeling_workflow
from .custom_threat_modeling import create_custom_threat_modeling_workflow
from .my_workflow import create_my_workflow

__all__ = [
    "create_baseline_threat_modeling_workflow",
    "create_custom_threat_modeling_workflow",
    "create_my_workflow",
]
```

2. Update `src/threat_composer_ai/core/runner.py`:

```python
# Add import
from ..workflows.my_workflow import create_my_workflow

# Update WORKFLOWS dict in WorkflowRunner class
WORKFLOWS = {
    "baseline": create_baseline_threat_modeling_workflow,
    "custom": create_custom_threat_modeling_workflow,
    "my-workflow": create_my_workflow,  # Add your workflow
}
```

3. Update CLI choices in `src/threat_composer_ai/cli/main.py`:

```python
@click.option(
    "--workflow",
    type=click.Choice(["baseline", "custom", "my-workflow"], case_sensitive=False),
    default="baseline",
    help="Workflow to use for threat modeling (default: baseline)",
)
```

### Step 3: Use Your Workflow

```bash
threat-composer-ai-cli /path/to/project --output-dir ./docs/threat-model --workflow my-workflow
```

## Available Agents

You can mix and match these agents in your custom workflow:

- **create_application_info_agent**: Gathers basic application context
- **create_architecture_agent**: Analyzes system architecture and components
- **create_architecture_diagram_agent**: Generates visual architecture diagrams
- **create_dataflow_agent**: Identifies data flows and trust boundaries
- **create_dataflow_diagram_agent**: Creates data flow diagrams
- **create_threats_agent**: Performs STRIDE analysis and threat identification
- **create_mitigations_agent**: Develops mitigation strategies
- **create_threat_model_agent**: Synthesizes results into Threat Composer schema

## Workflow Design Tips

1. **Linear vs Parallel**: Use `add_edge()` for sequential execution, or add multiple edges from one node for parallel execution
2. **Conditional Execution**: Use `create_dependency_condition()` (see baseline_threat_modeling.py) for complex dependencies
3. **Skip Diagrams**: Omit diagram agents for faster execution in CI/CD
4. **Focus on Specific Threats**: Create workflows that only run specific analysis agents
5. **Incremental Analysis**: Design workflows that can resume from previous sessions using `previous_session_path`

## Example: CI/CD Optimized Workflow

```python
def create_cicd_workflow(config, session_manager, previous_session_path):
    """Fast workflow for CI/CD pipelines - no diagrams, focused on threats."""
    
    application_info = create_application_info_agent(config, previous_session_path)
    threats = create_threats_agent(config, previous_session_path)
    threat_model = create_threat_model_agent(config, previous_session_path)

    builder = GraphBuilder()
    builder.add_node(application_info, "application_info")
    builder.add_node(threats, "threats")
    builder.add_node(threat_model, "threat_model")
    
    builder.add_edge("application_info", "threats")
    builder.add_edge("threats", "threat_model")
    
    builder.set_entry_point("application_info")
    builder.set_session_manager(session_manager)
    builder.set_execution_timeout(600.0)  # 10 minutes
    builder.set_node_timeout(300.0)  # 5 minutes per node
    
    return builder.build()
```

## Testing Your Workflow

```bash
# Test with verbose output
threat-composer-ai-cli /path/to/project \
  --output-dir ./test-output \
  --workflow my-workflow \
  --verbose

# Check the output
ls -la ./test-output/
cat ./test-output/threat_model.json
```

## Troubleshooting

- **Workflow not found**: Ensure you've registered it in `runner.py` WORKFLOWS dict
- **Import errors**: Check that `__init__.py` exports your workflow function
- **Agent failures**: Review logs in output directory for agent-specific errors
- **Timeout issues**: Adjust `execution_timeout` and `node_timeout` in your workflow

## Next Steps

- Review `baseline_threat_modeling.py` for advanced patterns
- Explore agent implementations in `src/threat_composer_ai/agents/`
- Check Strands documentation for graph building features
- Customize agent prompts for your organization's needs
