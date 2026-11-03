"""Model operations: ids assigned in code, per-item rejection, link integrity."""

import uuid

import pytest

from threat_composer_ai.builder import model_ops as ops
from threat_composer_ai.builder.coverage import link_problems


def threat(**overrides):
    base = {
        "threat_source": "internet-based actor",
        "prerequisites": "with a valid session",
        "threat_action": "Replay another user's token",
        "threat_impact": "account takeover",
        "impacted_goal": ["confidentiality"],
        "impacted_assets": ["user data"],
        "stride": ["S"],
        "priority": "High",
        "elements": ["P1"],
    }
    return ops.ThreatInput(**{**base, **overrides})


@pytest.fixture
def doc():
    return ops.empty_model("App")


def test_empty_model_is_valid(doc):
    assert ops.validate_document(doc) == []


def test_add_threats_assigns_ids_and_statement(doc):
    result = ops.add_threats(
        doc, [threat(), threat(priority="Medium")], {"P1"}, "tester"
    )
    assert [a["numericId"] for a in result["added"]] == [1, 2]
    item = doc["threats"][0]
    uuid.UUID(item["id"], version=4)
    assert item["threatAction"] == "replay another user's token"
    assert item["statement"].startswith(
        "An internet-based actor with a valid session can"
    )
    assert "P1" in item["tags"] and ops.DEFAULT_AI_TAG in item["tags"]
    meta = {m["key"]: m["value"] for m in item["metadata"]}
    assert meta["STRIDE"] == ["S"] and meta["Priority"] == "High"
    assert meta["custom:agent"] == "tester"
    assert ops.validate_document(doc) == []


def test_invalid_items_rejected_individually(doc):
    long_tag = "x" * 31
    result = ops.add_threats(
        doc, [threat(), threat(elements=["NOPE"]), threat(tags=[long_tag])], {"P1"}
    )
    assert [a["index"] for a in result["added"]] == [0]
    assert [r["index"] for r in result["rejected"]] == [1, 2]
    assert "unknown ids" in result["rejected"][0]["errors"][0]
    assert len(doc["threats"]) == 1


def test_stride_is_deduplicated_and_ordered(doc):
    ops.add_threats(doc, [threat(stride=["I", "S", "I"])])
    meta = {m["key"]: m["value"] for m in doc["threats"][0]["metadata"]}
    assert meta["STRIDE"] == ["S", "I"]


def test_mitigations_link_and_existing_controls(doc):
    tid = ops.add_threats(doc, [threat()])["added"][0]["id"]
    result = ops.add_mitigations(
        doc,
        [
            ops.MitigationInput(
                content="Bind tokens to client",
                threat_ids=[tid],
                control_type="Preventative",
            ),
            ops.MitigationInput(content="CSRF tokens", threat_ids=[tid], existing=True),
            ops.MitigationInput(content="Orphan", threat_ids=[str(uuid.uuid4())]),
        ],
    )
    assert len(result["added"]) == 2 and result["rejected"][0]["index"] == 2
    existing = doc["mitigations"][1]
    assert existing["status"] == "mitigationResolved"
    assert ops.EXISTING_CONTROL_TAG in existing["tags"]
    assert len(doc["mitigationLinks"]) == 2
    assert link_problems(doc) == []


def test_assumption_links_infer_type(doc):
    tid = ops.add_threats(doc, [threat()])["added"][0]["id"]
    mid = ops.add_mitigations(
        doc, [ops.MitigationInput(content="m", threat_ids=[tid])]
    )["added"][0]["id"]
    ops.add_assumptions(
        doc, [ops.AssumptionInput(content="TLS everywhere", link_to=[tid, mid])]
    )
    assert {x["type"] for x in doc["assumptionLinks"]} == {"Threat", "Mitigation"}
    bad = ops.add_assumptions(doc, [ops.AssumptionInput(content="x", link_to=["nope"])])
    assert bad["rejected"] and len(doc["assumptions"]) == 1


def test_remove_cascades_links(doc):
    tid = ops.add_threats(doc, [threat()])["added"][0]["id"]
    ops.add_mitigations(doc, [ops.MitigationInput(content="m", threat_ids=[tid])])
    ops.add_assumptions(doc, [ops.AssumptionInput(content="a", link_to=[tid])])
    ops.remove(doc, "threat", [tid])
    assert doc["mitigationLinks"] == [] and doc["assumptionLinks"] == []
    with pytest.raises(ops.BuilderError):
        ops.remove(doc, "threat", [tid])


def test_update_threat_keeps_identity_and_links(doc):
    tid = ops.add_threats(doc, [threat()])["added"][0]["id"]
    ops.add_mitigations(doc, [ops.MitigationInput(content="m", threat_ids=[tid])])
    ops.update_threat(doc, tid, threat(threat_action="forge a token", priority="Low"))
    item = doc["threats"][0]
    assert item["id"] == tid and item["numericId"] == 1
    assert "forge a token" in item["statement"]
    assert doc["mitigationLinks"][0]["linkedId"] == tid


def test_update_mitigation_replaces_links(doc):
    t1, t2 = (a["id"] for a in ops.add_threats(doc, [threat(), threat()])["added"])
    mid = ops.add_mitigations(doc, [ops.MitigationInput(content="m", threat_ids=[t1])])[
        "added"
    ][0]["id"]
    ops.update_mitigation(doc, mid, ops.MitigationInput(content="m2", threat_ids=[t2]))
    assert doc["mitigationLinks"] == [{"mitigationId": mid, "linkedId": t2}]


def test_link_and_unlink(doc):
    t1, t2 = (a["id"] for a in ops.add_threats(doc, [threat(), threat()])["added"])
    mid = ops.add_mitigations(doc, [ops.MitigationInput(content="m", threat_ids=[t1])])[
        "added"
    ][0]["id"]
    assert ops.link(doc, "mitigation", mid, [t1, t2])["changed"] == 1
    assert ops.link(doc, "mitigation", mid, [t1], unlink=True)["changed"] == 1
    assert doc["mitigationLinks"] == [{"mitigationId": mid, "linkedId": t2}]


def test_set_status_validates(doc):
    tid = ops.add_threats(doc, [threat()])["added"][0]["id"]
    ops.set_status(doc, "threat", [tid], "threatResolvedNotUseful")
    assert doc["threats"][0]["status"] == "threatResolvedNotUseful"
    with pytest.raises(ops.BuilderError):
        ops.set_status(doc, "threat", [tid], "mitigationResolved")


def test_numeric_ids_continue_after_removal(doc):
    ids = [a["id"] for a in ops.add_threats(doc, [threat(), threat()])["added"]]
    ops.remove(doc, "threat", [ids[0]])
    added = ops.add_threats(doc, [threat()])["added"][0]
    assert added["numericId"] == 3


def test_summary_filters(doc):
    ops.add_threats(
        doc, [threat(), threat(priority="Low", elements=["P2"])], {"P1", "P2"}
    )
    view = ops.summary(doc, ["threats"], priority="High")
    assert len(view["threats"]) == 1 and "info" not in view
    assert len(ops.summary(doc, ["threats"], element="P2")["threats"]) == 1


def test_ai_tag_from_environment(doc, monkeypatch):
    monkeypatch.setenv(ops.AI_TAG_ENV_VAR, "Claude")
    ops.add_threats(doc, [threat()])
    assert "Claude" in doc["threats"][0]["tags"]
