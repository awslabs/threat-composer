"""The dataflow agent's write tool: one structured input, three consistent outputs."""

import json

import pytest

from threat_composer_ai.builder.render import graphviz_available
from threat_composer_ai.config import AppConfig, register_global_config
from threat_composer_ai.tools.threat_composer_validate_tc_v1_schema import (
    validate_tc_data_pydantic,
)
from threat_composer_ai.tools.threat_composer_write_dataflow import (
    threat_composer_write_dataflow,
)

pytestmark = pytest.mark.skipif(
    not graphviz_available(), reason="graphviz not installed"
)

ZONES = [
    {"id": "Z1", "name": "Internet", "trust_level": "untrusted"},
    {"id": "Z2", "name": "Backend", "trust_level": "trusted"},
]
ELEMENTS = [
    {"id": "U1", "kind": "human_actor", "name": "User", "zone": "Z1"},
    {
        "id": "P1",
        "kind": "process",
        "name": "API",
        "zone": "Z2",
        "evidence": ["src/api.py:10"],
    },
    {"id": "DS1", "kind": "data_store", "name": "DB", "zone": "Z2", "high_value": True},
]
FLOWS = [
    {"source": "U1", "target": "P1", "description": "Login", "assets": ["password"]},
    {"source": "P1", "target": "DS1", "description": "Query"},
]


@pytest.fixture
def config(tmp_path):
    work = tmp_path / "work"
    work.mkdir()
    cfg = AppConfig.create(working_directory=work, output_directory=work / ".tc")
    cfg.output_directory.mkdir(parents=True, exist_ok=True)
    register_global_config(cfg)
    return cfg


def components(cfg):
    return cfg.output_directory / cfg.components_output_sub_dir


def test_writes_three_consistent_outputs(config):
    message = threat_composer_write_dataflow(
        zones=ZONES,
        elements=ELEMENTS,
        flows=FLOWS,
        assumptions=[{"content": "Deployed behind TLS"}],
    )
    assert "3 elements, 2 flows (1 crossing a trust boundary)" in message

    out = components(config)
    system = json.loads((out / config.dataflow_system_filename).read_text())
    assert [f["id"] for f in system["flows"]] == ["DF1", "DF2"]

    description = json.loads((out / config.dataflow_description_filename).read_text())
    markdown = description["dataflow"]["description"]
    assert "| DF1 | Login | U1 | P1 | Internet to Backend | password |" in markdown
    assert description["assumptions"][0]["content"] == "Deployed behind TLS"
    meta = {m["key"]: m["value"] for m in description["assumptions"][0]["metadata"]}
    assert meta["custom:agent"] == "dataflow"
    assert validate_tc_data_pydantic(description) == (True, "")

    svg = (out / config.dataflow_diagram_filename).read_text()
    assert "DF1: Login" in svg and "DF2: Query" in svg

    hashes = config.output_directory / config.hashes_output_sub_dir
    for name in (
        config.dataflow_system_filename,
        config.dataflow_description_filename,
        config.dataflow_diagram_filename,
    ):
        assert (hashes / f"{name}.hash").exists()


@pytest.mark.parametrize(
    "elements, flows, match",
    [
        (
            ELEMENTS,
            [{"source": "U1", "target": "NOPE", "description": "x"}],
            "unknown target",
        ),
        ([{**ELEMENTS[0], "zone": "Z9"}], [], "unknown zone"),
        ([{**ELEMENTS[0], "kind": "robot"}], [], "Invalid input"),
        (ELEMENTS + [ELEMENTS[0]], [], "duplicate element"),
    ],
)
def test_bad_input_writes_nothing(config, elements, flows, match):
    with pytest.raises(ValueError, match=match):
        threat_composer_write_dataflow(zones=ZONES, elements=elements, flows=flows)
    out = components(config)
    assert not out.exists() or not any(out.iterdir())


def test_bad_assumption_writes_nothing(config):
    with pytest.raises(ValueError, match="assumptions"):
        threat_composer_write_dataflow(
            zones=ZONES,
            elements=ELEMENTS,
            flows=FLOWS,
            assumptions=[{"content": "x", "tags": ["t" * 31]}],
        )
    out = components(config)
    assert not out.exists() or not any(out.iterdir())


def test_tool_schema_exposes_structured_input():
    schema = threat_composer_write_dataflow.tool_spec["inputSchema"]["json"]
    assert set(schema["required"]) == {"zones", "elements", "flows"}
    kinds = schema["$defs"]["Element"]["properties"]["kind"]["enum"]
    assert kinds == ["human_actor", "external_entity", "process", "data_store"]
