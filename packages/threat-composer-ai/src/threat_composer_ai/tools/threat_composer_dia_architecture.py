"""
Architecture Diagram generation tool.

Takes the architecture as structured data and draws it with the diagrams
library. Icons are names checked against the icons the library ships.
"""

import difflib
import importlib
import inspect
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import diagrams
from diagrams import Node
from diagrams.custom import Custom
from pydantic import Field
from strands.types.tools import ToolResult, ToolUse

from threat_composer_ai.config import get_global_config
from threat_composer_ai.tools.threat_composer_dia_common import (
    MAX_EDGES,
    MAX_GROUPS,
    MAX_NODES,
    DiagramSpec,
    EdgeSpec,
    GroupSpec,
    Id,
    NodeSpec,
    run_diagram_tool,
    safe_label,
    tool_input_schema,
)

# custom takes a file path, not a library icon.
EXCLUDED_PROVIDERS = {"custom", "__pycache__", "_template"}


@lru_cache(maxsize=1)
def get_icon_index() -> dict[str, type[Node]]:
    """Map "provider.service.Class" to each icon class in the diagrams library."""
    index: dict[str, type[Node]] = {}
    root = os.path.dirname(diagrams.__file__)
    for provider in sorted(os.listdir(root)):
        provider_path = os.path.join(root, provider)
        if (
            not os.path.isdir(provider_path)
            or provider.startswith("_")
            or provider in EXCLUDED_PROVIDERS
        ):
            continue
        for service_file in sorted(os.listdir(provider_path)):
            if not service_file.endswith(".py") or service_file.startswith("_"):
                continue
            service = service_file[:-3]
            try:
                # Module names come from the installed package, not from input
                module = importlib.import_module(f"diagrams.{provider}.{service}")  # nosec
            except ImportError:
                continue
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if (
                    not name.startswith("_")
                    and issubclass(obj, Node)
                    and not issubclass(obj, Custom)
                    and getattr(obj, "_icon", None)
                ):
                    index[f"{provider}.{service}.{name}"] = obj
    return index


def resolve_icon(icon: str) -> type[Node]:
    """Return the icon class for an allowlisted name. Raises ValueError otherwise."""
    index = get_icon_index()
    key = icon.strip().removeprefix("diagrams.")
    if key in index:
        return index[key]
    if "." not in key:
        matches = sorted(k for k in index if k.rsplit(".", 1)[1] == key)
        if len(matches) == 1:
            return index[matches[0]]
        if matches:
            raise ValueError(
                f"icon '{icon}' is ambiguous, use one of: {', '.join(matches[:8])}"
            )
    suggestions = suggest_icons(key)
    hint = (
        f"did you mean: {', '.join(suggestions)}"
        if suggestions
        else "use threat_composer_dia_list_icons to find one"
    )
    raise ValueError(f"unknown icon '{icon}', {hint}")


def suggest_icons(name: str, limit: int = 5) -> list[str]:
    """Return the allowlisted icon names closest to name."""
    index = get_icon_index()
    suggestions = difflib.get_close_matches(name, index, n=limit, cutoff=0.6)
    if suggestions:
        return suggestions
    # Fall back to icons with the same class name in any provider or service.
    leaf = name.rsplit(".", 1)[-1].lower()
    return [k for k in index if k.rsplit(".", 1)[1].lower() == leaf][:limit]


def icon_tree() -> dict[str, dict[str, list[str]]]:
    """Return {provider: {service: [class names]}} from the icon index."""
    tree: dict[str, dict[str, list[str]]] = {}
    for key in get_icon_index():
        provider, service, name = key.split(".")
        tree.setdefault(provider, {}).setdefault(service, []).append(name)
    return {
        provider: {service: sorted(names) for service, names in services.items()}
        for provider, services in tree.items()
    }


class ArchitectureNode(NodeSpec):
    icon: str | None = Field(
        default=None,
        max_length=128,
        description=(
            'Icon as "provider.service.Class" from threat_composer_dia_list_icons, '
            'e.g. "aws.compute.EC2". Leave out for a plain box.'
        ),
    )
    cluster: Id | None = Field(
        default=None, description="Id of the cluster that holds the node"
    )


class ArchitectureSpec(DiagramSpec):
    clusters: list[GroupSpec] = Field(
        default_factory=list,
        max_length=MAX_GROUPS,
        description="Groupings such as accounts, VPCs and subnets",
    )
    nodes_: list[ArchitectureNode] = Field(
        alias="nodes", max_length=MAX_NODES, description="Components to draw"
    )
    edges: list[EdgeSpec] = Field(
        default_factory=list,
        max_length=MAX_EDGES,
        description="Connections between node ids",
    )

    def groups(self) -> list[GroupSpec]:
        return self.clusters

    def nodes(self) -> list[tuple[NodeSpec, str | None]]:
        return [(n, n.cluster) for n in self.nodes_]

    def links(self) -> list[EdgeSpec]:
        return self.edges

    def problems(self) -> list[str]:
        problems = super().problems()
        for node in self.nodes_:
            if node.icon:
                try:
                    resolve_icon(node.icon)
                except ValueError as e:
                    problems.append(f"node '{node.id}': {e}")
        return problems


TOOL_SPEC = {
    "name": "threat_composer_dia_architecture",
    "description": """Draw an Architecture Diagram as SVG from structured data.

Give every node and cluster a short unique id. Edges and nesting refer to those ids.

- nodes: icon is "provider.service.Class" as listed by threat_composer_dia_list_icons, e.g. "aws.compute.EC2". A bare class name such as "EC2" works when it is unique. Leave icon out for a plain box.
- clusters: groupings such as accounts, VPCs and subnets. Set parent to nest one cluster in another.
- edges: connections between node ids, with an optional label. direction is forward (default), back, both or none. style is solid (default), dashed, dotted or bold.

Example:
{
  "title": "Web Service Architecture",
  "direction": "LR",
  "clusters": [
    {"id": "vpc", "label": "VPC"},
    {"id": "app", "label": "Application Tier", "parent": "vpc"}
  ],
  "nodes": [
    {"id": "lb", "icon": "aws.network.ELB", "label": "Load Balancer", "cluster": "vpc"},
    {"id": "web", "icon": "aws.compute.EC2", "label": "Web", "cluster": "app"},
    {"id": "db", "icon": "aws.database.RDS", "label": "PostgreSQL", "cluster": "vpc"}
  ],
  "edges": [
    {"source": "lb", "target": "web", "label": "HTTPS"},
    {"source": "web", "target": "db", "label": "SQL"}
  ]
}

The output SVG file path is determined automatically from configuration.
""",
    "inputSchema": tool_input_schema(ArchitectureSpec),
}


def _make_node(node: ArchitectureNode) -> Node:
    node_cls = resolve_icon(node.icon) if node.icon else Node
    return node_cls(safe_label(node.label))


def _get_output_path() -> Path:
    """Get the output path for the architecture diagram from config."""
    config = get_global_config()
    if not config:
        raise ValueError("Global config not initialized")

    return (
        config.output_directory
        / config.components_output_sub_dir
        / config.architecture_diagram_filename
    )


def threat_composer_dia_architecture(tool: ToolUse, **kwargs: Any) -> ToolResult:
    """Draw the architecture diagram from structured data and write the SVG."""
    return run_diagram_tool(
        tool=tool,
        diagram_type="Architecture",
        output_path=_get_output_path(),
        spec_cls=ArchitectureSpec,
        make_node=_make_node,
    )
