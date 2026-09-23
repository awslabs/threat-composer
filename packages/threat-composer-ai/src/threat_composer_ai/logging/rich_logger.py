"""Rich-based colorful logging for threat-composer-ai."""

import logging
from pathlib import Path

from rich.console import Console
from rich.logging import RichHandler
from rich.markup import escape as _rich_escape
from rich.theme import Theme


def rich_escape(value) -> str:
    """Safely escape a value for Rich markup, handling None and non-string types."""
    if value is None:
        return "None"
    if not isinstance(value, str):
        value = str(value)
    return _rich_escape(value)


# Custom theme for threat-composer-ai
THREAT_COMPOSER_THEME = Theme(
    {
        "info": "cyan",
        "warning": "yellow",
        "error": "red",
        "critical": "bold red",
        "debug": "dim white",
        "success": "green",
        "agent": "bold blue",
        "workflow": "bold magenta",
        "progress": "bright_cyan",
    }
)

# Global console instance
console = Console(theme=THREAT_COMPOSER_THEME)


class AgentAwareFormatter(logging.Formatter):
    """Custom formatter that adds agent context and rich formatting.

    IMPORTANT: This formatter escapes record.getMessage() before embedding it
    in Rich markup tags, so that arbitrary content (e.g. from botocore debug
    logs containing square brackets) does not get misinterpreted as Rich tags.
    """

    def __init__(self):
        super().__init__()
        self.agent_context = None

    def set_agent_context(self, agent_name: str):
        """Set the current agent context."""
        self.agent_context = agent_name

    def clear_agent_context(self):
        """Clear the current agent context."""
        self.agent_context = None

    def format(self, record):
        """Format log record with agent context."""
        # Add agent context to the record if available
        if self.agent_context:
            record.agent = self.agent_context
        elif not hasattr(record, "agent"):
            record.agent = "system"

        # If the message was pre-formatted with Rich markup by our helpers,
        # use it as-is. Otherwise escape to prevent markup injection from
        # third-party loggers (botocore, etc.).
        if getattr(record, "_rich_markup_safe", False):
            raw_message = record.getMessage()
        else:
            raw_message = rich_escape(record.getMessage())

        # Create formatted message with agent context
        if record.agent == "system":
            formatted = f"[workflow]🔧 SYSTEM[/workflow] | {raw_message}"
        else:
            formatted = f"[agent]🤖 {record.agent.upper()}[/agent] | {raw_message}"

        return formatted


# Global formatter instance
_formatter = AgentAwareFormatter()


def setup_rich_logging(
    log_level: int = logging.INFO,
    show_time: bool = True,
    show_path: bool = False,
    log_file_path: Path | None = None,
    log_filename: str | None = None,
) -> None:
    """Set up rich logging with custom formatting and optional file logging."""

    # Create rich handler for console output - markup=True is safe because
    # AgentAwareFormatter escapes raw messages before wrapping in markup tags
    rich_handler = RichHandler(
        console=console,
        show_time=show_time,
        show_path=show_path,
        markup=True,
        rich_tracebacks=True,
        tracebacks_show_locals=True,
    )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add rich handler for console
    root_logger.addHandler(rich_handler)

    # Set custom formatter for rich handler
    rich_handler.setFormatter(_formatter)

    # Add file handler if log_file_path is provided
    if log_file_path and log_filename:
        import re

        # Ensure logs directory exists
        log_file_path.mkdir(parents=True, exist_ok=True)

        # Create file handler that captures everything going to console
        log_file = log_file_path / log_filename
        file_handler = logging.FileHandler(log_file, mode="w", encoding="utf-8")
        file_handler.setLevel(log_level)

        # Custom formatter that strips rich markup for clean file output
        class PlainTextFormatter(logging.Formatter):
            def format(self, record):
                # Use the same formatter logic as the rich handler but strip markup
                formatted_message = _formatter.format(record)
                # Strip rich markup tags like [success], [error], etc.
                clean_message = re.sub(r"\[/?[^\]]*\]", "", formatted_message)
                # Clean up extra spaces
                clean_message = " ".join(clean_message.split())
                return f"{self.formatTime(record)} - {clean_message}"

        file_handler.setFormatter(PlainTextFormatter(datefmt="%Y-%m-%d %H:%M:%S"))
        root_logger.addHandler(file_handler)

    # Configure strands logger specifically with markup=False to prevent
    # Rich from parsing raw request/response data as markup tags (e.g., [/-])
    strands_logger = logging.getLogger("strands")

    # Create a separate handler for strands with markup disabled
    strands_rich_handler = RichHandler(
        console=console,
        show_time=show_time,
        show_path=show_path,
        markup=False,  # Disable markup to prevent parsing errors from raw data
        rich_tracebacks=True,
        tracebacks_show_locals=True,
    )

    # Suppress verbose internal Strands library stack traces, we will handle this upstream
    logging.getLogger("strands.multiagent.graph").setLevel(logging.CRITICAL)
    logging.getLogger("strands.event_loop.event_loop").setLevel(logging.CRITICAL)
    logging.getLogger("strands.agent.agent").setLevel(logging.CRITICAL)

    # Suppress OpenTelemetry connection errors when Jaeger is not running
    logging.getLogger("opentelemetry.exporter.otlp").setLevel(logging.CRITICAL)
    logging.getLogger("opentelemetry.sdk._shared_internal").setLevel(logging.CRITICAL)
    logging.getLogger("urllib3.connectionpool").setLevel(logging.CRITICAL)

    strands_logger.setLevel(log_level)
    strands_logger.propagate = False
    strands_logger.addHandler(strands_rich_handler)

    # Prevent botocore and other third-party loggers from propagating
    # bracket-heavy content through the root handler's markup parser
    for third_party in ("botocore", "boto3", "urllib3", "s3transfer"):
        tp_logger = logging.getLogger(third_party)
        tp_handler = RichHandler(
            console=console,
            show_time=show_time,
            show_path=show_path,
            markup=False,
            rich_tracebacks=True,
        )
        tp_logger.propagate = False
        tp_logger.addHandler(tp_handler)
        if log_file_path and log_filename:
            tp_logger.addHandler(file_handler)

    # Add file handler to strands logger if available
    if log_file_path and log_filename:
        strands_logger.addHandler(file_handler)


def get_logger(name: str, agent_name: str | None = None) -> logging.Logger:
    """Get a logger with optional agent context."""
    logger = logging.getLogger(name)

    if agent_name:
        # Create a custom adapter that includes agent context
        class AgentLoggerAdapter(logging.LoggerAdapter):
            def process(self, msg, kwargs):
                return f"[agent]🤖 {agent_name.upper()}[/agent] | {msg}", kwargs

        return AgentLoggerAdapter(logger, {})

    return logger


def set_agent_context(agent_name: str) -> None:
    """Set the global agent context for all subsequent log messages."""
    _formatter.set_agent_context(agent_name)


def clear_agent_context() -> None:
    """Clear the global agent context."""
    _formatter.clear_agent_context()


def _log_markup(logger, level, message):
    """Log a message that contains pre-escaped Rich markup tags."""
    if not logger.isEnabledFor(level):
        return
    record = logger.makeRecord(logger.name, level, "(unknown)", 0, message, (), None)
    record._rich_markup_safe = True
    logger.handle(record)


def log_workflow_step(step_name: str, description: str = "") -> None:
    """Log a workflow step with special formatting."""
    logger = get_logger(__name__)
    if description:
        _log_markup(
            logger,
            logging.INFO,
            f"[progress]📋 STEP: {rich_escape(step_name)}[/progress] - {rich_escape(description)}",
        )
    else:
        _log_markup(
            logger,
            logging.INFO,
            f"[progress]📋 STEP: {rich_escape(step_name)}[/progress]",
        )


def log_agent_message(agent_name: str, action: str, details: str = "") -> None:
    """Log an agent action with special formatting."""
    logger = get_logger(__name__)
    if details:
        _log_markup(
            logger,
            logging.INFO,
            f"[agent]🤖 {rich_escape(agent_name.upper())}[/agent] | [success]⚡ {rich_escape(action)}[/success] - {rich_escape(details)}",
        )
    else:
        _log_markup(
            logger,
            logging.INFO,
            f"[agent]🤖 {rich_escape(agent_name.upper())}[/agent] | [success]⚡ {rich_escape(action)}[/success]",
        )


def log_agent_tool_use(agent_name: str, action: str, details: str = "") -> None:
    """Log an agent action with special formatting."""
    logger = get_logger(__name__)
    if details:
        _log_markup(
            logger,
            logging.INFO,
            f"[agent]🤖 {rich_escape(agent_name.upper())}[/agent] | [progress]🔨 {rich_escape(action)}[/progress] - {rich_escape(details)}",
        )
    else:
        _log_markup(
            logger,
            logging.INFO,
            f"[agent]🤖 {rich_escape(agent_name.upper())}[/agent] | [progress]🔨 {rich_escape(action)}[/progress]",
        )


def log_success(message: str) -> None:
    """Log a success message with special formatting."""
    logger = get_logger(__name__)
    _log_markup(logger, logging.INFO, f"[success]✅ {rich_escape(message)}[/success]")


def log_error(message: str) -> None:
    """Log an error message with special formatting."""
    logger = get_logger(__name__)
    _log_markup(logger, logging.ERROR, f"[error]❌ {rich_escape(message)}[/error]")


def log_warning(message: str) -> None:
    """Log a warning message with special formatting."""
    logger = get_logger(__name__)
    _log_markup(
        logger, logging.WARNING, f"[warning]⚠️  {rich_escape(message)}[/warning]"
    )


def log_debug(message: str) -> None:
    """Log a debug message with special formatting."""
    logger = get_logger(__name__)
    _log_markup(logger, logging.DEBUG, f"[debug]🔍 {rich_escape(message)}[/debug]")


def log_model_config(
    model_id: str, region: str, model_source: str, region_source: str
) -> None:
    """Log model configuration at startup with special formatting."""
    logger = get_logger(__name__)
    _log_markup(
        logger,
        logging.INFO,
        f"[success]🤖 MODEL CONFIG | Model: {rich_escape(model_id)} | Source: {rich_escape(model_source)}[/success]",
    )
    _log_markup(
        logger,
        logging.INFO,
        f"[success]🤖 MODEL CONFIG | Region: {rich_escape(region)} | Source: {rich_escape(region_source)}[/success]",
    )


def log_startup_banner(config, sources: dict[str, str]) -> None:
    """Log comprehensive startup configuration banner."""
    from ..config import AppConfig  # noqa: F401

    logger = get_logger(__name__)

    # Banner header
    _log_markup(logger, logging.INFO, "[workflow]" + "=" * 80 + "[/workflow]")
    _log_markup(
        logger,
        logging.INFO,
        "[workflow]🚀 THREAT COMPOSER AI - WORKFLOW STARTING[/workflow]",
    )
    _log_markup(logger, logging.INFO, "[workflow]" + "=" * 80 + "[/workflow]")

    # Invocation source
    invocation_emoji = "💻" if config.invocation_source == "CLI" else "🔌"
    _log_markup(
        logger,
        logging.INFO,
        f"[success]{invocation_emoji} INVOCATION SOURCE: {rich_escape(config.invocation_source)}[/success]",
    )

    # Session info
    session_id = config.output_directory.name
    _log_markup(
        logger, logging.INFO, f"[info]📋 SESSION ID: {rich_escape(session_id)}[/info]"
    )

    # AWS Configuration
    _log_markup(logger, logging.INFO, "[workflow]" + "-" * 80 + "[/workflow]")
    _log_markup(logger, logging.INFO, "[workflow]☁️  AWS CONFIGURATION[/workflow]")
    _log_markup(
        logger,
        logging.INFO,
        f"[success]  Profile: {rich_escape(config.aws_profile)} | Source: {rich_escape(sources.get('aws_profile', 'unknown'))}[/success]",
    )
    _log_markup(
        logger,
        logging.INFO,
        f"[success]  Region: {rich_escape(config.aws_region)} | Source: {rich_escape(sources.get('aws_region', 'unknown'))}[/success]",
    )
    _log_markup(
        logger,
        logging.INFO,
        f"[success]  Model ID: {rich_escape(config.aws_model_id)} | Source: {rich_escape(sources.get('aws_model_id', 'unknown'))}[/success]",
    )

    # Directories
    _log_markup(logger, logging.INFO, "[workflow]" + "-" * 80 + "[/workflow]")
    _log_markup(logger, logging.INFO, "[workflow]📁 DIRECTORIES[/workflow]")
    _log_markup(
        logger,
        logging.INFO,
        f"[info]  Working: {rich_escape(str(config.working_directory))}[/info]",
    )
    _log_markup(
        logger,
        logging.INFO,
        f"[info]  Output: {rich_escape(str(config.output_directory))}[/info]",
    )

    # Runtime Configuration
    _log_markup(logger, logging.INFO, "[workflow]" + "-" * 80 + "[/workflow]")
    _log_markup(logger, logging.INFO, "[workflow]⚙️  RUNTIME CONFIGURATION[/workflow]")
    _log_markup(
        logger,
        logging.INFO,
        f"[info]  Execution Timeout: {config.execution_timeout}s[/info]",
    )
    _log_markup(
        logger, logging.INFO, f"[info]  Node Timeout: {config.node_timeout}s[/info]"
    )
    _log_markup(
        logger, logging.INFO, f"[info]  Verbose Logging: {config.verbose}[/info]"
    )
    _log_markup(
        logger, logging.INFO, f"[info]  Telemetry: {config.enable_telemetry}[/info]"
    )

    # Banner footer
    _log_markup(logger, logging.INFO, "[workflow]" + "=" * 80 + "[/workflow]")
