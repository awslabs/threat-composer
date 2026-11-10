"""Threat statements must read the way the Threat Composer UI renders them."""

import pytest

from threat_composer_ai.builder.statement import (
    compose_statement,
    indefinite_article,
    join_list,
    lower_first,
)


@pytest.mark.parametrize(
    "phrase, article",
    [
        ("actor", "an"),
        ("internet-based actor", "an"),
        ("malicious user", "a"),
        ("user with a session", "a"),
        ("unauthenticated user", "an"),
        ("hour-long job", "an"),
        ("MITM attacker", "an"),
        ("TLS terminator", "a"),
        ("S3 bucket owner", "an"),
        ("", "a"),
    ],
)
def test_indefinite_article(phrase, article):
    assert indefinite_article(phrase) == article


def test_lower_first_keeps_acronyms_and_camel_case():
    assert lower_first("Spoof another user") == "spoof another user"
    assert lower_first("API gateway") == "API gateway"
    assert lower_first("OAuth token theft") == "OAuth token theft"


def test_join_list_matches_render_array_field():
    assert join_list(["a"], "and") == "a"
    assert join_list(["a", "b"], "and") == "a and b"
    assert join_list(["a", "b", "c"], "and/or") == "a, b and/or c"
    assert join_list(["", " "], "and") == ""


# The eight formats in packages/threat-composer/src/data/threatStatementFormat.ts
@pytest.mark.parametrize(
    "impact, goals, assets, expected_tail",
    [
        ("", [], [], "can read tokens"),
        ("x", [], [], "can read tokens, which leads to x"),
        ("", ["integrity"], [], "can read tokens, resulting in reduced integrity"),
        ("x", ["integrity"], [], "which leads to x, resulting in reduced integrity"),
        ("", [], ["db"], "can read tokens, negatively impacting db"),
        ("x", [], ["db"], "which leads to x, negatively impacting db"),
        ("", ["integrity"], ["db"], "resulting in reduced integrity of db"),
        (
            "x",
            ["integrity"],
            ["db"],
            "which leads to x, resulting in reduced integrity of db",
        ),
    ],
)
def test_all_eight_formats(impact, goals, assets, expected_tail):
    statement = compose_statement("actor", "", "read tokens", impact, goals, assets)
    assert statement.startswith("An actor can read tokens")
    assert statement.endswith(expected_tail)


def test_full_statement_and_whitespace():
    assert (
        compose_statement(
            "An internet-based actor",
            "with  a stolen   token",
            "call the admin API",
            "unauthorized changes",
            ["confidentiality", "integrity"],
            ["user records", "audit log"],
        )
        == "An internet-based actor with a stolen token can call the admin API, "
        "which leads to unauthorized changes, resulting in reduced confidentiality "
        "and/or integrity of user records and audit log"
    )


def test_articles_inside_fields_corrected_like_the_ui():
    # Cases taken from the workshop examples, where the UI shows the corrected
    # article even though the field text says otherwise.
    assert (
        compose_statement(
            "threat actor",
            "who has access to a LLM powered application",
            "input a unexpected data schema",
        )
        == "A threat actor who has access to an LLM powered application can input "
        "an unexpected data schema"
    )
    assert (
        compose_statement("actor", "", "read an user record")
        == "An actor can read a user record"
    )
