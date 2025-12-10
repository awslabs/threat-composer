"""
Dataflow Agent

Parses and understands codebases to create Dataflow
"""

import os

from strands import Agent

from ..config import AppConfig
from ..tools import (
    threat_composer_generate_uuid4,
    threat_composer_generate_uuid4_with_guidance,
    threat_composer_list_workdir_files_gitignore_filtered,
    threat_composer_validate_tc_v1_schema,
)
from ..utils import get_tool_name
from ..utils.relative_path_helper import create_prompt_path_from_config
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


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    # Build the tags example with the configurable AI generated tag
    tags_example = f'["tag1", "tag2", "{config.ai_generated_tag}"] (each tag ≤30 chars)'

    output_format = (
        """{
        "schema": 1,
        "applicationInfo": { #Empty },
        "architecture" : { # Empty },
        "dataflow": {
          "description": "CRITICAL CONSTRAINT: Maximum 12,000 characters total. Be extremely concise. Markdown format. No unicode. Use tables and lists only - no lengthy prose.

          ### Human actors
          [List only. Max 3-5 items. One line each. Human actors who interact with the system.]

          ### External entities
          [List only. Max 3-5 items. One line each. External systems/services you don't control.]

          ### Processes
          [List only. Max 5-7 items. One line each. Components that perform computation.]

          ### Data stores
          [Table format. Columns: Store | Type | High-Value (Y/N). Max 5-7 rows. Where data is stored at rest.]

          ### Trust boundaries
          [Table format. Columns: Zone | Elements | Trust Level. Max 3-5 rows. Security zones separating elements.]

          ### Data flows (MOST IMPORTANT - will be used for diagram)
          [Table format ONLY. Columns: Flow ID | Description | Source | Target | Trust Boundaries Crossed | Assets. Keep descriptions under 50 chars each. This section is critical for the data flow diagram that follows.]

          STOP HERE. No additional sections."
        },
        "assumptions": [
          {
            "id": "Use available un-used UUID, or call tool to get more",
            "numericId": 1,
            "content": "[Brief assumption - single line - <= 200 chars]",
            "tags": """
        + tags_example
        + """,
            "metadata": [{
                "key": "Comments"
                "value": "[Brief detail - <= 300 chars]",
              },
              {
                "key": "custom:agent",
                "value": "[Contributing agent name]"
              }]
          }
        ],
        "assumptionLinks": [#Empty],
        "threats": [#Empty],
        "mitigations": [#Empty],
        "mitigationLinks": [#Empty],
      }"""
    )

    # Get dynamic input dependencies using the new helper function
    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))

    prompt_text = f"""You are a agent specializing in understanding software systems for threat modeling purposes based on provided context, and by reviewing application source code.

   {dynamic_inputs}

   Your focus is determining the elements and flows of this application.

   Your primary responsibilities:
   1. Read required inputs
   2. Perform code analysis using tools if necesseary.
   3. If doing file enumeration you must use {get_tool_name(threat_composer_list_workdir_files_gitignore_filtered)}
   4. You must use threat_composer_workdir_file_read tool to read file contents
   5. Determine elements and dataflow of application to the degree of detail that it could be used by another agent to create a data flow diagram
   6. Document all assumptions you make during analysis
   7. Write structured outputs to markdown files using tools

   {CODE_ANALYSIS_PROMPT_SNIPPET}

    REQUIRED TOOLS:
    1. You must use threat_composer_workdir_file_read tool to disovery directories, and read files.
    2. You must use threat_composer_workdir_file_write tool to create your outputs.
    3. You must use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate your output.

    You have been provided with a set if pre-generated UUIDs to use for your outputs

    IMPORTANT UUID USAGE:
    - Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
    - Each UUID should only be used once
    - If you need more UUIDs than provided, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
    - Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed

    REQUIRED FILE OUTPUTS:

   1. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.dataflow_description_filename)}" with the following structure {output_format}

   Remember: Be explicit about what you're assuming vs. what you can definitively determine from the code.

   FINAL RESPONSE:
   1. Your final reponse must be a single line. No formatting."""

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
                output_files=[config.dataflow_description_filename],
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
        threat_composer_list_workdir_files_gitignore_filtered,
        threat_composer_generate_uuid4,
        threat_composer_generate_uuid4_with_guidance,
        threat_composer_validate_tc_v1_schema,
    ]

    agent = Agent(
        name=AGENT_NAME,
        model=create_agent_model(AGENT_NAME, config, **model_overrides),
        system_prompt=create_system_prompt(config),
        conversation_manager=create_default_conversation_manager(),
        callback_handler=create_default_callback_handler(AGENT_NAME, config),
        tools=tools_list,
    )

    # Proactively seed the agent with a batch of UUIDs
    agent.tool.threat_composer_generate_uuid4_with_guidance(batch_size=20)

    return agent
