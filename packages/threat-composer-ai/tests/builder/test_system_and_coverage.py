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


def test_viewer_embeds_model_safely(system):
    import json
    import re

    from threat_composer_ai.builder.viewer import render_dfd_html, viewer_data

    system.flows[0].description = "</script><b>x</b>"
    html = render_dfd_html(system, title="Demo </script>")
    assert html.count("</script>") == html.count("<script")  # nothing closes early
    raw = re.search(
        r'<script id="dfd-data" type="application/json">(.*?)</script>', html, re.S
    ).group(1)
    assert json.loads(raw) == viewer_data(system)
    flows = {f["id"]: f for f in viewer_data(system)["flows"]}
    assert flows["DF1"]["crosses"] and flows["DF1"]["boundary"] == [
        "Internet",
        "Backend",
    ]
    assert not flows["DF2"]["crosses"]


@pytest.fixture
def nested():
    """Internet outside; an AWS account holding a compute zone and a store zone."""
    return SystemModel(
        zones=[
            Zone(id="Z1", name="Internet", trust_level="untrusted"),
            Zone(id="ACCT", name="Account", trust_level="internal"),
            Zone(id="CMP", name="Compute", parent="ACCT"),
            Zone(id="STO", name="Stores", parent="ACCT"),
        ],
        elements=[
            Element(id="U1", kind="human_actor", name="User", zone="Z1"),
            Element(id="P1", kind="process", name="Fn", zone="CMP"),
            Element(id="DS1", kind="data_store", name="Table", zone="STO"),
            Element(id="CFN", kind="process", name="Deployer", zone="ACCT"),
            Element(id="X", kind="process", name="Loose"),
        ],
        flows=[
            Flow(id="DF1", source="U1", target="P1", description="Call"),
            Flow(id="DF2", source="P1", target="DS1", description="Write"),
            Flow(
                id="DF3",
                source="CFN",
                target="P1",
                description="Deploy",
                plane="control",
            ),
            Flow(id="DF4", source="P1", target="CFN", description="Report"),
            Flow(id="DF5", source="X", target="P1", description="Poke"),
        ],
    )


def test_nested_zones_crossings(nested):
    by_id = {f.id: f for f in nested.flows}
    assert nested.problems() == []
    assert nested.zone_chain("CMP") == ["CMP", "ACCT"]
    # Perimeter: no zone holds both ends; the path enters the account.
    assert nested.boundaries_crossed(by_id["DF1"]) == ["Internet", "Account", "Compute"]
    assert nested.common_zone(by_id["DF1"]) is None
    # Sibling zones inside one account: an inner crossing.
    assert nested.boundaries_crossed(by_id["DF2"]) == ["Compute", "Stores"]
    assert nested.common_zone(by_id["DF2"]) == "ACCT"
    # Between a child zone and an element directly in its parent.
    assert nested.boundaries_crossed(by_id["DF3"]) == ["Account", "Compute"]
    assert nested.boundaries_crossed(by_id["DF4"]) == ["Compute", "Account"]
    assert nested.common_zone(by_id["DF3"]) == "ACCT"
    # Unzoned elements keep the old behaviour.
    assert nested.boundaries_crossed(by_id["DF5"]) == ["unzoned", "Account", "Compute"]


def test_zone_parent_problems():
    model = SystemModel(
        zones=[
            Zone(id="A", name="a", parent="B"),
            Zone(id="B", name="b", parent="A"),
            Zone(id="C", name="c", parent="GONE"),
        ]
    )
    problems = model.problems()
    assert "zone C: unknown parent 'GONE'" in problems
    assert "zone A: parent chain loops back to itself" in problems
    assert "zone B: parent chain loops back to itself" in problems
    # A loop must not hang the path computations.
    assert model.zone_chain("A") == ["A", "B"]


def test_markdown_shows_parent_and_plane(nested):
    md = dataflow_markdown(nested)
    assert "| Compute |  | Account | P1 |" in md
    assert "| Internet | untrusted | - | U1 |" in md
    assert "| DF3 | Deploy | CFN | P1 | Account to Compute |  | control |" in md
    assert "| DF2 | Write | P1 | DS1 | Compute to Stores |  | - |" in md


def test_render_nests_zone_clusters(nested, monkeypatch):
    import diagrams

    from threat_composer_ai.builder import render

    def fake_render(self):
        self.dot.save(self.filename)
        with open(self.filename + ".svg", "w", encoding="utf-8") as f:
            f.write(f"<svg><!--{self.dot.source}--></svg>")

    monkeypatch.setattr(render, "graphviz_available", lambda: True)
    monkeypatch.setattr(diagrams.Diagram, "render", fake_render)

    svg = render.render_dfd_svg(nested)
    account = svg.index('label="Account (internal)"')
    # Both child clusters open after the account cluster and before it closes.
    assert account < svg.index("label=Compute") and account < svg.index("label=Stores")
    assert svg.count("subgraph") == 4  # each zone drawn once


def test_viewer_data_carries_nesting_and_plane(nested):
    from threat_composer_ai.builder.viewer import viewer_data

    data = viewer_data(nested)
    assert {z["id"]: z["parent"] for z in data["zones"]}["CMP"] == "ACCT"
    flows = {f["id"]: f for f in data["flows"]}
    assert flows["DF1"]["within"] is None and flows["DF2"]["within"] == "ACCT"
    assert flows["DF3"]["plane"] == "control" and flows["DF2"]["plane"] is None
