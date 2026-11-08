"""Partial updates, lookup by number, and the expected_hash check."""

import asyncio
import json

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


def read(tmp_path):
    return json.loads((tmp_path / MODEL).read_text())


@pytest.fixture
def model(server, tmp_path):
    """A model with a system model, two threats, a mitigation and an assumption."""
    call(server, "tm_init", model=MODEL, name="Demo")
    call(
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
    threat = {
        "threat_source": "internet-based actor",
        "prerequisites": "with a stolen token",
        "threat_action": "replay the token",
        "threat_impact": "access to another account",
        "impacted_goal": ["confidentiality"],
        "impacted_assets": ["account data"],
        "stride": ["S"],
        "priority": "High",
        "elements": ["U1"],
        "comments": "original comment",
        "evidence": ["src/auth.py:10"],
        "tags": ["task:1"],
    }
    call(
        server,
        "tm_add_threats",
        model=MODEL,
        agent="kiro",
        threats=[threat, {**threat, "threat_action": "forge a token"}],
    )
    doc = read(tmp_path)
    t1, t2 = (t["id"] for t in doc["threats"])
    call(
        server,
        "tm_add_mitigations",
        model=MODEL,
        agent="kiro",
        mitigations=[
            {
                "content": "Bind tokens to a device",
                "threat_ids": [t1],
                "control_type": "Preventative",
            }
        ],
    )
    call(
        server,
        "tm_add_assumptions",
        model=MODEL,
        agent="kiro",
        assumptions=[{"content": "TLS is on", "link_to": [t1], "comments": "why"}],
    )
    return {"t1": t1, "t2": t2}


def meta(item, key):
    return next((m["value"] for m in item["metadata"] if m["key"] == key), None)


# -- tm_patch_threat -------------------------------------------------------


def test_patch_threat_changes_only_named_fields(server, tmp_path, model):
    before = read(tmp_path)
    result = call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"comments": "new comment"},
    )
    assert result["fields"] == ["comments"] and result["modified"] is True

    after = read(tmp_path)
    t_before, t_after = before["threats"][0], after["threats"][0]
    assert meta(t_after, "Comments") == "new comment"
    assert meta(t_after, "custom:agent") == "kiro"  # provenance kept
    for key in t_before:
        if key != "metadata":
            assert t_after[key] == t_before[key]
    for key in ("STRIDE", "Priority", "custom:evidence"):
        assert meta(t_after, key) == meta(t_before, key)
    assert after["threats"][1] == before["threats"][1]
    assert after["mitigationLinks"] == before["mitigationLinks"]
    assert after["assumptionLinks"] == before["assumptionLinks"]


def test_patch_threat_by_id_and_number_are_the_same(server, tmp_path, model):
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat=model["t1"],
        changes={"priority": "Low"},
    )
    assert meta(read(tmp_path)["threats"][0], "Priority") == "Low"
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="t1",
        changes={"priority": "Medium"},
    )
    assert meta(read(tmp_path)["threats"][0], "Priority") == "Medium"


def test_patch_threat_recomposes_statement_from_changed_grammar(
    server, tmp_path, model
):
    result = call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"threat_action": "Reuse the token", "impacted_goal": ["integrity"]},
    )
    statement = read(tmp_path)["threats"][0]["statement"]
    assert statement == result["statement"]
    assert "reuse the token" in statement
    assert "reduced integrity of account data" in statement
    assert "stolen token" in statement  # untouched fields stay


def test_patch_threat_elements_stride_evidence_and_clears(server, tmp_path, model):
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={
            "elements": ["P1"],
            "stride": ["T", "S"],
            "evidence": [],
            "comments": "",
            "status": "threatResolved",
        },
    )
    t = read(tmp_path)["threats"][0]
    assert "P1" in t["tags"] and "U1" not in t["tags"]
    assert "task:1" in t["tags"]  # other tags stay
    assert meta(t, "STRIDE") == ["S", "T"]
    assert meta(t, "custom:evidence") is None
    assert meta(t, "Comments") is None
    assert t["status"] == "threatResolved"


def test_patch_threat_custom_metadata(server, tmp_path, model):
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"metadata": {"custom:verified_at": "2026-11-08", "custom:pr": "12"}},
    )
    t = read(tmp_path)["threats"][0]
    assert meta(t, "custom:verified_at") == "2026-11-08"
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"metadata": {"custom:pr": None}},
    )
    t = read(tmp_path)["threats"][0]
    assert meta(t, "custom:pr") is None
    assert meta(t, "custom:verified_at") == "2026-11-08"


def test_patch_threat_rejects_bad_input_and_changes_nothing(server, tmp_path, model):
    raw = (tmp_path / MODEL).read_text()
    bad = [
        ({"elements": ["NOPE"]}, "unknown ids"),
        ({}, "nothing to change"),
        ({"metadata": {"custom:agent": "x"}}, "custom:agent"),
        ({"metadata": {"Priority": "Low"}}, "custom:"),
        ({"threat_source": None}, "cannot be null"),
        ({"threat_action": " "}, "cannot be empty"),
        ({"no_such_field": 1}, "no_such_field"),
    ]
    for changes, message in bad:
        with pytest.raises(ToolError, match=message):
            call(server, "tm_patch_threat", model=MODEL, threat="T1", changes=changes)
    with pytest.raises(ToolError, match="no threat numbered 9"):
        call(
            server,
            "tm_patch_threat",
            model=MODEL,
            threat="T9",
            changes={"status": "threatResolved"},
        )
    with pytest.raises(ToolError, match="not a threat"):
        call(
            server,
            "tm_patch_threat",
            model=MODEL,
            threat="M1",
            changes={"status": "threatResolved"},
        )
    assert (tmp_path / MODEL).read_text() == raw


# -- tm_patch_mitigation ---------------------------------------------------


def test_patch_mitigation(server, tmp_path, model):
    before = read(tmp_path)
    call(
        server,
        "tm_patch_mitigation",
        model=MODEL,
        mitigation="M1",
        changes={
            "status": "mitigationResolved",
            "existing": True,
            "control_type": "Detective",
            "comments": "done",
            "metadata": {"custom:pr": "7"},
        },
    )
    m = read(tmp_path)["mitigations"][0]
    assert m["status"] == "mitigationResolved"
    assert "Existing control" in m["tags"] and "Detective" in m["tags"]
    assert "Preventative" not in m["tags"]
    assert meta(m, "Comments") == "done" and meta(m, "custom:pr") == "7"
    assert meta(m, "custom:agent") == "kiro"
    assert m["content"] == before["mitigations"][0]["content"]
    assert read(tmp_path)["mitigationLinks"] == before["mitigationLinks"]


def test_patch_mitigation_replaces_links_only_when_asked(server, tmp_path, model):
    call(
        server,
        "tm_patch_mitigation",
        model=MODEL,
        mitigation="M1",
        changes={"threat_ids": [model["t2"]]},
    )
    assert read(tmp_path)["mitigationLinks"] == [
        {
            "mitigationId": read(tmp_path)["mitigations"][0]["id"],
            "linkedId": model["t2"],
        }
    ]
    with pytest.raises(ToolError, match="unknown"):
        call(
            server,
            "tm_patch_mitigation",
            model=MODEL,
            mitigation="M1",
            changes={"threat_ids": ["x" * 36]},
        )


# -- tm_patch_assumption ---------------------------------------------------


def test_patch_assumption_keeps_id_number_and_links(server, tmp_path, model):
    before = read(tmp_path)
    call(
        server,
        "tm_patch_assumption",
        model=MODEL,
        assumption="A1",
        changes={"content": "TLS 1.3 is on"},
    )
    after = read(tmp_path)
    a_before, a_after = before["assumptions"][0], after["assumptions"][0]
    assert a_after["content"] == "TLS 1.3 is on"
    assert a_after["id"] == a_before["id"]
    assert a_after["numericId"] == a_before["numericId"]
    assert meta(a_after, "Comments") == "why"
    assert after["assumptionLinks"] == before["assumptionLinks"]


def test_patch_assumption_link_to(server, tmp_path, model):
    call(
        server,
        "tm_patch_assumption",
        model=MODEL,
        assumption="A1",
        changes={"link_to": [model["t2"]]},
    )
    links = read(tmp_path)["assumptionLinks"]
    assert [x["linkedId"] for x in links] == [model["t2"]]
    call(
        server,
        "tm_patch_assumption",
        model=MODEL,
        assumption="A1",
        changes={"link_to": []},
    )
    assert read(tmp_path)["assumptionLinks"] == []


# -- tm_get_item -----------------------------------------------------------


def test_get_item_returns_everything_and_linked_items(server, model):
    t = call(server, "tm_get_item", model=MODEL, item="T1")
    assert t["kind"] == "threat" and t["number"] == "T1"
    assert t["elements"] == ["U1"]
    assert t["priority"] == "High" and t["stride"] == ["S"]
    keys = {m["key"] for m in t["item"]["metadata"]}
    assert {"Comments", "custom:evidence", "custom:agent"} <= keys
    assert [m["number"] for m in t["linked"]["mitigations"]] == ["M1"]
    assert [a["number"] for a in t["linked"]["assumptions"]] == ["A1"]
    assert t["hash"]

    m = call(server, "tm_get_item", model=MODEL, item="M1")
    assert [x["number"] for x in m["linked"]["threats"]] == ["T1"]
    a = call(server, "tm_get_item", model=MODEL, item=model["t1"])
    assert a["number"] == "T1"
    a = call(server, "tm_get_item", model=MODEL, item="A1")
    assert [x["number"] for x in a["linked"]["threats"]] == ["T1"]

    with pytest.raises(ToolError, match="say which kind"):
        call(server, "tm_get_item", model=MODEL, item="1")
    with pytest.raises(ToolError, match="no item"):
        call(server, "tm_get_item", model=MODEL, item="nope")


# -- expected_hash ---------------------------------------------------------


def test_reads_and_writes_return_a_hash_that_tracks_the_file(server, tmp_path, model):
    h0 = call(server, "tm_get", model=MODEL)["hash"]
    assert call(server, "tm_validate", model=MODEL)["hash"] == h0
    assert call(server, "tm_coverage_report", model=MODEL)["hash"] == h0
    assert call(server, "tm_get_item", model=MODEL, item="T1")["hash"] == h0

    written = call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"priority": "Low"},
        expected_hash=h0,
    )
    assert written["hash"] != h0
    assert call(server, "tm_get", model=MODEL)["hash"] == written["hash"]


def test_stale_hash_is_refused_and_changes_nothing(server, tmp_path, model):
    h0 = call(server, "tm_get", model=MODEL)["hash"]
    call(
        server,
        "tm_set_status",
        model=MODEL,
        kind="threat",
        ids=[model["t2"]],
        status="threatResolved",
    )  # someone else writes
    raw = (tmp_path / MODEL).read_text()

    writes = [
        ("tm_patch_threat", {"threat": "T1", "changes": {"priority": "Low"}}),
        (
            "tm_set_status",
            {"kind": "threat", "ids": [model["t1"]], "status": "threatResolved"},
        ),
        ("tm_remove", {"kind": "threat", "ids": [model["t1"]]}),
        ("tm_set_section", {"section": "architecture", "description": "x"}),
        ("tm_add_tags", {"kind": "threat", "ids": [model["t1"]], "tags": ["x"]}),
    ]
    for tool, args in writes:
        with pytest.raises(ToolError, match="changed since you read it"):
            call(server, tool, model=MODEL, expected_hash=h0, **args)
    assert (tmp_path / MODEL).read_text() == raw

    # With the current hash, or none, the write goes through.
    h1 = call(server, "tm_get", model=MODEL)["hash"]
    call(
        server,
        "tm_add_tags",
        model=MODEL,
        kind="threat",
        ids=[model["t1"]],
        tags=["x"],
        expected_hash=h1,
    )
    call(
        server, "tm_add_tags", model=MODEL, kind="threat", ids=[model["t1"]], tags=["y"]
    )


def test_hash_changes_when_the_file_is_edited_outside_the_tools(
    server, tmp_path, model
):
    h0 = call(server, "tm_get", model=MODEL)["hash"]
    doc = read(tmp_path)
    doc["threats"][0]["status"] = "threatResolved"
    (tmp_path / MODEL).write_text(json.dumps(doc, indent=2) + "\n")
    with pytest.raises(ToolError, match="changed since you read it"):
        call(
            server,
            "tm_set_status",
            model=MODEL,
            kind="threat",
            ids=[model["t1"]],
            status="threatIdentified",
            expected_hash=h0,
        )


# -- tm_remove, tm_search, tm_edit_section, tags -----------------------------


def test_remove_refuses_while_text_mentions_the_item(server, tmp_path, model):
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T2",
        changes={"comments": "Relies on assumption 1 and also M1."},
    )
    raw = (tmp_path / MODEL).read_text()
    with pytest.raises(ToolError, match="T2 metadata:Comments mentions A1"):
        call(server, "tm_remove", model=MODEL, kind="assumption", ids=["A1"])
    assert (tmp_path / MODEL).read_text() == raw  # links and item stay

    # A mention of a different number is not a match.
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T2",
        changes={"comments": "see A10, M12 and a1"},
    )
    result = call(server, "tm_remove", model=MODEL, kind="assumption", ids=["A1"])
    assert result["removed_numbers"] == ["A1"] and "references_left" not in result
    doc = read(tmp_path)
    assert doc["assumptions"] == [] and doc["assumptionLinks"] == []


def test_remove_force_removes_and_reports_what_is_left(server, tmp_path, model):
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T2",
        changes={"comments": "see mitigation #1"},
    )
    result = call(
        server, "tm_remove", model=MODEL, kind="mitigation", ids=["M1"], force=True
    )
    assert result["references_left"][0]["in"] == "T2"
    doc = read(tmp_path)
    assert doc["mitigations"] == [] and doc["mitigationLinks"] == []


def test_remove_ignores_mentions_inside_the_removed_items(server, tmp_path, model):
    call(
        server,
        "tm_patch_assumption",
        model=MODEL,
        assumption="A1",
        changes={"comments": "this is A1"},
    )
    call(server, "tm_remove", model=MODEL, kind="assumption", ids=["A1"])
    assert read(tmp_path)["assumptions"] == []


def test_search_covers_every_text_field(server, model):
    call(
        server,
        "tm_patch_mitigation",
        model=MODEL,
        mitigation="M1",
        changes={"comments": "needle in mitigation comment"},
    )
    call(
        server,
        "tm_set_section",
        model=MODEL,
        section="architecture",
        description="the needle sits in the architecture",
    )
    call(
        server,
        "sys_upsert",
        model=MODEL,
        elements=[
            {"id": "DS1", "kind": "data_store", "name": "needle store", "zone": "Z2"}
        ],
    )
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"evidence": ["src/needle.py:1"]},
    )

    found = call(server, "tm_search", model=MODEL, query="NEEDLE")
    places = {(m["kind"], m["number"], m["field"]) for m in found["matches"]}
    assert places == {
        ("mitigation", "M1", "metadata:Comments"),
        ("section", "architecture", "description"),
        ("element", "DS1", "name"),
        ("threat", "T1", "metadata:custom:evidence"),
    }
    assert found["count"] == 4 and found["truncated"] is False
    assert (
        call(server, "tm_search", model=MODEL, query="NEEDLE", case_sensitive=True)[
            "count"
        ]
        == 0
    )
    only = call(server, "tm_search", model=MODEL, query="needle", kinds=["threat"])
    assert [m["number"] for m in only["matches"]] == ["T1"]
    assert (
        call(server, "tm_search", model=MODEL, query="needle", limit=1)["truncated"]
        is True
    )

    regex = call(
        server, "tm_search", model=MODEL, query=r"^replay the \w+$", regex=True
    )
    assert {m["number"] for m in regex["matches"]} == {"T1"}
    with pytest.raises(ToolError, match="regular expression"):
        call(server, "tm_search", model=MODEL, query="(", regex=True)
    with pytest.raises(ToolError, match="empty"):
        call(server, "tm_search", model=MODEL, query="")


def test_edit_section(server, tmp_path, model):
    call(
        server,
        "tm_set_section",
        model=MODEL,
        section="architecture",
        description="API talks to DB. API is public.",
    )
    raw = (tmp_path / MODEL).read_text()
    with pytest.raises(ToolError, match="not found"):
        call(
            server,
            "tm_edit_section",
            model=MODEL,
            section="architecture",
            old="nope",
            new="x",
        )
    with pytest.raises(ToolError, match="matches 2 times"):
        call(
            server,
            "tm_edit_section",
            model=MODEL,
            section="architecture",
            old="API",
            new="Gateway",
        )
    assert (tmp_path / MODEL).read_text() == raw

    call(
        server,
        "tm_edit_section",
        model=MODEL,
        section="architecture",
        old="API is public",
        new="API is private",
    )
    assert (
        read(tmp_path)["architecture"]["description"]
        == "API talks to DB. API is private."
    )
    result = call(
        server,
        "tm_edit_section",
        model=MODEL,
        section="architecture",
        old="API",
        new="Gateway",
        replace_all=True,
    )
    assert result["replaced"] == 2
    assert (
        read(tmp_path)["architecture"]["description"]
        == "Gateway talks to DB. Gateway is private."
    )


def test_viewer_flag_skips_the_html_file(server, tmp_path, model):
    result = call(server, "sys_render", model=MODEL, viewer=False)
    assert result["viewer"] is None and not (tmp_path / "app.dfd.html").exists()
    call(server, "sys_render", model=MODEL)
    assert (tmp_path / "app.dfd.html").exists()


def test_element_ids_round_trip_between_reads_and_writes(server, tmp_path, model):
    got = call(server, "tm_get", model=MODEL, sections=["threats"])["threats"][0]
    assert got["elements"] == ["U1"] and "U1" not in got["tags"]
    item = call(server, "tm_get_item", model=MODEL, item="T1")
    assert item["elements"] == ["U1"] and "U1" not in item["other_tags"]

    before = read(tmp_path)["threats"][0]["tags"]
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"elements": got["elements"]},
    )
    assert read(tmp_path)["threats"][0]["tags"] == before

    with pytest.raises(ToolError, match="not as tags|element or flow ids"):
        call(server, "tm_add_tags", model=MODEL, kind="threat", ids=["x"], tags=["P1"])
    call(
        server,
        "tm_add_tags",
        model=MODEL,
        kind="threat",
        ids=[model["t1"]],
        tags=["task:2"],
    )


# -- dry_run -----------------------------------------------------------------


def changes(result):
    return {(c.get("item") or c.get("link"), c["op"]): c for c in result["changes"]}


def test_dry_run_reports_field_changes_and_writes_nothing(server, tmp_path, model):
    raw = (tmp_path / MODEL).read_text()
    h0 = call(server, "tm_get", model=MODEL)["hash"]

    result = call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"comments": "new", "priority": "Low", "status": "threatResolved"},
        dry_run=True,
    )
    assert result["dry_run"] is True and result["hash"] == h0
    change = changes(result)[("T1", "change")]["fields"]
    assert change["metadata:Comments"] == {"before": "original comment", "after": "new"}
    assert change["metadata:Priority"] == {"before": "High", "after": "Low"}
    assert change["status"] == {
        "before": "threatIdentified",
        "after": "threatResolved",
    }
    assert set(change) == {"metadata:Comments", "metadata:Priority", "status"}
    assert (tmp_path / MODEL).read_text() == raw

    # The same call without dry_run makes exactly that change.
    real = call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"comments": "new", "priority": "Low", "status": "threatResolved"},
    )
    assert "dry_run" not in real and real["hash"] != h0
    t = read(tmp_path)["threats"][0]
    assert meta(t, "Priority") == "Low" and t["status"] == "threatResolved"


def test_dry_run_shows_adds_removes_links_and_tags(server, tmp_path, model):
    raw = (tmp_path / MODEL).read_text()
    added = call(
        server,
        "tm_add_threats",
        model=MODEL,
        dry_run=True,
        threats=[
            {
                "threat_source": "actor",
                "threat_action": "do a thing",
                "stride": ["T"],
                "priority": "Low",
            }
        ],
    )
    assert ("T3", "add") in changes(added) and added["added"][0]["numericId"] == 3

    removed = call(
        server, "tm_remove", model=MODEL, kind="mitigation", ids=["M1"], dry_run=True
    )
    c = changes(removed)
    assert ("M1", "remove") in c and ("M1 -> T1", "unlink") in c

    linked = call(
        server,
        "tm_link",
        model=MODEL,
        kind="mitigation",
        from_id=read(tmp_path)["mitigations"][0]["id"],
        to_ids=[model["t2"]],
        dry_run=True,
    )
    assert ("M1 -> T2", "link") in changes(linked)

    tagged = call(
        server,
        "tm_add_tags",
        model=MODEL,
        kind="threat",
        ids=[model["t1"]],
        tags=["task:9"],
        dry_run=True,
    )
    assert changes(tagged)[("T1", "change")]["fields"]["tags"] == {
        "added": ["task:9"],
        "removed": [],
    }
    assert (tmp_path / MODEL).read_text() == raw


def test_dry_run_still_rejects_bad_changes_and_stale_hashes(server, tmp_path, model):
    h0 = call(server, "tm_get", model=MODEL)["hash"]
    with pytest.raises(ToolError, match="unknown ids"):
        call(
            server,
            "tm_patch_threat",
            model=MODEL,
            threat="T1",
            changes={"elements": ["NOPE"]},
            dry_run=True,
        )
    call(
        server, "tm_add_tags", model=MODEL, kind="threat", ids=[model["t1"]], tags=["z"]
    )
    with pytest.raises(ToolError, match="changed since you read it"):
        call(
            server,
            "tm_patch_threat",
            model=MODEL,
            threat="T1",
            changes={"priority": "Low"},
            expected_hash=h0,
            dry_run=True,
        )


def test_dry_run_section_edit_clips_long_text_and_hides_images(server, tmp_path, model):
    call(
        server,
        "tm_set_section",
        model=MODEL,
        section="architecture",
        description="x" * 1000,
    )
    result = call(
        server,
        "tm_edit_section",
        model=MODEL,
        section="architecture",
        old="x" * 1000,
        new="short",
        dry_run=True,
    )
    fields = changes(result)[("architecture", "change")]["fields"]["description"]
    assert fields["after"] == "short" and "1000 characters" in fields["before"]
    assert len(fields["before"]) < 400
    assert read(tmp_path)["architecture"]["description"] == "x" * 1000


def test_dry_run_on_system_model_and_render(server, tmp_path, model):
    system_path = tmp_path / "app.system.json"
    raw = system_path.read_text()

    upsert = call(
        server,
        "sys_upsert",
        model=MODEL,
        dry_run=True,
        elements=[{"id": "DS1", "kind": "data_store", "name": "DB", "zone": "Z2"}],
        flows=[{"source": "P1", "target": "DS1", "description": "Query"}],
    )
    c = changes(upsert)
    assert ("element DS1", "add") in c and ("flow DF2", "add") in c
    assert system_path.read_text() == raw

    removed = call(server, "sys_remove", model=MODEL, ids=["P1"], dry_run=True)
    assert ("flow DF1", "remove") in changes(removed)
    assert system_path.read_text() == raw

    before = (tmp_path / MODEL).read_text()
    rendered = call(server, "sys_render", model=MODEL, dry_run=True)
    assert rendered["dry_run"] is True
    assert changes(rendered)[("dataflow", "change")]["fields"]["description"]
    assert (tmp_path / MODEL).read_text() == before
    assert not (tmp_path / "app.dfd.html").exists()
    assert not (tmp_path / "app.dfd.svg").exists()


def test_dry_run_sys_upsert_on_new_model_creates_no_file(server, tmp_path):
    call(server, "tm_init", model=MODEL, name="Demo")
    call(
        server,
        "sys_upsert",
        model=MODEL,
        dry_run=True,
        elements=[{"id": "P1", "kind": "process", "name": "API"}],
    )
    assert not (tmp_path / "app.system.json").exists()


# -- gaps: patch edge cases ---------------------------------------------------


def test_patched_statement_equals_the_statement_add_would_make(server, tmp_path, model):
    """T1 and T2 differ only in threat_action, so patching T1's action to T2's
    must give T2's statement."""
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"threat_action": "Forge a token"},  # case is normalised like add
    )
    threats = read(tmp_path)["threats"]
    assert threats[0]["threatAction"] == "forge a token"
    assert threats[0]["statement"] == threats[1]["statement"]


def test_patch_threat_clearing_optional_grammar_fields(server, tmp_path, model):
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"prerequisites": "", "threat_impact": "", "impacted_goal": []},
    )
    t = read(tmp_path)["threats"][0]
    assert "stolen token" not in t["statement"]
    assert "leads to" not in t["statement"]
    assert t["impactedGoal"] == [] and t["impactedAssets"] == ["account data"]
    assert "negatively impacting account data" in t["statement"]


def test_patch_threat_elements_needs_a_system_model(server, tmp_path):
    call(server, "tm_init", model=MODEL, name="Demo")
    call(
        server,
        "tm_add_threats",
        model=MODEL,
        threats=[
            {
                "threat_source": "actor",
                "threat_action": "act",
                "stride": ["S"],
                "priority": "Low",
            }
        ],
    )
    with pytest.raises(ToolError, match="no system model"):
        call(
            server,
            "tm_patch_threat",
            model=MODEL,
            threat="T1",
            changes={"elements": ["P1"]},
        )
    # Other fields still patch without one.
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"priority": "High"},
    )


def test_patch_mitigation_content_and_clearing_tags(server, tmp_path, model):
    call(
        server,
        "tm_patch_mitigation",
        model=MODEL,
        mitigation="M1",
        changes={
            "content": "  Bind tokens to a client certificate  ",
            "existing": True,
        },
    )
    m = read(tmp_path)["mitigations"][0]
    assert m["content"] == "Bind tokens to a client certificate"
    assert "Existing control" in m["tags"] and "Preventative" in m["tags"]

    call(
        server,
        "tm_patch_mitigation",
        model=MODEL,
        mitigation="M1",
        changes={"existing": False, "control_type": None},
    )
    m = read(tmp_path)["mitigations"][0]
    assert "Existing control" not in m["tags"]
    assert not {"Preventative", "Detective", "Corrective"} & set(m["tags"])
    assert "AI Generated" in m["tags"]  # unrelated tags stay


def test_patch_assumption_rejects_unknown_link_and_changes_nothing(
    server, tmp_path, model
):
    raw = (tmp_path / MODEL).read_text()
    with pytest.raises(ToolError, match="not a threat or mitigation id"):
        call(
            server,
            "tm_patch_assumption",
            model=MODEL,
            assumption="A1",
            changes={"link_to": ["nope"], "content": "changed"},
        )
    assert (tmp_path / MODEL).read_text() == raw


def test_patch_assumption_can_link_to_a_mitigation(server, tmp_path, model):
    mitigation_id = read(tmp_path)["mitigations"][0]["id"]
    call(
        server,
        "tm_patch_assumption",
        model=MODEL,
        assumption="A1",
        changes={"link_to": [mitigation_id]},
    )
    assert read(tmp_path)["assumptionLinks"] == [
        {
            "type": "Mitigation",
            "assumptionId": read(tmp_path)["assumptions"][0]["id"],
            "linkedId": mitigation_id,
        }
    ]


def test_edit_section_rejects_empty_old_text(server, model):
    with pytest.raises(ToolError, match="must not be empty"):
        call(
            server,
            "tm_edit_section",
            model=MODEL,
            section="architecture",
            old="",
            new="x",
        )


# -- gaps: removal references --------------------------------------------------


def test_reference_matching_boundaries(server, tmp_path, model):
    def removal(comment, kind="assumption", ref="A1"):
        call(
            server,
            "tm_patch_threat",
            model=MODEL,
            threat="T2",
            changes={"comments": comment},
        )
        return call(
            server, "tm_remove", model=MODEL, kind=kind, ids=[ref], dry_run=True
        )

    # Not references to A1: other numbers, lower-case codes, longer words.
    for text in [
        "see A10",
        "A11 and A21",
        "a1",
        "XA1",
        "A1B",
        "assumption 10",
        "assumptions 12",
        "the assumption is 1",
    ]:
        removal(text)  # would raise if it matched

    # References to A1.
    for text in [
        "see A1.",
        "(A1)",
        "A01",
        "Assumption 1",
        "assumptions #1",
        "assumption   1",
    ]:
        with pytest.raises(ToolError, match="mentions A1"):
            removal(text)

    # By id, and a different kind with the same number is not a match.
    with pytest.raises(ToolError, match="mentions A1"):
        removal(f"see {read(tmp_path)['assumptions'][0]['id']}")
    removal("see M1 and T1", kind="assumption", ref="A1")


def test_removal_finds_mentions_in_section_text_tags_and_other_kinds(
    server, tmp_path, model
):
    call(
        server,
        "tm_set_section",
        model=MODEL,
        section="architecture",
        description="Depends on threat 2.",
    )
    with pytest.raises(ToolError, match="architecture description mentions T2"):
        call(server, "tm_remove", model=MODEL, kind="threat", ids=["T2"])
    call(
        server,
        "tm_edit_section",
        model=MODEL,
        section="architecture",
        old="threat 2",
        new="the risk",
    )

    call(
        server,
        "tm_patch_assumption",
        model=MODEL,
        assumption="A1",
        changes={"content": "Holds because of T2"},
    )
    with pytest.raises(ToolError, match="A1 content mentions T2"):
        call(server, "tm_remove", model=MODEL, kind="threat", ids=["T2"])

    call(
        server,
        "tm_patch_assumption",
        model=MODEL,
        assumption="A1",
        changes={"content": "TLS is on"},
    )
    call(
        server,
        "tm_add_tags",
        model=MODEL,
        kind="mitigation",
        ids=[read(tmp_path)["mitigations"][0]["id"]],
        tags=["T2"],
    )
    with pytest.raises(ToolError, match="M1 tags mentions T2"):
        call(server, "tm_remove", model=MODEL, kind="threat", ids=["T2"])


def test_removing_several_items_ignores_mentions_between_them(server, tmp_path, model):
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"comments": "same as T2"},
    )
    call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T2",
        changes={"comments": "same as T1"},
    )
    result = call(server, "tm_remove", model=MODEL, kind="threat", ids=["T1", "T2"])
    assert result["removed_numbers"] == ["T1", "T2"]
    assert read(tmp_path)["threats"] == []


# -- gaps: search and diff -----------------------------------------------------


def test_search_finds_flow_assets_and_protocol(server, model):
    call(
        server,
        "sys_upsert",
        model=MODEL,
        flows=[
            {
                "id": "DF9",
                "source": "U1",
                "target": "P1",
                "description": "x",
                "protocol": "gRPC",
                "assets": ["session cookie"],
            }
        ],
    )
    found = call(server, "tm_search", model=MODEL, query="cookie")
    assert [(m["kind"], m["number"], m["field"]) for m in found["matches"]] == [
        ("flow", "DF9", "assets")
    ]
    found = call(server, "tm_search", model=MODEL, query="grpc", kinds=["flow"])
    assert [m["field"] for m in found["matches"]] == ["protocol"]


def test_search_snippet_is_bounded_around_the_match(server, model):
    call(
        server,
        "tm_set_section",
        model=MODEL,
        section="architecture",
        description="a" * 500 + "NEEDLE" + "b" * 500,
    )
    snippet = call(server, "tm_search", model=MODEL, query="needle")["matches"][0][
        "snippet"
    ]
    assert "NEEDLE" in snippet and len(snippet) < 150
    assert snippet.startswith("…") and snippet.endswith("…")


def test_dry_run_diff_hides_image_data(server, tmp_path, model):
    svg = tmp_path / "d.svg"
    svg.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
    )
    result = call(
        server,
        "tm_set_section",
        model=MODEL,
        section="architecture",
        image_path="d.svg",
        dry_run=True,
    )
    fields = changes(result)[("architecture", "change")]["fields"]
    assert fields == {"image": {"changed": True}}
    assert "image" not in read(tmp_path)["architecture"]


def test_dry_run_with_no_effective_change_lists_none(server, model):
    result = call(
        server,
        "tm_patch_threat",
        model=MODEL,
        threat="T1",
        changes={"priority": "High"},
        dry_run=True,
    )
    assert result["changes"] == []


# -- gaps: hashes and concurrency ---------------------------------------------


def test_expected_hash_on_a_missing_model_is_refused(server):
    with pytest.raises(ToolError, match="not found"):
        call(
            server,
            "tm_set_status",
            model="missing.tc.json",
            kind="threat",
            ids=["x"],
            status="threatResolved",
            expected_hash="abc",
        )


def test_only_one_of_two_writers_with_the_same_hash_succeeds(tmp_path, model):
    """Two clients read the model, then both write against that read. The second
    write must be refused instead of silently replacing the first."""
    import threading

    workspace = Workspace(tmp_path)
    mcp = FastMCP("test")
    register_builder_tools(mcp, workspace)
    h0 = call(mcp, "tm_get", model=MODEL)["hash"]

    outcomes: list[str] = []
    barrier = threading.Barrier(4)

    def writer(comment):
        barrier.wait()
        try:
            call(
                mcp,
                "tm_patch_threat",
                model=MODEL,
                threat="T1",
                changes={"comments": comment},
                expected_hash=h0,
            )
            outcomes.append("ok")
        except ToolError as e:
            outcomes.append(
                "stale" if "changed since you read it" in str(e) else str(e)
            )

    # Every writer changes the comment to a different value. A write that left
    # the file byte-identical would keep the hash valid, so none may do that.
    comments = [f"writer {i}" for i in range(4)]
    threads = [threading.Thread(target=writer, args=(c,)) for c in comments]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(outcomes) == ["ok", "stale", "stale", "stale"]
    assert meta(read(tmp_path)["threats"][0], "Comments") in comments


def test_hash_ignores_nothing_in_the_file(server, tmp_path, model):
    """Any byte change, even whitespace, changes the hash."""
    h0 = call(server, "tm_get", model=MODEL)["hash"]
    path = tmp_path / MODEL
    path.write_text(path.read_text() + "\n")
    assert call(server, "tm_get", model=MODEL)["hash"] != h0
