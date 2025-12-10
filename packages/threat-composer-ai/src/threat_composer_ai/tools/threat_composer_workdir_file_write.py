"""
Output directory restricted file writer tool.

This module wraps the strands_tools file_write functionality to only allow
writing files within the configured output directory, preventing path
traversal attacks and ensuring agents stay within their designated output space.

PREFERRED USAGE: Use relative paths (e.g., "./components/file.json", "./output/data.txt")
for optimal token efficiency. Relative paths are automatically resolved to absolute
paths internally while keeping prompts concise and readable.

All original file_write functionality is preserved, including:
- Interactive confirmation for write operations
- Rich console output with syntax highlighting
- Automatic directory creation
- File type detection and preview
"""

import hashlib
import json
from pathlib import Path
from typing import Any

from strands.types.tools import ToolResult, ToolUse
from strands_tools.file_write import TOOL_SPEC as FILE_WRITE_TOOL_SPEC
from strands_tools.file_write import file_write as original_file_write
from strands_tools.utils import console_util

from threat_composer_ai.config import get_global_config
from threat_composer_ai.tools.path_validation import (
    create_path_validation_error_message,
    validate_output_directory_path,
)
from threat_composer_ai.utils import now_utc_timestamp
from threat_composer_ai.utils.relative_path_helper import resolve_relative_path

TOOL_SPEC = FILE_WRITE_TOOL_SPEC
TOOL_SPEC["name"] = "threat_composer_workdir_file_write"


def _hash_file(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    try:
        with open(file_path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except FileNotFoundError:
        return ""  # File doesn't exist


def _write_hash_file_for_output(file_path: str, config):
    """Write individual hash file for a specific output file.

    Args:
        file_path: Path to the file that was just created
        config: AppConfig instance
    """
    try:
        # Calculate hash of the file
        file_hash = _hash_file(file_path)
        filename = Path(file_path).name

        # Create simplified hash data
        hash_data = {"hash": f"sha256:{file_hash}", "timestamp": now_utc_timestamp()}

        # Ensure hashes directory exists
        hashes_dir = config.output_directory / config.hashes_output_sub_dir
        hashes_dir.mkdir(parents=True, exist_ok=True)

        # Write individual hash file
        hash_file_path = hashes_dir / f"{filename}.hash"
        with open(hash_file_path, "w", encoding="utf-8") as f:
            json.dump(hash_data, f, indent=2)

    except Exception:
        # Log error but don't fail the main operation
        pass  # Silent failure for hash writing


def threat_composer_workdir_file_write(tool: ToolUse, **kwargs: Any) -> ToolResult:
    tool_input = tool.get("input", {})

    try:
        # Validate required parameters
        if not tool_input.get("path"):
            raise ValueError("path parameter is required")

        if "content" not in tool_input:
            raise ValueError("content parameter is required")

        # Resolve relative path to absolute path for validation and processing
        file_path = tool_input["path"]
        resolved_file_path = resolve_relative_path(file_path)
        validate_output_directory_path(resolved_file_path, operation="write")

        # Update the tool input with resolved path for the original tool
        resolved_tool_input = tool_input.copy()
        resolved_tool_input["path"] = resolved_file_path

        # Create a new tool structure with resolved paths
        resolved_tool = tool.copy()
        resolved_tool["input"] = resolved_tool_input

        # Call the original file_write tool with resolved paths
        result = original_file_write(resolved_tool, **kwargs)

        # If file write was successful, write hash file immediately
        if result.get("status") != "error":
            try:
                config = get_global_config()
                if config:
                    # Write individual hash file for this output (use resolved path)
                    _write_hash_file_for_output(resolved_file_path, config)
            except Exception as hash_error:
                # Don't fail the main operation if hash writing fails
                from threat_composer_ai.logging import log_debug

                log_debug(f"Failed to write hash file for {file_path}: {hash_error}")

        return result

    except ValueError as e:
        # Handle our validation errors with clear messaging
        console = console_util.create()
        error_msg = create_path_validation_error_message(str(e))

        # Create a user-friendly error panel
        from rich import box
        from rich.panel import Panel
        from rich.text import Text

        console.print(
            Panel(
                Text(error_msg, style="bold red"),
                title="[bold red]Access Denied",
                border_style="red",
                box=box.HEAVY,
                expand=False,
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
        error_msg = f"Error in working directory file writer: {str(e)}"

        from rich import box
        from rich.panel import Panel
        from rich.text import Text

        console.print(
            Panel(
                Text(error_msg, style="bold red"),
                title="[bold red]Error",
                border_style="red",
                box=box.HEAVY,
                expand=False,
            )
        )

        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "error",
            "content": [{"text": error_msg}],
        }
