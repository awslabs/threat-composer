"""
Operations on a Threat Composer v1 document held as a dict.

Every function here is pure with respect to the file system: it takes the
document, changes it in place and returns a result. The MCP layer handles
locking and writing. That keeps these easy to unit test.

Identifiers are assigned here, never by the model: `id` is a fresh UUID v4
and `numericId` is one more than the highest in that collection.
"""

import os
import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ..models.threat_composer_v1 import (
    Assumption,
    Mitigation,
    Threat,
    ThreatComposerV1Model,
)
from .statement import compose_statement, lower_first, normalise_source

AI_TAG_ENV_VAR = "THREAT_COMPOSER_AI_GENERATED_TAG"
DEFAULT_AI_TAG = "AI Generated"
EXISTING_CONTROL_TAG = "Existing control"

Section = Literal["applicationInfo", "architecture", "dataflow"]
Kind = Literal["threat", "mitigation", "assumption"]
Stride = Literal["S", "T", "R", "I", "D", "E"]
Priority = Literal["High", "Medium", "Low"]
ThreatStatus = Literal["threatIdentified", "threatResolved", "threatResolvedNotUseful"]
MitigationStatus = Literal[
    "mitigationIdentified",
    "mitigationInProgress",
    "mitigationResolved",
    "mitigationResolvedWillNotAction",
]

_COLLECTION = {
    "threat": "threats",
    "mitigation": "mitigations",
    "assumption": "assumptions",
}


class BuilderError(ValueError):
    """A request the caller can fix."""


# ---------------------------------------------------------------------------
# Inputs. These are the MCP tool input schemas, so their field descriptions
# are what Claude reads. Keep them short and exact.
# ---------------------------------------------------------------------------


class _Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AssumptionInput(_Input):
    content: str = Field(..., max_length=1000, description="The assumption, one line")
    comments: str = Field("", max_length=1000, description="Rationale. Markdown")
    tags: list[str] = Field(default_factory=list, description="Each ≤30 chars")
    link_to: list[str] = Field(
        default_factory=list, description="Ids of threats or mitigations it supports"
    )


class ThreatInput(_Input):
    threat_source: str = Field(
        ...,
        max_length=200,
        description="Who acts, without article: 'internet-based actor'",
    )
    prerequisites: str = Field(
        "", max_length=200, description="'with a valid session token'; '' if none"
    )
    threat_action: str = Field(..., max_length=200, description="'replay the token'")
    threat_impact: str = Field("", max_length=200, description="Direct result")
    impacted_goal: list[str] = Field(
        default_factory=list, description="For example confidentiality, integrity"
    )
    impacted_assets: list[str] = Field(default_factory=list)
    stride: list[Stride] = Field(..., min_length=1)
    priority: Priority
    elements: list[str] = Field(
        default_factory=list,
        description="System model element or flow ids this threat applies to",
    )
    comments: str = Field("", max_length=1000, description="Rationale. Markdown")
    evidence: list[str] = Field(default_factory=list, description="path:line")
    tags: list[str] = Field(default_factory=list)
    status: ThreatStatus = "threatIdentified"


class MitigationInput(_Input):
    content: str = Field(..., max_length=1000, description="The control, specific")
    threat_ids: list[str] = Field(..., min_length=1, description="Threats it mitigates")
    control_type: Literal["Preventative", "Detective", "Corrective"] | None = None
    existing: bool = Field(
        False, description="True if the code already implements this control"
    )
    comments: str = Field("", max_length=1000, description="Rationale. Markdown")
    evidence: list[str] = Field(default_factory=list, description="path:line")
    tags: list[str] = Field(default_factory=list)
    status: MitigationStatus | None = Field(
        None, description="Defaults to mitigationResolved if existing, else identified"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def ai_tag() -> str:
    return os.environ.get(AI_TAG_ENV_VAR) or DEFAULT_AI_TAG


def empty_model(name: str = "", description: str = "") -> dict[str, Any]:
    return {
        "schema": 1,
        "applicationInfo": {"name": name, "description": description},
        "architecture": {"description": ""},
        "dataflow": {"description": ""},
        "assumptions": [],
        "mitigations": [],
        "threats": [],
        "assumptionLinks": [],
        "mitigationLinks": [],
    }


def _items(doc: dict[str, Any], kind: str) -> list[dict[str, Any]]:
    return doc.setdefault(_COLLECTION[kind], [])


def _ids(doc: dict[str, Any], kind: str) -> set[str]:
    return {i["id"] for i in doc.get(_COLLECTION[kind]) or []}


def _next_numeric(doc: dict[str, Any], kind: str) -> int:
    return max((i.get("numericId", 0) for i in _items(doc, kind)), default=0) + 1


def _tags(*groups: list[str]) -> list[str]:
    seen: list[str] = []
    for group in groups:
        for tag in group:
            tag = tag.strip()
            if tag and tag not in seen:
                seen.append(tag)
    return seen


def _metadata(
    comments: str, agent: str | None, extra: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    meta: list[dict[str, Any]] = []
    if comments.strip():
        meta.append({"key": "Comments", "value": comments.strip()})
    meta.extend(extra or [])
    if agent:
        meta.append({"key": "custom:agent", "value": agent})
    return meta


def _errors(e: ValidationError) -> list[str]:
    return [
        f"{'.'.join(str(p) for p in err['loc']) or 'item'}: {err['msg']}"
        for err in e.errors()
    ]


def validate_document(doc: dict[str, Any]) -> list[str]:
    """Whole-document schema errors, empty if valid."""
    try:
        ThreatComposerV1Model.model_validate(doc)
        return []
    except ValidationError as e:
        return _errors(e)


def _check(entity_cls: type[BaseModel], item: dict[str, Any]) -> list[str]:
    try:
        entity_cls.model_validate(item)
        return []
    except ValidationError as e:
        return _errors(e)


def _metadata_value(item: dict[str, Any], key: str) -> Any:
    return next(
        (m["value"] for m in item.get("metadata") or [] if m["key"] == key), None
    )


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------


def set_section(
    doc: dict[str, Any],
    section: Section,
    description: str | None = None,
    name: str | None = None,
    image: str | None = None,
) -> None:
    target = doc.setdefault(section, {})
    if name is not None:
        if section != "applicationInfo":
            raise BuilderError("name applies only to applicationInfo")
        target["name"] = name
    if image is not None:
        if section == "applicationInfo":
            raise BuilderError("applicationInfo has no image")
        target["image"] = image
    if description is not None:
        target["description"] = description


# ---------------------------------------------------------------------------
# Adding items
# ---------------------------------------------------------------------------


def _build_threat(
    t: ThreatInput, known_elements: set[str] | None, agent: str | None
) -> tuple[dict[str, Any], list[str]]:
    problems: list[str] = []
    if known_elements is not None:
        unknown = [e for e in t.elements if e not in known_elements]
        if unknown:
            problems.append(f"elements: unknown ids {unknown}")

    source = normalise_source(t.threat_source)
    prerequisites = lower_first(t.prerequisites)
    action = lower_first(t.threat_action)
    impact = lower_first(t.threat_impact)
    goals = [lower_first(g) for g in t.impacted_goal if g.strip()]
    assets = [lower_first(a) for a in t.impacted_assets if a.strip()]

    extra = [
        {"key": "STRIDE", "value": sorted(set(t.stride), key="STRIDE".index)},
        {"key": "Priority", "value": t.priority},
    ]
    if t.evidence:
        extra.append({"key": "custom:evidence", "value": t.evidence})

    item = {
        "id": str(uuid.uuid4()),
        "numericId": 0,
        "threatSource": source,
        "prerequisites": prerequisites,
        "threatAction": action,
        "threatImpact": impact,
        "impactedGoal": goals,
        "impactedAssets": assets,
        "statement": compose_statement(
            source, prerequisites, action, impact, goals, assets
        ),
        "status": t.status,
        "tags": _tags(t.elements, t.tags, [ai_tag()]),
        "metadata": _metadata(t.comments, agent, extra),
    }
    return item, problems + _check(Threat, item)


def _build_mitigation(m: MitigationInput, agent: str | None) -> dict[str, Any]:
    status = m.status or (
        "mitigationResolved" if m.existing else "mitigationIdentified"
    )
    extra = [{"key": "custom:evidence", "value": m.evidence}] if m.evidence else []
    return {
        "id": str(uuid.uuid4()),
        "numericId": 0,
        "content": m.content.strip(),
        "status": status,
        "tags": _tags(
            [m.control_type] if m.control_type else [],
            [EXISTING_CONTROL_TAG] if m.existing else [],
            m.tags,
            [ai_tag()],
        ),
        "metadata": _metadata(m.comments, agent, extra),
    }


def _result(
    added: list[dict[str, Any]], rejected: list[dict[str, Any]]
) -> dict[str, Any]:
    return {"added": added, "rejected": rejected}


def add_threats(
    doc: dict[str, Any],
    threats: list[ThreatInput],
    known_elements: set[str] | None = None,
    agent: str | None = None,
) -> dict[str, Any]:
    """Add threats. Valid items are added; invalid ones are reported by index."""
    added, rejected = [], []
    for index, t in enumerate(threats):
        item, problems = _build_threat(t, known_elements, agent)
        if problems:
            rejected.append({"index": index, "errors": problems})
            continue
        item["numericId"] = _next_numeric(doc, "threat")
        _items(doc, "threat").append(item)
        added.append(
            {
                "index": index,
                "id": item["id"],
                "numericId": item["numericId"],
                "statement": item["statement"],
            }
        )
    return _result(added, rejected)


def add_mitigations(
    doc: dict[str, Any], mitigations: list[MitigationInput], agent: str | None = None
) -> dict[str, Any]:
    threat_ids = _ids(doc, "threat")
    added, rejected = [], []
    for index, m in enumerate(mitigations):
        item = _build_mitigation(m, agent)
        problems = _check(Mitigation, item)
        unknown = [t for t in m.threat_ids if t not in threat_ids]
        if unknown:
            problems.append(f"threat_ids: unknown {unknown}")
        if problems:
            rejected.append({"index": index, "errors": problems})
            continue
        item["numericId"] = _next_numeric(doc, "mitigation")
        _items(doc, "mitigation").append(item)
        links = doc.setdefault("mitigationLinks", [])
        for threat_id in dict.fromkeys(m.threat_ids):
            links.append({"mitigationId": item["id"], "linkedId": threat_id})
        added.append({"index": index, "id": item["id"], "numericId": item["numericId"]})
    return _result(added, rejected)


def add_assumptions(
    doc: dict[str, Any], assumptions: list[AssumptionInput], agent: str | None = None
) -> dict[str, Any]:
    added, rejected = [], []
    for index, a in enumerate(assumptions):
        item = {
            "id": str(uuid.uuid4()),
            "numericId": 0,
            "content": a.content.strip(),
            "tags": _tags(a.tags, [ai_tag()]),
            "metadata": _metadata(a.comments, agent),
        }
        problems = _check(Assumption, item)
        try:
            link_types = [_assumption_link_type(doc, target) for target in a.link_to]
        except BuilderError as e:
            problems.append(f"link_to: {e}")
        if problems:
            rejected.append({"index": index, "errors": problems})
            continue
        item["numericId"] = _next_numeric(doc, "assumption")
        _items(doc, "assumption").append(item)
        for target, link_type in zip(a.link_to, link_types, strict=True):
            _add_assumption_link(doc, item["id"], target, link_type)
        added.append({"index": index, "id": item["id"], "numericId": item["numericId"]})
    return _result(added, rejected)


# ---------------------------------------------------------------------------
# Links
# ---------------------------------------------------------------------------


def _assumption_link_type(doc: dict[str, Any], target: str) -> str:
    if target in _ids(doc, "threat"):
        return "Threat"
    if target in _ids(doc, "mitigation"):
        return "Mitigation"
    raise BuilderError(f"'{target}' is not a threat or mitigation id")


def _add_assumption_link(
    doc: dict[str, Any], assumption_id: str, target: str, link_type: str
) -> None:
    links = doc.setdefault("assumptionLinks", [])
    link = {"type": link_type, "assumptionId": assumption_id, "linkedId": target}
    if link not in links:
        links.append(link)


def link(
    doc: dict[str, Any],
    kind: Literal["mitigation", "assumption"],
    from_id: str,
    to_ids: list[str],
    unlink: bool = False,
) -> dict[str, Any]:
    """Link (or unlink) a mitigation to threats, or an assumption to threats or
    mitigations."""
    if from_id not in _ids(doc, kind):
        raise BuilderError(f"no {kind} with id '{from_id}'")
    changed = 0
    if kind == "mitigation":
        threat_ids = _ids(doc, "threat")
        unknown = [t for t in to_ids if t not in threat_ids]
        if unknown:
            raise BuilderError(f"unknown threat ids {unknown}")
        links = doc.setdefault("mitigationLinks", [])
        for target in to_ids:
            entry = {"mitigationId": from_id, "linkedId": target}
            if unlink and entry in links:
                links.remove(entry)
                changed += 1
            elif not unlink and entry not in links:
                links.append(entry)
                changed += 1
    else:
        links = doc.setdefault("assumptionLinks", [])
        for target in to_ids:
            if unlink:
                before = len(links)
                links[:] = [
                    x
                    for x in links
                    if not (x["assumptionId"] == from_id and x["linkedId"] == target)
                ]
                changed += before - len(links)
            else:
                before = len(links)
                _add_assumption_link(
                    doc, from_id, target, _assumption_link_type(doc, target)
                )
                changed += len(links) - before
    return {"changed": changed}


# ---------------------------------------------------------------------------
# Updating and removing
# ---------------------------------------------------------------------------


def _find(doc: dict[str, Any], kind: str, item_id: str) -> dict[str, Any]:
    for item in _items(doc, kind):
        if item["id"] == item_id:
            return item
    raise BuilderError(f"no {kind} with id '{item_id}'")


def update_threat(
    doc: dict[str, Any],
    threat_id: str,
    threat: ThreatInput,
    known_elements: set[str] | None = None,
    agent: str | None = None,
) -> dict[str, Any]:
    """Replace a threat's content, keeping its id, numericId and links."""
    existing = _find(doc, "threat", threat_id)
    item, problems = _build_threat(threat, known_elements, agent)
    if problems:
        raise BuilderError("; ".join(problems))
    item["id"], item["numericId"] = existing["id"], existing["numericId"]
    existing.clear()
    existing.update(item)
    return {"id": threat_id, "statement": item["statement"]}


def update_mitigation(
    doc: dict[str, Any],
    mitigation_id: str,
    mitigation: MitigationInput,
    agent: str | None = None,
) -> dict[str, Any]:
    """Replace a mitigation's content and its threat links, keeping its id."""
    existing = _find(doc, "mitigation", mitigation_id)
    item = _build_mitigation(mitigation, agent)
    problems = _check(Mitigation, item)
    unknown = [t for t in mitigation.threat_ids if t not in _ids(doc, "threat")]
    if unknown:
        problems.append(f"threat_ids: unknown {unknown}")
    if problems:
        raise BuilderError("; ".join(problems))
    item["id"], item["numericId"] = existing["id"], existing["numericId"]
    existing.clear()
    existing.update(item)
    links = doc.setdefault("mitigationLinks", [])
    links[:] = [x for x in links if x["mitigationId"] != mitigation_id]
    for threat_id in dict.fromkeys(mitigation.threat_ids):
        links.append({"mitigationId": mitigation_id, "linkedId": threat_id})
    return {"id": mitigation_id}


def set_status(
    doc: dict[str, Any],
    kind: Literal["threat", "mitigation"],
    ids: list[str],
    status: str,
) -> dict[str, Any]:
    entity_cls = Threat if kind == "threat" else Mitigation
    items = [_find(doc, kind, i) for i in ids]
    for item in items:
        problems = _check(entity_cls, {**item, "status": status})
        if problems:
            raise BuilderError("; ".join(problems))
    for item in items:
        item["status"] = status
    return {"updated": len(items)}


_ENTITY_CLS: dict[str, type[BaseModel]] = {
    "threat": Threat,
    "mitigation": Mitigation,
    "assumption": Assumption,
}


def _change_tags(
    doc: dict[str, Any], kind: Kind, ids: list[str], tags: list[str], add: bool
) -> dict[str, Any]:
    """Add or remove tags on items. Checks everything before it changes anything."""
    if any(not t.strip() for t in tags):
        raise BuilderError("tags: a tag cannot be empty or only whitespace")
    wanted = _tags(tags)
    items = [_find(doc, kind, i) for i in dict.fromkeys(ids)]
    changes: list[tuple[dict[str, Any], list[str]]] = []
    for item in items:
        current = item.get("tags") or []
        if add:
            new = current + [t for t in wanted if t not in current]
        else:
            new = [t for t in current if t not in wanted]
        if new == current:
            continue
        problems = _check(_ENTITY_CLS[kind], {**item, "tags": new})
        if problems:
            raise BuilderError(f"{kind} '{item['id']}': " + "; ".join(problems))
        changes.append((item, new))
    for item, new in changes:
        item["tags"] = new
    return {"updated": len(items)}


def add_tags(
    doc: dict[str, Any], kind: Kind, ids: list[str], tags: list[str]
) -> dict[str, Any]:
    """Append tags an item does not have yet. Changes no other field."""
    return _change_tags(doc, kind, ids, tags, add=True)


def remove_tags(
    doc: dict[str, Any], kind: Kind, ids: list[str], tags: list[str]
) -> dict[str, Any]:
    """Remove tags from items. Changes no other field."""
    return _change_tags(doc, kind, ids, tags, add=False)


def remove(doc: dict[str, Any], kind: Kind, ids: list[str]) -> dict[str, Any]:
    """Remove items and every link that refers to them."""
    for i in ids:
        _find(doc, kind, i)
    gone = set(ids)
    collection = _items(doc, kind)
    collection[:] = [x for x in collection if x["id"] not in gone]
    mitigation_links = doc.setdefault("mitigationLinks", [])
    mitigation_links[:] = [
        x
        for x in mitigation_links
        if x["mitigationId"] not in gone and x["linkedId"] not in gone
    ]
    assumption_links = doc.setdefault("assumptionLinks", [])
    assumption_links[:] = [
        x
        for x in assumption_links
        if x["assumptionId"] not in gone and x["linkedId"] not in gone
    ]
    return {"removed": len(ids)}


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------


def summary(
    doc: dict[str, Any],
    sections: list[Literal["info", "threats", "mitigations", "assumptions"]]
    | None = None,
    priority: Priority | None = None,
    element: str | None = None,
) -> dict[str, Any]:
    """A compact view: ids, statements, links. No descriptions or images."""
    sections = sections or ["info", "threats", "mitigations", "assumptions"]
    mitigation_links = doc.get("mitigationLinks") or []
    assumption_links = doc.get("assumptionLinks") or []
    out: dict[str, Any] = {}

    if "info" in sections:
        info = doc.get("applicationInfo") or {}
        out["info"] = {
            "name": info.get("name", ""),
            "description_chars": {
                s: len((doc.get(s) or {}).get("description") or "")
                for s in ("applicationInfo", "architecture", "dataflow")
            },
            "images": {
                s: bool((doc.get(s) or {}).get("image"))
                for s in ("architecture", "dataflow")
            },
            "counts": {
                k: len(doc.get(k) or [])
                for k in ("threats", "mitigations", "assumptions")
            },
        }

    if "threats" in sections:
        rows = []
        for t in doc.get("threats") or []:
            prio = _metadata_value(t, "Priority")
            tags = t.get("tags") or []
            if priority and prio != priority:
                continue
            if element and element not in tags:
                continue
            rows.append(
                {
                    "id": t["id"],
                    "numericId": t["numericId"],
                    "statement": t.get("statement", ""),
                    "priority": prio,
                    "stride": _metadata_value(t, "STRIDE") or [],
                    "tags": tags,
                    "status": t.get("status"),
                    "mitigations": [
                        x["mitigationId"]
                        for x in mitigation_links
                        if x["linkedId"] == t["id"]
                    ],
                }
            )
        out["threats"] = rows

    if "mitigations" in sections:
        out["mitigations"] = [
            {
                "id": m["id"],
                "numericId": m["numericId"],
                "content": m.get("content", ""),
                "status": m.get("status"),
                "tags": m.get("tags") or [],
                "threats": [
                    x["linkedId"]
                    for x in mitigation_links
                    if x["mitigationId"] == m["id"]
                ],
            }
            for m in doc.get("mitigations") or []
        ]

    if "assumptions" in sections:
        out["assumptions"] = [
            {
                "id": a["id"],
                "numericId": a["numericId"],
                "content": a.get("content", ""),
                "linked": [
                    x["linkedId"]
                    for x in assumption_links
                    if x["assumptionId"] == a["id"]
                ],
            }
            for a in doc.get("assumptions") or []
        ]
    return out
