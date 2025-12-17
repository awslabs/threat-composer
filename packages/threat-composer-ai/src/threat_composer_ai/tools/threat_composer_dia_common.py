"""
Common utilities for diagram generation tools.

Shared code between architecture diagram and DFD diagram tools.
"""

import base64
import hashlib
import json
import re
import tempfile
from pathlib import Path
from typing import Any

from diagrams import Cluster, Diagram, Edge
from rich import box
from rich.panel import Panel
from rich.text import Text
from strands.types.tools import ToolResult, ToolUse
from strands_tools.utils import console_util

from threat_composer_ai.config import get_global_config
from threat_composer_ai.logging import log_debug, log_error, log_success
from threat_composer_ai.utils import now_utc_timestamp


def embed_images_as_base64(svg_content: str) -> str:
    """
    Embed external image references as base64 data URIs.

    This makes the SVG self-contained and portable.
    """

    def replace_image_href(match: re.Match) -> str:
        """Replace xlink:href with base64 data URI."""
        full_match = match.group(0)
        file_path = match.group(1)

        try:
            path = Path(file_path)
            if path.exists() and path.suffix.lower() == ".png":
                with open(path, "rb") as f:
                    image_data = base64.b64encode(f.read()).decode("utf-8")
                return full_match.replace(
                    f'xlink:href="{file_path}"',
                    f'xlink:href="data:image/png;base64,{image_data}"',
                )
        except Exception:
            pass  # Keep original reference if embedding fails

        return full_match

    # Match xlink:href="..." attributes pointing to files
    pattern = r'xlink:href="([^"]+\.png)"'
    return re.sub(pattern, replace_image_href, svg_content)


def inject_diagram_params(code: str, filename: str, output_dir: str) -> str:
    """
    Inject filename and outformat parameters into Diagram() calls.

    This modifies the code to ensure:
    - Output goes to the specified directory
    - Output format is SVG
    - show=False (don't try to open the file)
    """
    lines = code.split("\n")
    modified_lines = []

    for line in lines:
        if "Diagram(" in line and "with " in line:
            # Context manager usage: with Diagram(...):
            # Need to inject keyword args AFTER any positional args

            # Build the params to inject (only if not already present)
            params_to_add = []
            if "filename=" not in line:
                params_to_add.append(f'filename="{output_dir}/{filename}"')
            if "outformat=" not in line:
                params_to_add.append('outformat="svg"')
            if "show=" not in line:
                params_to_add.append("show=False")

            if params_to_add:
                # Find the closing paren before the colon
                match = re.search(r"(.*Diagram\([^)]*)\)(\s*:.*)", line)
                if match:
                    before_close = match.group(1)
                    after_close = match.group(2)
                    # Check if there are existing args (not just empty parens)
                    diagram_args = before_close[before_close.rfind("Diagram(") + 8 :]
                    has_args = len(diagram_args.strip()) > 0
                    if has_args:
                        injection = ", " + ", ".join(params_to_add)
                    else:
                        injection = ", ".join(params_to_add)
                    line = before_close + injection + ")" + after_close

        modified_lines.append(line)

    return "\n".join(modified_lines)


def write_hash_file(file_path: Path) -> None:
    """Write hash file for the generated diagram."""
    try:
        config = get_global_config()
        if not config:
            return

        # Calculate hash
        with open(file_path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()

        # Create hash data
        hash_data = {
            "hash": f"sha256:{file_hash}",
            "timestamp": now_utc_timestamp(),
        }

        # Ensure hashes directory exists
        hashes_dir = config.output_directory / config.hashes_output_sub_dir
        hashes_dir.mkdir(parents=True, exist_ok=True)

        # Write hash file
        hash_file_path = hashes_dir / f"{file_path.name}.hash"
        with open(hash_file_path, "w", encoding="utf-8") as f:
            json.dump(hash_data, f, indent=2)

    except Exception:
        # Silent failure for hash writing
        pass


def get_base_builtins() -> dict[str, Any]:
    """Get the safe subset of builtins for diagram execution."""
    return {
        "True": True,
        "False": False,
        "None": None,
        "str": str,
        "int": int,
        "float": float,
        "list": list,
        "dict": dict,
        "tuple": tuple,
        "len": len,
        "range": range,
        "print": print,
    }


def get_core_diagram_classes() -> dict[str, Any]:
    """Get core diagrams library classes."""
    return {
        "Diagram": Diagram,
        "Cluster": Cluster,
        "Edge": Edge,
    }


def execute_diagram_code(
    tool: ToolUse,
    diagram_type: str,
    output_path: Path,
    namespace: dict[str, Any],
    **kwargs: Any,
) -> ToolResult:
    """
    Execute diagram code and generate SVG output.

    Args:
        tool: The tool use request
        diagram_type: Type of diagram for logging (e.g., "Architecture", "DFD")
        output_path: Path where the SVG should be saved
        namespace: Restricted namespace for code execution

    Returns:
        ToolResult with success or error status
    """
    tool_input = tool.get("input", {})
    console = console_util.create()

    try:
        # Validate required parameters
        code = tool_input.get("code")
        if not code:
            raise ValueError("code parameter is required")

        output_dir = output_path.parent

        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)

        # The diagrams library outputs to current directory by default
        diagram_name = output_path.stem

        log_debug(f"Generating {diagram_type} diagram to: {output_path}")

        # Use a temp directory for diagram generation
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Modify code to set output directory and filename
            modified_code = inject_diagram_params(code, diagram_name, str(temp_path))

            log_debug("Executing diagram code in restricted namespace")

            # Execute the code in restricted namespace
            exec(modified_code, namespace)  # nosec

            # Find the generated SVG file
            svg_files = list(temp_path.glob("*.svg"))
            if not svg_files:
                # Check for PNG (default format)
                png_files = list(temp_path.glob("*.png"))
                if png_files:
                    raise ValueError(
                        "Diagram generated PNG instead of SVG. "
                        "Ensure Diagram() uses outformat='svg'"
                    )
                raise ValueError("No diagram output file generated")

            # Read SVG and embed images as base64 data URIs
            svg_content = svg_files[0].read_text(encoding="utf-8")
            svg_content = embed_images_as_base64(svg_content)
            output_path.write_text(svg_content, encoding="utf-8")

        log_success(f"{diagram_type} diagram generated: {output_path}")

        # Write hash file for the output
        write_hash_file(output_path)

        # Display success
        console.print(
            Panel(
                Text(f"{diagram_type} diagram saved to:\n{output_path}", style="green"),
                title="[bold green]Diagram Generated",
                border_style="green",
                box=box.ROUNDED,
                expand=False,
            )
        )

        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "success",
            "content": [
                {
                    "text": f"{diagram_type} diagram successfully generated and saved to {output_path}"
                }
            ],
        }

    except SyntaxError as e:
        error_msg = f"Syntax error in diagram code: {e}"
        log_error(error_msg)
        console.print(
            Panel(
                Text(error_msg, style="bold red"),
                title="[bold red]Syntax Error",
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
        error_msg = f"Error generating {diagram_type} diagram: {e}"
        log_error(error_msg)
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
