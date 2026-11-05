"""Model operations: ids assigned in code, per-item rejection, link integrity."""

import copy
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


# -- tags -------------------------------------------------------------------


def _tagged_doc(doc):
    """Two threats, two linked mitigations with full metadata, one assumption."""
    t1, t2 = (a["id"] for a in ops.add_threats(doc, [threat(), threat()])["added"])
    m1, m2 = (
        a["id"]
        for a in ops.add_mitigations(
            doc,
            [
                ops.MitigationInput(
                    content="Bind tokens to client",
                    threat_ids=[t1, t2],
                    control_type="Preventative",
                    comments="Why",
                    evidence=["src/auth.py:10"],
                    tags=["alpha"],
                    status="mitigationInProgress",
                ),
                ops.MitigationInput(content="m2", threat_ids=[t1], existing=True),
            ],
            agent="defender",
        )["added"]
    )
    a1 = ops.add_assumptions(doc, [ops.AssumptionInput(content="a", link_to=[t1])])[
        "added"
    ][0]["id"]
    return {"threat": t1, "mitigation": m1, "assumption": a1, "m2": m2}


def _without_tags(doc, kind, item_id):
    stripped = copy.deepcopy(doc)
    for item in stripped[ops._COLLECTION[kind]]:
        if item["id"] == item_id:
            item.pop("tags", None)
    return stripped


def test_add_tags_changes_only_tags(doc):
    ids = _tagged_doc(doc)
    mid = ids["mitigation"]
    before = copy.deepcopy(doc)
    result = ops.add_tags(doc, "mitigation", [mid], ["  task:3.2 "])
    assert result == {"updated": 1}
    item = next(m for m in doc["mitigations"] if m["id"] == mid)
    old = next(m for m in before["mitigations"] if m["id"] == mid)
    assert item["tags"] == old["tags"] + ["task:3.2"]
    assert _without_tags(doc, "mitigation", mid) == _without_tags(
        before, "mitigation", mid
    )
    assert doc["mitigationLinks"] == before["mitigationLinks"]
    assert item["status"] == "mitigationInProgress"
    assert ops.validate_document(doc) == []


def test_add_existing_tag_is_noop_and_keeps_order(doc):
    mid = _tagged_doc(doc)["mitigation"]
    ops.add_tags(doc, "mitigation", [mid], ["task:1", "task:2"])
    tags = doc["mitigations"][0]["tags"]
    before = copy.deepcopy(doc)
    ops.add_tags(doc, "mitigation", [mid], ["task:2", "alpha", "task:1", "task:2"])
    assert doc == before
    assert tags[-2:] == ["task:1", "task:2"] and tags.index("alpha") < tags.index(
        "task:1"
    )


def test_remove_tags_and_missing_tag_is_noop(doc):
    mid = _tagged_doc(doc)["mitigation"]
    ops.add_tags(doc, "mitigation", [mid], ["task:1", "task:2"])
    before = copy.deepcopy(doc)
    assert ops.remove_tags(doc, "mitigation", [mid], ["task:1"]) == {"updated": 1}
    old_tags = before["mitigations"][0]["tags"]
    assert doc["mitigations"][0]["tags"] == [t for t in old_tags if t != "task:1"]
    assert _without_tags(doc, "mitigation", mid) == _without_tags(
        before, "mitigation", mid
    )
    after = copy.deepcopy(doc)
    ops.remove_tags(doc, "mitigation", [mid], ["not-there"])
    assert doc == after


@pytest.mark.parametrize("kind", ["threat", "mitigation", "assumption"])
def test_tags_work_for_each_kind(doc, kind):
    item_id = _tagged_doc(doc)[kind]
    before = copy.deepcopy(doc)
    ops.add_tags(doc, kind, [item_id], ["task:3.2"])
    item = next(i for i in doc[ops._COLLECTION[kind]] if i["id"] == item_id)
    assert item["tags"][-1] == "task:3.2"
    ops.remove_tags(doc, kind, [item_id], ["task:3.2"])
    assert doc == before


def test_tags_unknown_id_changes_nothing(doc):
    ids = _tagged_doc(doc)
    before = copy.deepcopy(doc)
    for op in (ops.add_tags, ops.remove_tags):
        with pytest.raises(ops.BuilderError, match="no mitigation"):
            op(doc, "mitigation", [ids["mitigation"], "nope", ids["m2"]], ["alpha"])
        assert doc == before


@pytest.mark.parametrize("bad", ["", "   "])
def test_tags_empty_tag_rejected(doc, bad):
    mid = _tagged_doc(doc)["mitigation"]
    before = copy.deepcopy(doc)
    for op in (ops.add_tags, ops.remove_tags):
        with pytest.raises(ops.BuilderError, match="empty"):
            op(doc, "mitigation", [mid], ["task:1", bad])
        assert doc == before


def test_tags_schema_rejection_changes_nothing(doc):
    ids = _tagged_doc(doc)
    before = copy.deepcopy(doc)
    with pytest.raises(ops.BuilderError, match="30 character"):
        ops.add_tags(doc, "mitigation", [ids["m2"], ids["mitigation"]], ["x" * 31])
    assert doc == before
    ops.add_tags(doc, "mitigation", [ids["mitigation"]], ["x" * 30])
    assert ops.validate_document(doc) == []


# -- summary elements and filters ---------------------------------------------


def test_element_ids_in_tags_rejected(doc):
    result = ops.add_threats(
        doc, [threat(elements=[], tags=["P1", "web"]), threat()], {"P1"}
    )
    assert [r["index"] for r in result["rejected"]] == [0]
    assert "put element and flow ids in elements" in result["rejected"][0]["errors"][0]
    # Without a system model there is nothing to check against.
    assert ops.add_threats(doc, [threat(tags=["P1"])])["rejected"] == []


def test_summary_splits_elements_from_tags(doc):
    ops.add_threats(doc, [threat(elements=["P1", "DF1"], tags=["web"])], {"P1", "DF1"})
    row = ops.summary(doc, ["threats"], known_targets={"P1", "DF1"})["threats"][0]
    assert row["elements"] == ["P1", "DF1"]
    assert row["tags"] == ["web", ops.DEFAULT_AI_TAG]
    row = ops.summary(doc, ["threats"])["threats"][0]
    assert row["elements"] == [] and "P1" in row["tags"]


def test_summary_status_filters(doc):
    t1, t2 = (a["id"] for a in ops.add_threats(doc, [threat(), threat()])["added"])
    ops.set_status(doc, "threat", [t2], "threatResolvedNotUseful")
    m1, m2 = (
        a["id"]
        for a in ops.add_mitigations(
            doc,
            [
                ops.MitigationInput(content="m1", threat_ids=[t1]),
                ops.MitigationInput(content="m2", threat_ids=[t2], existing=True),
            ],
        )["added"]
    )
    view = ops.summary(
        doc, ["threats", "mitigations"], threat_status=["threatIdentified"]
    )
    assert [t["id"] for t in view["threats"]] == [t1]
    assert [m["id"] for m in view["mitigations"]] == [m1]
    view = ops.summary(doc, ["mitigations"], mitigation_status=["mitigationResolved"])
    assert [m["id"] for m in view["mitigations"]] == [m2]
    assert len(ops.summary(doc, ["mitigations"])["mitigations"]) == 2


def test_summary_element_filter_narrows_mitigations(doc):
    known = {"P1", "P2"}
    t1, t2 = (
        a["id"]
        for a in ops.add_threats(doc, [threat(), threat(elements=["P2"])], known)[
            "added"
        ]
    )
    ops.add_mitigations(
        doc,
        [
            ops.MitigationInput(content="m1", threat_ids=[t1]),
            ops.MitigationInput(content="m2", threat_ids=[t2]),
        ],
    )
    view = ops.summary(doc, ["mitigations"], element="P2", known_targets=known)
    assert [m["content"] for m in view["mitigations"]] == ["m2"]
