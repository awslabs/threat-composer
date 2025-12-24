"""Configuration export utilities for threat-composer-ai."""

from datetime import datetime, timezone
from typing import Any

from ..logging import log_debug, log_error, log_success
from .app_config import AppConfig


def export_run_configuration(
    config: AppConfig, invocation_args: dict[str, Any], start_time: datetime
) -> None:
    """Export configuration files for the current run."""
    try:
        config.export_configuration(invocation_args, start_time)
        log_success(
            f"Configuration exported to: {config.output_directory / config.config_output_sub_dir}"
        )
    except Exception as e:
        log_error(f"Failed to export configuration: {str(e)}")


def update_run_completion_info(
    config: AppConfig, accumulated_usage: dict | None = None
) -> None:
    """Update run metadata with completion information."""
    try:
        end_time = datetime.now(timezone.utc)
        config.update_run_completion(end_time, accumulated_usage)
        log_debug("Run completion information updated")
    except Exception as e:
        log_error(f"Failed to update run completion info: {str(e)}")
