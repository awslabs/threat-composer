"""Shared workflow execution logic for CLI and MCP."""

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from strands.session import FileSessionManager

from ..config import AppConfig
from ..config.export import export_run_configuration, update_run_completion_info
from ..utils.relative_path_helper import make_relative_to_working_dir
from ..validation import (
    validate_aws_bedrock_access,
    validate_aws_bedrock_inference,
    validate_graphviz_installation,
)
from ..workflows.baseline_threat_modeling import (
    create_baseline_threat_modeling_workflow,
)


class WorkflowRunner:
    """Manages workflow setup, execution, and cleanup."""

    def __init__(
        self,
        config: AppConfig,
        session_manager: FileSessionManager,
        previous_session_path: str | None = None,
    ):
        """
        Initialize workflow runner.

        Args:
            config: Application configuration
            session_manager: File session manager instance
            previous_session_path: Path to previous session for incremental execution
        """
        self.config = config
        self.session_manager = session_manager
        self.previous_session_path = previous_session_path
        self.workflow = None

    @classmethod
    def create_from_params(
        cls,
        working_directory: Path,
        output_directory: Path | None = None,
        previous_session_path: str | None = None,
        verbose: bool | None = None,
        enable_telemetry: bool | None = None,
        aws_region: str | None = None,
        aws_model_id: str | None = None,
        aws_profile: str | None = None,
        execution_timeout: float | None = None,
        node_timeout: float | None = None,
        invocation_source: str = "UNKNOWN",
        setup_logging: bool = True,
    ) -> "WorkflowRunner":
        """
        Create WorkflowRunner with full initialization.

        Handles all initialization steps:
        - AppConfig creation
        - Global config registration
        - Logging setup
        - Telemetry setup
        - Session manager creation

        Args:
            working_directory: Directory to analyze
            output_directory: Optional output directory override
            previous_session_path: Path to previous session for incremental execution
            verbose: Enable verbose logging
            enable_telemetry: Enable telemetry tracing
            aws_region: AWS region override
            aws_model_id: AWS model ID override
            aws_profile: AWS profile name override
            execution_timeout: Max execution timeout in seconds
            node_timeout: Max timeout per node in seconds
            setup_logging: Whether to setup rich logging (default: True)

        Returns:
            Fully initialized WorkflowRunner instance
        """
        # 1. Create AppConfig
        config = AppConfig.create(
            working_directory=working_directory,
            output_directory=output_directory,
            verbose=verbose,
            enable_telemetry=enable_telemetry,
            aws_region=aws_region,
            aws_model_id=aws_model_id,
            aws_profile=aws_profile,
            execution_timeout=execution_timeout,
            node_timeout=node_timeout,
            invocation_source=invocation_source,
        )

        # 2. Register global config
        from ..config import register_global_config

        register_global_config(config)

        # 3. Setup logging (if requested)
        if setup_logging:
            from ..logging import log_startup_banner, setup_rich_logging

            logs_dir = config.output_directory / config.logs_output_sub_dir
            setup_rich_logging(
                config.log_level,
                log_file_path=logs_dir,
                log_filename=config.log_filename,
            )

            # Log startup banner with all configuration details
            sources = config._get_configuration_sources(
                {
                    "aws_model_id": aws_model_id,
                    "aws_region": aws_region,
                    "aws_profile": aws_profile,
                    "verbose": verbose,
                    "enable_telemetry": enable_telemetry,
                    "execution_timeout": execution_timeout,
                    "node_timeout": node_timeout,
                }
            )
            log_startup_banner(config, sources)

        # 4. Setup telemetry (if enabled)
        if config.enable_telemetry:
            from ..utils import setup_local_telemetry

            setup_local_telemetry(
                endpoint_host=config.telemetry_endpoint_host,
                endpoint_port=config.telemetry_endpoint_port,
                service_name=config.telemetry_service_name,
            )

        # 5. Get session info
        from ..config import get_global_session_id, get_global_storage_directory

        session_id = get_global_session_id()
        storage_dir = f"{get_global_storage_directory()}/{session_id}"

        # 6. Create session manager
        sm = FileSessionManager(session_id=session_id, storage_dir=storage_dir)

        # 7. Create and return runner
        return cls(
            config=config,
            session_manager=sm,
            previous_session_path=previous_session_path,
        )

    def setup(
        self,
        invocation_args: dict,
        skip_validation: bool = False,
    ) -> tuple[bool, str | None]:
        """
        Common setup: validation, exports, workflow creation.

        Note: Telemetry is configured during runner creation in create_from_params()
        based on config.enable_telemetry, so it's not set up again here.

        Args:
            invocation_args: Invocation arguments for export (from CLI or MCP)
            skip_validation: Skip AWS credential validation

        Returns:
            (success: bool, error_message: str | None)
        """
        try:
            # 1. Graphviz validation (required for DFD diagram generation)
            if not skip_validation:
                validate_graphviz_installation()

            # 2. AWS credential validation (unless skipped)
            if not skip_validation:
                validate_aws_bedrock_access(self.config)
                if not validate_aws_bedrock_inference(self.config):
                    return False, "AWS Bedrock inference validation failed"

            # 2. Output directory creation

            self.config.create_output_directory()

            # 3. Export run configuration
            start_time = datetime.now(timezone.utc)
            export_run_configuration(self.config, invocation_args, start_time)

            # 4. Create workflow with previous_session_path support
            self.workflow = create_baseline_threat_modeling_workflow(
                config=self.config,
                session_manager=self.session_manager,
                previous_session_path=self.previous_session_path,
            )

            # 5. Set BYPASS_TOOL_CONSENT
            os.environ["BYPASS_TOOL_CONSENT"] = "true"

            return True, None

        except SystemExit:
            # AWS validation raises SystemExit for CLI, but we need to catch it for MCP
            # Extract the error message from the exit code
            return False, "AWS credential validation failed - check logs for details"

        except Exception as e:
            return False, str(e)

    def _prepare_workflow_input(self) -> str:
        """
        Prepare workflow input with directory path and pre-loaded UUIDs.

        Returns:
            Formatted workflow input string
        """
        relative_working_dir = make_relative_to_working_dir(
            str(self.config.working_directory)
        )

        return f"Analyze local directory: {relative_working_dir}"

    def _update_completion(self) -> None:
        """Update run completion information."""
        update_run_completion_info(self.config)

    def execute_sync(self) -> Any:
        """
        Execute workflow synchronously (for CLI).

        Returns:
            Workflow execution result
        """
        workflow_input = self._prepare_workflow_input()
        result = self.workflow(workflow_input)
        self._update_completion()
        return result

    async def execute_async(self) -> Any:
        """
        Execute workflow asynchronously (for MCP).

        Returns:
            Workflow execution result
        """
        workflow_input = self._prepare_workflow_input()
        result = await self.workflow.invoke_async(workflow_input)
        self._update_completion()
        return result

    def get_relative_working_dir(self) -> str:
        """
        Get relative path for workflow input.

        Returns:
            Relative path to working directory
        """
        return make_relative_to_working_dir(str(self.config.working_directory))
