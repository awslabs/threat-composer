"""
Working directory and output directory file reader tool.

This module wraps the strands_tools file_read functionality to allow
reading files within both the configured working directory (source code)
and output directory (generated files), preventing path traversal attacks
and ensuring agents stay within their allowed workspaces.

PREFERRED USAGE: Use relative paths (e.g., "./components/file.json", "./src/main.py")
for optimal token efficiency. Relative paths are automatically resolved to absolute
paths internally while keeping prompts concise and readable.

TOKEN OPTIMIZATION: This tool automatically converts any absolute paths in the response
back to relative paths, significantly reducing token usage in tool outputs while
maintaining full functionality.

All original file_read functionality is preserved, including:
- Multiple reading modes (view, find, lines, chunk, search, stats, preview, diff, time_machine, document)
- Wildcard pattern matching and comma-separated paths
- Rich console output with syntax highlighting
- Document block generation for Bedrock compatibility
"""

from typing import Any

from strands.types.tools import ToolResult, ToolUse
from strands_tools.file_read import TOOL_SPEC as FILE_READ_TOOL_SPEC
from strands_tools.file_read import file_read as original_file_read
from strands_tools.utils import console_util

from threat_composer_ai.tools.path_validation import (
    create_path_validation_error_message,
    validate_working_or_output_directory_path,
)
from threat_composer_ai.utils.relative_path_helper import (
    make_relative_to_working_dir,
    resolve_relative_path,
)

TOOL_SPEC = FILE_READ_TOOL_SPEC
TOOL_SPEC["name"] = "threat_composer_workdir_file_read"


def _convert_absolute_paths_to_relative_in_response(result: ToolResult) -> ToolResult:
    """
    Convert any absolute paths in the tool response back to relative paths.
    This reduces token usage in the response while maintaining functionality.
    """
    import re

    from threat_composer_ai.config import get_global_config

    config = get_global_config()
    if not config:
        return result

    working_dir_str = str(config.working_directory.resolve())

    # Function to replace absolute paths with relative paths
    def replace_absolute_with_relative(text: str) -> str:
        # Pattern to match absolute paths that start with the working directory
        pattern = re.escape(working_dir_str) + r'(/[^\s\'"]*)?'

        def replacement(match):
            full_path = match.group(0)
            return make_relative_to_working_dir(full_path)

        return re.sub(pattern, replacement, text)

    # Process the result content
    if isinstance(result, dict) and "content" in result:
        content = result["content"]
        if isinstance(content, list):
            # Process each content item
            processed_content = []
            for item in content:
                if isinstance(item, dict) and "text" in item:
                    # Convert absolute paths to relative in text content
                    item_copy = item.copy()
                    item_copy["text"] = replace_absolute_with_relative(item["text"])
                    processed_content.append(item_copy)
                else:
                    processed_content.append(item)

            # Return modified result
            result_copy = result.copy()
            result_copy["content"] = processed_content
            return result_copy

    return result


def threat_composer_workdir_file_read(tool: ToolUse, **kwargs: Any) -> ToolResult:
    tool_input = tool.get("input", {})

    try:
        # Validate required parameters
        if not tool_input.get("path"):
            raise ValueError("path parameter is required")

        if not tool_input.get("mode"):
            raise ValueError("mode parameter is required")

        # Resolve relative path to absolute path for validation and processing
        main_path = tool_input["path"]
        resolved_main_path = resolve_relative_path(main_path)

        # Validate path is in working directory OR output directory
        validate_working_or_output_directory_path(resolved_main_path, operation="read")

        # Update the tool input with resolved path for the original tool
        resolved_tool_input = tool_input.copy()
        resolved_tool_input["path"] = resolved_main_path

        # Validate comparison_path if present (for diff mode)
        if "comparison_path" in tool_input:
            comparison_path = tool_input["comparison_path"]
            if comparison_path:
                # Resolve relative path and validate
                resolved_comparison = resolve_relative_path(comparison_path)
                validate_working_or_output_directory_path(
                    resolved_comparison, operation="read"
                )

                # Update the tool input with resolved comparison path
                resolved_tool_input["comparison_path"] = resolved_comparison

        # Create a new tool structure with resolved paths
        resolved_tool = tool.copy()
        resolved_tool["input"] = resolved_tool_input

        # Call the original file_read tool with resolved paths
        result = original_file_read(resolved_tool, **kwargs)

        # Convert any absolute paths in the response back to relative paths
        return _convert_absolute_paths_to_relative_in_response(result)

    except ValueError as e:
        # Handle our validation errors with clear messaging
        console = console_util.create()
        error_msg = create_path_validation_error_message(str(e))

        # Create a user-friendly error panel
        from rich.markup import escape
        from rich.panel import Panel

        console.print(
            Panel(
                escape(error_msg), title="[bold red]Access Denied", border_style="red"
            )
        )

        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "error",
            "content": [{"text": error_msg}],
        }

    except Exception as e:
        # Handle any other errors
        console = console_util.create()
        error_msg = f"Error in working directory file reader: {str(e)}"

        from rich.markup import escape
        from rich.panel import Panel

        console.print(
            Panel(escape(error_msg), title="[bold red]Error", border_style="red")
        )

        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "error",
            "content": [{"text": error_msg}],
        }
