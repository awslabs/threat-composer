"""
Common utilities for diagram generation tools.

The diagram tools take structured data and draw it with the diagrams library.
"""

import base64
import hashlib
import json
import re
import tempfile
from collections import defaultdict
from collections.abc import Callable
from pathlib import Path
from typing import Annotated, Any, Literal

from diagrams import Cluster, Diagram, Edge, Node
from graphviz import nohtml
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationError,
)
from rich import box
from rich.panel import Panel
from rich.text import Text
from strands.types.tools import ToolResult, ToolUse
from strands_tools.utils import console_util

from threat_composer_ai.config import get_global_config
from threat_composer_ai.logging import log_debug, log_error, log_success
from threat_composer_ai.utils import now_utc_timestamp

# Limits keep the graph small enough for graphviz to lay out quickly.
MAX_NODES = 300
MAX_EDGES = 600
MAX_GROUPS = 100
MAX_GROUP_DEPTH = 8
MAX_LABEL_LENGTH = 200

Id = Annotated[
    str, StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z0-9_.:-]{1,64}$")
]
Label = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=MAX_LABEL_LENGTH)
]
Direction = Literal["LR", "TB", "RL", "BT"]

_CONTROL_CHARS = re.compile(r"[\x00-\x09\x0b-\x1f\x7f]")


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


def safe_label(text: str) -> str:
    """Return text as a plain graphviz label, drawn exactly as written."""
    text = _CONTROL_CHARS.sub(" ", text)
    text = text.replace("\\", "\\\\").replace('"', '\\"')
    return nohtml(text)


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GroupSpec(_Strict):
    id: Id = Field(description="Short unique id")
    label: Label = Field(description="Name shown on the group")
    parent: Id | None = Field(
        default=None, description="Id of the group this one is nested in"
    )


class EdgeSpec(_Strict):
    source: Id = Field(description="Id of the node the edge starts at")
    target: Id = Field(description="Id of the node the edge ends at")
    label: Label = Field(default="", description="Text shown on the edge")
    direction: Literal["forward", "back", "both", "none"] = Field(
        default="forward", description="Which ends of the edge have an arrow"
    )
    style: Literal["solid", "dashed", "dotted", "bold"] = Field(
        default="solid", description="Line style"
    )

    def text(self) -> str:
        """Return the text drawn on the edge."""
        return self.label


class NodeSpec(_Strict):
    id: Id = Field(description="Short unique id")
    label: Label = Field(description="Name shown on the node")


class DiagramSpec(_Strict):
    """Base for a diagram drawn from data. Subclasses name the groups and nodes."""

    title: Label = Field(description="Diagram title")
    direction: Direction = Field(
        default="LR",
        description="Layout direction: LR (left to right), TB, RL or BT",
    )

    def groups(self) -> list[GroupSpec]:
        raise NotImplementedError

    def nodes(self) -> list[tuple[NodeSpec, str | None]]:
        """Return each node with the id of the group that holds it."""
        raise NotImplementedError

    def links(self) -> list[EdgeSpec]:
        raise NotImplementedError

    def problems(self) -> list[str]:
        """Return reference and structure errors. Empty means valid."""
        problems: list[str] = []
        groups = {g.id: g for g in self.groups()}
        node_ids: set[str] = set()
        seen: set[str] = set()

        for item_id in [g.id for g in self.groups()] + [n.id for n, _ in self.nodes()]:
            if item_id in seen:
                problems.append(f"duplicate id '{item_id}'")
            seen.add(item_id)

        for node, group_id in self.nodes():
            node_ids.add(node.id)
            if group_id is not None and group_id not in groups:
                problems.append(f"node '{node.id}' is in unknown group '{group_id}'")

        for group in groups.values():
            depth, current, visited = 1, group, {group.id}
            while current.parent is not None:
                parent = groups.get(current.parent)
                if parent is None:
                    problems.append(
                        f"group '{current.id}' has unknown parent '{current.parent}'"
                    )
                    break
                if parent.id in visited:
                    problems.append(f"group '{group.id}' is in a parent cycle")
                    break
                visited.add(parent.id)
                depth += 1
                current = parent
            if depth > MAX_GROUP_DEPTH:
                problems.append(
                    f"group '{group.id}' is nested deeper than {MAX_GROUP_DEPTH}"
                )

        for i, edge in enumerate(self.links()):
            for end in (edge.source, edge.target):
                if end not in node_ids:
                    problems.append(f"link {i} refers to unknown node '{end}'")

        return problems


def parse_spec(tool_input: dict[str, Any], spec_cls: type[DiagramSpec]) -> DiagramSpec:
    """Validate tool input against spec_cls. Raises ValueError with all problems."""
    data = dict(tool_input or {})
    # Some models send a list or object field as a JSON string.
    for key, value in data.items():
        if key not in ("title", "direction") and isinstance(value, str):
            try:
                data[key] = json.loads(value)
            except json.JSONDecodeError:
                pass
    try:
        spec = spec_cls.model_validate(data)
    except ValidationError as e:
        details = "; ".join(
            f"{'.'.join(str(p) for p in err['loc']) or 'input'}: {err['msg']}"
            for err in e.errors()[:20]
        )
        raise ValueError(f"Invalid diagram input: {details}") from e
    problems = spec.problems()
    if problems:
        raise ValueError("Invalid diagram input: " + "; ".join(problems[:20]))
    return spec


def _inline_refs(schema: Any, defs: dict[str, Any]) -> Any:
    if isinstance(schema, dict):
        ref = schema.get("$ref")
        if ref:
            return _inline_refs(defs[ref.rsplit("/", 1)[-1]], defs)
        return {k: _inline_refs(v, defs) for k, v in schema.items() if k != "$defs"}
    if isinstance(schema, list):
        return [_inline_refs(v, defs) for v in schema]
    return schema


def tool_input_schema(spec_cls: type[BaseModel]) -> dict[str, Any]:
    """Return the JSON Schema for a tool input, with every $ref inlined."""
    schema = spec_cls.model_json_schema()
    return _inline_refs(schema, schema.get("$defs", {}))


def render_svg(
    spec: DiagramSpec,
    make_node: Callable[[NodeSpec], Node],
    cluster_cls: type[Cluster],
) -> str:
    """Draw a validated spec and return self-contained SVG."""
    children: dict[str | None, list[GroupSpec]] = defaultdict(list)
    for group in spec.groups():
        children[group.parent].append(group)
    nodes_in: dict[str | None, list[NodeSpec]] = defaultdict(list)
    for node, group_id in spec.nodes():
        nodes_in[group_id].append(node)

    drawn: dict[str, Node] = {}

    def draw_group(group_id: str | None) -> None:
        for node in nodes_in[group_id]:
            drawn[node.id] = make_node(node)
        for child in children[group_id]:
            with cluster_cls(safe_label(child.label)):
                draw_group(child.id)

    with tempfile.TemporaryDirectory() as temp_dir:
        base = Path(temp_dir) / "diagram"
        with Diagram(
            safe_label(spec.title),
            filename=str(base),
            outformat="svg",
            show=False,
            direction=spec.direction,
        ):
            draw_group(None)
            for edge in spec.links():
                drawn[edge.source].connect(
                    drawn[edge.target],
                    Edge(
                        forward=edge.direction in ("forward", "both"),
                        reverse=edge.direction in ("back", "both"),
                        label=safe_label(edge.text()),
                        style=edge.style,
                    ),
                )
        svg = base.with_suffix(".svg").read_text(encoding="utf-8")
        svg = embed_images_as_base64(svg)
    return deduplicate_embedded_images(svg)


def _panel(console: Any, message: str, title: str, ok: bool) -> None:
    console.print(
        Panel(
            Text(message, style="green" if ok else "bold red"),
            title=f"[bold {'green' if ok else 'red'}]{title}",
            border_style="green" if ok else "red",
            box=box.ROUNDED if ok else box.HEAVY,
            expand=False,
        )
    )


def run_diagram_tool(
    tool: ToolUse,
    diagram_type: str,
    output_path: Path,
    spec_cls: type[DiagramSpec],
    make_node: Callable[[NodeSpec], Node],
    cluster_cls: type[Cluster] = Cluster,
) -> ToolResult:
    """Validate the tool input, draw the diagram and write the SVG."""
    console = console_util.create()
    tool_use_id = tool.get("toolUseId", "default-id")
    try:
        spec = parse_spec(tool.get("input", {}), spec_cls)
        log_debug(f"Generating {diagram_type} diagram to: {output_path}")
        svg = render_svg(spec, make_node, cluster_cls)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(svg, encoding="utf-8")
        write_hash_file(output_path)
    except Exception as e:
        error_msg = f"Error generating {diagram_type} diagram: {e}"
        log_error(error_msg)
        _panel(console, error_msg, "Error", ok=False)
        return {
            "toolUseId": tool_use_id,
            "status": "error",
            "content": [{"text": error_msg}],
        }

    log_success(f"{diagram_type} diagram generated: {output_path}")
    _panel(
        console,
        f"{diagram_type} diagram saved to:\n{output_path}",
        "Diagram Generated",
        ok=True,
    )
    return {
        "toolUseId": tool_use_id,
        "status": "success",
        "content": [
            {
                "text": f"{diagram_type} diagram successfully generated and saved to {output_path}"
            }
        ],
    }
