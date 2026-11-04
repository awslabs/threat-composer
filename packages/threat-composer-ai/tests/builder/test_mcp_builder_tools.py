"""End to end through an in-memory MCP client, as Claude Code would call them."""

import asyncio
import json
import os
import stat
from pathlib import Path

import pytest
from fastmcp import Client, FastMCP
from fastmcp.exceptions import ToolError

from threat_composer_ai.builder.workspace import Workspace
from threat_composer_ai.mcp.builder_tools import register_builder_tools

MODEL = "app.tc.json"


@pytest.fixture
def server(tmp_path):
    mcp = FastMCP("test")
    register_builder_tools(mcp, Workspace(tmp_path))
    return mcp


def call(server, tool, /, **args):
    async def run():
        async with Client(server) as client:
            return (await client.call_tool(tool, args)).data

    return asyncio.run(run())


def test_full_flow(server, tmp_path):
    call(server, "tm_init", model=MODEL, name="Demo")
    with pytest.raises(ToolError, match="exists"):
        call(server, "tm_init", model=MODEL, name="Demo")

    sys_result = call(
        server,
        "sys_upsert",
        model=MODEL,
        zones=[{"id": "Z1", "name": "Internet"}, {"id": "Z2", "name": "Cloud"}],
        elements=[
            {"id": "U1", "kind": "human_actor", "name": "User", "zone": "Z1"},
            {"id": "P1", "kind": "process", "name": "API", "zone": "Z2"},
        ],
        flows=[{"source": "U1", "target": "P1", "description": "Request"}],
    )
    assert sys_result["flow_ids"] == ["DF1"] and sys_result["problems"] == []

    rendered = call(server, "sys_render", model=MODEL, diagram=False)
    assert rendered["markdown"] is True

    threats = call(
        server,
        "tm_add_threats",
        model=MODEL,
        agent="threat-analyst",
        threats=[
            {
                "threat_source": "actor",
                "threat_action": "spoof a user",
                "stride": ["S"],
                "priority": "High",
                "elements": ["U1"],
            },
            {
                "threat_source": "actor",
                "threat_action": "x",
                "stride": ["T"],
                "priority": "High",
                "elements": ["NOPE"],
            },
        ],
    )
    assert len(threats["added"]) == 1 and threats["rejected"][0]["index"] == 1
    tid = threats["added"][0]["id"]

    call(
        server,
        "tm_add_mitigations",
        model=MODEL,
        mitigations=[{"content": "MFA", "threat_ids": [tid]}],
    )
    assert call(server, "tm_validate", model=MODEL) == {"valid": True, "errors": []}

    view = call(server, "tm_get", model=MODEL, sections=["threats"])
    assert view["threats"][0]["mitigations"]

    report = call(server, "tm_coverage_report", model=MODEL)
    assert "P1" in report["targets_with_no_threats"]
    assert report["boundary_crossings_without_threats"] == ["DF1"]

    doc = json.loads((tmp_path / MODEL).read_text())
    assert (
        "| DF1 | Request | U1 | P1 | Internet to Cloud |"
        in doc["dataflow"]["description"]
    )
    assert (tmp_path / "app.system.json").exists()


def test_invalid_change_writes_nothing(server, tmp_path):
    call(server, "tm_init", model=MODEL, name="Demo")
    before = (tmp_path / MODEL).read_text()
    with pytest.raises(ToolError, match="name applies only"):
        call(server, "tm_set_section", model=MODEL, section="dataflow", name="x")
    with pytest.raises(ToolError, match="would be invalid"):
        call(
            server,
            "tm_set_section",
            model=MODEL,
            section="applicationInfo",
            name="n" * 201,
        )
    assert (tmp_path / MODEL).read_text() == before


def test_paths_confined_to_workspace(server, tmp_path):
    with pytest.raises(ToolError, match="outside"):
        call(server, "tm_init", model="../escape.tc.json", name="x")
    with pytest.raises(ToolError, match="must end with"):
        call(server, "tm_init", model="notes.json", name="x")
    outside = Path(tmp_path).parent / "secret.svg"
    call(server, "tm_init", model=MODEL, name="x")
    with pytest.raises(ToolError, match="outside"):
        call(
            server,
            "tm_set_section",
            model=MODEL,
            section="architecture",
            image_path=str(outside),
        )


def test_written_files_follow_umask(server, tmp_path):
    old = os.umask(0o022)
    try:
        call(server, "tm_init", model=MODEL, name="x")
    finally:
        os.umask(old)
    # Mode is fixed at import from the process umask; it must not be mkstemp's 0600
    assert stat.S_IMODE((tmp_path / MODEL).stat().st_mode) & 0o044


def test_symlink_escape_refused(server, tmp_path):
    target = tmp_path.parent / f"{tmp_path.name}-outside"
    target.mkdir()
    (tmp_path / "link").symlink_to(target, target_is_directory=True)
    with pytest.raises(ToolError, match="outside"):
        call(server, "tm_init", model="link/app.tc.json", name="x")


def test_sys_remove_drops_dangling_flows(server):
    call(
        server,
        "sys_upsert",
        model=MODEL,
        elements=[
            {"id": "A", "kind": "process", "name": "a"},
            {"id": "B", "kind": "data_store", "name": "b"},
        ],
        flows=[{"source": "A", "target": "B", "description": "write"}],
    )
    call(server, "sys_remove", model=MODEL, ids=["B"])
    assert call(server, "sys_get", model=MODEL)["flows"] == []


def test_tool_annotations(server):
    async def run():
        async with Client(server) as client:
            return {t.name: t.annotations for t in await client.list_tools()}

    annotations = asyncio.run(run())
    assert annotations["tm_get"].readOnlyHint is True
    assert annotations["tm_coverage_report"].readOnlyHint is True
    assert annotations["tm_remove"].destructiveHint is True
    assert annotations["tm_add_threats"].readOnlyHint is False


def _tool_names(monkeypatch, value):
    from threat_composer_ai.mcp.server import TOOLS_ENV_VAR, create_mcp_server

    if value is None:
        monkeypatch.delenv(TOOLS_ENV_VAR, raising=False)
    else:
        monkeypatch.setenv(TOOLS_ENV_VAR, value)

    async def run():
        async with Client(create_mcp_server()) as client:
            return {t.name for t in await client.list_tools()}

    return asyncio.run(run())


def test_server_tool_sets(monkeypatch):
    everything = _tool_names(monkeypatch, None)
    builder = _tool_names(monkeypatch, "builder")
    assert "threat_modeling_start_workflow" in everything
    assert "threat_modeling_start_workflow" not in builder
    assert {"tm_init", "sys_render", "tm_coverage_report"} <= builder
    with pytest.raises(ValueError, match="must be"):
        _tool_names(monkeypatch, "bogus")


def test_init_returns_absolute_path(server, tmp_path):
    result = call(server, "tm_init", model=MODEL, name="x")
    assert result["path"] == str(tmp_path / MODEL)


def test_tag_tools_change_only_tags(server, tmp_path):
    call(server, "tm_init", model=MODEL, name="Demo")
    tid = call(
        server,
        "tm_add_threats",
        model=MODEL,
        threats=[
            {
                "threat_source": "actor",
                "threat_action": "x",
                "stride": ["S"],
                "priority": "High",
            }
        ],
    )["added"][0]["id"]
    mid = call(
        server,
        "tm_add_mitigations",
        model=MODEL,
        mitigations=[{"content": "MFA", "threat_ids": [tid], "comments": "c"}],
    )["added"][0]["id"]
    before = json.loads((tmp_path / MODEL).read_text())

    added = call(
        server,
        "tm_add_tags",
        model=MODEL,
        kind="mitigation",
        ids=[mid],
        tags=["task:3.2"],
    )
    assert added == {"updated": 1}
    after = json.loads((tmp_path / MODEL).read_text())
    assert after["mitigations"][0]["tags"][-1] == "task:3.2"
    after["mitigations"][0]["tags"].pop()
    assert after == before

    raw = (tmp_path / MODEL).read_text()
    with pytest.raises(ToolError, match="no mitigation"):
        call(
            server,
            "tm_add_tags",
            model=MODEL,
            kind="mitigation",
            ids=[mid, "nope"],
            tags=["task:9"],
        )
    with pytest.raises(ToolError, match="30 character"):
        call(
            server,
            "tm_add_tags",
            model=MODEL,
            kind="mitigation",
            ids=[mid],
            tags=["x" * 31],
        )
    assert (tmp_path / MODEL).read_text() == raw

    call(
        server,
        "tm_remove_tags",
        model=MODEL,
        kind="mitigation",
        ids=[mid],
        tags=["task:3.2"],
    )
    assert json.loads((tmp_path / MODEL).read_text()) == before
