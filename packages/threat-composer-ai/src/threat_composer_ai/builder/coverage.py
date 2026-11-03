"""
Coverage report: the "did we do a good job?" check.

Deterministic, so an agent can call it before finishing and act on the gaps,
and so the same facts can be checked by the eval harness after a run.
"""

from typing import Any

from .system_model import STRIDE_BY_KIND, SystemModel

IGNORED_STATUS = "threatResolvedNotUseful"


def _meta(item: dict[str, Any], key: str) -> Any:
    return next(
        (m["value"] for m in item.get("metadata") or [] if m["key"] == key), None
    )


def link_problems(doc: dict[str, Any]) -> list[str]:
    """Links that point at nothing."""
    threats = {t["id"] for t in doc.get("threats") or []}
    mitigations = {m["id"] for m in doc.get("mitigations") or []}
    assumptions = {a["id"] for a in doc.get("assumptions") or []}
    out = []
    for x in doc.get("mitigationLinks") or []:
        if x.get("mitigationId") not in mitigations:
            out.append(f"mitigationLink: unknown mitigation {x.get('mitigationId')}")
        if x.get("linkedId") not in threats:
            out.append(f"mitigationLink: unknown threat {x.get('linkedId')}")
    for x in doc.get("assumptionLinks") or []:
        if x.get("assumptionId") not in assumptions:
            out.append(f"assumptionLink: unknown assumption {x.get('assumptionId')}")
        target = threats if x.get("type") == "Threat" else mitigations
        if x.get("linkedId") not in target:
            out.append(f"assumptionLink: unknown {x.get('type')} {x.get('linkedId')}")
    return out


def coverage_report(doc: dict[str, Any], system: SystemModel | None) -> dict[str, Any]:
    threats = [t for t in doc.get("threats") or [] if t.get("status") != IGNORED_STATUS]
    mitigation_links = doc.get("mitigationLinks") or []
    assumption_links = doc.get("assumptionLinks") or []
    mitigated = {x["linkedId"] for x in mitigation_links}

    report: dict[str, Any] = {
        "counts": {
            "threats": len(threats),
            "threats_ignored": len(doc.get("threats") or []) - len(threats),
            "mitigations": len(doc.get("mitigations") or []),
            "assumptions": len(doc.get("assumptions") or []),
        },
        "dangling_links": link_problems(doc),
        "unmitigated_high_medium": [
            {
                "id": t["id"],
                "numericId": t["numericId"],
                "priority": _meta(t, "Priority"),
            }
            for t in threats
            if _meta(t, "Priority") in ("High", "Medium") and t["id"] not in mitigated
        ],
        "mitigations_without_threats": [
            m["id"]
            for m in doc.get("mitigations") or []
            if m["id"] not in {x["mitigationId"] for x in mitigation_links}
        ],
        "unlinked_assumptions": [
            a["id"]
            for a in doc.get("assumptions") or []
            if a["id"] not in {x["assumptionId"] for x in assumption_links}
        ],
        "threats_without_elements": [],
    }

    if system is None:
        report["system_model"] = "absent: element coverage not checked"
        return report

    targets: list[tuple[str, str, str]] = [
        (e.id, e.kind, e.name) for e in system.elements
    ] + [(f.id, "data_flow", f.description) for f in system.flows]
    known = {t[0] for t in targets}

    covered: dict[str, set[str]] = {i: set() for i in known}
    for t in threats:
        refs = [tag for tag in t.get("tags") or [] if tag in known]
        if not refs:
            report["threats_without_elements"].append(t["id"])
        for ref in refs:
            covered[ref].update(_meta(t, "STRIDE") or [])

    matrix, gaps = [], []
    for target_id, kind, name in targets:
        applicable = STRIDE_BY_KIND[kind]
        missing = [c for c in applicable if c not in covered[target_id]]
        matrix.append(
            {
                "id": target_id,
                "kind": kind,
                "name": name,
                "covered": [c for c in applicable if c in covered[target_id]],
                "missing": missing,
            }
        )
        if len(missing) == len(applicable):
            gaps.append(target_id)

    crossing = [f for f in system.flows if system.boundaries_crossed(f)]
    report["stride_matrix"] = matrix
    report["targets_with_no_threats"] = gaps
    report["boundary_crossings_without_threats"] = [
        f.id for f in crossing if not covered[f.id]
    ]
    report["stride_cells"] = {
        "applicable": sum(len(STRIDE_BY_KIND[k]) for _, k, _ in targets),
        "covered": sum(len(row["covered"]) for row in matrix),
    }
    return report
