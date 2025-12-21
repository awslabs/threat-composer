"""Application configuration for threat-composer-ai."""

import json
import logging
import os
import platform
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from botocore.config import Config as BotocoreConfig


@dataclass
class AppConfig:
    """Centralized application configuration."""

    # Core directories
    working_directory: Path
    output_directory: Path

    # Partial output sub-dir
    components_output_sub_dir: str = "components"
    logs_output_sub_dir: str = "logs"
    config_output_sub_dir: str = "config"
    hashes_output_sub_dir: str = "hashes"

    # File names
    application_info_filename: str = "applicationInfo.tc.json"
    architecture_description_filename: str = "architectureDescription.tc.json"
    architecture_diagram_filename: str = "architectureDiagram.svg"
    dataflow_description_filename: str = "dataflowDescription.tc.json"
    dataflow_diagram_filename: str = "dataflowDiagram.svg"
    threats_filename: str = "threats.tc.json"
    mitigations_filename: str = "mitigations.tc.json"
    threat_composer_filename: str = "threatmodel.tc.json"
    log_filename: str = "threat-composer.log"

    # Logging configuration
    log_level: int = logging.INFO
    verbose: bool = False

    # Telemetry configuration
    enable_telemetry: bool = False
    telemetry_endpoint_host: str = "localhost"
    telemetry_endpoint_port: int = 4318
    telemetry_service_name: str = "threat-composer-ai"

    # Rich display configuration
    show_assistant_messages: bool = True
    show_tool_use: bool = True
    agent_auto_context: bool = True
    path_display_max_length: int = 50

    # AWS configuration
    aws_region: str = "us-west-2"
    aws_model_id: str = "global.anthropic.claude-sonnet-4-20250514-v1:0"
    aws_profile: str | None = None

    # Runtime configuration
    execution_timeout: float = 2400.0  # 40 minutes
    node_timeout: float = 1200.0  # 20 minutes per agent

    # AI Generated content tagging
    ai_generated_tag: str = "AI Generated"

    # UUID batch size for pre-loading
    uuid_batch_size: int = 100

    # Invocation source tracking
    invocation_source: str = "UNKNOWN"  # "CLI" or "MCP"

    @classmethod
    def create(
        cls,
        working_directory: Path,
        output_directory: Path | None = None,
        verbose: bool | None = None,
        enable_telemetry: bool | None = None,
        aws_region: str | None = None,
        aws_model_id: str | None = None,
        aws_profile: str | None = None,
        execution_timeout: float | None = None,
        node_timeout: float | None = None,
        ai_generated_tag: str | None = None,
        uuid_batch_size: int | None = None,
        invocation_source: str = "UNKNOWN",
    ) -> "AppConfig":
        """
        Create AppConfig with proper precedence: CLI args → Environment vars → Defaults.

        Args:
            working_directory: Required working directory path
            output_directory: Optional output directory override
            verbose: Optional verbose logging override
            enable_telemetry: Optional telemetry enablement override
            aws_region: Optional AWS region override
            aws_model_id: Optional AWS model ID override
            execution_timeout: Optional execution timeout override
            node_timeout: Optional node timeout override
            ai_generated_tag: Optional AI generated content tag override
            uuid_batch_size: Optional UUID batch size override

        Returns:
            AppConfig instance with merged configuration
        """
        # Get environment variable values with proper type conversion
        env_output_dir = cls._get_env_path("THREAT_COMPOSER_OUTPUT_DIR")
        env_verbose = cls._get_env_bool("THREAT_COMPOSER_VERBOSE")
        env_enable_telemetry = cls._get_env_bool("THREAT_COMPOSER_ENABLE_TELEMETRY")
        env_aws_region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
        env_aws_model_id = os.getenv("THREAT_COMPOSER_AWS_MODEL_ID")
        env_aws_profile = os.getenv("AWS_PROFILE")
        env_execution_timeout = cls._get_env_float("THREAT_COMPOSER_EXECUTION_TIMEOUT")
        env_node_timeout = cls._get_env_float("THREAT_COMPOSER_NODE_TIMEOUT")
        env_ai_generated_tag = os.getenv("THREAT_COMPOSER_AI_GENERATED_TAG")
        env_uuid_batch_size = cls._get_env_int("THREAT_COMPOSER_UUID_BATCH_SIZE")

        # Determine base output directory with precedence: CLI args → Environment vars → Class defaults
        base_output_dir = (
            output_directory
            or env_output_dir
            or Path(f"{working_directory}/.threat-composer")
        )

        # Always generate session-based subdirectory regardless of base output directory source
        session_id = cls._generate_session_id(base_output_dir)
        final_output_dir = base_output_dir / session_id

        # Apply precedence: CLI args → Environment vars → Class defaults
        return cls(
            working_directory=working_directory,
            output_directory=final_output_dir,
            verbose=verbose
            if verbose is not None
            else (env_verbose if env_verbose is not None else False),
            enable_telemetry=enable_telemetry
            if enable_telemetry is not None
            else (env_enable_telemetry if env_enable_telemetry is not None else False),
            aws_region=aws_region or env_aws_region or cls.aws_region,
            aws_model_id=aws_model_id or env_aws_model_id or cls.aws_model_id,
            aws_profile=aws_profile or env_aws_profile,
            execution_timeout=execution_timeout
            if execution_timeout is not None
            else (env_execution_timeout if execution_timeout is not None else 2400.0),
            node_timeout=node_timeout
            if node_timeout is not None
            else (env_node_timeout if env_node_timeout is not None else 1200.0),
            ai_generated_tag=ai_generated_tag
            or env_ai_generated_tag
            or cls.ai_generated_tag,
            uuid_batch_size=uuid_batch_size
            if uuid_batch_size is not None
            else (env_uuid_batch_size if env_uuid_batch_size is not None else 100),
            invocation_source=invocation_source,
        )

    @staticmethod
    def _get_env_path(key: str) -> Path | None:
        """Get environment variable as Path, return None if not set or invalid."""
        value = os.getenv(key)
        return Path(value) if value else None

    @staticmethod
    def _get_env_bool(key: str) -> bool | None:
        """Get environment variable as boolean, return None if not set."""
        value = os.getenv(key)
        if value is None:
            return None
        return value.lower() in ("true", "1", "yes", "on")

    @staticmethod
    def _get_env_int(key: str) -> int | None:
        """Get environment variable as integer, return None if not set or invalid."""
        value = os.getenv(key)
        if value is None:
            return None
        try:
            return int(value)
        except ValueError:
            return None

    @staticmethod
    def _get_env_float(key: str) -> float | None:
        """Get environment variable as float, return None if not set or invalid."""
        value = os.getenv(key)
        if value is None:
            return None
        try:
            return float(value)
        except ValueError:
            return None

    @staticmethod
    def _generate_session_id(base_path: Path) -> str:
        """Generate a unique session ID with collision handling."""
        session_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
        threat_model_base_path = base_path / session_id

        # Handle potential collisions by adding seconds if needed
        if threat_model_base_path.exists():
            # Add seconds to make it unique
            session_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

        return session_id

    def __post_init__(self):
        """Initialize derived configuration after object creation."""
        # Ensure paths are absolute
        self.working_directory = self.working_directory.resolve()
        self.output_directory = self.output_directory.resolve()

        # Set logging level based on verbose flag
        if self.verbose:
            self.log_level = logging.DEBUG

    def create_boto_config(self) -> BotocoreConfig:
        """Create enhanced boto config for AWS operations."""
        return BotocoreConfig(
            retries={"max_attempts": 5, "mode": "adaptive"},
            connect_timeout=60,
            read_timeout=300,
            region_name=self.aws_region,
        )

    def get_log_level_name(self) -> str:
        """Get human-readable log level name."""
        return logging.getLevelName(self.log_level)

    def create_output_directory(self) -> None:
        """Create output directory if it doesn't exist."""
        self.output_directory.mkdir(parents=True, exist_ok=True)

    def _get_configuration_sources(
        self, invocation_args: dict[str, Any]
    ) -> dict[str, str]:
        """Determine the source of each configuration value."""
        sources = {}

        # AWS model ID source
        if invocation_args.get("aws_model_id"):
            sources["aws_model_id"] = "invocation argument"
        elif os.getenv("THREAT_COMPOSER_AWS_MODEL_ID"):
            sources["aws_model_id"] = "environment variable"
        else:
            sources["aws_model_id"] = "default"

        # AWS region source
        if invocation_args.get("aws_region"):
            sources["aws_region"] = "invocation argument"
        elif os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION"):
            sources["aws_region"] = "environment variable"
        else:
            sources["aws_region"] = "default"

        # AWS profile source
        if invocation_args.get("aws_profile"):
            sources["aws_profile"] = "invocation argument"
        elif os.getenv("AWS_PROFILE"):
            sources["aws_profile"] = "environment variable"
        else:
            sources["aws_profile"] = "not configured"

        # Other configuration sources
        for key in [
            "verbose",
            "enable_telemetry",
            "execution_timeout",
            "node_timeout",
        ]:
            if invocation_args.get(key) is not None:
                sources[key] = "invocation argument"
            elif os.getenv(f"THREAT_COMPOSER_{key.upper()}"):
                sources[key] = "environment variable"
            else:
                sources[key] = "default"

        return sources

    def to_config_dict(self) -> dict[str, Any]:
        """Export configuration in CLI-reusable format."""
        aws_config = {"model_id": self.aws_model_id, "region": self.aws_region}
        if self.aws_profile:
            aws_config["profile"] = self.aws_profile

        return {
            "version": "1.0",
            "aws": aws_config,
            "runtime": {
                "execution_timeout_seconds": self.execution_timeout,
                "node_timeout_seconds": self.node_timeout,
            },
            "logging": {
                "verbose": self.verbose,
                "enable_telemetry": self.enable_telemetry,
            },
            "features": {
                "show_assistant_messages": self.show_assistant_messages,
                "show_tool_use": self.show_tool_use,
                "agent_auto_context": self.agent_auto_context,
            },
        }

    def export_configuration(
        self, invocation_args: dict[str, Any], start_time: datetime
    ) -> None:
        """Export configuration files to the config subdirectory."""
        from ..utils import format_utc_timestamp

        config_dir = self.output_directory / self.config_output_sub_dir
        config_dir.mkdir(parents=True, exist_ok=True)

        # 1. Export reusable configuration
        config_file = config_dir / "config.json"
        with open(config_file, "w", encoding="utf-8") as f:
            json.dump(self.to_config_dict(), f, indent=2)

        # 2. Export run metadata
        session_id = self.output_directory.name
        sources = self._get_configuration_sources(invocation_args)

        metadata = {
            "session": {
                "session_id": session_id,
                "invocation_source": self.invocation_source,
                "start_time": format_utc_timestamp(start_time),
                "end_time": None,  # Will be updated at completion
                "duration_seconds": None,
            },
            "directories": {
                "working_directory": str(self.working_directory),
                "output_directory": str(self.output_directory),
            },
            "system": {
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "platform": platform.platform(),
            },
            "invocation_arguments": {
                k: v for k, v in invocation_args.items() if v is not None
            },
            "configuration_sources": sources,
        }

        metadata_file = config_dir / "run-metadata.json"
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        # 3. Export safe environment variables
        safe_env_vars = {
            "safe_aws_vars": {
                "AWS_REGION": os.getenv("AWS_REGION"),
                "AWS_DEFAULT_REGION": os.getenv("AWS_DEFAULT_REGION"),
                "AWS_PROFILE": os.getenv("AWS_PROFILE"),
            },
            "threat_composer_vars": {
                key: os.getenv(key)
                for key in [
                    "THREAT_COMPOSER_OUTPUT_DIR",
                    "THREAT_COMPOSER_VERBOSE",
                    "THREAT_COMPOSER_ENABLE_TELEMETRY",
                    "THREAT_COMPOSER_EXECUTION_TIMEOUT",
                    "THREAT_COMPOSER_NODE_TIMEOUT",
                    "THREAT_COMPOSER_AWS_MODEL_ID",
                    "THREAT_COMPOSER_AI_GENERATED_TAG",
                ]
            },
            "note": "Only non-sensitive environment variables are logged. Credentials and secrets are never exported.",
        }

        env_file = config_dir / "environment-vars.json"
        with open(env_file, "w", encoding="utf-8") as f:
            json.dump(safe_env_vars, f, indent=2)

    def update_run_completion(
        self, end_time: datetime, accumulated_usage: dict | None = None
    ) -> None:
        """Update run metadata with completion information and token usage."""
        from ..logging import log_success
        from ..utils import format_utc_timestamp, parse_utc_timestamp

        config_dir = self.output_directory / self.config_output_sub_dir
        metadata_file = config_dir / "run-metadata.json"

        if metadata_file.exists():
            with open(metadata_file, encoding="utf-8") as f:
                metadata = json.load(f)

            start_time_str = metadata["session"]["start_time"]
            start_time = parse_utc_timestamp(start_time_str)

            duration = (end_time - start_time).total_seconds()

            metadata["session"]["end_time"] = format_utc_timestamp(end_time)
            metadata["session"]["duration_seconds"] = duration

            # Add token usage if available
            if accumulated_usage:
                input_tokens = accumulated_usage.get("inputTokens", 0)
                output_tokens = accumulated_usage.get("outputTokens", 0)
                total_tokens = accumulated_usage.get("totalTokens", 0)

                metadata["token_usage"] = {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens,
                }

                # Log token usage summary
                log_success(
                    f"Token usage: {input_tokens:,} input + {output_tokens:,} output = {total_tokens:,} total"
                )

            # Write the updated metadata back to the file
            with open(metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)
