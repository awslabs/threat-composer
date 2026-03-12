"""
Custom Deep Dive Agent

Performs detailed threat analysis for specific sequence flows based on Q Context script.
Creates focused threat model examining security considerations, threats, and mitigations.
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
    create_agent_model,
    create_cached_system_prompt,
    create_default_callback_handler,
    create_default_conversation_manager,
)

AGENT_NAME = "deep_dive"


def create_system_prompt(config: AppConfig):
    """Create system prompt for deep dive analysis"""

    prompt_text = f"""You are a deep dive agent performing detailed threat analysis for sequence flows.

Your task is to perform detailed threat analysis following these steps:

1. **Load Flow Context**: Load flow information from discovery stage
   - Read flow package from discovery outputs
   - Verify all required information available

2. **Create Detailed Sequence Diagram**: Generate detailed PlantUML sequence diagram
   - Show all components, message flows, data transformations
   - Highlight authentication, authorization, error paths
   - Include security controls

3. **Identify Flow-Specific Assets**: Document assets specific to this flow
   - Data assets, security credentials, configuration, infrastructure
   - Document sensitivity, protection requirements, access methods

4. **Analyze Trust Boundaries**: Identify and analyze trust boundaries crossed
   - Document source/destination zones, data transferred, security controls
   - Create detailed trust boundary diagram

5. **Perform Detailed Code Review**: Review security-critical code sections
   - Analyze for vulnerabilities using secure coding best practices
   - Document findings and recommendations

6. **Identify Flow-Specific Threats**: Document threats using STRIDE framework
   - Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege
   - Document threat ID, description, attack vectors, affected assets, impact

7. **Define Flow-Specific Mitigations**: Document mitigations for each threat
   - Implementation details, verification methods, status

8. **Perform Risk Assessment**: Assess risk using Amazon's framework
   - Impact: Minor/Moderate/Severe
   - Likelihood: Low/Medium/High
   - Risk Level: Low/Medium/High/Critical
   - Prioritize threats by risk level

{CODE_ANALYSIS_PROMPT_SNIPPET}

REQUIRED TOOLS:
- Use {get_tool_name(threat_composer_workdir_file_read)} to read files
- Use {get_tool_name(threat_composer_workdir_file_write)} to create outputs
- Use {get_tool_name(threat_composer_validate_tc_v1_schema)} to validate outputs

OUTPUT REQUIREMENTS:
- Save sequence diagram to flow-specific directory
- Save assets, trust boundaries, threats, mitigations to separate files
- Create comprehensive analysis document
- Create verification report
- Prepare summary for final report integration

FINAL RESPONSE: Single line summary of deep dive completion."""

    return create_cached_system_prompt(prompt_text)


def create_custom_deep_dive_agent(
    config: AppConfig | None = None,
    previous_session_path: str | None = None,
    **model_overrides,
) -> Agent:
    """Create the Deep Dive Agent"""

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
