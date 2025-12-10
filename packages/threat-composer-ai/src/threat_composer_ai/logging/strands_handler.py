"""Unified strands callback handler with rich formatting integration."""

from ..config import AppConfig
from ..utils import format_path_for_display
from .rich_logger import (
    log_agent_message,
    log_agent_tool_use,
    log_debug,
    set_agent_context,
)


class StrandsRichHandler:
    """
    Enhanced callback handler for strands agents that integrates with the existing rich logger.
    """

    def __init__(
        self,
        agent_name: str | None = None,
        show_assistant_messages: bool = True,
        show_tool_use: bool = True,
        auto_context: bool = True,
        config: AppConfig | None = None,
    ):
        """
        Initialize the strands rich handler.

        Args:
            agent_name: Name of the agent (used for context and logging)
            show_assistant_messages: Whether to display assistant messages
            show_tool_use: Whether to display tool use
            auto_context: Whether to automatically manage agent context
            config: Optional AppConfig for path formatting and other settings
        """
        self.agent_name = agent_name
        self.show_assistant_messages = show_assistant_messages
        self.show_tool_use = show_tool_use
        self.auto_context = auto_context
        self.config = config

        # Set agent context if specified and auto_context is enabled
        if self.auto_context and self.agent_name:
            set_agent_context(self.agent_name)
            log_debug(f"Strands handler initialized for agent: {self.agent_name}")

    def __call__(self, **kwargs) -> None:
        """
        Handle strands callback events with rich formatting.
        """
        try:
            # When a new message is created from the assistant, print its content
            if "message" in kwargs and kwargs["message"].get("role") == "assistant":
                # Process each content item in the message
                for content_item in kwargs["message"]["content"]:
                    # 1. If there is a message (text), output the text via log_agent_message
                    if "text" in content_item:
                        if self.show_assistant_messages:
                            log_agent_message(
                                self.agent_name or "agent", content_item["text"]
                            )

                    # 2. If there is toolUse, output the name, mode and path via log_agent_tool_use
                    if "toolUse" in content_item:
                        if self.show_tool_use:
                            tool_use = content_item["toolUse"]
                            tool_name = tool_use.get("name", "unknown")
                            tool_input = tool_use.get("input", {})
                            mode = tool_input.get("mode", "unknown")
                            path = tool_input.get("path", "unknown")

                            # Format path for display if config is available
                            if self.config and path != "unknown":
                                try:
                                    formatted_path = format_path_for_display(
                                        path,
                                        str(self.config.working_directory),
                                        self.config.path_display_max_length,
                                    )
                                except Exception:
                                    # Fallback to original path if formatting fails
                                    formatted_path = path
                            else:
                                formatted_path = path

                            log_message = f"Tool: {tool_name}"

                            log_details_segments = []

                            if mode and mode != "unknown":
                                log_details_segments.append(f"Mode: {mode}")
                            if path and path != "unknown":
                                log_details_segments.append(f"Path: {formatted_path}")

                            log_detail = ", ".join(log_details_segments)

                            log_agent_tool_use(
                                self.agent_name or "agent", log_message, log_detail
                            )

        except Exception as e:
            # Ensure callback errors don't break agent execution
            log_debug(f"Error in strands callback handler for {self.agent_name}: {e}")


def create_strands_rich_handler(
    agent_name: str | None = None,
    show_assistant_messages: bool = True,
    show_tool_use: bool = True,
    auto_context: bool = True,
    config: AppConfig | None = None,
) -> StrandsRichHandler:
    """
    Factory function to create a strands rich handler with sensible defaults.

    Args:
        agent_name: Name of the agent for context
        show_assistant_messages: Whether to display assistant messages
        show_tool_use: Whether to display tool use
        auto_context: Whether to automatically manage agent context
        config: Optional AppConfig for path formatting and other settings

    Returns:
        Configured StrandsRichHandler instance
    """
    return StrandsRichHandler(
        agent_name=agent_name,
        show_assistant_messages=show_assistant_messages,
        show_tool_use=show_tool_use,
        auto_context=auto_context,
        config=config,
    )
