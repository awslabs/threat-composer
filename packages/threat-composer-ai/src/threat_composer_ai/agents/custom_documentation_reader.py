"""
Custom Documentation Reader Agent

Entry point agent that reads curated documentation and produces both
application_info and architecture outputs. Replaces application_info + architecture agents.
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
    any_input_files_changed,
    copy_output_from_previous_session,
    create_agent_model,
    create_cached_system_prompt,
    create_default_callback_handler,
    create_default_conversation_manager,
    create_no_action_system_prompt,
    generate_required_inputs_section,
)

AGENT_NAME = "documentation_reader"

# Curated architecture documentation paths
ARCHITECTURE_DOCS = [
    "./docs/architecture.md",
    "./docs/oauth2-authentication.md",
    "./docs/tool-level-authorization.md",
]

ARCHITECTURE_DIAGRAMS = [
    "./docs/diagrams/src/complete_platform_architecture.mmd",
    "./docs/diagrams/src/control_plane_architecture.mmd",
    "./docs/diagrams/src/data_plane_architecture.mmd",
    "./docs/diagrams/src/entity_relationships.mmd",
]


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return []  # Entry point agent - no dependencies


def create_system_prompt(config: AppConfig):
    """Create the system prompt with caching enabled"""

    tags_example = f'["tag1", "tag2", "{config.ai_generated_tag}"] (each tag ≤30 chars)'

    output_format_app_info = (
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
          }
        ],
        "assumptionLinks": [#Empty],
        "threats": [#Empty],
        "mitigations": [#Empty],
        "mitigationLinks": [#Empty],
      }"""
    )

    output_format_architecture = (
        """{
        "schema": 1,
        "applicationInfo": { #Empty },
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
          }
        ],
        "assumptionLinks": [#Empty],
        "threats": [#Empty],
        "mitigations": [#Empty],
        "mitigationLinks": [#Empty],
      }"""
    )

    curated_docs = "\n".join(f"   - {doc}" for doc in ARCHITECTURE_DOCS)
    curated_diagrams = "\n".join(f"   - {diagram}" for diagram in ARCHITECTURE_DIAGRAMS)

    prompt_text = f"""You are an entry point agent for threat modeling. You read curated documentation to produce application info and architecture outputs.

   REQUIRED INPUTS:
   1. Working directory. The workflow query provides a local directory path in format "Analyze local directory: /path/to/directory"

   CURATED ARCHITECTURE DOCUMENTATION (read these first):
   Documentation files:
{curated_docs}

   Architecture diagrams (Mermaid .mmd format):
{curated_diagrams}

   Your primary responsibilities:
   1. Read and parse curated architecture documentation
   2. Parse Mermaid diagrams to understand components, relationships, and boundaries
   3. Extract application name, description, objectives, use-cases, and features
   4. Extract architecture details (layers, boundaries, components, APIs, security components)
   5. Validate documentation against actual code (use code analysis tools only when needed)
   6. Document assumptions about the system
   7. Write two structured outputs: application_info and architecture

   {CODE_ANALYSIS_PROMPT_SNIPPET}

    REQUIRED TOOLS:
    1. You must use {get_tool_name(threat_composer_workdir_file_read)} tool to read architecture docs and diagrams
    2. You may use {get_tool_name(threat_composer_workdir_file_read)} tool to validate against code when needed
    3. You must use {get_tool_name(threat_composer_workdir_file_write)} tool to create your outputs
    4. You must use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate your outputs

    You have been provided with a set of pre-generated UUIDs to use for your outputs

    IMPORTANT UUID USAGE:
    - Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
    - Each UUID should only be used once
    - If you need more UUIDs than provided, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
    - Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed

    REQUIRED FILE OUTPUTS:

   1. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.application_info_filename)}" with the following structure {output_format_app_info}

   2. Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", config.architecture_description_filename)}" with the following structure {output_format_architecture}

   Remember: Base your analysis primarily on curated documentation. Use code analysis only to validate or clarify unclear points.

   FINAL RESPONSE:
   1. Your final response must be a single line. No formatting."""

    return create_cached_system_prompt(prompt_text)


def create_custom_documentation_reader_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Documentation Reader Agent - entry point with no dependencies."""

    # Entry point agent - no incremental execution check needed
    # Always runs fresh as it has no input dependencies

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

    agent.tool.threat_composer_generate_uuid4_with_guidance(batch_size=30)

    return agent
