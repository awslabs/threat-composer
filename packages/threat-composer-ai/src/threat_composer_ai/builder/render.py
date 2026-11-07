"""
Render the system model as dataflow markdown and as a DFD.

The DFD is drawn from data with the existing DFD node classes, so its layout
follows directly from the system model.
"""

import shutil
import tempfile
import textwrap
import threading
from pathlib import Path

from .system_model import SystemModel

# diagrams keeps the current Diagram and Cluster in context variables, and
# graphviz output goes through the file system; one render at a time.
_RENDER_LOCK = threading.Lock()


# Above this many flows, full edge labels crowd the diagram and Graphviz places
# them far from their edges. Edges then carry only their DF id; the
# descriptions are in the dataflow table rendered from the same model.
COMPACT_FLOWS = 10
NODE_LABEL_WIDTH = 22
ZONE_LABEL_WIDTH = 40
EDGE_IDS_WIDTH = 20


class RenderError(RuntimeError):
    pass


def _cell(text: str) -> str:
    return text.replace("|", "/").replace("\n", " ").strip()


def dataflow_markdown(system: SystemModel) -> str:
    """Dataflow description in the section layout Threat Composer users expect."""
    by_kind = {
        k: [e for e in system.elements if e.kind == k]
        for k in ("human_actor", "external_entity", "process", "data_store")
    }

    def bullets(kind: str) -> str:
        rows = [
            f"- **{e.id}** {e.name}" + (f": {e.description}" if e.description else "")
            for e in by_kind[kind]
        ]
        return "\n".join(rows) or "- None identified"

    lines = [
        "### Human actors",
        bullets("human_actor"),
        "",
        "### External entities",
        bullets("external_entity"),
        "",
        "### Processes",
        bullets("process"),
        "",
        "### Data stores",
        "| Id | Store | High-value | Zone |",
        "| --- | --- | --- | --- |",
    ]
    lines += [
        f"| {e.id} | {_cell(e.name)} | {'Y' if e.high_value else 'N'} | {_cell(system.zone_name(e.zone))} |"
        for e in by_kind["data_store"]
    ]
    lines += [
        "",
        "### Trust zones",
        "| Zone | Trust level | Elements |",
        "| --- | --- | --- |",
    ]
    lines += [
        f"| {_cell(z.name)} | {_cell(z.trust_level)} | "
        f"{', '.join(e.id for e in system.elements if e.zone == z.id)} |"
        for z in system.zones
    ]
    lines += [
        "",
        "### Data flows",
        "| Flow | Description | Source | Target | Boundary crossed | Assets |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for f in system.flows:
        crossed = system.boundaries_crossed(f)
        lines.append(
            f"| {f.id} | {_cell(f.description)} | {f.source} | {f.target} | "
            f"{_cell(' to '.join(crossed)) if crossed else 'No'} | {_cell(', '.join(f.assets))} |"
        )
    return "\n".join(lines) + "\n"


def graphviz_available() -> bool:
    return shutil.which("dot") is not None


def render_dfd_svg(
    system: SystemModel,
    title: str = "Data Flow Diagram",
    boundary_only: bool = False,
) -> str:
    """Render the system model as an SVG string with images embedded.

    With boundary_only, draw only the flows that cross a trust boundary and the
    elements at their ends. Each zone label counts the flows and elements it
    leaves out; the dataflow table still lists all of them.
    """
    if not graphviz_available():
        raise RenderError(
            "Graphviz 'dot' is not on PATH. Install graphviz to render diagrams."
        )
    problems = system.problems()
    if problems:
        raise RenderError("system model has errors: " + "; ".join(problems))

    from diagrams import Diagram, Edge

    from ..tools.threat_composer_dia_common import (
        deduplicate_embedded_images,
        embed_images_as_base64,
    )
    from ..tools.threat_composer_dia_nodes import (
        Datastore,
        ExternalEntity,
        HumanActor,
        Process,
        TrustBoundary,
    )

    node_class = {
        "human_actor": HumanActor,
        "external_entity": ExternalEntity,
        "process": Process,
        "data_store": Datastore,
    }

    zone_of = {e.id: e.zone for e in system.elements}
    if boundary_only:
        flows = [f for f in system.flows if system.boundaries_crossed(f)]
        shown = {f.source for f in flows} | {f.target for f in flows}
    else:
        flows = list(system.flows)
        shown = {e.id for e in system.elements}

    def hidden_note(zone_id: str) -> str:
        if not boundary_only:
            return ""
        n_flows = sum(
            1
            for f in system.flows
            if zone_of[f.source] == zone_id and zone_of[f.target] == zone_id
        )
        n_elements = sum(
            1 for e in system.elements if e.zone == zone_id and e.id not in shown
        )
        parts = []
        if n_flows:
            parts.append(f"{n_flows} internal flow{'s' if n_flows != 1 else ''}")
        if n_elements:
            parts.append(f"{n_elements} element{'s' if n_elements != 1 else ''}")
        return f"\n[not shown: {', '.join(parts)}]" if parts else ""

    compact = len(flows) > COMPACT_FLOWS

    def wrap(text: str, width: int) -> str:
        return "\n".join(textwrap.wrap(text, width)) or text

    # One edge per source and target pair. Parallel flows between the same
    # two elements otherwise draw as a fan of near-identical curves, which is
    # most of the clutter in a large diagram. Direction is kept: A to B and
    # B to A stay separate edges, because STRIDE analysis is per direction.
    edges: dict[tuple[str, str], list] = {}
    for f in flows:
        edges.setdefault((f.source, f.target), []).append(f)

    def edge_label(flows) -> str:
        if compact:
            return wrap(", ".join(f.id for f in flows), EDGE_IDS_WIDTH)
        return "\n".join(wrap(f"{f.id}: {f.description}", 30) for f in flows)

    def make_node(e):
        label = f"{e.id}\n{wrap(e.name, NODE_LABEL_WIDTH)}"
        if e.kind == "human_actor":
            return HumanActor(label)
        # The node classes default to fixed sizes, which long names overflow.
        # Let shapes grow to fit their label; the defaults remain the minimum.
        return node_class[e.kind](label, fixedsize="false")

    with _RENDER_LOCK, tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "dfd"
        nodes = {}
        with Diagram(
            title,
            filename=str(out),
            outformat="svg",
            show=False,
            # Top to bottom keeps large diagrams from becoming a long thin strip
            direction="TB" if compact else "LR",
            # The diagrams default is orthogonal routing, and Graphviz cannot
            # attach labels to orthogonal edges, so labels drift away from
            # them. Curved edges keep each DF id next to its edge.
            graph_attr={"splines": "spline"},
        ):
            for zone in system.zones:
                label = (
                    f"{zone.name} ({zone.trust_level})"
                    if zone.trust_level
                    else zone.name
                )
                with TrustBoundary(
                    wrap(label, ZONE_LABEL_WIDTH) + hidden_note(zone.id)
                ):
                    for e in system.elements:
                        if e.zone == zone.id and e.id in shown:
                            nodes[e.id] = make_node(e)
            for e in system.elements:
                if e.id in shown and e.id not in nodes:
                    nodes[e.id] = make_node(e)
            for (source, target), flows in edges.items():
                (nodes[source] >> Edge(label=edge_label(flows)) >> nodes[target])

        svg_path = out.with_suffix(".svg")
        if not svg_path.exists():
            raise RenderError("graphviz produced no SVG")
        svg = svg_path.read_text(encoding="utf-8")
        return deduplicate_embedded_images(embed_images_as_base64(svg))
