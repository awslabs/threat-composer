"""System model, dataflow rendering and coverage."""

import pytest
from pydantic import ValidationError

from threat_composer_ai.builder import model_ops as ops
from threat_composer_ai.builder.coverage import coverage_report
from threat_composer_ai.builder.render import (
    dataflow_markdown,
    graphviz_available,
    render_dfd_svg,
)
from threat_composer_ai.builder.system_model import Element, Flow, SystemModel, Zone


@pytest.fixture
def system():
    return SystemModel(
        zones=[
            Zone(id="Z1", name="Internet", trust_level="untrusted"),
            Zone(id="Z2", name="Backend", trust_level="trusted"),
        ],
        elements=[
            Element(id="U1", kind="human_actor", name="User", zone="Z1"),
            Element(id="P1", kind="process", name="API", zone="Z2"),
            Element(id="DS1", kind="data_store", name="DB", zone="Z2", high_value=True),
        ],
        flows=[
            Flow(id="DF1", source="U1", target="P1", description="Login request"),
            Flow(id="DF2", source="P1", target="DS1", description="Query | write"),
        ],
    )


def test_ids_must_be_short_and_unique():
    with pytest.raises(ValidationError):
        Element(id="x" * 31, kind="process", name="p")
    with pytest.raises(ValidationError):
        SystemModel(
            elements=[
                Element(id="P1", kind="process", name="a"),
                Element(id="P1", kind="process", name="b"),
            ]
        )


def test_problems_and_boundaries(system):
    assert system.problems() == []
    assert system.boundaries_crossed(system.flows[0]) == ["Internet", "Backend"]
    assert system.boundaries_crossed(system.flows[1]) == []
    assert system.next_flow_id() == "DF3"
    system.flows.append(Flow(id="DF9", source="P1", target="GONE", description="x"))
    assert system.problems() == ["flow DF9: unknown target 'GONE'"]


def test_markdown_has_sections_and_escapes_pipes(system):
    md = dataflow_markdown(system)
    for heading in (
        "### Human actors",
        "### Processes",
        "### Data stores",
        "### Data flows",
    ):
        assert heading in md
    assert "| DF1 | Login request | U1 | P1 | Internet to Backend |" in md
    assert "Query / write" in md
    assert "| DS1 | DB | Y | Backend |" in md


@pytest.mark.skipif(not graphviz_available(), reason="graphviz not installed")
def test_render_dfd(system):
    svg = render_dfd_svg(system)
    assert svg.lstrip().startswith(("<?xml", "<svg", "<!DOCTYPE"))
    assert "DF1: Login request" in svg


def _threat(elements, stride, priority="High"):
    return ops.ThreatInput(
        threat_source="actor",
        threat_action="do harm",
        stride=stride,
        priority=priority,
        elements=elements,
    )


def test_coverage_without_system_model():
    doc = ops.empty_model("App")
    ops.add_threats(doc, [_threat([], ["S"])])
    report = coverage_report(doc, None)
    assert report["system_model"].startswith("absent")
    assert len(report["unmitigated_high_medium"]) == 1


def test_coverage_matrix(system):
    doc = ops.empty_model("App")
    known = {"U1", "P1", "DS1", "DF1", "DF2"}
    added = ops.add_threats(
        doc,
        [
            _threat(["P1"], ["S", "T"]),
            _threat(["DF1"], ["T"], "Medium"),
            _threat([], ["D"], "Low"),
        ],
        known,
    )["added"]
    ops.add_mitigations(
        doc, [ops.MitigationInput(content="m", threat_ids=[added[0]["id"]])]
    )
    ops.set_status(doc, "threat", [added[2]["id"]], "threatResolvedNotUseful")

    report = coverage_report(doc, system)
    rows = {r["id"]: r for r in report["stride_matrix"]}
    assert rows["P1"]["covered"] == ["S", "T"]
    assert rows["P1"]["missing"] == ["R", "I", "D", "E"]
    assert rows["DF1"]["covered"] == ["T"]
    assert set(report["targets_with_no_threats"]) == {"U1", "DS1", "DF2"}
    assert report["boundary_crossings_without_threats"] == []
    assert [t["id"] for t in report["unmitigated_high_medium"]] == [added[1]["id"]]
    assert report["counts"]["threats_ignored"] == 1
    assert report["threats_without_elements"] == []
    assert report["stride_cells"] == {"applicable": 2 + 6 + 4 + 3 + 3, "covered": 3}


def test_render_dfd_builds_graph_without_graphviz(system, monkeypatch):
    """Exercise node, cluster and edge construction with only the final
    Graphviz call stubbed, so this runs where `dot` is not installed."""
    import diagrams

    from threat_composer_ai.builder import render

    def fake_render(self):
        self.dot.save(self.filename)  # __exit__ deletes this file
        with open(self.filename + ".svg", "w", encoding="utf-8") as f:
            f.write(f"<svg><!--{self.dot.source}--></svg>")

    monkeypatch.setattr(render, "graphviz_available", lambda: True)
    monkeypatch.setattr(diagrams.Diagram, "render", fake_render)

    svg = render.render_dfd_svg(system, title="Demo")
    assert 'label="DF1: Login request"' in svg
    assert "Internet (untrusted)" in svg  # trust zone cluster
    assert "U1\nUser" in svg and "DS1\nDB" in svg
    assert "shape=cylinder" in svg and "shape=oval" in svg
    # Shapes grow to fit long names instead of clipping them
    assert "fixedsize=false" in svg


def test_render_dfd_refuses_broken_model(system, monkeypatch):
    from threat_composer_ai.builder import render

    monkeypatch.setattr(render, "graphviz_available", lambda: True)
    system.flows.append(Flow(id="DF3", source="P1", target="GONE", description="x"))
    with pytest.raises(render.RenderError, match="unknown target"):
        render.render_dfd_svg(system)


@pytest.mark.skipif(not graphviz_available(), reason="graphviz not installed")
def test_large_diagrams_use_compact_labels(system):
    from threat_composer_ai.builder.render import COMPACT_FLOWS

    small = render_dfd_svg(system)
    assert "DF1: Login request" in small

    for i in range(COMPACT_FLOWS):
        system.flows.append(
            Flow(id=f"DF{i + 3}", source="P1", target="DS1", description="Extra flow")
        )
    large = render_dfd_svg(system)
    assert "Extra flow" not in large  # descriptions live in the dataflow table
    assert "DF12" in large


def test_parallel_flows_share_one_edge(system, monkeypatch):
    import diagrams

    from threat_composer_ai.builder import render

    def fake_render(self):
        self.dot.save(self.filename)
        with open(self.filename + ".svg", "w", encoding="utf-8") as f:
            f.write(f"<svg><!--{self.dot.source}--></svg>")

    monkeypatch.setattr(render, "graphviz_available", lambda: True)
    monkeypatch.setattr(diagrams.Diagram, "render", fake_render)

    system.flows += [
        Flow(id="DF3", source="P1", target="DS1", description="Audit write"),
        Flow(id="DF4", source="DS1", target="P1", description="Query result"),
    ]
    svg = render.render_dfd_svg(system)
    assert svg.count(" -> ") == 3  # DF2 and DF3 merge; DF4 keeps its direction
    assert 'label="DF2: Query | write\nDF3: Audit write"' in svg

    for i in range(render.COMPACT_FLOWS):
        system.flows.append(
            Flow(id=f"DF{i + 5}", source="P1", target="DS1", description="x")
        )
    svg = render.render_dfd_svg(system)
    assert svg.count(" -> ") == 3
    assert "DF2, DF3, DF5" in svg


def test_boundary_view_hides_internal_flows(system, monkeypatch):
    import diagrams

    from threat_composer_ai.builder import render

    def fake_render(self):
        self.dot.save(self.filename)
        with open(self.filename + ".svg", "w", encoding="utf-8") as f:
            f.write(f"<svg><!--{self.dot.source}--></svg>")

    monkeypatch.setattr(render, "graphviz_available", lambda: True)
    monkeypatch.setattr(diagrams.Diagram, "render", fake_render)

    svg = render.render_dfd_svg(system, boundary_only=True)
    assert "DF1: Login request" in svg  # Internet to Backend
    assert "DF2" not in svg  # P1 to DS1 stays in Backend
    assert "DS1" not in svg  # no flow of DS1 crosses a boundary
    assert "[not shown: 1 internal flow, 1 element]" in svg
