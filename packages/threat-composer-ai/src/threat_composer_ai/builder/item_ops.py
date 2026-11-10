"""
Partial updates and single-item lookup.

`patch_*` change only the fields the caller names and leave every other field
as it is: ids, numericIds, links, other metadata and `custom:agent`. That is
the difference from `update_threat` and `update_mitigation`, which replace the
whole item.

An item is named by its id (UUID) or by its number: `T17`, `M19`, `A44`, or
`17` when the kind is already known.
"""

import copy
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from ..models.threat_composer_v1 import Assumption, Mitigation, Threat
from .model_ops import (
    EXISTING_CONTROL_TAG,
    BuilderError,
    Kind,
    MitigationStatus,
    Priority,
    Stride,
    ThreatStatus,
    _add_assumption_link,
    _assumption_link_type,
    _check,
    _ids,
    _Input,
    _items,
    _metadata_value,
    _tags,
    find_item,
    ref_id,
    remove,
)
from .search import references
from .statement import compose_statement, lower_first, normalise_source

CONTROL_TYPES = ("Preventative", "Detective", "Corrective")
# Metadata that has a named field, or that the builder owns.
_RESERVED_KEYS = {"custom:agent", "custom:evidence"}

MetadataValue = str | list[str] | None
MetadataPatch = dict[str, MetadataValue]


class _Patch(_Input):
    metadata: MetadataPatch | None = Field(
        None,
        description=(
            "Custom metadata to set, as {'custom:key': value}. A value is a "
            "string or a list of strings; null deletes the key. Keys start with "
            "'custom:'. custom:agent and custom:evidence are not set here"
        ),
    )

    @field_validator("metadata")
    @classmethod
    def _custom_keys(cls, v: MetadataPatch | None) -> MetadataPatch | None:
        for key in v or {}:
            if not key.startswith("custom:") or key in _RESERVED_KEYS:
                raise ValueError(
                    f"'{key}': use a 'custom:' key other than "
                    f"{', '.join(sorted(_RESERVED_KEYS))}"
                )
        return v


class ThreatPatch(_Patch):
    """Only the fields you set change. Omit a field to keep it."""

    threat_source: str | None = Field(None, max_length=200)
    prerequisites: str | None = Field(None, max_length=200, description="'' clears")
    threat_action: str | None = Field(None, max_length=200)
    threat_impact: str | None = Field(None, max_length=200, description="'' clears")
    impacted_goal: list[str] | None = Field(None, description="Replaces the list")
    impacted_assets: list[str] | None = Field(None, description="Replaces the list")
    stride: list[Stride] | None = Field(None, min_length=1)
    priority: Priority | None = None
    elements: list[str] | None = Field(
        None,
        description="Replaces the element and flow ids. Needs a system model",
    )
    comments: str | None = Field(
        None, max_length=1000, description="Replaces the comments. '' deletes them"
    )
    evidence: list[str] | None = Field(
        None, description="Replaces the evidence. [] deletes it"
    )
    status: ThreatStatus | None = None


class MitigationPatch(_Patch):
    """Only the fields you set change. Omit a field to keep it."""

    content: str | None = Field(None, max_length=1000)
    threat_ids: list[str] | None = Field(
        None, min_length=1, description="Replaces the linked threats"
    )
    control_type: Literal["Preventative", "Detective", "Corrective"] | None = Field(
        None, description="Replaces the control type tag"
    )
    existing: bool | None = Field(
        None, description="Add or remove the 'Existing control' tag"
    )
    comments: str | None = Field(
        None, max_length=1000, description="Replaces the comments. '' deletes them"
    )
    evidence: list[str] | None = Field(
        None, description="Replaces the evidence. [] deletes it"
    )
    status: MitigationStatus | None = None


class AssumptionPatch(_Patch):
    """Only the fields you set change. Omit a field to keep it."""

    content: str | None = Field(None, max_length=1000)
    comments: str | None = Field(
        None, max_length=1000, description="Replaces the comments. '' deletes them"
    )
    link_to: list[str] | None = Field(
        None,
        description="Replaces the linked threats and mitigations. [] unlinks all",
    )


# ---------------------------------------------------------------------------
# Finding items by id or number
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------


def _set_meta(item: dict[str, Any], key: str, value: MetadataValue) -> None:
    """Set a metadata entry in place; None or empty deletes it."""
    meta = item.get("metadata") or []
    item["metadata"] = meta
    entry = next((m for m in meta if m["key"] == key), None)
    if value is None or value == "" or value == []:
        if entry:
            meta.remove(entry)
    elif entry:
        entry["value"] = value
    else:
        meta.append({"key": key, "value": value})


def _apply_common_metadata(new: dict[str, Any], p: _Patch, fields: set[str]) -> None:
    if "comments" in fields:
        _set_meta(new, "Comments", (getattr(p, "comments", None) or "").strip())
    if "evidence" in fields:
        _set_meta(new, "custom:evidence", getattr(p, "evidence", None) or [])
    for key, value in (p.metadata or {}).items():
        _set_meta(new, key, value)


def _fields(patch: _Patch) -> set[str]:
    """Names the caller set. An empty metadata patch counts as not set."""
    fields = set(patch.model_fields_set)
    if not patch.metadata:
        fields.discard("metadata")
    return fields


def _require_changes(fields: set[str]) -> None:
    if not fields:
        raise BuilderError("nothing to change: set at least one field")


def _not_null(p: BaseModel, fields: set[str], names: list[str]) -> None:
    """Fields where an explicit null makes no sense."""
    bad = [n for n in names if n in fields and getattr(p, n) is None]
    if bad:
        raise BuilderError(f"{bad}: cannot be null; omit the field to keep it")


def _finish(
    existing: dict[str, Any],
    new: dict[str, Any],
    entity_cls: type[BaseModel],
    fields: set[str],
    problems: list[str] | None = None,
) -> dict[str, Any]:
    problems = (problems or []) + _check(entity_cls, new)
    if problems:
        raise BuilderError("; ".join(problems))
    changed = new != existing
    existing.clear()
    existing.update(new)
    return {
        "id": existing["id"],
        "numericId": existing["numericId"],
        "fields": sorted(fields),
        "modified": changed,
    }


# ---------------------------------------------------------------------------
# Patches
# ---------------------------------------------------------------------------


def patch_threat(
    doc: dict[str, Any],
    ref: str,
    patch: ThreatPatch,
    known_elements: set[str] | None = None,
) -> dict[str, Any]:
    _, existing = find_item(doc, ref, "threat")
    fields = _fields(patch)
    _require_changes(fields)
    _not_null(
        patch,
        fields,
        [
            "threat_source",
            "prerequisites",
            "threat_action",
            "threat_impact",
            "impacted_goal",
            "impacted_assets",
            "stride",
            "priority",
            "elements",
            "status",
        ],
    )
    new = copy.deepcopy(existing)
    problems: list[str] = []

    grammar = {
        "threat_source": ("threatSource", normalise_source),
        "prerequisites": ("prerequisites", lower_first),
        "threat_action": ("threatAction", lower_first),
        "threat_impact": ("threatImpact", lower_first),
    }
    for name, (key, clean) in grammar.items():
        if name in fields:
            new[key] = clean(getattr(patch, name))
    for name, key in (
        ("impacted_goal", "impactedGoal"),
        ("impacted_assets", "impactedAssets"),
    ):
        if name in fields:
            new[key] = [lower_first(x) for x in getattr(patch, name) if x.strip()]
    if any(n in fields for n in (*grammar, "impacted_goal", "impacted_assets")):
        if not new.get("threatSource") or not new.get("threatAction"):
            problems.append("threat_source and threat_action cannot be empty")
        else:
            new["statement"] = compose_statement(
                new["threatSource"],
                new.get("prerequisites") or "",
                new["threatAction"],
                new.get("threatImpact") or "",
                new.get("impactedGoal") or [],
                new.get("impactedAssets") or [],
            )

    if "stride" in fields:
        _set_meta(new, "STRIDE", sorted(set(patch.stride or []), key="STRIDE".index))
    if "priority" in fields:
        _set_meta(new, "Priority", patch.priority)
    if "status" in fields:
        new["status"] = patch.status

    if "elements" in fields:
        if known_elements is None:
            problems.append("elements: this model has no system model; add one first")
        else:
            unknown = [e for e in patch.elements or [] if e not in known_elements]
            if unknown:
                problems.append(f"elements: unknown ids {unknown}")
            others = [t for t in new.get("tags") or [] if t not in known_elements]
            new["tags"] = _tags(patch.elements or [], others)

    _apply_common_metadata(new, patch, fields)
    return _finish(existing, new, Threat, fields, problems) | {
        "statement": existing.get("statement", "")
    }


def patch_mitigation(
    doc: dict[str, Any], ref: str, patch: MitigationPatch
) -> dict[str, Any]:
    _, existing = find_item(doc, ref, "mitigation")
    fields = _fields(patch)
    _require_changes(fields)
    _not_null(patch, fields, ["content", "threat_ids", "existing", "status"])
    new = copy.deepcopy(existing)
    problems: list[str] = []

    if "content" in fields:
        new["content"] = (patch.content or "").strip()
    if "status" in fields:
        new["status"] = patch.status
    tags = list(new.get("tags") or [])
    if "control_type" in fields:
        tags = [t for t in tags if t not in CONTROL_TYPES]
        if patch.control_type:
            tags.append(patch.control_type)
    if "existing" in fields:
        tags = [t for t in tags if t != EXISTING_CONTROL_TAG]
        if patch.existing:
            tags.append(EXISTING_CONTROL_TAG)
    new["tags"] = _tags(tags)

    new_links: list[str] | None = None
    if "threat_ids" in fields:
        wanted = [ref_id(doc, t, "threat") for t in patch.threat_ids or []]
        unknown = [t for t in wanted if t not in _ids(doc, "threat")]
        if unknown:
            problems.append(f"threat_ids: unknown {unknown}")
        new_links = list(dict.fromkeys(wanted))

    _apply_common_metadata(new, patch, fields)
    result = _finish(existing, new, Mitigation, fields, problems)
    if new_links is not None:
        links = doc.setdefault("mitigationLinks", [])
        links[:] = [x for x in links if x["mitigationId"] != existing["id"]]
        for threat_id in new_links:
            links.append({"mitigationId": existing["id"], "linkedId": threat_id})
    return result


def patch_assumption(
    doc: dict[str, Any], ref: str, patch: AssumptionPatch
) -> dict[str, Any]:
    _, existing = find_item(doc, ref, "assumption")
    fields = _fields(patch)
    _require_changes(fields)
    _not_null(patch, fields, ["content", "link_to"])
    new = copy.deepcopy(existing)
    problems: list[str] = []

    if "content" in fields:
        new["content"] = (patch.content or "").strip()

    link_types: list[tuple[str, str]] = []
    if "link_to" in fields:
        for target in dict.fromkeys(ref_id(doc, t) for t in patch.link_to or []):
            try:
                link_types.append((target, _assumption_link_type(doc, target)))
            except BuilderError as e:
                problems.append(f"link_to: {e}")

    _apply_common_metadata(new, patch, fields)
    result = _finish(existing, new, Assumption, fields, problems)
    if "link_to" in fields:
        links = doc.setdefault("assumptionLinks", [])
        links[:] = [x for x in links if x["assumptionId"] != existing["id"]]
        for target, link_type in link_types:
            _add_assumption_link(doc, existing["id"], target, link_type)
    return result


# ---------------------------------------------------------------------------
# One item in full
# ---------------------------------------------------------------------------


def _brief(kind: str, item: dict[str, Any]) -> dict[str, Any]:
    out = {
        "id": item["id"],
        "number": f"{kind[0].upper()}{item['numericId']}",
        "text": item.get("statement" if kind == "threat" else "content", ""),
    }
    if item.get("status"):
        out["status"] = item["status"]
    return out


def get_item(
    doc: dict[str, Any],
    ref: str,
    known_targets: set[str] | None = None,
) -> dict[str, Any]:
    """Everything stored on one item, and the items linked to it."""
    kind, item = find_item(doc, ref)
    by_id = {
        k: {i["id"]: i for i in _items(doc, k)}
        for k in ("threat", "mitigation", "assumption")
    }
    m_links = doc.get("mitigationLinks") or []
    a_links = doc.get("assumptionLinks") or []

    def pick(kind_name: str, ids: list[str]) -> list[dict[str, Any]]:
        return [
            _brief(kind_name, by_id[kind_name][i]) for i in ids if i in by_id[kind_name]
        ]

    linked: dict[str, list[dict[str, Any]]] = {}
    out: dict[str, Any] = {"kind": kind}
    if kind == "threat":
        linked["mitigations"] = pick(
            "mitigation",
            [x["mitigationId"] for x in m_links if x["linkedId"] == item["id"]],
        )
        linked["assumptions"] = pick(
            "assumption",
            [x["assumptionId"] for x in a_links if x["linkedId"] == item["id"]],
        )
        tags = item.get("tags") or []
        known = known_targets or set()
        out["elements"] = [t for t in tags if t in known]
        out["other_tags"] = [t for t in tags if t not in known]
        out["priority"] = _metadata_value(item, "Priority")
        out["stride"] = _metadata_value(item, "STRIDE") or []
    elif kind == "mitigation":
        linked["threats"] = pick(
            "threat",
            [x["linkedId"] for x in m_links if x["mitigationId"] == item["id"]],
        )
        linked["assumptions"] = pick(
            "assumption",
            [x["assumptionId"] for x in a_links if x["linkedId"] == item["id"]],
        )
    else:
        targets = [x for x in a_links if x["assumptionId"] == item["id"]]
        linked["threats"] = pick(
            "threat", [x["linkedId"] for x in targets if x["type"] == "Threat"]
        )
        linked["mitigations"] = pick(
            "mitigation", [x["linkedId"] for x in targets if x["type"] == "Mitigation"]
        )
    out["number"] = f"{kind[0].upper()}{item['numericId']}"
    out["item"] = copy.deepcopy(item)
    out["linked"] = linked
    return out


# ---------------------------------------------------------------------------
# Editing a section in place
# ---------------------------------------------------------------------------


def edit_section(
    doc: dict[str, Any],
    section: str,
    old: str,
    new: str,
    replace_all: bool = False,
) -> dict[str, Any]:
    """Replace exact text in a section description."""
    if not old:
        raise BuilderError("old must not be empty")
    target = doc.get(section) or {}
    text = target.get("description") or ""
    count = text.count(old)
    if count == 0:
        raise BuilderError(f"old text not found in {section} description")
    if count > 1 and not replace_all:
        raise BuilderError(
            f"old text matches {count} times in {section} description; make it "
            "longer so it matches once, or set replace_all"
        )
    doc.setdefault(section, {})["description"] = text.replace(old, new)
    return {"section": section, "replaced": count}


# ---------------------------------------------------------------------------
# Removing, with a check for mentions in prose
# ---------------------------------------------------------------------------


def remove_checked(
    doc: dict[str, Any], kind: Kind, refs: list[str], force: bool = False
) -> dict[str, Any]:
    """Remove items named by id or number, and the links that refer to them.

    Links are cleaned up, but prose is not: another item may say "assumption
    43" in its text. Unless `force` is set, the removal is refused when any
    text outside the removed items mentions one of them by id or number.
    """
    targets = [find_item(doc, ref, kind) for ref in dict.fromkeys(refs)]
    mentions = references(doc, targets)
    if mentions and not force:
        shown = "; ".join(
            f'{m["in"]} {m["field"]} mentions {m["mentions"]}: "{m["snippet"]}"'
            for m in mentions[:10]
        )
        more = f" (and {len(mentions) - 10} more)" if len(mentions) > 10 else ""
        raise BuilderError(
            f"nothing removed: text still refers to what you remove. {shown}{more}. "
            "Edit that text with tm_patch_*, or pass force=true to remove anyway."
        )
    result = remove(doc, kind, [item["id"] for _, item in targets])
    result["removed_numbers"] = [
        f"{kind[0].upper()}{item['numericId']}" for _, item in targets
    ]
    if mentions:
        result["references_left"] = mentions
    return result
