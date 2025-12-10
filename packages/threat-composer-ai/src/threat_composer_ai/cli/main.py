"""Main CLI entry point for threat_composer_ai module."""

import os
import signal
import sys
import threading
from pathlib import Path

import click

from ..core import WorkflowRunner
from ..logging import (
    log_debug,
    log_error,
    log_model_config,
    log_success,
)
from ..utils import create_signal_handler

# Global shutdown flag and workflow reference for signal handling
_shutdown_event = threading.Event()
_active_workflow_ref = {"workflow": None}


@click.command()
@click.argument(
    "directory_path",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
)
@click.option(
    "--verbose", "-v", is_flag=True, help="Enable verbose output for detailed logging"
)
@click.option(
    "--output-dir",
    "-o",
    type=click.Path(path_type=Path),
    help="Output directory for analysis results",
)
@click.option("--aws-region", type=str, help="AWS region for Bedrock API calls")
@click.option(
    "--aws-model-id", type=str, help="AWS Bedrock model ID to use for analysis"
)
@click.option("--aws-profile", type=str, help="AWS profile name to use for credentials")
@click.option(
    "--execution-timeout", type=float, help="Maximum execution timeout in seconds"
)
@click.option(
    "--node-timeout", type=float, help="Maximum timeout per agent node in seconds"
)
@click.option(
    "--skip-validation",
    is_flag=True,
    help="Skip AWS credential validation (not recommended)",
)
@click.option(
    "--enable-telemetry",
    is_flag=True,
    help="Enable Jaeger telemetry tracing (disabled by default)",
)
@click.option(
    "--rerun-from",
    type=click.Path(exists=True, path_type=Path),
    help="Rerun from previous session directory (incremental execution)",
)
def main(
    directory_path: Path,
    verbose: bool,
    output_dir: Path | None,
    aws_region: str | None,
    aws_model_id: str | None,
    aws_profile: str | None,
    execution_timeout: float | None,
    node_timeout: float | None,
    skip_validation: bool,
    enable_telemetry: bool,
    rerun_from: Path | None,
):
    """
    AI-powered automated threat modeling for codebases.

    DIRECTORY_PATH: Path to the directory you want to analyze for threats.
    """

    # Validate directory first
    if not directory_path.exists():
        log_error(f"Directory does not exist: {directory_path}")
        sys.exit(1)

    if not directory_path.is_dir():
        log_error(f"Path is not a directory: {directory_path}")
        sys.exit(1)

    # Handle incremental execution path
    previous_session_path_str = str(rerun_from) if rerun_from else None
    if previous_session_path_str:
        log_success(
            f"Incremental execution: Rerunning from {previous_session_path_str}"
        )

    # Create runner with full initialization using factory method
    runner = WorkflowRunner.create_from_params(
        working_directory=directory_path,
        output_directory=output_dir,
        previous_session_path=previous_session_path_str,
        verbose=verbose,
        enable_telemetry=enable_telemetry,
        aws_region=aws_region,
        aws_model_id=aws_model_id,
        aws_profile=aws_profile,
        execution_timeout=execution_timeout,
        node_timeout=node_timeout,
        invocation_source="CLI",
        setup_logging=True,
    )

    # Log startup information
    log_success(f"Analyzing directory: {runner.config.working_directory}")
    log_success(f"Output directory: {runner.config.output_directory}")

    if verbose:
        log_debug(f"AWS region: {runner.config.aws_region}")
        log_debug(f"Log level: {runner.config.get_log_level_name()}")
        if runner.config.enable_telemetry:
            log_debug("Telemetry enabled - traces will be sent to Jaeger")
        else:
            log_debug(
                "Telemetry disabled (use --enable-telemetry or THREAT_COMPOSER_ENABLE_TELEMETRY=true to enable)"
            )

    # Log model configuration at startup
    model_source = "default"
    if aws_model_id:
        model_source = "CLI argument"
    elif os.getenv("THREAT_COMPOSER_AWS_MODEL_ID"):
        model_source = "environment variable"

    region_source = "default"
    if aws_region:
        region_source = "CLI argument"
    elif os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION"):
        region_source = "environment variable"

    log_model_config(
        runner.config.aws_model_id,
        runner.config.aws_region,
        model_source,
        region_source,
    )

    # Log profile configuration if present
    if runner.config.aws_profile:
        profile_source = "default"
        if aws_profile:
            profile_source = "CLI argument"
        elif os.getenv("AWS_PROFILE"):
            profile_source = "environment variable"

        log_success(f"AWS Profile: {runner.config.aws_profile} (from {profile_source})")

    # Create and register signal handler for Ctrl+C
    handler = create_signal_handler(_shutdown_event, _active_workflow_ref)
    signal.signal(signal.SIGINT, handler)

    try:
        # Setup workflow (validation, telemetry, exports)
        invocation_args = {
            "directory_path": str(directory_path),
            "verbose": verbose,
            "output_dir": str(output_dir) if output_dir else None,
            "aws_region": aws_region,
            "aws_model_id": aws_model_id,
            "aws_profile": aws_profile,
            "execution_timeout": execution_timeout,
            "node_timeout": node_timeout,
            "skip_validation": skip_validation,
            "enable_telemetry": enable_telemetry,
        }

        success, error = runner.setup(
            invocation_args=invocation_args,
            skip_validation=skip_validation,
        )

        if not success:
            log_error(f"Setup failed: {error}")
            sys.exit(1)

        log_success(f"Output directory ready: {runner.config.output_directory}")

        # Store workflow reference for signal handler access
        _active_workflow_ref["workflow"] = runner.workflow

        # Execute workflow synchronously
        result = runner.execute_sync()

        # Clear workflow reference after completion
        _active_workflow_ref["workflow"] = None

        # Log results
        log_success("Threat modeling completed successfully!")
        log_success(f"Results available in: {runner.config.output_directory}")

        if verbose:
            log_debug(f"Analysis result: {result}")

    except KeyboardInterrupt:
        # Clear workflow reference on interruption
        _active_workflow_ref["workflow"] = None
        log_error("Analysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        # Clear workflow reference on error
        _active_workflow_ref["workflow"] = None
        log_error(f"Error (Run with --verbose to see full details): {str(e)}")
        if verbose:
            import traceback

            log_debug("Full exception details:")
            log_debug(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
