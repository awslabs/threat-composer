"""Load a completed threat-composer-ai run off disk into evaluatable form.

A finished run leaves three useful things behind, and this reads all of them:

artifacts
    The threat model and its components, under the session directory.

graph state
    ``multi_agents/.../multi_agent.json``, written by the strands
    ``FileSessionManager``. This is the authoritative record of what actually
    happened: which nodes ran, in what order, which failed, and what each one
    cost. It is worth preferring over anything inferred from the artifacts,
    because artifact presence does not prove this run produced it. ``--rerun-from``
    carries work forward from an earlier session, so a threat model can be
    perfectly valid and stale at the same time. Node status distinguishes those;
    a file on disk cannot.

spans
    ``telemetry/spans.jsonl``, when the run used ``--telemetry-export file``.
    Optional, and absent runs are handled rather than failed, but required for
    any trajectory-level check.

Everything is flattened into ``EnvironmentState`` entries so that evaluators stay
pure functions of named state. That keeps them unit testable against synthetic
state, with no need for an eighteen minute inference run to exercise a boolean.
"""

import json
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

from ..config.app_config import AppConfig
from ..tools.threat_composer_validate_tc_v1_schema import validate_tc_data_pydantic

# Logical node name -> AppConfig field holding the filename it writes. Resolved
# from the dataclass defaults rather than hardcoded, so renaming an output in
# AppConfig moves this with it instead of silently breaking the eval.
_COMPONENT_FILES = {
    "application_info": "application_info_filename",
    "architecture": "architecture_description_filename",
    "architecture_diagram": "architecture_diagram_filename",
    "dataflow": "dataflow_description_filename",
    "dataflow_diagram": "dataflow_diagram_filename",
    "threats": "threats_filename",
    "mitigations": "mitigations_filename",
}
_ROOT_FILES = {"threat_model": "threat_composer_filename"}
_DIAGRAMS = ("architecture_diagram", "dataflow_diagram")

# The threat grammar the schema models. A threat that fills only `statement` is
# far weaker than one that names its source, prerequisites, action, impact and
# affected asset, and unlike statement length this is a structural property we
# can actually check rather than a proxy for it.
_THREAT_GRAMMAR = (
    "threatSource",
    "prerequisites",
    "threatAction",
    "threatImpact",
    "impactedAssets",
)


def _config_defaults() -> dict[str, Any]:
    """AppConfig's declared defaults, read without instantiating it.

    AppConfig requires two paths and may do work in __post_init__. Only the
    defaults are needed here, so reading the dataclass fields is both cheaper and
    free of side effects.
    """
    return {f.name: f.default for f in fields(AppConfig)}


@dataclass
class LoadedSession:
    """Everything a completed run left behind, parsed."""

    session_dir: Path
    artifact_paths: dict[str, Path] = field(default_factory=dict)
    threat_model: dict[str, Any] | None = None
    graph_state: dict[str, Any] | None = None
    run_metadata: dict[str, Any] | None = None
    resolved_config: dict[str, Any] | None = None
    spans: list[dict[str, Any]] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    unparseable: list[str] = field(default_factory=list)


def resolve_session_dir(path: Path) -> Path:
    """Accept either a session directory or the ``--output-dir`` above it.

    The CLI stamps a directory per run, so ``--output-dir out`` yields
    ``out/20260825-2324``. Callers should not have to know the stamp.
    """
    defaults = _config_defaults()
    threat_model = defaults["threat_composer_filename"]
    if (path / threat_model).is_file():
        return path
    if not path.is_dir():
        return path
    candidates = sorted(
        child
        for child in path.iterdir()
        if child.is_dir() and (child / threat_model).is_file()
    )
    if len(candidates) == 1:
        return candidates[0]
    if candidates:
        # Newest wins, but never silently: evaluating the wrong run and reporting
        # a confident verdict is worse than an extra line of output.
        newest = max(candidates, key=lambda c: (c / threat_model).stat().st_mtime)
        print(f"note: {len(candidates)} sessions under {path}, using {newest.name}")
        return newest
    return path


def _find_graph_state(session_dir: Path) -> dict[str, Any] | None:
    """Locate the strands multi-agent state file.

    Globbed rather than built from a fixed path because the session directory and
    graph names are strands' to choose, not ours.
    """
    for candidate in sorted(session_dir.glob("**/multi_agent.json")):
        try:
            return json.loads(candidate.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
    return None


def _load_spans(session_dir: Path, defaults: dict[str, Any]) -> list[dict[str, Any]]:
    spans_path = (
        session_dir
        / defaults["telemetry_output_sub_dir"]
        / defaults["telemetry_spans_filename"]
    )
    if not spans_path.is_file():
        return []
    spans = []
    for line in spans_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            spans.append(json.loads(line))
        except json.JSONDecodeError:
            # A truncated final line is expected if a run was killed mid-write.
            continue
    return spans


def load_session(path: Path) -> LoadedSession:
    """Read a finished run off disk."""
    defaults = _config_defaults()
    session_dir = resolve_session_dir(path)
    loaded = LoadedSession(session_dir=session_dir)

    components = session_dir / defaults["components_output_sub_dir"]
    loaded.artifact_paths = {
        name: components / defaults[key] for name, key in _COMPONENT_FILES.items()
    }
    loaded.artifact_paths.update(
        {name: session_dir / defaults[key] for name, key in _ROOT_FILES.items()}
    )

    for name, artifact in loaded.artifact_paths.items():
        if not artifact.is_file():
            loaded.missing.append(name)
            continue
        if artifact.name.endswith(".json"):
            try:
                parsed = json.loads(artifact.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                loaded.unparseable.append(name)
                continue
            if name == "threat_model":
                loaded.threat_model = parsed

    loaded.graph_state = _find_graph_state(session_dir)
    config_dir = session_dir / defaults["config_output_sub_dir"]
    for attribute, filename in (
        ("run_metadata", "run-metadata.json"),
        ("resolved_config", "config.json"),
    ):
        path = config_dir / filename
        if path.is_file():
            try:
                setattr(loaded, attribute, json.loads(path.read_text(encoding="utf-8")))
            except (OSError, json.JSONDecodeError):
                setattr(loaded, attribute, None)
    loaded.spans = _load_spans(session_dir, defaults)
    return loaded


def _diagram_facts(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"present": False, "valid": False, "text_nodes": 0}
    try:
        # Parsing an artifact this process's own pipeline produced, not
        # untrusted input.
        root = ElementTree.parse(path).getroot()
    except ElementTree.ParseError as exc:
        return {"present": True, "valid": False, "text_nodes": 0, "error": str(exc)}
    labelled = [
        el
        for el in root.iter()
        if el.tag.rsplit("}", 1)[-1] == "text" and (el.text or "").strip()
    ]
    return {
        "present": True,
        "valid": root.tag.rsplit("}", 1)[-1] == "svg",
        "text_nodes": len(labelled),
    }


def _corpus(threat_model: dict[str, Any]) -> str:
    """Every piece of prose the agent wrote, flattened for concept matching."""
    parts: list[str] = []
    for threat in threat_model.get("threats") or []:
        for key in ("statement", "impactedGoal", *_THREAT_GRAMMAR):
            value = threat.get(key)
            if isinstance(value, str):
                parts.append(value)
            elif isinstance(value, list):
                parts.extend(str(item) for item in value)
    for key in ("mitigations", "assumptions"):
        parts.extend(
            entry.get("content") or "" for entry in threat_model.get(key) or []
        )
    for key in ("applicationInfo", "architecture", "dataflow"):
        section = threat_model.get(key)
        if isinstance(section, dict):
            parts.append(section.get("description") or "")
            parts.append(section.get("name") or "")
    return "\n".join(p for p in parts if p)


def _link_facts(threat_model: dict[str, Any]) -> dict[str, list[str]]:
    threats = {t.get("id") for t in threat_model.get("threats") or []}
    mitigations = {m.get("id") for m in threat_model.get("mitigations") or []}
    assumptions = {a.get("id") for a in threat_model.get("assumptions") or []}
    dangling: list[str] = []

    mitigation_links = threat_model.get("mitigationLinks") or []
    for link in mitigation_links:
        if link.get("mitigationId") not in mitigations:
            dangling.append(f"mitigationLink.mitigationId={link.get('mitigationId')}")
        if link.get("linkedId") not in threats:
            dangling.append(f"mitigationLink.linkedId={link.get('linkedId')}")

    for link in threat_model.get("assumptionLinks") or []:
        if link.get("assumptionId") not in assumptions:
            dangling.append(f"assumptionLink.assumptionId={link.get('assumptionId')}")
        # assumptionLinks name which collection linkedId points into, so resolve
        # against that one rather than assuming threats.
        target = {"Threat": threats, "Mitigation": mitigations}.get(
            link.get("type"), threats | mitigations
        )
        if link.get("linkedId") not in target:
            dangling.append(
                f"assumptionLink.linkedId={link.get('linkedId')} type={link.get('type')}"
            )

    mitigated = {
        link.get("linkedId")
        for link in mitigation_links
        if link.get("linkedId") in threats
    }
    return {
        "dangling": dangling,
        "unmitigated_threats": sorted(str(t) for t in threats - mitigated),
    }


def _threat_quality_facts(
    threat_model: dict[str, Any], min_statement_chars: int
) -> dict[str, list[str]]:
    short: list[str] = []
    incomplete: list[str] = []
    for threat in threat_model.get("threats") or []:
        identifier = str(threat.get("id") or threat.get("numericId") or "?")
        if len((threat.get("statement") or "").strip()) < min_statement_chars:
            short.append(identifier)
        empty = [
            key
            for key in _THREAT_GRAMMAR
            if not (
                threat.get(key) or (isinstance(threat.get(key), list) and threat[key])
            )
        ]
        if empty:
            incomplete.append(f"{identifier}: {','.join(empty)}")
    return {"short_statements": short, "incomplete_grammar": incomplete}


def to_environment_state(
    loaded: LoadedSession, min_statement_chars: int = 40
) -> list[Any]:
    """Flatten a loaded session into named EnvironmentState entries.

    Imported lazily so that the module is importable, and unit testable, without
    strands-agents-evals installed. It only ships in the `eval` extra.
    """
    from strands_evals.types import EnvironmentState

    state: dict[str, Any] = {
        "session.dir": str(loaded.session_dir),
        "artifacts.missing": sorted(loaded.missing),
        "artifacts.unparseable": sorted(loaded.unparseable),
        "telemetry.span_count": len(loaded.spans),
    }

    graph = loaded.graph_state or {}
    state["graph.present"] = bool(loaded.graph_state)
    state["graph.status"] = graph.get("status")
    state["graph.failed_nodes"] = graph.get("failed_nodes") or []
    state["graph.interrupted_nodes"] = graph.get("interrupted_nodes") or []
    state["graph.completed_nodes"] = sorted(graph.get("completed_nodes") or [])
    state["graph.execution_order"] = graph.get("execution_order") or []
    state["graph.node_statuses"] = {
        node: (result or {}).get("status")
        for node, result in (graph.get("node_results") or {}).items()
    }
    usage = graph.get("accumulated_usage") or {}
    state["usage.input_tokens"] = usage.get("inputTokens")
    state["usage.output_tokens"] = usage.get("outputTokens")
    state["usage.total_tokens"] = usage.get("totalTokens")
    state["usage.execution_time_ms"] = graph.get("execution_time")

    # Where each setting came from, and what it resolved to. The CLI records this
    # itself, which is what lets the eval prove it measured default behaviour rather
    # than a configuration peculiar to CI. Recording the resolved model matters as
    # much as the sources: when a default model changes, that is the first thing
    # anyone reading a failed run will want to see.
    metadata = loaded.run_metadata or {}
    state["config.sources"] = metadata.get("configuration_sources") or {}
    aws = (loaded.resolved_config or {}).get("aws") or {}
    state["config.aws_model_id"] = aws.get("model_id")
    state["config.aws_region"] = aws.get("region")

    state["diagrams"] = {
        name: _diagram_facts(loaded.artifact_paths[name])
        for name in _DIAGRAMS
        if name in loaded.artifact_paths
    }

    threat_model = loaded.threat_model
    if threat_model is None:
        state["schema.valid"] = False
        state["schema.error"] = "threat model missing or unparseable"
        state["counts.threats"] = 0
        state["counts.mitigations"] = 0
        state["counts.assumptions"] = 0
        state["links.dangling"] = []
        state["links.unmitigated_threats"] = []
        state["threats.short_statements"] = []
        state["threats.incomplete_grammar"] = []
        state["corpus"] = ""
        state["application.name"] = None
    else:
        is_valid, error = validate_tc_data_pydantic(threat_model)
        state["schema.valid"] = is_valid
        state["schema.error"] = "" if is_valid else error.strip()
        state["counts.threats"] = len(threat_model.get("threats") or [])
        state["counts.mitigations"] = len(threat_model.get("mitigations") or [])
        state["counts.assumptions"] = len(threat_model.get("assumptions") or [])
        state.update({f"links.{k}": v for k, v in _link_facts(threat_model).items()})
        state.update(
            {
                f"threats.{k}": v
                for k, v in _threat_quality_facts(
                    threat_model, min_statement_chars
                ).items()
            }
        )
        state["corpus"] = _corpus(threat_model)
        state["application.name"] = (threat_model.get("applicationInfo") or {}).get(
            "name"
        )

    return [EnvironmentState(name=name, state=value) for name, value in state.items()]


def to_trajectory(loaded: LoadedSession) -> Any | None:
    """Map the run's spans into a strands-evals Session, if there are any.

    Returns None when the run had no telemetry, so that callers can distinguish
    "no spans" from "spans showing nothing happened". Any trajectory-level check
    must treat the former as a failure rather than a pass, or it silently
    succeeds forever.
    """
    if not loaded.spans:
        return None
    from strands_evals.mappers import detect_otel_mapper

    mapper = detect_otel_mapper(loaded.spans)
    return mapper.map_to_session(loaded.spans, session_id=loaded.session_dir.name)
