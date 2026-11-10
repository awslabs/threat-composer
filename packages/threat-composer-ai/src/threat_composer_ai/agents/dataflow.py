"""
Dataflow Agent

Parses and understands codebases to create Dataflow.

The agent records its analysis as structured data through
threat_composer_write_dataflow, which writes the dataflow description, the
system model and the data flow diagram from that one input.
"""

import os

from strands import Agent

from ..config import AppConfig
from ..config.style_skill import writing_rules_section
from ..tools import (
    threat_composer_list_workdir_files_gitignore_filtered,
    threat_composer_workdir_file_read,
    threat_composer_write_dataflow,
)
from ..utils import get_tool_name
from .common import (
    CODE_ANALYSIS_PROMPT_SNIPPET,
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
AGENT_NAME = "dataflow"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.application_info_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.architecture_description_filename}",
    ]


def get_output_files(config: AppConfig) -> list[str]:
    """Files written by threat_composer_write_dataflow."""
    return [
        config.dataflow_description_filename,
        config.dataflow_system_filename,
        config.dataflow_diagram_filename,
    ]


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))
    write_tool = get_tool_name(threat_composer_write_dataflow)

    prompt_text = f"""You are an agent specializing in understanding software systems for threat modeling purposes, based on provided context and by reviewing application source code.

{dynamic_inputs}

Your focus is the elements, trust zones and data flows of this application. A threat analyst will apply STRIDE to each element and flow you record, so record what they need to reason about attacks, not every component.

Your responsibilities:
1. Read the required inputs with {get_tool_name(threat_composer_workdir_file_read)}.
2. Analyze the code as needed to confirm and refine the elements and flows. If you enumerate files, use {get_tool_name(threat_composer_list_workdir_files_gitignore_filtered)}.
3. Record the result with one call to {write_tool}.

{CODE_ANALYSIS_PROMPT_SNIPPET}

WHAT TO RECORD:
- Trust zones: areas where everything shares one level of trust, for example the internet, the user's browser, a private network, a cloud account. Give each a short id (Z1, Z2) and a trust level.
- Elements, each with a short id, a kind and its zone:
  - human_actor (U1, U2): people who interact with the system
  - external_entity (E1, E2): systems or services outside your control
  - process (P1, P2): components that run code and transform data
  - data_store (DS1, DS2): where data rests. Set high_value for stores of credentials, personal data, secrets or other sensitive data.
- Flows: data moving between two elements. Describe each in a few words, list the assets it carries, and give the source and target element ids. Omit flow ids; they are numbered DF1, DF2, ... in the order you list them, so list them in the order data moves through the system.
- Evidence: for elements and flows you confirmed in the code, add path:line references.
- Assumptions: anything you assumed rather than confirmed, such as the deployment environment or a component you could not see.

LEVEL OF DETAIL:
- Merge components that share trust and handle the same data, for example a pool of identical workers is one process.
- Keep every flow that crosses a trust zone. These matter most to the threat analyst.
- Prefer accuracy over completeness. Do not invent elements the code and inputs do not support.

If {write_tool} returns an error, fix the input it names and call it again. It writes nothing until the input is valid.

{writing_rules_section()}

FINAL RESPONSE:
1. Your final response must be a single line. No formatting."""

    return create_cached_system_prompt(prompt_text)


def create_dataflow_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Dataflow Agent with incremental execution support."""

    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy output from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=get_output_files(config),
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
        threat_composer_list_workdir_files_gitignore_filtered,
        threat_composer_write_dataflow,
    ]

    return Agent(
        name=AGENT_NAME,
        model=create_agent_model(AGENT_NAME, config, **model_overrides),
        system_prompt=create_system_prompt(config),
        conversation_manager=create_default_conversation_manager(),
        callback_handler=create_default_callback_handler(AGENT_NAME, config),
        tools=tools_list,
    )
