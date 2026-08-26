"""Domain evaluators for threat-composer-ai output.

strands-agents-evals ships deterministic primitives (``Equals``, ``Contains``,
``StartsWith``, ``ToolCalled``, ``SkillInvoked``, ``StateEquals``) and a set of
LLM judges. The primitives assert on a conversational agent's text; none of them
know what a threat model is. These fill that gap, reading the named state that
``session.to_environment_state`` publishes.

They are deliberately pure functions of that state, with no file access, so every
one is unit testable against a synthetic dict rather than needing a real run.

Two tiers, distinguished by ``tier`` and used to decide what should break a build:

operational
    Did the run mechanically succeed? These read the strands graph state, which is
    the authoritative record of what happened, rather than inferring from
    artifacts. A failure is a break.

quality
    Is the output worth anything? Bands, link integrity, threat grammar, diagram
    content, concept coverage. A failure is drift, and wants a human to judge
    whether the agent regressed or the expectations went stale.
"""

from typing import Any

from strands_evals.evaluators.evaluator import Evaluator
from strands_evals.types import EvaluationData, EvaluationOutput

OPERATIONAL = "operational"
QUALITY = "quality"


def _state(case: EvaluationData, name: str, default: Any = None) -> Any:
    for entry in case.actual_environment_state or []:
        if entry.name == name:
            return entry.state
    return default


def _output(score: float, passed: bool, reason: str, label: str) -> EvaluationOutput:
    return EvaluationOutput(score=score, test_pass=passed, reason=reason, label=label)


def _verdict(passed: bool, reason: str, label: str) -> list[EvaluationOutput]:
    return [_output(1.0 if passed else 0.0, passed, reason, label)]


class _StateEvaluator(Evaluator):
    """Base for evaluators reading named environment state."""

    tier = QUALITY

    async def evaluate_async(
        self, evaluation_case: EvaluationData
    ) -> list[EvaluationOutput]:
        return self.evaluate(evaluation_case)


class GraphCompleted(_StateEvaluator):
    """Every graph node ran and none failed.

    This is the check that artifact inspection cannot replace. `--rerun-from`
    carries results forward from a previous session, so a stale threat model can
    be present, parseable and schema valid while a node failed in this run. Node
    status is the only thing that distinguishes those two worlds.
    """

    tier = OPERATIONAL

    def __init__(self, expected_nodes: list[str], name: str | None = None):
        super().__init__(name=name or "graph_completed")
        self.expected_nodes = expected_nodes

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        if not _state(evaluation_case, "graph.present"):
            return _verdict(
                False,
                "no strands graph state found in the session directory, so the run cannot be verified",
                self.get_name(),
            )
        status = _state(evaluation_case, "graph.status")
        failed = _state(evaluation_case, "graph.failed_nodes") or []
        interrupted = _state(evaluation_case, "graph.interrupted_nodes") or []
        statuses = _state(evaluation_case, "graph.node_statuses") or {}
        absent = [n for n in self.expected_nodes if n not in statuses]
        not_completed = sorted(
            node for node, s in statuses.items() if str(s).lower() != "completed"
        )

        problems = []
        if str(status).lower() != "completed":
            problems.append(f"graph status {status!r}")
        if failed:
            problems.append(f"failed nodes {failed}")
        if interrupted:
            problems.append(f"interrupted nodes {interrupted}")
        if absent:
            problems.append(f"nodes never ran {absent}")
        if not_completed:
            problems.append(f"nodes not completed {not_completed}")

        passed = not problems
        reason = (
            f"{len(statuses)} nodes completed, none failed or interrupted"
            if passed
            else "; ".join(problems)
        )
        return _verdict(passed, reason, self.get_name())


class ExecutionOrderValid(_StateEvaluator):
    """Nodes ran in an order consistent with the declared graph edges.

    Edges are checked individually rather than against one total order, because
    the diagram nodes hang off parallel branches: each is ordered only against its
    own parent and its position relative to anything else is undefined. Asserting
    a total order would fail for reasons that are not defects.
    """

    tier = OPERATIONAL

    def __init__(self, edges: list[list[str]], name: str | None = None):
        super().__init__(name=name or "execution_order_valid")
        self.edges = [tuple(edge) for edge in edges]

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        order = _state(evaluation_case, "graph.execution_order") or []
        if not order:
            return _verdict(False, "no execution order recorded", self.get_name())
        position = {node: index for index, node in enumerate(order)}
        violations = [
            f"{before} ran after {after}"
            for before, after in self.edges
            if before in position
            and after in position
            and position[before] > position[after]
        ]
        passed = not violations
        return _verdict(
            passed,
            f"{len(self.edges)} edges consistent with execution order"
            if passed
            else "; ".join(violations),
            self.get_name(),
        )


class ArtifactsComplete(_StateEvaluator):
    """Every expected artifact is present and parseable."""

    tier = OPERATIONAL

    def __init__(self, name: str | None = None):
        super().__init__(name=name or "artifacts_complete")

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        missing = _state(evaluation_case, "artifacts.missing") or []
        unparseable = _state(evaluation_case, "artifacts.unparseable") or []
        passed = not missing and not unparseable
        problems = []
        if missing:
            problems.append(f"missing {missing}")
        if unparseable:
            problems.append(f"unparseable {unparseable}")
        return _verdict(
            passed,
            "all artifacts present and parseable" if passed else "; ".join(problems),
            self.get_name(),
        )


class SchemaValid(_StateEvaluator):
    """The threat model validates against ThreatComposerV1Model.

    Uses the package's own validator, the same one the MCP tool exposes, so the
    eval cannot drift from what the tool itself considers valid.
    """

    tier = OPERATIONAL

    def __init__(self, name: str | None = None):
        super().__init__(name=name or "schema_valid")

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        valid = bool(_state(evaluation_case, "schema.valid"))
        error = _state(evaluation_case, "schema.error") or ""
        return _verdict(
            valid,
            "validates against ThreatComposerV1Model"
            if valid
            else (error.splitlines() or ["invalid"])[0][:200],
            self.get_name(),
        )


class SpansCaptured(_StateEvaluator):
    """Telemetry actually produced spans.

    Without this, every trajectory check passes vacuously the moment telemetry
    breaks. The OTLP path in particular disables itself with only a warning when
    nothing is listening, so a run can look entirely healthy while emitting
    nothing at all.
    """

    tier = OPERATIONAL

    def __init__(self, minimum: int = 1, name: str | None = None):
        super().__init__(name=name or "spans_captured")
        self.minimum = minimum

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        count = _state(evaluation_case, "telemetry.span_count") or 0
        passed = count >= self.minimum
        return _verdict(
            passed,
            f"{count} spans captured"
            + ("" if passed else f", expected at least {self.minimum}"),
            self.get_name(),
        )


class DefaultsExercised(_StateEvaluator):
    """The run used the CLI's own defaults for the settings that govern behaviour.

    Operational, because a run that overrode its own defaults is not measuring the
    thing this eval exists to measure, and every other result in the report becomes
    misleading rather than merely wrong.

    The point is regression cover for changes to the defaults themselves. If someone
    bumps the default model, retunes a default timeout, or changes a default prompt,
    the effect on output quality only shows up if the default is what actually
    applied. Pinning the model in the eval would make the eval blind to precisely the
    change most likely to move quality.

    The CLI records the provenance of each setting in run-metadata.json, so this is a
    direct assertion rather than an inference. The resolved model is reported either
    way, since when a default model changes that is the first thing anyone reading a
    failed run needs to know.
    """

    tier = OPERATIONAL

    def __init__(self, settings: list[str], name: str | None = None):
        super().__init__(name=name or "defaults_exercised")
        self.settings = settings

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        sources = _state(evaluation_case, "config.sources") or {}
        model = _state(evaluation_case, "config.aws_model_id")
        detail = f"model {model}" if model else "model unknown"

        if not sources:
            return _verdict(
                False,
                f"no configuration provenance recorded, cannot confirm defaults were used ({detail})",
                self.get_name(),
            )

        overridden = {
            setting: sources.get(setting)
            for setting in self.settings
            if sources.get(setting) != "default"
        }
        missing = [s for s in self.settings if s not in sources]
        problems = []
        if overridden:
            problems.append(
                "not default: "
                + ", ".join(f"{k} came from {v}" for k, v in sorted(overridden.items()))
            )
        if missing:
            problems.append(f"not recorded: {missing}")

        passed = not problems
        return _verdict(
            passed,
            f"{len(self.settings)} settings came from defaults, {detail}"
            if passed
            else f"{'; '.join(problems)} ({detail})",
            self.get_name(),
        )


class CountWithinBand(_StateEvaluator):
    """An entity count falls inside an inclusive band.

    Bands are wide by design. The generator is non-deterministic, so the job here
    is catching collapse or runaway, not pinning a figure.
    """

    def __init__(
        self, entity: str, minimum: int, maximum: int, name: str | None = None
    ):
        super().__init__(name=name or f"{entity}_within_band")
        self.entity = entity
        self.minimum = minimum
        self.maximum = maximum

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        count = _state(evaluation_case, f"counts.{self.entity}") or 0
        passed = self.minimum <= count <= self.maximum
        return _verdict(
            passed,
            f"{count} {self.entity} (expected {self.minimum}..{self.maximum})",
            self.get_name(),
        )


class LinksResolve(_StateEvaluator):
    """No dangling links, and every threat carries a mitigation."""

    def __init__(self, require_all_mitigated: bool = True, name: str | None = None):
        super().__init__(name=name or "links_resolve")
        self.require_all_mitigated = require_all_mitigated

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        dangling = _state(evaluation_case, "links.dangling") or []
        unmitigated = _state(evaluation_case, "links.unmitigated_threats") or []
        problems = []
        if dangling:
            problems.append(f"{len(dangling)} dangling: {'; '.join(dangling[:3])}")
        if self.require_all_mitigated and unmitigated:
            problems.append(f"{len(unmitigated)} threats without a mitigation")
        passed = not problems
        return _verdict(
            passed,
            "all links resolve and every threat is mitigated"
            if passed
            else "; ".join(problems),
            self.get_name(),
        )


class ThreatsWellFormed(_StateEvaluator):
    """Threats fill the grammar the schema models, not just a statement.

    Checking that threatSource, prerequisites, threatAction, threatImpact and
    impactedAssets are populated is a structural test for specificity. Statement
    length, which this replaces, was only ever a proxy for it.
    """

    def __init__(self, allow_incomplete: int = 0, name: str | None = None):
        super().__init__(name=name or "threats_well_formed")
        self.allow_incomplete = allow_incomplete

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        short = _state(evaluation_case, "threats.short_statements") or []
        incomplete = _state(evaluation_case, "threats.incomplete_grammar") or []
        problems = []
        if short:
            problems.append(f"{len(short)} statements below the length floor")
        if len(incomplete) > self.allow_incomplete:
            problems.append(
                f"{len(incomplete)} threats missing grammar fields (allowed {self.allow_incomplete}): {'; '.join(incomplete[:3])}"
            )
        passed = not problems
        return _verdict(
            passed,
            "all threats substantive and fully specified"
            if passed
            else "; ".join(problems),
            self.get_name(),
        )


class DiagramsUsable(_StateEvaluator):
    """Both diagrams parse as SVG and carry real labels.

    An SVG that parses but has no text is a picture of nothing, which is a failure
    mode worth separating from the file being absent.
    """

    def __init__(self, min_text_nodes: int = 10, name: str | None = None):
        super().__init__(name=name or "diagrams_usable")
        self.min_text_nodes = min_text_nodes

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        diagrams = _state(evaluation_case, "diagrams") or {}
        if not diagrams:
            return _verdict(False, "no diagrams recorded", self.get_name())
        problems = []
        for name, facts in sorted(diagrams.items()):
            if not facts.get("present"):
                problems.append(f"{name} missing")
            elif not facts.get("valid"):
                problems.append(f"{name} not valid SVG")
            elif facts.get("text_nodes", 0) < self.min_text_nodes:
                problems.append(
                    f"{name} has {facts.get('text_nodes')} labels, minimum {self.min_text_nodes}"
                )
        passed = not problems
        return _verdict(
            passed,
            f"{len(diagrams)} diagrams valid with labels"
            if passed
            else "; ".join(problems),
            self.get_name(),
        )


class ConceptCoverage(_StateEvaluator):
    """The output is about the codebase analysed, not generic boilerplate.

    Expressed as groups of alternative phrasings, requiring a minimum number of
    groups rather than all of them. A language model says "background service
    worker" one run and "background script" the next, so matching fixed strings
    would fail for reasons unrelated to quality. Requiring a subset leaves room
    for wording to move while still catching a collapse into text that would fit
    any codebase.

    This is the weakest check here and worth being honest about: it verifies
    vocabulary, not understanding. Output can use every right word inside wrong
    claims and pass. Judging the claims themselves needs an LLM evaluator, which
    is a separate and later concern.
    """

    def __init__(
        self,
        concept_groups: dict[str, list[str]],
        minimum: int | None = None,
        name: str | None = None,
    ):
        super().__init__(name=name or "concept_coverage")
        self.concept_groups = concept_groups
        self.minimum = minimum if minimum is not None else len(concept_groups)

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        corpus = (_state(evaluation_case, "corpus") or "").lower()
        if not corpus:
            return _verdict(False, "no prose to match against", self.get_name())
        matched, absent = [], []
        for concept, phrasings in sorted(self.concept_groups.items()):
            if any(p.lower() in corpus for p in phrasings):
                matched.append(concept)
            else:
                absent.append(concept)
        passed = len(matched) >= self.minimum
        score = len(matched) / len(self.concept_groups) if self.concept_groups else 0.0
        return [
            _output(
                score,
                passed,
                f"{len(matched)}/{len(self.concept_groups)} concepts present, need {self.minimum}"
                + (f". absent: {', '.join(absent)}" if absent else ""),
                self.get_name(),
            )
        ]


class TokenUsageWithinBand(_StateEvaluator):
    """Token spend has not regressed.

    Nothing at the artifact layer notices a prompt change that doubles cost. At
    over a million tokens a run, it is worth a check of its own.
    """

    def __init__(self, maximum: int, minimum: int = 1, name: str | None = None):
        super().__init__(name=name or "token_usage_within_band")
        self.maximum = maximum
        self.minimum = minimum

    def evaluate(self, evaluation_case: EvaluationData) -> list[EvaluationOutput]:
        total = _state(evaluation_case, "usage.total_tokens")
        if total is None:
            return _verdict(False, "no token usage recorded", self.get_name())
        passed = self.minimum <= total <= self.maximum
        return _verdict(
            passed,
            f"{total:,} total tokens (expected {self.minimum:,}..{self.maximum:,})",
            self.get_name(),
        )
