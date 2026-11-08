"""
Find text in a threat model: for a search, and for references to a number.

Both walk the same list of text fields: threats, mitigations and assumptions
(content, grammar fields, tags and all metadata), the three section
descriptions, and when there is a system model, its zones, elements and flows.
"""

import re
from collections.abc import Iterator
from typing import Any, Literal

from .model_ops import BuilderError
from .system_model import SystemModel

SearchKind = Literal[
    "threat", "mitigation", "assumption", "section", "zone", "element", "flow"
]

_ITEM_FIELDS = {
    "threat": (
        "statement",
        "threatSource",
        "prerequisites",
        "threatAction",
        "threatImpact",
        "impactedGoal",
        "impactedAssets",
    ),
    "mitigation": ("content",),
    "assumption": ("content",),
}
_COLLECTION = {
    "threat": "threats",
    "mitigation": "mitigations",
    "assumption": "assumptions",
}
_SECTION_FIELDS = (
    ("applicationInfo", "name"),
    ("applicationInfo", "description"),
    ("architecture", "description"),
    ("dataflow", "description"),
)


class TextField(dict):
    """kind, id, number, field and text of one string in the model."""


def _strings(value: Any) -> Iterator[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for x in value:
            yield from _strings(x)


def _field(kind: str, id_: str, number: str, field: str, text: str) -> TextField:
    return TextField(kind=kind, id=id_, number=number, field=field, text=text)


def iter_text(
    doc: dict[str, Any], system: SystemModel | None = None
) -> Iterator[TextField]:
    """Every string stored in the model, with where it is."""
    for kind, fields in _ITEM_FIELDS.items():
        for item in doc.get(_COLLECTION[kind]) or []:
            number = f"{kind[0].upper()}{item.get('numericId')}"
            for name in fields:
                for text in _strings(item.get(name)):
                    yield _field(kind, item["id"], number, name, text)
            for tag in item.get("tags") or []:
                yield _field(kind, item["id"], number, "tags", tag)
            for meta in item.get("metadata") or []:
                for text in _strings(meta.get("value")):
                    yield _field(
                        kind, item["id"], number, f"metadata:{meta['key']}", text
                    )
    for section, name in _SECTION_FIELDS:
        text = (doc.get(section) or {}).get(name)
        if isinstance(text, str) and text:
            yield _field("section", section, section, name, text)
    if system is None:
        return
    for z in system.zones:
        for name in ("name", "trust_level"):
            if getattr(z, name):
                yield _field("zone", z.id, z.id, name, getattr(z, name))
    for e in system.elements:
        for name in ("name", "description"):
            if getattr(e, name):
                yield _field("element", e.id, e.id, name, getattr(e, name))
    for f in system.flows:
        for name in ("description", "protocol"):
            if getattr(f, name):
                yield _field("flow", f.id, f.id, name, getattr(f, name))
        for asset in f.assets:
            yield _field("flow", f.id, f.id, "assets", asset)


def _snippet(text: str, start: int, end: int, width: int = 50) -> str:
    left, right = max(0, start - width), min(len(text), end + width)
    return ("…" if left else "") + text[left:right] + ("…" if right < len(text) else "")


def search(
    doc: dict[str, Any],
    system: SystemModel | None,
    query: str,
    regex: bool = False,
    case_sensitive: bool = False,
    kinds: list[SearchKind] | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Find a string or a regular expression in every text field."""
    if not query:
        raise BuilderError("query must not be empty")
    flags = 0 if case_sensitive else re.IGNORECASE
    try:
        pattern = re.compile(query if regex else re.escape(query), flags)
    except re.error as e:
        raise BuilderError(f"query is not a valid regular expression: {e}") from e
    matches: list[dict[str, Any]] = []
    total = 0
    for entry in iter_text(doc, system):
        if kinds and entry["kind"] not in kinds:
            continue
        found = pattern.search(entry["text"])
        if not found:
            continue
        total += 1
        if len(matches) < limit:
            matches.append(
                {
                    "kind": entry["kind"],
                    "id": entry["id"],
                    "number": entry["number"],
                    "field": entry["field"],
                    "snippet": _snippet(entry["text"], found.start(), found.end()),
                }
            )
    return {"matches": matches, "count": total, "truncated": total > len(matches)}


# ---------------------------------------------------------------------------
# References to a number in prose
# ---------------------------------------------------------------------------

_WORD = {
    "threat": "threats?",
    "mitigation": "mitigations?",
    "assumption": "assumptions?",
}


def _reference_pattern(kind: str, item: dict[str, Any]) -> re.Pattern[str]:
    """Matches the item's id, its number as T17, M19 or A44, or as 'threat 17'
    or 'assumption #44'. A short code is case sensitive, so 'a1' is not A1."""
    number = int(item["numericId"])
    letter = kind[0].upper()
    return re.compile(
        rf"{re.escape(item['id'])}"
        rf"|(?<![A-Za-z0-9]){letter}0*{number}(?![A-Za-z0-9])"
        rf"|(?i:(?<![a-z0-9]){_WORD[kind]}\s*#?\s*0*{number}(?![a-z0-9]))"
    )


def references(
    doc: dict[str, Any],
    targets: list[tuple[str, dict[str, Any]]],
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Text outside `targets` that mentions one of them by id or number."""
    skip = {(kind, item["id"]) for kind, item in targets}
    patterns = [(kind, item, _reference_pattern(kind, item)) for kind, item in targets]
    found: list[dict[str, Any]] = []
    for entry in iter_text(doc):
        if (entry["kind"], entry["id"]) in skip:
            continue
        for kind, item, pattern in patterns:
            match = pattern.search(entry["text"])
            if match:
                found.append(
                    {
                        "in": entry["number"],
                        "field": entry["field"],
                        "mentions": f"{kind[0].upper()}{item['numericId']}",
                        "snippet": _snippet(entry["text"], match.start(), match.end()),
                    }
                )
        if len(found) >= limit:
            break
    return found
