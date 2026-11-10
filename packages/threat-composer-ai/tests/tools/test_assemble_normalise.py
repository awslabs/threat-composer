"""The assembler owns numericIds and threat statements, not the model."""

import uuid

from threat_composer_ai.tools.threat_composer_assemble_tc_v1_model import (
    _assemble_components,
    normalise_threats_and_mitigations,
)
from threat_composer_ai.tools.threat_composer_validate_tc_v1_schema import (
    validate_tc_data_pydantic,
)


def _threat(numeric_id, statement="whatever the model wrote", **fields):
    base = {
        "id": str(uuid.uuid4()),
        "numericId": numeric_id,
        "threatSource": "internet-based actor",
        "prerequisites": "with a stolen token",
        "threatAction": "call the admin API",
        "threatImpact": "unauthorized changes",
        "impactedGoal": ["integrity"],
        "impactedAssets": ["user records"],
        "statement": statement,
        "status": "threatIdentified",
    }
    return {**base, **fields}


def test_numeric_ids_reassigned_in_order():
    model = {
        "threats": [_threat(5), _threat(5), _threat(1)],
        "mitigations": [
            {"id": str(uuid.uuid4()), "numericId": 9, "content": "a"},
            {"id": str(uuid.uuid4()), "numericId": 9, "content": "b"},
        ],
    }
    normalise_threats_and_mitigations(model)
    assert [t["numericId"] for t in model["threats"]] == [1, 2, 3]
    assert [m["numericId"] for m in model["mitigations"]] == [1, 2]


def test_statement_rebuilt_from_fields():
    model = {"threats": [_threat(1, statement="A/An internet-based actor can ...")]}
    normalise_threats_and_mitigations(model)
    assert model["threats"][0]["statement"] == (
        "An internet-based actor with a stolen token can call the admin API, "
        "which leads to unauthorized changes, resulting in reduced integrity "
        "of user records"
    )


def test_empty_list_entries_ignored():
    # The threats prompt tells the model to return [""] when a list is unknown
    model = {"threats": [_threat(1, impactedGoal=[""], impactedAssets=[""])]}
    normalise_threats_and_mitigations(model)
    assert model["threats"][0]["statement"].endswith(
        "can call the admin API, which leads to unauthorized changes"
    )


def test_statement_kept_when_grammar_incomplete():
    model = {"threats": [_threat(1, statement="kept as written", threatAction="")]}
    normalise_threats_and_mitigations(model)
    assert model["threats"][0]["statement"] == "kept as written"


def test_assembled_model_still_validates():
    threat = _threat(7)
    mitigation = {"id": str(uuid.uuid4()), "numericId": 3, "content": "MFA"}
    components = {
        "application_info": {"applicationInfo": {"name": "App", "description": ""}},
        "architecture_description": {"architecture": {"description": ""}},
        "dataflow_description": {"dataflow": {"description": ""}},
        "threats": {"threats": [threat], "assumptionLinks": []},
        "mitigations": {
            "mitigations": [mitigation],
            "mitigationLinks": [
                {"mitigationId": mitigation["id"], "linkedId": threat["id"]}
            ],
        },
    }
    assembled = _assemble_components(components, "missing.svg", "missing.svg")
    assert assembled["threats"][0]["numericId"] == 1
    assert assembled["mitigations"][0]["numericId"] == 1
    assert assembled["mitigationLinks"][0]["linkedId"] == threat["id"]
    assert validate_tc_data_pydantic(assembled) == (True, "")
