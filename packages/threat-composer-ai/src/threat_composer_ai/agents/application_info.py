"""
ApplicationInfo Agent

Parses and understands codebases to create ApplicationInfo
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
from ..utils.relative_path_helper import create_prompt_path_from_config
from .common import (
    CODE_ANALYSIS_PROMPT_SNIPPET,
    copy_output_from_previous_session,
    create_agent_model,
    create_cached_system_prompt,
    create_default_callback_handler,
    create_default_conversation_manager,
    create_no_action_system_prompt,
)

# Agent configuration
AGENT_NAME = "application_info"


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    # Build the tags example with the configurable AI generated tag
    tags_example = f'["tag1", "tag2", "{config.ai_generated_tag}"] (each tag ≤30 chars)'

    output_format = (
        """{
        "schema": 1,
        "applicationInfo": {
          "name": "[Name of application - plaintext. single line. - <=200 chars]",
          "description": "CRITICAL CONSTRAINT: Maximum 10,000 characters total. Be extremely concise. Markdown format. No unicode. Use lists and tables only - no lengthy prose. These chars are NOT allowed: < > &

          ### Summary
          [2-3 sentences maximum. What the application does. No paragraphs. <=500 chars]

          ### Key objectives
          [List only. Max 3-5 items. One line each. <=300 chars total]

          ### Use-cases
          [List only. Max 3-5 items. One line each. <=400 chars total]

          ### Features
          [List only. Max 5-7 items. One line each. <=500 chars total]

          STOP HERE. No additional sections."
        },
        "architecture": { #Empty },
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

    prompt_text = f"""You are a agent specializing in understanding software systems for threat modeling purposes based on provided context and by reviewing application source code.

    REQUIRED INPUTS:
    1. Working directory. The workflow query provides a local directory path in format "Analyze local directory: /path/to/directory"

    You focus is determining the application name, and application description.

    Your primary responsibilities:
    1. Perform code analysis using tools
    2. Determine Application Name and Description
    4. Document all assumptions you make during analysis
    5. Write structured outputs to markdown files using tools

    {CODE_ANALYSIS_PROMPT_SNIPPET}

    REQUIRED TOOLS:
    1. When doing file enumeration you must use {get_tool_name(threat_composer_list_workdir_files_gitignore_filtered)}.
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
    1. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.application_info_filename)}" with the following structure {output_format}

    Documented assumptions should include, but are not limited to:
    - Code completeness and accuracy
    - Technology stack characteristics
    - Deployment environment

    Remember: Be explicit about what you're assuming vs. what you can definitively determine from the code.

    FINAL RESPONSE:
    1. Your final reponse must be a single line. No formatting."""

    return create_cached_system_prompt(prompt_text)


def create_application_info_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Application Info Agent."""

    # Check if this is a rerun - if so, always return no-op agent
    if previous_session_path and config:
        # Copy output from previous session
        copy_output_from_previous_session(
            agent_name=AGENT_NAME,
            output_files=[config.application_info_filename],
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

    # Normal agent creation for first run only
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
