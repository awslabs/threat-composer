"""
Architecture Diagram Agent

Parses textual architecture description into a diagram using the diagrams library.
Uses AWS Diagram MCP Server for reference (icons and examples) and a local tool for SVG rendering.
"""

import os

from strands import Agent

from ..config import AppConfig
from ..tools import (
    threat_composer_dia_architecture,
    threat_composer_dia_examples,
    threat_composer_dia_list_icons,
    threat_composer_workdir_file_read,
)
from ..utils import get_tool_name
from .common import (
    any_input_files_changed,
    copy_output_from_previous_session,
    create_agent_model,
    create_cached_system_prompt,
    create_default_callback_handler,
    create_default_conversation_manager,
    create_no_action_system_prompt,
    generate_required_inputs_section,
)

# Agent configuration
AGENT_NAME = "architecture_diagram"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.architecture_description_filename}"
    ]


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""
    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))

    prompt_text = f"""# System Prompt: Architecture Diagram Generator using diagrams library

## Role
You are an expert software architect and technical diagramming specialist. Your task is to convert textual descriptions of software system architectures into clear, professional architecture diagrams using the Python diagrams library.

{dynamic_inputs}

## REQUIRED TOOLS:
1. ${get_tool_name(threat_composer_workdir_file_read)}: Read files from the working directory
2. ${get_tool_name(threat_composer_dia_list_icons)}: Lists available icon classes from the diagrams library (AWS, GCP, Azure, K8s, etc.)
3. ${get_tool_name(threat_composer_dia_examples)}: Gets example Python code showing how to use the diagrams library
4. Use ${get_tool_name(threat_composer_dia_architecture)} with the Python code which will create the architecture diagram as SVG

## Workflow

### Step 1: Read Architecture Description
Use the ${get_tool_name(threat_composer_workdir_file_read)} tool to read the architecture description from the required input file.

### Step 2: Discover Available Icons and Examples
If needed, use ${get_tool_name(threat_composer_dia_list_icons)} to find appropriate icon classes for the components in your architecture.
Use ${get_tool_name(threat_composer_dia_examples)} to see example code patterns if you need reference.

### Step 3: Write Python Code
Based on the architecture description, write Python code using the diagrams library:
- Import necessary node classes from diagrams library (e.g., diagrams.aws.compute, diagrams.aws.database)
- Use Diagram() context manager with appropriate name and direction
- Use Cluster() for logical groupings (VPCs, subnets, trust boundaries)
- Create nodes for each component
- Define edges (>>, <<, -) for connections between components
- Include Edge labels where appropriate for data flows

### Step 4: Render the Diagram
Use the ${get_tool_name(threat_composer_dia_architecture)} tool to execute your Python code and render it as an SVG file.
- Pass the Python code you wrote to the tool
- The tool will execute the code in a restricted namespace and output an SVG file

## Python Code Requirements

Example structure:
```python
from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import EC2, Lambda
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB

with Diagram("Architecture Name", show=False, direction="LR"):
    with Cluster("VPC"):
        lb = ELB("Load Balancer")
        with Cluster("Application Tier"):
            servers = [EC2("web1"), EC2("web2")]
        with Cluster("Database Tier"):
            db = RDS("PostgreSQL")
    lb >> servers >> db
```

## Output Requirements

- Do not provide interim responses or respond with content of the diagram
- The final SVG will be automatically saved to the configured output path
- Your final response must be a single line confirming completion

## Quality Checklist

Before finalizing:
- [ ] All components from the architecture description are included
- [ ] Logical groupings (Clusters) represent the architecture hierarchy
- [ ] Connections between components are properly defined
- [ ] Appropriate node types are used for each component
- [ ] Direction and layout make the diagram readable

FINAL RESPONSE:
1. Your final response must be a single line. No formatting."""

    return create_cached_system_prompt(prompt_text)


def create_architecture_diagram_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Architecture Diagram Agent."""
    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy output from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=[config.architecture_diagram_filename],
                previous_session_path=previous_session_path,
                config=config,
            )

            # Return agent with no-action prompt
            return Agent(
                name=AGENT_NAME,
                model=create_agent_model(
                    AGENT_NAME, config, temperature=0.0, max_tokens=100
                ),
                system_prompt=create_no_action_system_prompt(AGENT_NAME),
                conversation_manager=create_default_conversation_manager(),
                callback_handler=create_default_callback_handler(AGENT_NAME, config),
                tools=[],
            )

    # Get local tools
    current_dir = os.path.dirname(os.path.abspath(__file__))
    tools_dir = os.path.join(current_dir, "..", "tools")

    tools_list = [
        {
            "name": "threat_composer_workdir_file_read",
            "path": os.path.join(tools_dir, "threat_composer_workdir_file_read.py"),
        },
        {
            "name": "threat_composer_dia_list_icons",
            "path": os.path.join(tools_dir, "threat_composer_dia_list_icons.py"),
        },
        {
            "name": "threat_composer_dia_examples",
            "path": os.path.join(tools_dir, "threat_composer_dia_examples.py"),
        },
        {
            "name": "threat_composer_dia_architecture",
            "path": os.path.join(tools_dir, "threat_composer_dia_architecture.py"),
        },
    ]

    return Agent(
        name=AGENT_NAME,
        model=create_agent_model(AGENT_NAME, config, **model_overrides),
        system_prompt=create_system_prompt(config),
        conversation_manager=create_default_conversation_manager(),
        callback_handler=create_default_callback_handler(AGENT_NAME, config),
        tools=tools_list,
    )
