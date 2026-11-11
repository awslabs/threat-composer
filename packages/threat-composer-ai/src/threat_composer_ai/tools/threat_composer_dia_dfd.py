"""
Data Flow Diagram generation tool.

Takes the DFD as structured data and draws it with the custom DFD node classes.
"""

from collections import Counter
from pathlib import Path
from typing import Annotated, Any, Literal

from diagrams import Node
from pydantic import Field, StringConstraints
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
    Label,
    NodeSpec,
    run_diagram_tool,
    safe_label,
    tool_input_schema,
)
from threat_composer_ai.tools.threat_composer_dia_nodes import (
    Datastore,
    ExternalEntity,
    HumanActor,
    Process,
    TrustBoundary,
)

NODE_CLASSES = {
    "human_actor": HumanActor,
    "external_entity": ExternalEntity,
    "process": Process,
    "datastore": Datastore,
}

FLOW_ID_PATTERN = r"^DF[0-9]{1,4}$"


class DfdElement(NodeSpec):
    type: Literal["human_actor", "external_entity", "process", "datastore"] = Field(
        description="Element shape"
    )
    trust_boundary: Id | None = Field(
        default=None, description="Id of the trust boundary that holds the element"
    )


class DfdFlow(EdgeSpec):
    id: Annotated[str, StringConstraints(strip_whitespace=True)] = Field(
        pattern=FLOW_ID_PATTERN,
        description="Data flow id from the dataflow description: DF1, DF2, ...",
    )
    label: Label = Field(description="Short description of the data, without the DF id")

    def text(self) -> str:
        label = self.label
        # Don't draw the id twice when the label already starts with it.
        prefix = f"{self.id}:"
        if label.startswith(prefix):
            label = label[len(prefix) :].strip()
        return f"{self.id}: {label}" if label else self.id


class DfdSpec(DiagramSpec):
    trust_boundaries: list[GroupSpec] = Field(
        default_factory=list,
        max_length=MAX_GROUPS,
        description="Dashed trust zones. Set parent to nest one in another.",
    )
    elements: list[DfdElement] = Field(
        max_length=MAX_NODES, description="Actors, processes and data stores"
    )
    flows: list[DfdFlow] = Field(
        max_length=MAX_EDGES, description="One entry per data flow"
    )

    def groups(self) -> list[GroupSpec]:
        return self.trust_boundaries

    def nodes(self) -> list[tuple[NodeSpec, str | None]]:
        return [(e, e.trust_boundary) for e in self.elements]

    def links(self) -> list[EdgeSpec]:
        return self.flows

    def problems(self) -> list[str]:
        problems = super().problems()
        counts = Counter(f.id for f in self.flows)
        problems += [
            f"duplicate flow id '{i}'" for i, n in sorted(counts.items()) if n > 1
        ]
        return problems


TOOL_SPEC = {
    "name": "threat_composer_dia_dfd",
    "description": """Draw a Data Flow Diagram (DFD) as SVG from structured data.

Give every element and trust boundary a short unique id. Flows and nesting refer to those ids.

- elements: type is human_actor, external_entity, process or datastore. Set trust_boundary to the id of the boundary that holds it, or leave it out.
- trust_boundaries: dashed zones. Set parent to nest one boundary in another.
- flows: one per data flow. id is the DF identifier from the dataflow description (DF1, DF2, ...) and must be unique. label is the description; the diagram shows "DF1: <label>".

Example:
{
  "title": "My System DFD",
  "direction": "LR",
  "trust_boundaries": [{"id": "internal", "label": "Internal"}],
  "elements": [
    {"id": "user", "type": "human_actor", "label": "User"},
    {"id": "api", "type": "process", "label": "API", "trust_boundary": "internal"},
    {"id": "db", "type": "datastore", "label": "Database", "trust_boundary": "internal"}
  ],
  "flows": [
    {"id": "DF1", "source": "user", "target": "api", "label": "Request"},
    {"id": "DF2", "source": "api", "target": "db", "label": "Query"}
  ]
}

The output SVG file path is determined automatically from configuration.
""",
    "inputSchema": tool_input_schema(DfdSpec),
}


def _make_node(element: DfdElement) -> Node:
    return NODE_CLASSES[element.type](safe_label(element.label))


def _get_output_path() -> Path:
    """Get the output path for the DFD diagram from config."""
    config = get_global_config()
    if not config:
        raise ValueError("Global config not initialized")

    return (
        config.output_directory
        / config.components_output_sub_dir
        / config.dataflow_diagram_filename
    )


def threat_composer_dia_dfd(tool: ToolUse, **kwargs: Any) -> ToolResult:
    """Draw the DFD from structured data and write the SVG."""
    return run_diagram_tool(
        tool=tool,
        diagram_type="DFD",
        output_path=_get_output_path(),
        spec_cls=DfdSpec,
        make_node=_make_node,
        cluster_cls=TrustBoundary,
    )
