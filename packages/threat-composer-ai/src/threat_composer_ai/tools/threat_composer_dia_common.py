"""
Common utilities for diagram generation tools.

Shared code between architecture diagram and DFD diagram tools.
"""

import base64
import hashlib
import json
import re
import signal
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
from threat_composer_ai.validation import scan_diagram_code

# Default timeout for diagram generation (seconds)
DIAGRAM_EXECUTION_TIMEOUT = 60


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


def deduplicate_embedded_images(svg_content: str) -> str:
    """
    Deduplicate base64-embedded images in SVG using <defs>/<use> references.

    The mingrammer/diagrams library embeds the same PNG icon (e.g., the AWS EC2 icon)
    independently for every node instance. A diagram with 62 nodes but only 26 unique
    icons wastes ~65% of image data on duplicates.

    This function:
    1. Finds all <image> elements with base64 data URIs
    2. Groups them by identical image data
    3. For images used more than once, moves one copy into a <defs> block
    4. Replaces all occurrences with <use> references to the defined image

    This is a lossless transformation — the rendered SVG is visually identical.

    Args:
        svg_content: SVG string with base64-embedded images (output of embed_images_as_base64)

    Returns:
        Optimized SVG string with deduplicated images
    """
    # Match full <image> elements with base64 data URIs
    # Captures: (full element, attributes before href, data URI, attributes after href)
    image_pattern = re.compile(
        r"(<image\s)"
        r"([^>]*?)"
        r'xlink:href="(data:image/png;base64,[A-Za-z0-9+/=]+)"'
        r"([^>]*?)"
        r"(/?>)",
        re.DOTALL,
    )

    # First pass: collect all images and group by data URI
    matches = list(image_pattern.finditer(svg_content))
    if not matches:
        return svg_content

    # Map data_uri -> list of match objects
    uri_to_matches: dict[str, list[re.Match]] = {}
    for m in matches:
        data_uri = m.group(3)
        uri_to_matches.setdefault(data_uri, []).append(m)

    # Only deduplicate URIs that appear more than once
    duplicated_uris = {uri: ms for uri, ms in uri_to_matches.items() if len(ms) > 1}
    if not duplicated_uris:
        return svg_content

    # Generate stable short IDs for each unique duplicated image
    uri_to_def_id: dict[str, str] = {}
    for i, uri in enumerate(duplicated_uris):
        uri_to_def_id[uri] = f"dedup-img-{i}"

    # Build <defs> block with one <image> definition per unique duplicated image
    # Extract width/height from the first occurrence of each
    defs_entries = []
    for uri, ms in duplicated_uris.items():
        def_id = uri_to_def_id[uri]
        first_match = ms[0]
        # Combine pre and post attributes to extract width/height
        all_attrs = first_match.group(2) + " " + first_match.group(4)

        width_m = re.search(r'width="([^"]*)"', all_attrs)
        height_m = re.search(r'height="([^"]*)"', all_attrs)
        width_attr = f' width="{width_m.group(1)}"' if width_m else ""
        height_attr = f' height="{height_m.group(1)}"' if height_m else ""

        defs_entries.append(
            f'<image id="{def_id}" xlink:href="{uri}"{width_attr}{height_attr}/>'
        )

    defs_block = "<defs>\n" + "\n".join(defs_entries) + "\n</defs>"

    # Second pass: collect all replacements, then apply from end to start
    # so string offsets remain valid across all URI groups
    replacements: list[tuple[int, int, str]] = []  # (start, end, replacement_str)
    for uri, ms in duplicated_uris.items():
        def_id = uri_to_def_id[uri]
        for m in ms:
            all_attrs = m.group(2) + " " + m.group(4)

            # Preserve position attributes (x, y, transform) from each instance
            preserved = []
            for attr_name in ("x", "y", "transform"):
                attr_m = re.search(rf'{attr_name}="([^"]*)"', all_attrs)
                if attr_m:
                    preserved.append(f'{attr_name}="{attr_m.group(1)}"')

            # Preserve width/height per instance (they may differ)
            for attr_name in ("width", "height"):
                attr_m = re.search(rf'{attr_name}="([^"]*)"', all_attrs)
                if attr_m:
                    preserved.append(f'{attr_name}="{attr_m.group(1)}"')

            preserved_str = " ".join(preserved)
            use_element = f'<use xlink:href="#{def_id}" {preserved_str}/>'
            replacements.append((m.start(), m.end(), use_element))

    # Sort by start position descending so later replacements don't shift earlier offsets
    replacements.sort(key=lambda r: r[0], reverse=True)

    result = svg_content
    for start, end, replacement in replacements:
        result = result[:start] + replacement + result[end:]

    # Insert <defs> block after the opening <svg ...> tag
    svg_open_end = re.search(r"<svg[^>]*>", result)
    if svg_open_end:
        insert_pos = svg_open_end.end()
        result = result[:insert_pos] + "\n" + defs_block + "\n" + result[insert_pos:]

    return result


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
    timeout: int = DIAGRAM_EXECUTION_TIMEOUT,
    **kwargs: Any,
) -> ToolResult:
    """
    Execute diagram code and generate SVG output.

    Security measures:
    - Pre-execution code scanning (blocks imports, dangerous functions)
    - Restricted namespace (limited builtins)
    - Execution timeout protection

    Args:
        tool: The tool use request
        diagram_type: Type of diagram for logging (e.g., "Architecture", "DFD")
        output_path: Path where the SVG should be saved
        namespace: Restricted namespace for code execution
        timeout: Execution timeout in seconds (default: 60)

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

        # Security scan the code before execution
        scan_result = scan_diagram_code(code)
        if not scan_result.is_safe:
            error_msg = (
                f"Security issues found in diagram code: {scan_result.error_message}"
            )
            log_error(error_msg)
            console.print(
                Panel(
                    Text(error_msg, style="bold red"),
                    title="[bold red]Security Error",
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

            log_debug("Executing diagram code in restricted namespace with timeout")

            # Set up timeout handler
            def timeout_handler(signum, frame):
                raise TimeoutError(
                    f"Diagram generation timed out after {timeout} seconds"
                )

            # Register timeout (Unix only - gracefully skip on Windows)
            old_handler = None
            try:
                old_handler = signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(timeout)
            except (AttributeError, ValueError):
                # SIGALRM not available on Windows
                pass

            try:
                # Execute the code in restricted namespace
                # nosec B102 - Code is pre-scanned for security issues
                exec(modified_code, namespace)  # noqa: S102
            finally:
                # Cancel the alarm and restore handler
                try:
                    signal.alarm(0)
                    if old_handler is not None:
                        signal.signal(signal.SIGALRM, old_handler)
                except (AttributeError, ValueError):
                    pass

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
            svg_content = deduplicate_embedded_images(svg_content)
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

    except TimeoutError as e:
        error_msg = str(e)
        log_error(error_msg)
        console.print(
            Panel(
                Text(error_msg, style="bold red"),
                title="[bold red]Timeout Error",
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
