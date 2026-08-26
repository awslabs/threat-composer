"""Unit tests for the quality eval's evaluators.

Every evaluator is a pure function of named environment state, which is the whole
reason the state is flattened in session.py rather than passed around as file
handles. It means each check can be exercised against a synthetic dict in
milliseconds, both passing and failing, instead of needing an eighteen minute
inference run to find out whether a boolean works.

Each test asserts the failing case as well as the passing one. A check that has
never been seen to fail is not a check.
"""

import pytest

pytest.importorskip(
    "strands_evals",
    reason="strands-agents-evals ships in the 'eval' extra: uv sync --extra eval",
)

from strands_evals.types import EnvironmentState, EvaluationData  # noqa: E402

from threat_composer_ai.eval.evaluators import (  # noqa: E402
    OPERATIONAL,
    ArtifactsComplete,
    ConceptCoverage,
    CountWithinBand,
    DiagramsUsable,
    ExecutionOrderValid,
    GraphCompleted,
    LinksResolve,
    SchemaValid,
    SpansCaptured,
    ThreatsWellFormed,
    TokenUsageWithinBand,
)

NODES = ["application_info", "architecture", "threats", "mitigations", "threat_model"]
EDGES = [
    ["application_info", "architecture"],
    ["architecture", "threats"],
    ["threats", "mitigations"],
    ["mitigations", "threat_model"],
]


def data(**state):
    """Build EvaluationData from named state, as the task function would."""
    return EvaluationData(
        input="test",
        actual_environment_state=[
            EnvironmentState(name=name, state=value) for name, value in state.items()
        ],
    )


def verdict(evaluator, case):
    outputs = evaluator.evaluate(case)
    assert len(outputs) == 1, "evaluators here emit exactly one output"
    return outputs[0]


def healthy_graph(**overrides):
    state = {
        "graph.present": True,
        "graph.status": "completed",
        "graph.failed_nodes": [],
        "graph.interrupted_nodes": [],
        "graph.node_statuses": dict.fromkeys(NODES, "completed"),
        "graph.execution_order": NODES,
    }
    state.update(overrides)
    return state


class TestGraphCompleted:
    def test_passes_when_every_node_completed(self):
        out = verdict(GraphCompleted(NODES), data(**healthy_graph()))
        assert out.test_pass and out.score == 1.0

    def test_fails_on_a_failed_node(self):
        out = verdict(
            GraphCompleted(NODES),
            data(**healthy_graph(**{"graph.failed_nodes": ["threats"]})),
        )
        assert not out.test_pass
        assert "threats" in out.reason

    def test_fails_on_an_interrupted_node(self):
        out = verdict(
            GraphCompleted(NODES),
            data(**healthy_graph(**{"graph.interrupted_nodes": ["mitigations"]})),
        )
        assert not out.test_pass

    def test_fails_when_a_node_never_ran(self):
        statuses = dict.fromkeys(NODES, "completed")
        del statuses["mitigations"]
        out = verdict(
            GraphCompleted(NODES),
            data(**healthy_graph(**{"graph.node_statuses": statuses})),
        )
        assert not out.test_pass
        assert "never ran" in out.reason

    def test_fails_when_a_node_is_not_completed(self):
        statuses = dict.fromkeys(NODES, "completed")
        statuses["threats"] = "running"
        out = verdict(
            GraphCompleted(NODES),
            data(**healthy_graph(**{"graph.node_statuses": statuses})),
        )
        assert not out.test_pass

    def test_fails_loudly_when_graph_state_is_absent(self):
        # The important case: without graph state a stale artifact set cannot be
        # distinguished from a fresh one, so this must not pass by default.
        out = verdict(GraphCompleted(NODES), data(**{"graph.present": False}))
        assert not out.test_pass
        assert "cannot be verified" in out.reason

    def test_is_operational_tier(self):
        assert GraphCompleted(NODES).tier == OPERATIONAL


class TestExecutionOrderValid:
    def test_passes_on_declared_order(self):
        out = verdict(ExecutionOrderValid(EDGES), data(**healthy_graph()))
        assert out.test_pass

    def test_fails_when_an_edge_is_inverted(self):
        reversed_order = [
            "mitigations",
            "threats",
            "application_info",
            "architecture",
            "threat_model",
        ]
        out = verdict(
            ExecutionOrderValid(EDGES),
            data(**healthy_graph(**{"graph.execution_order": reversed_order})),
        )
        assert not out.test_pass
        assert "ran after" in out.reason

    def test_ignores_nodes_absent_from_the_order(self):
        # A parallel branch that did not run should not be reported as disordered.
        out = verdict(
            ExecutionOrderValid([["architecture", "architecture_diagram"]]),
            data(**healthy_graph()),
        )
        assert out.test_pass

    def test_fails_when_no_order_recorded(self):
        out = verdict(ExecutionOrderValid(EDGES), data(**{"graph.execution_order": []}))
        assert not out.test_pass


class TestArtifactsComplete:
    def test_passes_when_nothing_missing(self):
        out = verdict(
            ArtifactsComplete(),
            data(**{"artifacts.missing": [], "artifacts.unparseable": []}),
        )
        assert out.test_pass

    @pytest.mark.parametrize(
        "state",
        [
            {"artifacts.missing": ["threats"], "artifacts.unparseable": []},
            {"artifacts.missing": [], "artifacts.unparseable": ["threat_model"]},
        ],
    )
    def test_fails_on_missing_or_unparseable(self, state):
        assert not verdict(ArtifactsComplete(), data(**state)).test_pass


class TestSchemaValid:
    def test_passes_when_valid(self):
        out = verdict(SchemaValid(), data(**{"schema.valid": True, "schema.error": ""}))
        assert out.test_pass

    def test_fails_and_surfaces_the_first_error_line(self):
        out = verdict(
            SchemaValid(),
            data(**{"schema.valid": False, "schema.error": "bad field x\nand more"}),
        )
        assert not out.test_pass
        assert "bad field x" in out.reason
        assert "and more" not in out.reason


class TestSpansCaptured:
    def test_passes_above_the_floor(self):
        assert verdict(
            SpansCaptured(minimum=5), data(**{"telemetry.span_count": 9})
        ).test_pass

    def test_fails_when_telemetry_produced_nothing(self):
        # Guards against every trajectory check passing vacuously the moment
        # telemetry silently stops working.
        out = verdict(SpansCaptured(minimum=1), data(**{"telemetry.span_count": 0}))
        assert not out.test_pass

    def test_is_operational_tier(self):
        assert SpansCaptured().tier == OPERATIONAL


class TestCountWithinBand:
    @pytest.mark.parametrize("count", [10, 19, 40])
    def test_passes_inside_the_band_inclusive(self, count):
        out = verdict(
            CountWithinBand("threats", 10, 40), data(**{"counts.threats": count})
        )
        assert out.test_pass

    @pytest.mark.parametrize("count", [0, 9, 41])
    def test_fails_outside_the_band(self, count):
        out = verdict(
            CountWithinBand("threats", 10, 40), data(**{"counts.threats": count})
        )
        assert not out.test_pass
        assert "expected 10..40" in out.reason


class TestLinksResolve:
    def test_passes_when_all_resolve_and_all_mitigated(self):
        out = verdict(
            LinksResolve(),
            data(**{"links.dangling": [], "links.unmitigated_threats": []}),
        )
        assert out.test_pass

    def test_fails_on_a_dangling_link(self):
        out = verdict(
            LinksResolve(),
            data(
                **{
                    "links.dangling": ["mitigationLink.linkedId=nope"],
                    "links.unmitigated_threats": [],
                }
            ),
        )
        assert not out.test_pass
        assert "dangling" in out.reason

    def test_fails_on_an_unmitigated_threat(self):
        out = verdict(
            LinksResolve(),
            data(**{"links.dangling": [], "links.unmitigated_threats": ["t-1"]}),
        )
        assert not out.test_pass

    def test_can_tolerate_unmitigated_threats_when_configured(self):
        out = verdict(
            LinksResolve(require_all_mitigated=False),
            data(**{"links.dangling": [], "links.unmitigated_threats": ["t-1"]}),
        )
        assert out.test_pass


class TestThreatsWellFormed:
    def test_passes_when_grammar_is_complete(self):
        out = verdict(
            ThreatsWellFormed(),
            data(
                **{
                    "threats.short_statements": [],
                    "threats.incomplete_grammar": [],
                }
            ),
        )
        assert out.test_pass

    def test_fails_on_a_short_statement(self):
        out = verdict(
            ThreatsWellFormed(),
            data(
                **{
                    "threats.short_statements": ["t-1"],
                    "threats.incomplete_grammar": [],
                }
            ),
        )
        assert not out.test_pass

    def test_fails_on_missing_grammar_fields(self):
        out = verdict(
            ThreatsWellFormed(),
            data(
                **{
                    "threats.short_statements": [],
                    "threats.incomplete_grammar": ["t-1: threatSource"],
                }
            ),
        )
        assert not out.test_pass

    def test_allowance_tolerates_up_to_the_limit(self):
        state = {
            "threats.short_statements": [],
            "threats.incomplete_grammar": ["t-1: threatSource"],
        }
        assert verdict(ThreatsWellFormed(allow_incomplete=1), data(**state)).test_pass
        assert not verdict(
            ThreatsWellFormed(allow_incomplete=0), data(**state)
        ).test_pass


class TestDiagramsUsable:
    def test_passes_when_both_have_labels(self):
        out = verdict(
            DiagramsUsable(min_text_nodes=5),
            data(
                **{
                    "diagrams": {
                        "a": {"present": True, "valid": True, "text_nodes": 12},
                        "b": {"present": True, "valid": True, "text_nodes": 8},
                    }
                }
            ),
        )
        assert out.test_pass

    def test_fails_when_a_diagram_is_absent(self):
        out = verdict(
            DiagramsUsable(),
            data(
                **{
                    "diagrams": {
                        "a": {"present": False, "valid": False, "text_nodes": 0}
                    }
                }
            ),
        )
        assert not out.test_pass
        assert "missing" in out.reason

    def test_fails_when_valid_svg_has_no_labels(self):
        # A diagram that parses but says nothing is a distinct failure from one
        # that is absent, and worth separating in the output.
        out = verdict(
            DiagramsUsable(min_text_nodes=10),
            data(
                **{"diagrams": {"a": {"present": True, "valid": True, "text_nodes": 1}}}
            ),
        )
        assert not out.test_pass
        assert "labels" in out.reason


class TestConceptCoverage:
    GROUPS = {
        "worker": ["service worker", "background script"],
        "messaging": ["runtime.onMessage", "sendMessage"],
        "manifest": ["manifest"],
    }

    def test_matches_any_phrasing_in_a_group(self):
        out = verdict(
            ConceptCoverage(self.GROUPS, minimum=3),
            data(
                corpus="The background script reads the manifest and calls sendMessage."
            ),
        )
        assert out.test_pass, out.reason

    def test_is_case_insensitive(self):
        out = verdict(
            ConceptCoverage({"worker": ["service worker"]}, minimum=1),
            data(corpus="A SERVICE WORKER does the work."),
        )
        assert out.test_pass

    def test_fails_on_generic_output(self):
        out = verdict(
            ConceptCoverage(self.GROUPS, minimum=2),
            data(corpus="An actor could gain unauthorised access to the system."),
        )
        assert not out.test_pass
        assert "absent" in out.reason

    def test_minimum_allows_phrasing_to_drift(self):
        corpus = "the manifest and a service worker"
        assert verdict(
            ConceptCoverage(self.GROUPS, minimum=2), data(corpus=corpus)
        ).test_pass
        assert not verdict(
            ConceptCoverage(self.GROUPS, minimum=3), data(corpus=corpus)
        ).test_pass

    def test_score_is_the_fraction_matched(self):
        out = verdict(
            ConceptCoverage(self.GROUPS, minimum=1),
            data(corpus="just the manifest here"),
        )
        assert out.score == pytest.approx(1 / 3)

    def test_fails_with_no_prose(self):
        assert not verdict(
            ConceptCoverage(self.GROUPS, minimum=1), data(corpus="")
        ).test_pass


class TestTokenUsageWithinBand:
    def test_passes_below_the_ceiling(self):
        assert verdict(
            TokenUsageWithinBand(maximum=2_000_000),
            data(**{"usage.total_tokens": 1_255_735}),
        ).test_pass

    def test_fails_above_the_ceiling(self):
        out = verdict(
            TokenUsageWithinBand(maximum=1_000_000),
            data(**{"usage.total_tokens": 5_000_000}),
        )
        assert not out.test_pass

    def test_fails_when_usage_was_not_recorded(self):
        out = verdict(
            TokenUsageWithinBand(maximum=1_000_000),
            data(**{"usage.total_tokens": None}),
        )
        assert not out.test_pass
        assert "no token usage" in out.reason
