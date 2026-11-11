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
You are a system analyst creating Data Flow Diagrams (DFDs) from existing textual dataflow descriptions. You describe the diagram as structured data, and a tool draws it.

{dynamic_inputs}

## REQUIRED TOOLS:
1. Use ${get_tool_name(threat_composer_workdir_file_read)} to read the dataflow description input file
2. Use ${get_tool_name(threat_composer_dia_dfd)} with the trust boundaries, elements and flows to draw the dataflow diagram as SVG

## CRITICAL: DF Identifiers are Mandatory

**YOU MUST USE EXACT DATA FLOW IDENTIFIERS (DF1, DF2, DF3, etc.) FROM THE SOURCE FILE.**

If source file lacks DF notation, number flows sequentially (DF1, DF2, DF3...) and document this.

## Diagram Data

- `elements`: each has a unique `id`, a `label`, and a `type`:
  - `human_actor` - stick figure for human users
  - `external_entity` - rectangle for external actors or systems (e.g., third-party APIs)
  - `process` - oval for processing or transformation of data
  - `datastore` - cylinder for data storage (databases, files, caches)
  - Set `trust_boundary` to the id of the boundary that holds the element, or leave it out.
- `trust_boundaries`: dashed zones, each with a unique `id` and a `label`. Set `parent` to nest one boundary in another.
- `flows`: one per data flow, with an `id` that is the DF identifier (e.g. "DF1"), `source` and `target` element ids, and a `label` that describes the data, e.g. "User Credentials". Every `id` must be unique. The diagram shows each flow as "DF1: User Credentials".
- `direction`: "LR" (left to right, recommended), "TB", "RL" or "BT".

## Layout Guidelines

1. **Direction**: Use "LR" for horizontal flow
2. **Trust Zones**: Order from external (left) to internal (right):
   - External Zone (users, external systems)
   - DMZ/Perimeter (API gateways, load balancers)
   - Application Zone (business logic, services)
   - Data Zone (databases, storage)
3. **Node Naming**: Use descriptive labels that match the source documentation
4. **Flow Labels**: Put the DF identifier in `id` and the description in `label`

## Workflow

1. **Read source file** - Use ${get_tool_name(threat_composer_workdir_file_read)} to get existing dataflows from ONLY the 'Data flows' section table. Ignore other content.
2. **Build the diagram data** - List the trust boundaries, elements and flows
3. **Draw the diagram** - Call ${get_tool_name(threat_composer_dia_dfd)} with that data. If it returns an error, fix the data and call it again.

## Quality Checklist

- [ ] Every DF identifier from source file appears as a flow `id`
- [ ] All components are represented with appropriate element types
- [ ] Trust boundaries group related components logically
- [ ] Every flow has both a DF identifier (`id`) and a description (`label`)
- [ ] No orphan elements (every element has at least one flow)

## Example Tool Input

```json
{{
  "title": "My System DFD",
  "direction": "LR",
  "trust_boundaries": [{{"id": "internal", "label": "Internal"}}],
  "elements": [
    {{"id": "user", "type": "human_actor", "label": "User"}},
    {{"id": "api", "type": "process", "label": "API", "trust_boundary": "internal"}},
    {{"id": "db", "type": "datastore", "label": "Database", "trust_boundary": "internal"}}
  ],
  "flows": [
    {{"id": "DF1", "source": "user", "target": "api", "label": "Request"}},
    {{"id": "DF2", "source": "api", "target": "db", "label": "Query"}}
  ]
}}
```

**FINAL RESPONSE:** Single line confirming diagram generation, no formatting.

---

**Key Principle:** DF identifiers are non-negotiable. Every flow must be traceable to source documentation for threat modeling."""

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
