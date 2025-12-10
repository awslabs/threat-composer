"""
Threat Composer Generator Agent - Phase 5: Output Generation

Synthesizes all outputs into final Threat Composer schema format.
"""

from strands import Agent

from ..config import AppConfig
from ..tools import (
    threat_composer_assemble_tc_v1_model,
    threat_composer_validate_tc_v1_schema,
)
from ..utils.relative_path_helper import create_prompt_path_from_config
from .common import (
    any_input_files_changed,
    copy_output_from_previous_session,
    create_agent_model,
    create_cached_system_prompt,
    create_default_callback_handler,
    create_default_conversation_manager,
    create_no_action_system_prompt,
    get_tool_name,
)

# Agent configuration
AGENT_NAME = "threat_model"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.application_info_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.architecture_description_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.architecture_diagram_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.dataflow_description_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.dataflow_diagram_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.threats_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.mitigations_filename}",
    ]


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    prompt_text = f"""
    You are the Threat Composer Generator Agent responsible for creating the final Threat Composer schema output.

    REQUIRED TOOLS:
    - You must use {get_tool_name(threat_composer_assemble_tc_v1_model)} to create the threat model
    - You must use {get_tool_name(threat_composer_validate_tc_v1_schema)} for validation operations.

    Your responsibilities:
    1. Use the {get_tool_name(threat_composer_assemble_tc_v1_model)} tool providing the following parameters
        - application_info_path: {create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.application_info_filename)}
        - architecture_description_path: {create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.architecture_description_filename)}
        - architecture_diagram_path: {create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.architecture_diagram_filename)}
        - dataflow_description_path: {create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.dataflow_description_filename)}
        - dataflow_diagram_path: {create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.dataflow_diagram_filename)}
        - threats_path: {create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.threats_filename)}
        - mitigations_path: {create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.mitigations_filename)}
        - output_path: {create_prompt_path_from_config("output_directory", None, config.threat_composer_filename)}
    2. Use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate the file created.

    FINAL RESPONSE:
    1. Your final reponse must be a single line. No formatting.
    """

    return create_cached_system_prompt(prompt_text)


def create_threat_model_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Threat Composer Generator Agent for final schema output."""

    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy output from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=[config.threat_composer_filename],
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

    agent = Agent(
        name=AGENT_NAME,
        model=create_agent_model(AGENT_NAME, config, **model_overrides),
        system_prompt=create_system_prompt(config),
        conversation_manager=create_default_conversation_manager(),
        callback_handler=create_default_callback_handler(AGENT_NAME, config),
        tools=[
            threat_composer_validate_tc_v1_schema,
            threat_composer_assemble_tc_v1_model,
        ],
    )

    return agent
