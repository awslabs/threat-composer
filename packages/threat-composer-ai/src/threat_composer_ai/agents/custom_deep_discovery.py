"""
Custom Deep Discovery Agent

Performs comprehensive discovery phase analysis based on Q Context threat modeling script.
Analyzes system at high level to identify components, relationships, and sequence flows.
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

AGENT_NAME = "deep_discovery"


def get_input_files(config: AppConfig) -> list[str]:
    """Get the list of input files this agent depends on."""
    return [
        f"{config.output_directory}/{config.components_output_sub_dir}/{config.architecture_description_filename}"
    ]


def get_output_files(config: AppConfig) -> list[str]:
    """Get the list of output files this agent produces."""
    return [
        "deep-analysis/discovery_structure.md",
        "deep-analysis/security_files.json",
        "architecture-enriched.tc.json",
        # Note: deep-analysis/components/, workflows/, infrastructure/, flows/ are directories
        # with multiple files - not tracked individually for incremental execution
    ]


def create_system_prompt(config: AppConfig):
    """Create system prompt for deep discovery analysis"""

    dynamic_inputs = generate_required_inputs_section(config, get_input_files(config))

    tags_example = f'["tag1", "tag2", "{config.ai_generated_tag}"] (each tag ≤30 chars)'

    output_format = (
        """{
        "schema": 1,
        "applicationInfo: { #Empty },
        "architecture": {
          "description": "Enhanced architecture description from deep discovery analysis. Include:
            - Original architecture information
            - Discovered security-relevant components with file paths
            - Identified workflows and their entry/exit points
            - Infrastructure components and configurations
            - Sequence flows with components involved
            
            Maximum 15,000 characters. Markdown format. No unicode. Use lists and tables."
        },
        "dataflow": { #Empty },
        "assumptions": [
          {
            "id": "Use available un-used UUID, or call tool to get more",
            "numericId": 1,
            "content": "[Assumption about architecture, components, or flows - <= 200 chars]",
            "tags": """
        + tags_example
        + """,
            "metadata": [{
                "key": "Comments",
                "value": "[Detail - <= 300 chars]"
              },
              {
                "key": "custom:agent",
                "value": "deep_discovery"
              },
              {
                "key": "custom:flow",
                "value": "[Flow name if assumption relates to specific flow]"
              }]
          }
        ],
        "assumptionLinks": [#Empty],
        "threats": [#Empty],
        "mitigations": [#Empty],
        "mitigationLinks": [#Empty]
      }"""
    )

    prompt_text = f"""You are a deep discovery agent performing comprehensive threat modeling discovery analysis.

{dynamic_inputs}

Your task is to perform thorough discovery phase analysis following these steps:

1. **Code Structure Analysis**: Analyze ALL code directories respecting .gitignore patterns
   - Document purpose, key files (with absolute paths), dependencies, security components
   - Save to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", "deep-analysis/discovery_structure.md")}"

2. **Security-Relevant File Identification**: Create comprehensive mapping of security files
   - Identify auth, validation, encryption, API endpoints, data processing, error handling
   - Document absolute paths, purpose, security relevance (High/Medium/Low)
   - Save JSON to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", "deep-analysis/security_files.json")}"

3. **Component Analysis**: Analyze individual components and interactions
   - Document purpose, interfaces, dependencies, security considerations
   - Include complete file lists with absolute paths
   - Save to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", "deep-analysis/components/")}"

4. **Workflow Analysis**: Identify and analyze all workflows
   - Document entry points, processing steps, data transformations, security controls
   - Include exact file paths for each step
   - Save to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", "deep-analysis/workflows/")}"

5. **Infrastructure Analysis**: Analyze infrastructure code and configurations
   - Examine CDK, CloudFormation, configs, IAM roles, network configs
   - Save to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", "deep-analysis/infrastructure/")}"

6. **Sequence Flow Identification**: Identify main sequence flows
   - Document components, entry/exit points, security considerations, trust boundaries
   - Create individual flow docs with complete file lists
   - Save to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", "deep-analysis/flows/")}"

7. **Create Enriched Architecture Output**: Consolidate findings into architecture-enriched.tc.json
   - Read original architecture from input file
   - Enhance architecture description with discovered components, workflows, and flows
   - Add assumptions about architecture, components, and identified flows
   - Write to "{create_prompt_path_from_config("output_directory", "components_output_sub_dir", "architecture-enriched.tc.json")}" with structure: {output_format}

{CODE_ANALYSIS_PROMPT_SNIPPET}

REQUIRED TOOLS:
- Use {get_tool_name(threat_composer_workdir_file_read)} to read architecture input and files
- Use {get_tool_name(threat_composer_list_workdir_files_gitignore_filtered)} to list files
- Use {get_tool_name(threat_composer_workdir_file_write)} to create outputs
- Use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate architecture-enriched.tc.json

OUTPUT REQUIREMENTS:
- All file paths must be absolute
- Create JSON mappings for components, workflows, flows, and infrastructure
- Document security relevance for all identified files
- Create verification report confirming completeness
- MUST create architecture-enriched.tc.json as final consolidated output

FINAL RESPONSE: Single line summary of discovery completion."""

    return create_cached_system_prompt(prompt_text)


def create_custom_deep_discovery_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Deep Discovery Agent with incremental execution support"""

    # Check if this is a rerun and if input files have changed
    if previous_session_path and config:
        from .common import any_input_files_changed, copy_output_from_previous_session
        
        if not any_input_files_changed(
            get_input_files(config), config, previous_session_path
        ):
            # Copy outputs from previous session
            copy_output_from_previous_session(
                agent_name=AGENT_NAME,
                output_files=get_output_files(config),
                previous_session_path=previous_session_path,
                config=config,
            )

            return Agent(
                name=AGENT_NAME,
                model=create_agent_model(
                    AGENT_NAME, config, temperature=0.0, max_tokens=100
                ),
                system_prompt=create_no_action_system_prompt(AGENT_NAME),
                conversation_manager=create_default_conversation_manager(),
                callback_handler=create_default_callback_handler(AGENT_NAME, config),
                tools=[],
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

    agent.tool.threat_composer_generate_uuid4_with_guidance(batch_size=20)
    return agent
