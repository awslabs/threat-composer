"""
Common agent configuration and utilities.

Provides shared configuration for all threat modeling agents including:
- Enhanced boto configuration
- Default model settings
- Conversation management
- Logging callbacks
"""

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

from botocore.config import Config as BotocoreConfig
from strands.agent.conversation_manager import SummarizingConversationManager
from strands.models import BedrockModel
from strands.types.content import SystemContentBlock

from ..config import AppConfig
from ..logging import create_strands_rich_handler
from ..tools import threat_composer_list_workdir_files_gitignore_filtered
from ..tools.threat_composer_generate_uuid4 import (
    threat_composer_generate_uuid4,
)
from ..utils.relative_path_helper import create_prompt_path_from_config
from ..utils.tool_helpers import get_tool_name


def format_preloaded_uuids_section(uuids: list[str]) -> str:
    """Format pre-loaded UUIDs into a system prompt section.

    Args:
        uuids: List of UUID strings to format

    Returns:
        Formatted string for inclusion in system prompts
    """
    if not uuids:
        return ""

    uuid_lines = [f"{i}. {uuid_str}" for i, uuid_str in enumerate(uuids, 1)]

    return f"""PRE-LOADED UUIDs:
Here are {len(uuids)} pre-generated UUIDs to use as needed for your outputs:
{chr(10).join(uuid_lines)}

IMPORTANT UUID USAGE:
- Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
- Each UUID should only be used once
- If you need more than {len(uuids)} UUIDs, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
- Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed
"""


def generate_required_inputs_section(config: AppConfig, input_files: list[str]) -> str:
    """Generate REQUIRED INPUTS section from input files list.

    Args:
        config: AppConfig instance
        input_files: List of input filenames (e.g., ['applicationInfo.tc.json'])

    Returns:
        Formatted REQUIRED INPUTS section for system prompt
    """
    if not input_files:
        return ""

    inputs_list = []
    for i, input_file in enumerate(input_files, 1):
        # Use relative path to reduce token usage
        relative_path = create_prompt_path_from_config(
            "output_directory", "components_output_sub_dir", input_file
        )
        inputs_list.append(f"{i}. {relative_path}")

    return "REQUIRED INPUTS:\n" + "\n".join(inputs_list)


def hash_file(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    try:
        with open(file_path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except FileNotFoundError:
        return ""  # File doesn't exist


def any_input_files_changed(
    input_files: list[str], config: AppConfig, previous_session_path: str
) -> bool:
    """Check if any input files have changed since previous session using individual hash files.

    Args:
        input_files: List of input file paths (can be relative or absolute)
        config: AppConfig instance
        previous_session_path: Path to previous session directory

    Returns:
        True if any input files changed or don't exist in previous session
    """
    for input_file_path in input_files:
        # Use individual hash file comparison
        if file_changed_since_previous_session(input_file_path, previous_session_path):
            return True

    return False


def copy_output_from_previous_session(
    agent_name: str,
    output_files: list[str],
    previous_session_path: str,
    config: AppConfig,
):
    """Copy output files and their hash files from previous session to current session.

    Args:
        agent_name: Name of the agent (for logging)
        output_files: List of output filenames to copy
        previous_session_path: Path to previous session directory
        config: AppConfig instance
    """
    from ..logging import log_debug

    for output_file in output_files:
        # Copy the output file
        src = (
            Path(previous_session_path) / config.components_output_sub_dir / output_file
        )
        dst = (
            Path(config.output_directory)
            / config.components_output_sub_dir
            / output_file
        )

        if src.exists():
            # Ensure destination directory exists
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            log_debug(f"{agent_name}: Copied {output_file} from previous session")

            # Also copy the corresponding hash file
            hash_src = (
                Path(previous_session_path)
                / config.hashes_output_sub_dir
                / f"{output_file}.hash"
            )
            hash_dst = (
                Path(config.output_directory)
                / config.hashes_output_sub_dir
                / f"{output_file}.hash"
            )

            if hash_src.exists():
                # Ensure hashes directory exists
                hash_dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(hash_src, hash_dst)
                log_debug(
                    f"{agent_name}: Copied {output_file}.hash from previous session"
                )
            else:
                log_debug(
                    f"{agent_name}: Hash file for {output_file} not found in previous session"
                )
        else:
            log_debug(
                f"{agent_name}: Previous output {output_file} not found, will need to execute"
            )


def create_cached_system_prompt(prompt: str) -> list[SystemContentBlock]:
    """
    Convert a string system prompt to SystemContentBlock array with caching.

    This enables prompt caching using the provider-agnostic approach recommended
    by Strands Agents, replacing the deprecated cache_prompt parameter.

    Args:
        prompt: The system prompt string

    Returns:
        List of SystemContentBlock with cache point
    """
    return [
        SystemContentBlock(text=prompt),
        SystemContentBlock(cachePoint={"type": "default"}),
    ]


def create_no_action_system_prompt(agent_name: str) -> list[SystemContentBlock]:
    """Create system prompt for agent that takes no action due to unchanged inputs.

    Args:
        agent_name: Name of the agent

    Returns:
        System prompt for no-action agent as SystemContentBlock array with caching
    """
    prompt_text = f"""You are the {agent_name} agent in incremental execution mode.

SITUATION: You are being executed as part of an incremental rerun, but none of your input files have changed since the previous session.

STATUS: No changes detected in input files

ACTION: You should respond with a single line stating that you are taking no action because your input file context has not changed, and that the previous output has been preserved.

RESPONSE FORMAT: "Taking no action - no input file context changes detected. Previous output preserved."

Do not use any tools. Do not perform any analysis. Simply communicate your no-action status."""

    return create_cached_system_prompt(prompt_text)


def file_changed_since_previous_session(
    current_file_path: str, previous_session_path: str
) -> bool:
    """Compare file with its previous session hash using individual hash files.

    Args:
        current_file_path: Path to current file
        previous_session_path: Path to previous session directory

    Returns:
        True if file has changed or doesn't exist in previous session
    """
    filename = Path(current_file_path).name

    # Check if current file exists
    if not Path(current_file_path).exists():
        return True  # File doesn't exist, needs to be created

    # Check if previous hash file exists
    previous_hash_file = Path(previous_session_path) / "hashes" / f"{filename}.hash"
    if not previous_hash_file.exists():
        return True  # No previous hash, must execute

    try:
        # Load previous hash
        with open(previous_hash_file) as f:
            previous_hash_data = json.load(f)

        # Compare with current file hash
        current_hash = hash_file(current_file_path)
        previous_hash = previous_hash_data["hash"].replace("sha256:", "")

        return current_hash != previous_hash

    except Exception as e:
        from ..logging import log_debug

        log_debug(f"Error comparing hash for {filename}: {e}")
        return True  # Error reading hash, assume changed


CODE_ANALYSIS_PROMPT_SNIPPET = f"""When doing code analsyis:
- Recursivley explore the complete directory structure using {get_tool_name(threat_composer_list_workdir_files_gitignore_filtered)} tool
- Examine files in directory structure, with a focus on source code files (.ts, .js, .py, .java, .yaml, .yml, .json, .md, .ini, .cfg)
- Identify source code directories, infrastructure code, configuration files, test directories
"""


def create_enhanced_boto_config() -> BotocoreConfig:
    """
    Create enhanced boto config for long-running analysis tasks.

    Returns:
        BotocoreConfig with optimized settings for threat modeling agents
    """
    return BotocoreConfig(
        retries={"max_attempts": 15, "mode": "adaptive"},
        connect_timeout=60,
        read_timeout=1000,
    )


def create_default_bedrock_model(
    model_id: str | None = None,
    region_name: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 16384,
    config: AppConfig | None = None,
    **kwargs,
) -> BedrockModel:
    """
    Create a default BedrockModel configuration for threat modeling agents.

    Args:
        model_id: Model ID to use (defaults to config or Claude)
        region_name: AWS region (defaults to config or us-west-2)
        temperature: Model temperature (0.3 for focused analysis)
        max_tokens: Maximum tokens (16384 for comprehensive analysis)
        config: Optional AppConfig for default values
        **kwargs: Additional model parameters

    Returns:
        Configured BedrockModel instance
    """
    import boto3

    # Get defaults from config if available
    default_model_id = config.aws_model_id
    default_region = config.aws_region
    profile = config.aws_profile if config else None

    # Create boto session with profile if specified
    boto_session = None
    if profile:
        boto_session = boto3.Session(
            profile_name=profile, region_name=region_name or default_region
        )

    # Build model parameters conditionally
    # When boto_session is provided, don't pass region_name (they're mutually exclusive)
    model_params = {
        "model_id": model_id or default_model_id,
        "cache_tools": "default",
        "boto_client_config": create_enhanced_boto_config(),
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if boto_session:
        model_params["boto_session"] = boto_session
    else:
        model_params["region_name"] = region_name or default_region

    return BedrockModel(**model_params, **kwargs)


def create_default_conversation_manager():
    """
    Create default conversation manager for threat modeling agents.

    Returns:
        SummarizingConversationManager for efficient conversation handling
    """
    return SummarizingConversationManager()


def get_agent_model_config(
    agent_type: str, config: AppConfig | None = None
) -> dict[str, Any]:
    """
    Get agent-specific model configuration with appropriate parameters.

    Args:
        agent_type: Type of agent (code_analyzer, stride_analyzer, etc.)
        config: Optional AppConfig for overrides

    Returns:
        Dictionary of model configuration parameters
    """
    # Base configuration
    base_config = {
        "temperature": 0.3,
        "max_tokens": 16384,
    }

    # Agent-specific optimizations
    agent_configs = {
        "application_info": {
            "temperature": 0.5,  # More creative for discovering patterns
            "max_tokens": 16384,  # Large for comprehensive repo analysis
        },
        "architecture": {
            "temperature": 0.5,  # More creative for discovering patterns
            "max_tokens": 16384,  # Large for comprehensive repo analysis
        },
        "architecture_diagram": {
            "temperature": 0.1,  # Very focused
            "max_tokens": 16384,
        },
        "dataflow": {
            "temperature": 0.5,  # More creative for discovering patterns
            "max_tokens": 16384,
        },
        "dataflow_diagram": {
            "temperature": 0.1,  # Very focused
            "max_tokens": 32768,  # Passing around a bunch of things
        },
        "threats": {
            "temperature": 0.2,  # Very focused for systematic STRIDE analysis
            "max_tokens": 32768,
        },
        "mitigations": {
            "temperature": 0.6,  # Some creatively
            "max_tokens": 16384,
        },
        "threat_model": {
            "temperature": 0.1,  # Very precise for schema generation
            "max_tokens": 8192,  # small mostly deterministic stuff
        },
    }

    # Get agent-specific config or use base
    agent_config = agent_configs.get(agent_type, base_config)

    # Apply any config overrides
    if config:
        if hasattr(config, "aws_model_id"):
            agent_config["model_id"] = config.aws_model_id
        if hasattr(config, "aws_region"):
            agent_config["region_name"] = config.aws_region

    return agent_config


def create_default_callback_handler(agent_name: str, config: AppConfig | None = None):
    """
    Create default callback handler for threat modeling agents.

    Args:
        agent_name: Name of the agent for logging context
        config: Optional AppConfig for callback settings

    Returns:
        Configured callback handler for rich logging
    """
    if config:
        return create_strands_rich_handler(
            agent_name=agent_name,
            show_assistant_messages=getattr(config, "show_assistant_messages", True),
            show_tool_use=getattr(config, "show_tool_use", True),
            auto_context=getattr(config, "agent_auto_context", True),
            config=config,
        )
    else:
        return create_strands_rich_handler(
            agent_name=agent_name,
            show_assistant_messages=True,
            show_tool_use=True,
            auto_context=True,
            config=None,
        )


def create_agent_model(
    agent_type: str, config: AppConfig | None = None, **overrides
) -> BedrockModel:
    """
    Create a BedrockModel configured for a specific agent type.

    Args:
        agent_type: Type of agent (code_analyzer, stride_analyzer, etc.)
        config: Optional AppConfig for global settings
        **overrides: Any parameter overrides

    Returns:
        Configured BedrockModel instance
    """
    model_config = get_agent_model_config(agent_type, config)
    model_config.update(overrides)

    return create_default_bedrock_model(config=config, **model_config)
