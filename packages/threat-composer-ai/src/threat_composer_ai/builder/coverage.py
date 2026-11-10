"""
Coverage report: the "did we do a good job?" check.

Deterministic, so an agent can call it before finishing and act on the gaps,
and so the same facts can be checked by the eval harness after a run.
"""

from typing import Any

from .system_model import STRIDE_BY_KIND, SystemModel

IGNORED_STATUS = "threatResolvedNotUseful"
THREAT_RESOLVED = "threatResolved"
MITIGATION_RESOLVED = "mitigationResolved"
MITIGATION_WILL_NOT_ACTION = "mitigationResolvedWillNotAction"
MITIGATION_IN_PROGRESS = "mitigationInProgress"
MITIGATION_OPEN = ("mitigationIdentified", MITIGATION_IN_PROGRESS)

# A High threat is worth three Mediums and nine Lows. A threat with no priority
# is treated as Medium, so an unrated threat is not ignored.
PRIORITY_WEIGHT = {"High": 9, "Medium": 3, "Low": 1}
DEFAULT_WEIGHT = PRIORITY_WEIGHT["Medium"]
# A threat that already has a control still gains from a second one, but less.
REDUNDANT_FACTOR = 0.25
CONTROL_TYPES = ("Preventative", "Detective", "Corrective")


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


def resolution_report(
    doc: dict[str, Any], threats: list[dict[str, Any]]
) -> dict[str, list[dict[str, Any]]]:
    """Compare threat status with the status of the threat's mitigations.

    Advisory only: Threat Composer does not tie the two together, and a threat
    can be resolved by accepting the risk. Nothing here changes a status.
    """
    status = {m["id"]: m.get("status") for m in doc.get("mitigations") or []}
    linked: dict[str, list[str]] = {}
    for x in doc.get("mitigationLinks") or []:
        linked.setdefault(x["linkedId"], []).append(x["mitigationId"])

    def row(t: dict[str, Any], **extra: Any) -> dict[str, Any]:
        return {
            "id": t["id"],
            "numericId": t["numericId"],
            "status": t.get("status"),
            **extra,
        }

    candidates, accepted, resolved_open = [], [], []
    for t in threats:
        states = [status.get(m) for m in linked.get(t["id"], []) if m in status]
        if not states:
            continue
        resolved = t.get("status") == THREAT_RESOLVED
        if all(s == MITIGATION_RESOLVED for s in states):
            if not resolved:
                candidates.append(row(t, mitigations=len(states)))
        elif all(
            s in (MITIGATION_RESOLVED, MITIGATION_WILL_NOT_ACTION) for s in states
        ):
            if not resolved:
                accepted.append(
                    row(t, will_not_action=states.count(MITIGATION_WILL_NOT_ACTION))
                )
        elif resolved:
            resolved_open.append(
                row(
                    t,
                    open_mitigations=[
                        m
                        for m in linked[t["id"]]
                        if status.get(m)
                        not in (MITIGATION_RESOLVED, MITIGATION_WILL_NOT_ACTION)
                    ],
                )
            )
    return {
        "resolution_candidates": candidates,
        "resolution_candidates_with_will_not_action": accepted,
        "resolved_threats_with_open_mitigations": resolved_open,
    }


def mitigation_plan(
    doc: dict[str, Any], threats: list[dict[str, Any]]
) -> dict[str, Any]:
    """Recommend the order in which to implement the open mitigations.

    Greedy weighted cover. Each open threat has a weight from its priority. Each
    round picks the open mitigation with the highest marginal gain: the weight
    of the threats it would cover for the first time, plus REDUNDANT_FACTOR of
    the weight of threats that already have a control. A threat counts as having
    a control when a mitigationResolved mitigation (an existing control) is
    linked to it, or an earlier pick in this plan covers it. Ties go to work
    already in progress, then to the mitigation that touches more open threats,
    then to the lower item number.

    Advice only: it changes nothing. It does not know the cost of a mitigation.
    """
    open_threats = {t["id"]: t for t in threats if t.get("status") != THREAT_RESOLVED}
    weight = {
        i: PRIORITY_WEIGHT.get(_meta(t, "Priority"), DEFAULT_WEIGHT)
        for i, t in open_threats.items()
    }
    mitigations = {m["id"]: m for m in doc.get("mitigations") or []}
    by_mitigation: dict[str, list[str]] = {}
    covered: set[str] = set()
    for x in doc.get("mitigationLinks") or []:
        m, t = mitigations.get(x["mitigationId"]), x["linkedId"]
        if m is None or t not in open_threats:
            continue
        if m.get("status") == MITIGATION_RESOLVED:
            covered.add(t)
        elif m.get("status") in MITIGATION_OPEN:
            by_mitigation.setdefault(m["id"], []).append(t)

    total = sum(weight.values())
    already = sum(weight[t] for t in covered)

    def gain(m_id: str) -> float:
        return sum(
            weight[t] * (REDUNDANT_FACTOR if t in covered else 1)
            for t in by_mitigation[m_id]
        )

    def brief(t_id: str) -> dict[str, Any]:
        t = open_threats[t_id]
        return {
            "id": t_id,
            "numericId": t["numericId"],
            "priority": _meta(t, "Priority"),
        }

    plan: list[dict[str, Any]] = []
    remaining = set(by_mitigation)
    newly = 0.0
    while remaining:
        best = max(
            remaining,
            key=lambda i: (
                gain(i),
                mitigations[i].get("status") == MITIGATION_IN_PROGRESS,
                len(by_mitigation[i]),
                -mitigations[i]["numericId"],
            ),
        )
        remaining.discard(best)
        m = mitigations[best]
        first = [t for t in by_mitigation[best] if t not in covered]
        newly += sum(weight[t] for t in first)
        plan.append(
            {
                "rank": len(plan) + 1,
                "id": best,
                "numericId": m["numericId"],
                "content": m["content"],
                "status": m.get("status"),
                "control_type": next(
                    (c for c in m.get("tags") or [] if c in CONTROL_TYPES), None
                ),
                "score": gain(best),
                "covers_new": [brief(t) for t in first],
                "also_reduces": [brief(t) for t in by_mitigation[best] if t in covered],
                "cumulative_weight_covered_pct": (
                    round(100 * (already + newly) / total) if total else 100
                ),
            }
        )
        covered.update(first)

    return {
        "order": plan,
        # Open threats that no resolved or open mitigation covers, even after the
        # whole plan. They need a new mitigation, so they are not in `order`.
        "uncovered_threats": [brief(t) for t in open_threats if t not in covered],
        "weight_covered_before_plan_pct": (
            round(100 * already / total) if total else 100
        ),
    }


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
        **resolution_report(doc, threats),
        "mitigation_plan": mitigation_plan(doc, threats),
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
