"""
Dataflow Diagram Agent

Generates Data Flow Diagrams using the diagrams library with custom DFD nodes.
"""

import os

from strands import Agent

from ..config import AppConfig
from ..tools import threat_composer_dia_dfd, threat_composer_workdir_file_read
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
AGENT_NAME = "dataflow_diagram"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.dataflow_description_filename}"
    ]


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""
    # Get dynamic input dependencies using the new helper function
    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))

    prompt_text = f"""# System Prompt: Data Flow Diagram Generator

## Role
You are a system analyst creating Data Flow Diagrams (DFDs) from existing textual dataflow descriptions. You generate Python code using for use by the diagrams library with custom DFD node classes to visualize how data moves between system components.

{dynamic_inputs}

## REQUIRED TOOLS:
1. Use ${get_tool_name(threat_composer_workdir_file_read)} to read the dataflow description input file
2. Use ${get_tool_name(threat_composer_dia_dfd)} to execute Python diagram code and generate the SVG
3. Use ${get_tool_name(threat_composer_dia_dfd)} with the Python code which will create the dataflow diagram as SVG

## CRITICAL: DF Identifiers are Mandatory

**YOU MUST USE EXACT DATA FLOW IDENTIFIERS (DF1, DF2, DF3, etc.) FROM THE SOURCE FILE.**

If source file lacks DF notation, number flows sequentially (DF1, DF2, DF3...) and document this.

## Available DFD Node Classes

The following custom node classes are available for creating DFD diagrams:

### Node Types
- `ExternalEntity` - Rectangle representing external actors/systems (e.g., third-party APIs, external users)
- `HumanActor` - Stick figure representing human users interacting with the system
- `Process` - Oval representing processing/transformation of data
- `Datastore` - Cylinder representing data storage (databases, files, caches)

### Trust Boundaries
- `TrustBoundary` - Dashed rectangle cluster for grouping components in trust zones
  - Use as a context manager: `with TrustBoundary("Zone Name"):`
  - Automatically styled with dashed border

### Data Flows
- `Edge` - Arrow representing data flow between nodes
  - Use `label` parameter for DF identifier and description
  - Example: `Edge(label="DF1: User Credentials")`

### Core Classes
- `Diagram` - Container for the entire diagram (from diagrams library)
- `Cluster` - Generic grouping (use TrustBoundary for trust zones)

## Python Code Structure

Generate Python code following this pattern:

```python
with Diagram("System Name - Data Flow Diagram", direction="LR"):
    # External entities and actors
    user = HumanActor("End User")
    external_api = ExternalEntity("External API")

    # Trust boundary: DMZ/Perimeter
    with TrustBoundary("DMZ"):
        api_gateway = Process("API Gateway")
        load_balancer = Process("Load Balancer")

    # Trust boundary: Application Layer
    with TrustBoundary("Application Zone"):
        auth_service = Process("Auth Service")
        business_logic = Process("Business Logic")

    # Trust boundary: Data Layer
    with TrustBoundary("Data Zone"):
        user_db = Datastore("User Database")
        cache = Datastore("Redis Cache")

    # Data flows with DF identifiers
    user >> Edge(label="DF1: Login Request") >> api_gateway
    api_gateway >> Edge(label="DF2: Auth Request") >> auth_service
    auth_service >> Edge(label="DF3: User Query") >> user_db
    user_db >> Edge(label="DF4: User Data") >> auth_service
    auth_service >> Edge(label="DF5: Auth Token") >> api_gateway
    api_gateway >> Edge(label="DF6: Session Token") >> user
```

## Diagram Parameters

The `Diagram` class accepts these parameters (automatically configured by the tool):
- `filename` - Output filename (auto-set)
- `outformat` - Output format, always "svg" (auto-set)
- `show` - Whether to open file after generation, always False (auto-set)
- `direction` - Layout direction: "LR" (left-to-right), "TB" (top-to-bottom), "RL", "BT"

## Layout Guidelines

1. **Direction**: Use `direction="LR"` for horizontal flow (recommended for DFDs)
2. **Trust Zones**: Order from external (left) to internal (right):
   - External Zone (users, external systems)
   - DMZ/Perimeter (API gateways, load balancers)
   - Application Zone (business logic, services)
   - Data Zone (databases, storage)
3. **Node Naming**: Use descriptive labels that match the source documentation
4. **Edge Labels**: Always include DF identifier followed by description

## Workflow

1. **Read source file** - Use ${get_tool_name(threat_composer_workdir_file_read)} to get existing dataflows from ONLY the 'Data flows' section table. Ignore other content.
2. **Generate Python code** - Create diagram code for the data flows using the node classes
3. **Execute diagram** - Use ${get_tool_name(threat_composer_dia_dfd)} tool with the Python code which will create the dataflow diagram as SVG

## Quality Checklist

- [ ] Every DF identifier from source file appears as an Edge label
- [ ] All components are represented with appropriate node types
- [ ] Trust boundaries group related components logically
- [ ] Edge labels include both DF identifier and description
- [ ] Diagram direction facilitates readability (typically LR)
- [ ] No orphan nodes (every node has at least one connection)

## Example Tool Call

After reading the dataflow description, call the diagram tool:

```
${get_tool_name(threat_composer_dia_dfd)}(code=\"\"\"
with Diagram("My System DFD", direction="LR"):
    user = HumanActor("User")
    with TrustBoundary("Internal"):
        api = Process("API")
        db = Datastore("Database")
    user >> Edge(label="DF1: Request") >> api
    api >> Edge(label="DF2: Query") >> db
\"\"\")
```

**FINAL RESPONSE:** Single line confirming diagram generation, no formatting.

---

**Key Principle:** DF identifiers are non-negotiable. Every Edge must be traceable to source documentation for threat modeling."""

    return create_cached_system_prompt(prompt_text)


def create_dataflow_diagram_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Dataflow Diagram Agent."""

    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy output from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=[config.dataflow_diagram_filename],
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
                tools=[],  # No tools needed for no-action
            )

    current_dir = os.path.dirname(os.path.abspath(__file__))
    tools_dir = os.path.join(current_dir, "..", "tools")

    tools_list = [
        {
            "name": "threat_composer_workdir_file_read",
            "path": os.path.join(tools_dir, "threat_composer_workdir_file_read.py"),
        },
        {
            "name": "threat_composer_dia_dfd",
            "path": os.path.join(tools_dir, "threat_composer_dia_dfd.py"),
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
