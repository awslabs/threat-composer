"""Quality eval: run the CLI for real, then assert on what it produced.

Deliberately drives the shipped console script as a subprocess rather than
importing the workflow and running it in process. In process would be tidier and
would hand strands-agents-evals its spans directly, but it would evaluate a
reimplementation of the pipeline instead of the thing users actually run. Argument
parsing, config precedence, session setup and telemetry wiring would all be
bypassed, which is a meaningful slice of what can break.

Running as a subprocess costs nothing, because the run already persists everything
needed: artifacts, the strands graph state, and spans when
``--telemetry-export file`` is used. ``GenericGenAISessionMapper`` reads those
spans back from the file, so trajectory-level evaluators work on a completed
external run.

Two modes:

    # run the CLI, then evaluate
    python -m threat_composer_ai.eval.quality --target PATH --config eval/browser-extension.json

    # evaluate a run that already happened, no inference, no cost
    python -m threat_composer_ai.eval.quality --session-dir OUT --config ...

The second mode is what makes this developable. Every evaluator is a pure function
of named state, so the whole suite can be iterated against one recorded session
without paying for inference each time.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from . import fixture as fixture_module
from .evaluators import (
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
from .session import load_session, to_environment_state, to_trajectory

# Ordering constraints implied by the agent graph in
# workflows/baseline_threat_modeling.py.
DEFAULT_EDGES = [
    ["application_info", "architecture"],
    ["architecture", "dataflow"],
    ["dataflow", "threats"],
    ["threats", "mitigations"],
    ["mitigations", "threat_model"],
    ["architecture", "architecture_diagram"],
    ["dataflow", "dataflow_diagram"],
]
DEFAULT_NODES = [
    "application_info",
    "architecture",
    "architecture_diagram",
    "dataflow",
    "dataflow_diagram",
    "threats",
    "mitigations",
    "threat_model",
]


def load_config(path: Path | None) -> dict[str, Any]:
    if path is None:
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def build_evaluators(config: dict[str, Any]) -> list[Any]:
    """Assemble the evaluator set from a config file.

    Bands and concepts live in JSON rather than in code so that tuning them is a
    reviewable data change, not a patch to Python.
    """
    bands = config.get("bands") or {}
    evaluators: list[Any] = [
        GraphCompleted(expected_nodes=config.get("expected_nodes") or DEFAULT_NODES),
        ExecutionOrderValid(edges=config.get("graph_edges") or DEFAULT_EDGES),
        ArtifactsComplete(),
        SchemaValid(),
        LinksResolve(),
        ThreatsWellFormed(allow_incomplete=config.get("allow_incomplete_threats", 0)),
        DiagramsUsable(min_text_nodes=config.get("min_diagram_text_nodes", 10)),
    ]
    for entity in ("threats", "mitigations", "assumptions"):
        band = bands.get(entity)
        if band:
            evaluators.append(
                CountWithinBand(entity=entity, minimum=band[0], maximum=band[1])
            )
    if config.get("max_total_tokens"):
        evaluators.append(TokenUsageWithinBand(maximum=config["max_total_tokens"]))
    if config.get("concept_groups"):
        evaluators.append(
            ConceptCoverage(
                concept_groups=config["concept_groups"],
                minimum=config.get("min_concept_groups"),
            )
        )
    if config.get("require_spans"):
        evaluators.append(SpansCaptured(minimum=config.get("min_spans", 1)))
        for tool_name in config.get("expected_tools") or []:
            from strands_evals.evaluators.deterministic import ToolCalled

            # Named per tool, because the default name is the class name and
            # several instances would otherwise be indistinguishable in the
            # report. Tagged operational: a workflow that stopped calling its
            # tools is broken, not merely worse.
            called = ToolCalled(tool_name=tool_name, name=f"tool_called:{tool_name}")
            called.tier = OPERATIONAL
            evaluators.append(called)
    return evaluators


def run_cli(
    target: Path, output_dir: Path, region: str, model_id: str | None, timeout: int
) -> int:
    """Invoke the shipped console script against the fixture."""
    command = [
        "threat-composer-ai-cli",
        str(target),
        "--output-dir",
        str(output_dir),
        "--aws-region",
        region,
        "--enable-telemetry",
        "--telemetry-export",
        "file",
    ]
    if model_id:
        command += ["--aws-model-id", model_id]
    print(f"running: {' '.join(command)}", flush=True)
    completed = subprocess.run(command, timeout=timeout, check=False)
    print(f"cli exit: {completed.returncode}", flush=True)
    return completed.returncode


def evaluate(
    session_dir: Path, config: dict[str, Any], evaluators: list[Any] | None = None
) -> Any:
    """Evaluate one completed session and return the report."""
    from strands_evals import Case, Experiment

    loaded = load_session(session_dir)
    state = to_environment_state(
        loaded, min_statement_chars=config.get("min_statement_chars", 40)
    )
    trajectory = to_trajectory(loaded)

    threat_model_text = (
        json.dumps(loaded.threat_model, indent=2) if loaded.threat_model else ""
    )

    def task(case: Case) -> dict[str, Any]:
        # The work already happened; this only presents it to the framework.
        return {
            "output": threat_model_text,
            "environment_state": state,
            "trajectory": trajectory,
        }

    case = Case(
        name=config.get("case_name") or "threat-model-quality",
        session_id=loaded.session_dir.name,
        input=f"threat model {loaded.session_dir}",
    )
    experiment = Experiment(
        cases=[case], evaluators=evaluators or build_evaluators(config)
    )
    return experiment.run_evaluations(task)


def render(report: Any, evaluators: list[Any]) -> tuple[str, bool, bool]:
    """Render the report grouped by tier, and say which tiers failed.

    detailed_results is one entry per evaluator holding the outputs it produced,
    each carrying the label the evaluator stamped on it. That label ties a result
    back to its tier. Falls back to positional lookup for the framework's own
    evaluators, which do not set a label.
    """
    tiers = {e.get_name(): getattr(e, "tier", "quality") for e in evaluators}
    rows: list[tuple[str, str, bool, str]] = []
    for index, outputs in enumerate(report.detailed_results or []):
        fallback = (
            evaluators[index].get_name()
            if index < len(evaluators)
            else f"check {index}"
        )
        for output in outputs or []:
            data = output if isinstance(output, dict) else output.model_dump()
            label = data.get("label") or fallback
            rows.append(
                (
                    tiers.get(label, "quality"),
                    label,
                    bool(data.get("test_pass")),
                    data.get("reason") or "",
                )
            )

    lines = ["", "threat-composer-ai quality eval", ""]
    operational_ok = quality_ok = True
    for tier in (OPERATIONAL, "quality"):
        tier_rows = [r for r in rows if r[0] == tier]
        if not tier_rows:
            continue
        passed = sum(1 for r in tier_rows if r[2])
        lines.append(f"{tier.upper()}  ({passed}/{len(tier_rows)})")
        for _, label, ok, reason in tier_rows:
            lines.append(f"  [{'pass' if ok else 'FAIL'}] {label}: {reason}")
            if not ok:
                if tier == OPERATIONAL:
                    operational_ok = False
                else:
                    quality_ok = False
        lines.append("")
    verdict = (
        "PASS"
        if operational_ok and quality_ok
        else ("FAIL (operational)" if not operational_ok else "FAIL (quality)")
    )
    lines.append(f"result: {verdict}")
    return "\n".join(lines), operational_ok, quality_ok


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="threat-composer-ai-eval-quality",
        description="Run the threat-composer-ai CLI against a fixture and assert operational and quality invariants on the result.",
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--target",
        type=Path,
        help="Directory to analyse. Runs the CLI, costing inference.",
    )
    source.add_argument(
        "--session-dir",
        type=Path,
        help="Evaluate an existing session instead of running the CLI. No inference.",
    )
    parser.add_argument(
        "--config", type=Path, help="JSON file of bands, concepts and expectations."
    )
    parser.add_argument("--output-dir", type=Path, default=Path("eval-run"))
    parser.add_argument("--aws-region", default="us-west-2")
    parser.add_argument("--aws-model-id", default=None)
    parser.add_argument(
        "--timeout", type=int, default=3600, help="Seconds to allow the CLI run."
    )
    parser.add_argument("--json-report", type=Path)
    parser.add_argument(
        "--allow-quality-failures",
        action="store_true",
        help="Exit 0 on quality-only failures. Operational failures still exit 1.",
    )
    parser.add_argument(
        "--allow-fixture-drift",
        action="store_true",
        help="Run even if the fixture does not match its recorded hash. For local experimentation; results are not comparable to the recorded bands.",
    )
    args = parser.parse_args(argv)

    config = load_config(args.config)
    if args.config is None:
        print("note: no --config, running structural checks only with default bands")

    if args.target:
        # Checked before the CLI runs, not after. A drifted fixture makes the whole
        # run unattributable, so there is no sense spending eighteen minutes and a
        # million tokens to produce numbers nobody can interpret.
        expected = (config.get("fixture") or {}).get("tree_sha256")
        ok, message, identity = fixture_module.verify(args.target, expected)
        print(f"fixture: {message}")
        if not ok:
            if not args.allow_fixture_drift:
                print(
                    "refusing to run. Pass --allow-fixture-drift to override, "
                    "understanding that the result cannot be compared to the bands."
                )
                return 1
            print("continuing anyway because --allow-fixture-drift was given")

        code = run_cli(
            target=args.target,
            output_dir=args.output_dir,
            region=args.aws_region,
            model_id=args.aws_model_id,
            timeout=args.timeout,
        )
        if code != 0:
            # Still evaluate: a non-zero exit with partial output is exactly when
            # the per-node graph state is most worth reading.
            print(f"cli exited {code}, evaluating whatever it produced")
        session_dir = args.output_dir
    else:
        session_dir = args.session_dir

    # Built once and threaded through, so the report and the tier lookup cannot
    # disagree about which evaluators ran.
    evaluators = build_evaluators(config)
    report = evaluate(session_dir, config, evaluators)
    text, operational_ok, quality_ok = render(report, evaluators)
    print(text)

    if args.json_report:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        payload = report.model_dump() if hasattr(report, "model_dump") else {}
        args.json_report.write_text(json.dumps(payload, indent=2, default=str) + "\n")
        print(f"json report: {args.json_report}")

    if not operational_ok:
        return 1
    if not quality_ok:
        return 0 if args.allow_quality_failures else 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
