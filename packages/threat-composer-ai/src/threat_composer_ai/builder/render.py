"""
Render the system model as dataflow markdown and as a DFD.

The DFD is drawn from data with the existing DFD node classes, so its layout
follows directly from the system model.
"""

import shutil
import tempfile
import threading
from pathlib import Path

from .system_model import SystemModel

# diagrams keeps the current Diagram and Cluster in context variables, and
# graphviz output goes through the file system; one render at a time.
_RENDER_LOCK = threading.Lock()


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


def render_dfd_svg(system: SystemModel, title: str = "Data Flow Diagram") -> str:
    """Render the system model as an SVG string with images embedded."""
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

    def make_node(e):
        label = f"{e.id}\n{e.name}"
        if e.kind == "human_actor":
            return HumanActor(label)
        # The node classes default to fixed sizes, which long names overflow.
        # Let shapes grow to fit their label; the defaults remain the minimum.
        return node_class[e.kind](label, fixedsize="false")

    with _RENDER_LOCK, tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "dfd"
        nodes = {}
        with Diagram(
            title, filename=str(out), outformat="svg", show=False, direction="LR"
        ):
            for zone in system.zones:
                label = (
                    f"{zone.name} ({zone.trust_level})"
                    if zone.trust_level
                    else zone.name
                )
                with TrustBoundary(label):
                    for e in system.elements:
                        if e.zone == zone.id:
                            nodes[e.id] = make_node(e)
            for e in system.elements:
                if e.id not in nodes:
                    nodes[e.id] = make_node(e)
            for f in system.flows:
                (
                    nodes[f.source]
                    >> Edge(label=f"{f.id}: {f.description}")
                    >> nodes[f.target]
                )

        svg_path = out.with_suffix(".svg")
        if not svg_path.exists():
            raise RenderError("graphviz produced no SVG")
        svg = svg_path.read_text(encoding="utf-8")
        return deduplicate_embedded_images(embed_images_as_base64(svg))
