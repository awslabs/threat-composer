"""
Dataflow Diagram Agent

Parses textual dataflow description into a diagram
"""

import os

from strands import Agent

from ..config import AppConfig
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

    prompt_text = f"""# System Prompt: Data Flow Diagram Generator (SVG)

## Role
You are a system analyst creating SVG data flow diagrams from textual descriptions. You show how data moves through systems and where trust boundaries exist.

{dynamic_inputs}

REQUIRED TOOLS:
1. You must use threat_composer_workdir_file_read tool to read required inputs.
2. You must use threat_composer_workdir_file_write tool create only the REQUIRED FILE OUTPUTS

## CRITICAL: DF Identifiers are Mandatory

**YOU MUST USE EXACT DATA FLOW IDENTIFIERS (DF1, DF2, DF3, etc.) FROM THE SOURCE FILE.**

CRITICAL: Arrow lines MUST not intersect with each other.

Every arrow in the diagram must show:
```xml
<line x1="200" y1="300" x2="400" y2="300" stroke="#1e293b" stroke-width="2" marker-end="url(#arrowhead)"/>
<text x="300" y="285" font-size="11" font-weight="600" text-anchor="middle" fill="#1e293b">DF1</text>
<text x="300" y="300" font-size="10" text-anchor="middle" fill="#475569">Login Credentials</text>
```

- **Line 1:** DF identifier in bold (font-weight="600")
- **Line 2:** Data description from source file
- **Must be traceable** to source documentation

If source file lacks DF notation, number flows sequentially (DF1, DF2, DF3...) and document this.

## Shape Palette (Use ONLY These 5 Shapes)

**Human Actor** - Stick figure:
```xml
<circle cx="100" cy="50" r="15" fill="none" stroke="#1e293b" stroke-width="2"/>
<line x1="100" y1="65" x2="100" y2="110" stroke="#1e293b" stroke-width="2"/>
<line x1="100" y1="80" x2="80" y2="95" stroke="#1e293b" stroke-width="2"/>
<line x1="100" y1="80" x2="120" y2="95" stroke="#1e293b" stroke-width="2"/>
<line x1="100" y1="110" x2="80" y2="135" stroke="#1e293b" stroke-width="2"/>
<line x1="100" y1="110" x2="120" y2="135" stroke="#1e293b" stroke-width="2"/>
<text x="100" y="155" font-size="12" text-anchor="middle" fill="#1e293b">Actor Name</text>
```

**External Entity** - Rectangle (no rounded corners):
```xml
<rect x="250" y="50" width="140" height="80" fill="white" stroke="#1e293b" stroke-width="2" rx="0"/>
<text x="320" y="95" font-size="13" font-weight="600" text-anchor="middle" fill="#1e293b">Entity Name</text>
```

**Process** - Oval:
```xml
<ellipse cx="550" cy="90" rx="90" ry="50" fill="white" stroke="#1e293b" stroke-width="2"/>
<text x="550" y="95" font-size="13" font-weight="600" text-anchor="middle" fill="#1e293b">Process Name</text>
```

**Data Store** - Cylinder:
```xml
<ellipse cx="800" cy="70" rx="70" ry="15" fill="white" stroke="#1e293b" stroke-width="2"/>
<line x1="730" y1="70" x2="730" y2="110" stroke="#1e293b" stroke-width="2"/>
<line x1="870" y1="70" x2="870" y2="110" stroke="#1e293b" stroke-width="2"/>
<ellipse cx="800" cy="110" rx="70" ry="15" fill="white" stroke="#1e293b" stroke-width="2"/>
<text x="800" y="95" font-size="13" font-weight="600" text-anchor="middle" fill="#1e293b">Store Name</text>
```

**Data Flow** - Arrow with DF label:
```xml
<defs>
  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
    <polygon points="0 0, 10 3, 0 6" fill="#1e293b"/>
  </marker>
</defs>
<line x1="390" y1="90" x2="460" y2="90" stroke="#1e293b" stroke-width="2" marker-end="url(#arrowhead)"/>
<text x="425" y="75" font-size="11" font-weight="600" text-anchor="middle" fill="#1e293b">DF#</text>
<text x="425" y="88" font-size="10" text-anchor="middle" fill="#475569">Description</text>
```

**Trust Boundary** - Dashed rectangle:
```xml
<rect x="50" y="30" width="600" height="400" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="10,5" rx="8"/>
<text x="70" y="55" font-size="14" font-weight="600" fill="#64748b">Zone Name</text>
```

## Color Palette (Minimal & Accessible)

- **All elements:** stroke="#1e293b", stroke-width="2", fill="white"
- **Trust boundaries:** stroke="#64748b", stroke-width="3", stroke-dasharray="10,5"
- **DF identifiers:** fill="#1e293b", font-weight="600"
- **Descriptions:** fill="#475569"

## Layout Rules

- **SVG dimensions:** viewBox="0 0 1400-1600 900-1200"
- The full background is to be white in color
- **Flow direction:** Left to right (actors → entities → processes → stores)
- **Spacing:** 120-180px horizontal, 100-150px vertical between elements
- **Trust boundary padding:** 40-60px from contained elements
- **Arrow label clearance:** 25px above line for two-line labels

## Trust Boundary Types

1. **External/Internet** - Human actors, external entities
2. **DMZ/Perimeter** - Public-facing processes (API gateways, web servers)
3. **Internal/Application** - Business logic, internal APIs
4. **Data Zone** - Databases, secure storage (can be nested inside Internal)

## Required SVG Structure

- Do not provide interim responses or respond with content of SVG
- Do not use & symbol for any strings added to diagram

```xml
<svg viewBox="0 0 1600 1100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#1e293b"/>
    </marker>
  </defs>

  <!-- Title -->
  <text x="800" y="40" font-size="24" font-weight="bold" text-anchor="middle" fill="#1e293b">
    [System Name] Data Flow Diagram
  </text>

  <!-- Trust Boundaries (draw first) -->
  <!-- Elements (actors, entities, processes, stores) -->
  <!-- Data Flows (arrows with DF identifiers) -->
</svg>
```

## Workflow

1. **Read source file** - Extract all DF identifiers and descriptions
2. **Parse elements** - Identify actors, entities, processes, stores
3. **Plan layout** - Group elements by trust zone
4. **Draw boundaries** - Establish zones with dashed rectangles
5. **Place elements** - Position shapes within zones
6. **Add flows** - Draw arrows with DF labels from source file
7. **Verify** - Every DF from source appears on diagram
8. **Generate** - Create SVG file

## Quality Checklist

- [ ] Every arrow has DF identifier from source file
- [ ] DF identifier is bold, description is regular weight
- [ ] Only 5 shape types used (no custom icons)
- [ ] Trust boundaries clearly marked
- [ ] Flows crossing boundaries are visible
- [ ] No overlapping labels
- [ ] High contrast colors throughout

## REQUIRED FILE OUTPUTS:

1. Write to "{config.output_directory}/{config.components_output_sub_dir}/{config.dataflow_diagram_filename}"

**FINAL RESPONSE:** Single line, no formatting.

---

**Key Principle:** DF identifiers are non-negotiable. Every arrow must be traceable to source documentation for threat modeling."""

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
            "name": "threat_composer_workdir_file_write",
            "path": os.path.join(tools_dir, "threat_composer_workdir_file_write.py"),
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
