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
    threat_composer_workdir_file_read,
    threat_composer_workdir_file_write,
)
from ..utils import get_tool_name
from ..utils.relative_path_helper import create_prompt_path_from_config
from .common import (
    ASSUMPTION_GUIDANCE_SNIPPET,
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

    A security mitigation (or security control) is anything that reduces the likelihood and/or
    impact of a threat occurring, resulting in reduced risk.

    MITIGATION CATEGORIES:
    For each threat, systematically consider which of these categories apply and produce
    one mitigation per applicable category. Not every category applies to every threat —
    only produce mitigations where the category is genuinely relevant.

    - Preventative: Stops or hinders the occurrence of a threat.
      Example: Security groups preventing certain traffic from reaching instances.
    - Detective: Identifies the occurrence or possible occurrence of a threat.
      Example: A threat detection service monitoring accounts for malicious activity.
    - Corrective: Prevents continued or repeat occurrences of threats.
      Example: A root cause analysis process to identify and fix underlying issues.
    - Deterrent: Decreases the likelihood of an actor attempting a threat.
      Example: Acceptable use policies, audit trails that actors know are monitored.
    - Recovery: Helps a system maintain or resume functionality after a threat occurs.
      Example: Disaster recovery, automated failover, backup restoration.
    - Compensating: An alternative or temporary mitigation used until a preferred
      long-term mitigation can be implemented.
      Example: Manual security testing until automated test suites are built.

    MITIGATION GENERATION CONSTRAINTS:
    - For each HIGH or MEDIUM priority threat, consider all six categories above
    - Produce one mitigation per applicable category (typically 2-4 categories apply per threat)
    - Each mitigation must be specific to the technology stack and architecture identified
    - AVOID generic advice, theoretical controls, or mitigations already implied by modern frameworks
    - Tag each mitigation with its category (Preventative, Detective, Corrective, Deterrent, Recovery, or Compensating)

    REQUIRED TOOLS:
    1. You must use {get_tool_name(threat_composer_workdir_file_read)} tool to read required inputs
    2. You must use {get_tool_name(threat_composer_workdir_file_write)} tool to create your outputs.
    3. You must use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate your output.

    {dynamic_inputs}

    MITIGATION QUALITY CRITERIA:
    Each mitigation must be:
    - Specific to the technology stack identified in the architecture
    - Implementable with reasonable effort and cost
    - Addressing root cause, not just symptoms
    - Providing measurable security improvement
    Skip mitigations that are generic security advice or require unrealistic resources.

    You have been provided with a set if pre-generated UUIDs to use for your outputs

    IMPORTANT UUID USAGE:
    - Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
    - Each UUID should only be used once
    - If you need more UUIDs than provided, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
    - Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed

    REQUIRED FILE OUTPUTS:
    1. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.mitigations_filename)}" with the following structure {output_format}

    {ASSUMPTION_GUIDANCE_SNIPPET}

    As the mitigations agent, focus your assumptions on:
    - Mitigation effectiveness: controls whose sufficiency you accept without debate (e.g. "AWS IAM policies are correctly configured")
    - Scope boundaries: mitigation areas you are deliberately not addressing
    - Do NOT record facts about the technology stack or restate threats

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
