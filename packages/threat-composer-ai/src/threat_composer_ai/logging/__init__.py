"""Logging module for threat-composer-ai."""

from .rich_logger import (
    clear_agent_context,
    get_logger,
    log_agent_message,
    log_agent_tool_use,
    log_debug,
    log_error,
    log_model_config,
    log_startup_banner,
    log_success,
    log_warning,
    log_workflow_step,
    set_agent_context,
    setup_rich_logging,
)
from .strands_handler import (
    StrandsRichHandler,
    create_strands_rich_handler,
)

__all__ = [
    "setup_rich_logging",
    "get_logger",
    "set_agent_context",
    "clear_agent_context",
    "log_workflow_step",
    "log_agent_message",
    "log_agent_tool_use",
    "log_success",
    "log_error",
    "log_warning",
    "log_debug",
    "log_model_config",
    "log_startup_banner",
    "StrandsRichHandler",
    "create_strands_rich_handler",
]
