"""
Architecture Agent

Parses and understands codebases to create Architecture
"""

import os

from strands import Agent

from ..config import AppConfig
from ..tools import (
    threat_composer_generate_uuid4,
    threat_composer_generate_uuid4_with_guidance,
    threat_composer_list_workdir_files_gitignore_filtered,
    threat_composer_validate_tc_v1_schema,
    threat_composer_workdir_file_read,
    threat_composer_workdir_file_write,
)
from ..utils import get_tool_name
from ..utils.relative_path_helper import (
    create_prompt_path_from_config,
)
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
AGENT_NAME = "architecture"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.application_info_filename}"
    ]


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    # Build the tags example with the configurable AI generated tag
    tags_example = f'["tag1", "tag2", "{config.ai_generated_tag}"] (each tag ≤30 chars)'

    output_format = (
        """{
        "schema": 1,
        "applicationInfo: { #Empty },
        "architecture": {
          "description": "CRITICAL CONSTRAINT: Maximum 12,000 characters total. Be extremely concise. Markdown format. No unicode. Use lists and tables only - no lengthy prose. These chars are NOT allowed: <>&

            ### High Level Architecture

            #### Application type
            [One line only. Web app, API, mobile app, desktop app, service, etc. <=100 chars]

            #### Layers
            [List only. Max 3-5 items. One line each. E.g. presentation, logic, data. <=300 chars total]

            #### Boundaries
            [List only. Max 3-5 items. One line each. Internal/external systems, network zones. <=300 chars total]

            #### Technology components
            [List only. Max 5-7 items. One line each. Languages, frameworks, databases. <=500 chars total]

            #### Deployment architecture
            [If evident: List only. Max 3-5 items. One line each. <=300 chars total]

            #### APIs
            [If evident: Table format with header seperator row. Columns: Endpoint | Method | Purpose. Max 5-7 rows. <=400 chars total]

            #### Security relevant components
            [List only. Max 3-5 items. One line each. Auth, crypto, data handling. <=400 chars total]

            ### Low Level Architecture
            [List only. Max 5-10 items. One line each. Key components for diagram creation. <=800 chars total]

            STOP HERE. No additional sections."
        },
        "dataflow": { #Empty },
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
          },
        "assumptionLinks": [#Empty],
        "threats": [#Empty],
        "mitigations": [#Empty],
        "mitigationLinks": [#Empty],
        ]
      }"""
    )

    # Get dynamic input dependencies using the new helper function
    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))

    prompt_text = f"""You are a agent specializing in understanding software systems for threat modeling purposes based on provided context, and by reviewing application source code.

   {dynamic_inputs}

   You focus is determining the application architecture.

   Your primary responsibilities:
   1. Read required inputs
   2. Perform code analysis using tools as necesseary
   3. Determine architecture of application to the degree of detail that it could be used by another agent to create a architecture diagram
   4. Document all assumptions you make during analysis
   5. Write structured outputs to markdown files using tools

   {CODE_ANALYSIS_PROMPT_SNIPPET}

    REQUIRED TOOLS:
    1. You must use {get_tool_name(threat_composer_workdir_file_read)} tool to read required inputs
    2. You must use {get_tool_name(threat_composer_workdir_file_read)} tool to read file contents
    3. You must use {get_tool_name(threat_composer_workdir_file_write)} tool to create your outputs.
    4. You must use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate your output.

    You have been provided with a set if pre-generated UUIDs to use for your outputs

    IMPORTANT UUID USAGE:
    - Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
    - Each UUID should only be used once
    - If you need more UUIDs than provided, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
    - Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed

    REQUIRED FILE OUTPUTS:

   1. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.architecture_description_filename)}" with the following structure {output_format}

   Remember: Be explicit about what you're assuming vs. what you can definitively determine from the code.

   FINAL RESPONSE:
   1. Your final reponse must be a single line. No formatting."""

    return create_cached_system_prompt(prompt_text)


def create_architecture_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Architecture Agent with incremental execution support."""

    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy output from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=[config.architecture_description_filename],
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
