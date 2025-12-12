"""
Threats - STRIDE Per Element Analysis

Systematically applies STRIDE-per-element methodology for threat identification.
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
AGENT_NAME = "threats"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.application_info_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.architecture_description_filename}",
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.dataflow_description_filename}",
    ]


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    # Get dynamic input dependencies using the new helper function
    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))

    # Build the tags examples with the configurable AI generated tag
    threat_tags_example = f'[Dataflow element(s) this threat is associated with (comma delimited), "{config.ai_generated_tag}"] (each tag ≤30 chars)'
    assumption_tags_example = (
        f'["tag1", "tag2", "{config.ai_generated_tag}"] (each tag ≤30 chars)'
    )

    output_format = (
        """      {
        "schema": 1,
        "applicationInfo": { #Empty },
        "architecture": { #Empty },
        "dataflow": { #Empty },
        "threats": [
          {
            "id": "Use available un-used UUID, or call tool to get more",
            "numericId": 1,
            "threatSource": "threat source. the entity taking action. For example: actor (a useful default), internet-based actor, internal or external actor. lower case (≤200 chars)",
            "prerequisites": "prerequisites. conditions or requirements that must be met for a threat source's action to be viable. For example: -with access to another user's token. -who has administrator access -with user permissions - in a mitm position -with a network path to the API. If no prerequistes known return empty string, if know return but first word must be lower case (≤200 chars)",
            "threatAction": "threat action. the action being performed by the threat source. For example: -spoof another user -tamper with data stored in the database -make thousands of concurrent requests. first word must be lower case (≤200 chars)",
            "threatImpact": "threat impact. what impact this has on the system.The direct impact of a successful threat action. For example: - unauthorized access to the user's bank account information -modifying the username for the all-time high score. -a web application being unable to handle other user requests.if know return but first word must be lower case (≤200 chars)",
            "impactedGoal": ["goal1", "goal2"] The information security or business objective that is negatively affected.  This is most commonly the CIA triad: -confidentiality, -integrity, -availability. If not known return empty string in array, else strings in array first word must be lower case (each ≤200 chars),
            "impactedAssets": ["asset1", "asset2"] List of assets affected by this threat. If not known return empty string in array, else strings in array first word must be lower case (each ≤200 chars),
            "statement": "concatenate the above as follows into a one of the following permutations based on if the default is available or not - trim any repated white space into a single white space: 1/ A/an [threatSource] [prerequisites] can [threatAction], 2/ A/an [threatSource] [prerequisites] can [threatAction], which leads to [threatImpact], 3/ A/an [threatSource] [prerequisites] can [threatAction], resulting in reduced [impactedGoal], 4/ A/An [threatSource] [prerequisites] can [threatAction], which leads to [threatImpact], resulting in reduced [impactedGoal], 5/ A/An [threatSource] [prerequisites] can [threatAction], negatively impacting [impactedAssets], 6/ A/An [threatSource] [prerequisites] can [threatAction], which leads to [threatImpact], negatively impacting [impactedAssets], 7/ A/An [threatSource] [prerequisites] can [threatAction], resulting in reduced [impactedGoal] of [impactedAssets], 8/ A/An [threatSource] [prerequisites] can [threatAction], which leads to [threatImpact], resulting in reduced [impactedGoal] of [impactedAssets] (≤1400 chars)",
            "status": "threatIdentified" | "threatResolved" | "threatResolvedNotUseful",
            "tags": """
        + threat_tags_example
        + """,
            "metadata": [
              {
                "key": "STRIDE",
                "value": ["S", "T", "R", "I", "D", "E"] (subset of these)
              },
              {
                "key": "Comments",
                "value": "[Additional supporting information / rationale etc for the threat. Markdown supported - do not use tables. These chars are NOT allowed: < > &]"}
              {
                "key": "Priority",
                "value": "High" | "Medium" | "Low"
              },
              {
                "key": "custom:agent",
                "value": "[Contributing agent name]"
              }
            ]
          }
        ],
        "assumptions": [
          {
            "id": "Use available un-used UUID, or call tool to get more",
            "numericId": 1,
            "content": "assumption title (from header) (≤1000 chars)",
            "tags": """
        + assumption_tags_example
        + """,
            "metadata": [{
                "key": "Comments"
                "value": "assumption detail (from text below header). Markdown. No Tables (≤1000 chars). These chars are NOT allowed: < > &",
              },
              {
                "key": "custom:agent",
                "value": "[Contributing agent name]"
              }]
          }
        ],
        "assumptionLinks": [
        {
            "type": "Threat",
            "assumptionId": "assumption-uuid",
            "linkedId": "threat-uuid"
        },
        "mitigations": [#Empty],
        "mitigationLinks": [#Empty],
      }"""
    )

    prompt_text = f"""
    You are a STRIDE Analysis Agent specializing in systematic threat identification using STRIDE-per-element methodology.

    THREAT GENERATION CONSTRAINTS:
    - TARGET: 15-25 high-quality threats total (not per element)
    - FOCUS: Prioritize HIGH and MEDIUM priority threats only
    - AVOID: Low-priority, theoretical, or edge-case threats
    - QUALITY OVER QUANTITY: Better to have 20 realistic threats than 50 theoretical ones

    REQUIRED TOOLS:
    1. You must use threat_composer_workdir_file_read tool to read required inputs
    2. You must use threat_composer_workdir_file_write tool to create your outputs.
    3. You must use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate your output.

    {dynamic_inputs}

    STRIDE APPLICATION STRATEGY:
    1. For each dataflow element, apply only the MOST RELEVANT STRIDE categories
    2. Focus on threats that are:
       - Realistic given the technology stack
       - Have clear attack paths
       - Would have significant business impact
    3. Skip threats that are:
       - Purely theoretical without clear attack vectors
       - Require unrealistic attacker capabilities
       - Have minimal business impact

    THREAT PRIORITIZATION:
    - HIGH: Direct data breach, system compromise, financial loss
    - MEDIUM: Service disruption, data integrity issues, privilege escalation
    - LOW: Skip these - focus on HIGH/MEDIUM only

    For each system element (Human Actors, External Entities, Processes, Data Stores, Data Flows):
    - Apply relevant STRIDE categories based on element type
    - Create threat statements using the grammar: "[threat source] [prerequisites] can [threat action] which leads to [threat impact], negatively impacting [impacted assets]"
    - Assign STRIDE categories and priority levels
    - Consider both expected and unexpected interactions

    You have been provided with a set if pre-generated UUIDs to use for your outputs

    IMPORTANT UUID USAGE:
    - Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
    - Each UUID should only be used once
    - If you need more UUIDs than provided, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
    - Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed

    REQUIRED FILE OUTPUTS:
    1. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.threats_filename)}" with the following structure {output_format}

    Remember: Document all assumptions you make during analysis. Be explicit about what you're assuming vs. what you can definitively determine from the code.

    FINAL RESPONSE:
    1. Your final reponse must be a single line. No formatting.
    """

    return create_cached_system_prompt(prompt_text)


def create_threats_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the STRIDE-per-element analysis Agent for systematic threat identification."""

    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy output from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=[config.threats_filename],
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
