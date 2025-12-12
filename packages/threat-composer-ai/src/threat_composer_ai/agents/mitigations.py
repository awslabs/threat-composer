"""
Mitigation Analysis Agent

Systematically considers mitigation candidates for identified threats from the perspective of the defender persona
"""

import os

from strands import Agent

from ..config import AppConfig
from ..tools import (
    threat_composer_generate_uuid4,
    threat_composer_generate_uuid4_with_guidance,
    threat_composer_validate_tc_v1_schema,
)
from ..utils import get_tool_name
from ..utils.relative_path_helper import create_prompt_path_from_config
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
AGENT_NAME = "mitigations"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.application_info_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.architecture_description_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.dataflow_description_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.threats_filename}",
    ]


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    # Get dynamic input dependencies using the new helper function
    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))

    # Build the tags example with the configurable AI generated tag
    mitigation_tags_example = f'[Consider tags such as "Preventative", "Detective" and mitigation types like "Authentication", "{config.ai_generated_tag}"] (each tag ≤30 chars)'

    output_format = (
        """
    {
     "schema": 1,
     "applicationInfo": { #Empty },
     "architecture": { #Empty },
     "dataflow": { #Empty },
     "assumptions" : [ #Empty ],
     "assumptionLinks": [#Empty],
     "threats": [#Empty],
     "mitigations": [
        {
        "id": "Use available un-used UUID, or call tool to get more",
        "numericId": 1,
        "content": "mitigation content (≤1000 chars)",
        "tags": """
        + mitigation_tags_example
        + """,
        "metadata": [
            {
            "key": "Comments"
            "value": "[Additional supporting information / rationale etc for the mitigation. Markdown supported - do not use tables. These chars are NOT allowed: < > &]"
            }
            {
            "key": "custom:agent",
            "value": "[Contributing agent name]"
            }]
        }
     ],
     "mitigationLinks": [
        {
        "mitigationId": "mitigation-uuid",
        "linkedId": "existing-threat-uuid"
        }
     ]
    }"""
    )

    prompt_text = f"""
    You are the Defender Persona Agent.

    MITIGATION GENERATION CONSTRAINTS:
    - TARGET: 1-3 mitigations per HIGH priority threat, 1-2 per MEDIUM priority threat
    - FOCUS: Practical, implementable mitigations only
    - AVOID: Generic advice, theoretical controls, or obvious mitigations
    - QUALITY OVER QUANTITY: Better to have fewer actionable mitigations than many generic ones

    Your perspective focuses on:
    - Technical security controls and their implementation
    - Monitoring and detection capabilities
    - Incident response procedures
    - Operational security measures
    - Defense-in-depth strategies (multiple mitigations for a given threat)

    REQUIRED TOOLS:
    1. You must use threat_composer_workdir_file_read tool to read required inputs
    2. You must use threat_composer_workdir_file_write tool to create your outputs.
    3. You must use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate your output.

    {dynamic_inputs}

    MITIGATION SELECTION STRATEGY:
    For each threat in the threats file, consider:
    1. Focus on HIGH and MEDIUM priority threats only
    2. Prioritize mitigations that are:
       - Specific to the technology stack identified
       - Implementable with reasonable effort/cost
       - Address the root cause, not just symptoms
       - Provide measurable security improvement
    3. Skip mitigations that are:
       - Generic security advice (e.g., "use strong passwords")
       - Already implied by modern frameworks
       - Require unrealistic resources or expertise

    MITIGATION TYPES TO PRIORITIZE:
    - Preventative: Controls that stop threats from occurring
    - Detective: Controls that identify threats in progress
    - Corrective: Controls that limit damage when threats succeed

    You have been provided with a set if pre-generated UUIDs to use for your outputs

    IMPORTANT UUID USAGE:
    - Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
    - Each UUID should only be used once
    - If you need more UUIDs than provided, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
    - Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed

    REQUIRED FILE OUTPUTS:
    1. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.mitigations_filename)}" with the following structure {output_format}

    Remember: Document all assumptions you make during analysis. Be explicit about what you're assuming vs. what you can definitively determine from the code.

   FINAL RESPONSE:
   1. Your final reponse must be a single line. No formatting.
    """

    return create_cached_system_prompt(prompt_text)


def create_mitigations_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Mitigations Agent for systematic mitigation identification."""

    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy output from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=[config.mitigations_filename],
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
    agent.tool.threat_composer_generate_uuid4_with_guidance(batch_size=40)

    return agent
