"""
Field-level differences between two versions of a model, for dry runs.

A dry run applies a change in memory, checks it, and returns what would
change without writing the file.
"""

from typing import Any

_ITEM_KINDS = (("threats", "T"), ("mitigations", "M"), ("assumptions", "A"))
_SKIP = {"id", "numericId"}
_CLIP = 300


def _clip(value: Any) -> Any:
    if isinstance(value, str) and len(value) > _CLIP:
        return f"{value[:_CLIP]}…[{len(value)} characters]"
    return value


def _before_after(before: Any, after: Any) -> dict[str, Any]:
    return {"before": _clip(before), "after": _clip(after)}


def _list_change(before: list[Any], after: list[Any]) -> dict[str, Any]:
    if all(isinstance(x, str) for x in before + after):
        return {
            "added": [x for x in after if x not in before],
            "removed": [x for x in before if x not in after],
        }
    return _before_after(before, after)


def _field_changes(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    """Changed fields of one item. Metadata is compared key by key."""
    out: dict[str, Any] = {}
    for key in sorted((set(before) | set(after)) - _SKIP - {"metadata"}):
        a, b = before.get(key), after.get(key)
        if a == b:
            continue
        if key == "image":
            out[key] = {"changed": True}
        elif isinstance(a, list) and isinstance(b, list):
            out[key] = _list_change(a, b)
        else:
            out[key] = _before_after(a, b)
    old = {m["key"]: m["value"] for m in before.get("metadata") or []}
    new = {m["key"]: m["value"] for m in after.get("metadata") or []}
    for key in sorted(set(old) | set(new)):
        if old.get(key) != new.get(key):
            out[f"metadata:{key}"] = _before_after(old.get(key), new.get(key))
    return out


def _text(item: dict[str, Any]) -> str:
    for key in ("statement", "content", "name", "description"):
        if item.get(key):
            return _clip(item[key])
    return ""


def _keyed(
    before: list[dict[str, Any]],
    after: list[dict[str, Any]],
    label,
    key: str = "id",
) -> list[dict[str, Any]]:
    old = {x[key]: x for x in before}
    new = {x[key]: x for x in after}
    out: list[dict[str, Any]] = []
    for k, item in old.items():
        if k not in new:
            out.append({"op": "remove", "item": label(item), "text": _text(item)})
    for k, item in new.items():
        if k not in old:
            out.append({"op": "add", "item": label(item), "text": _text(item)})
        else:
            fields = _field_changes(old[k], item)
            if fields:
                out.append({"op": "change", "item": label(item), "fields": fields})
    return out


def diff_threat_model(before: dict[str, Any], after: dict[str, Any]) -> list[dict]:
    """Changes to items, section descriptions and links."""
    changes: list[dict[str, Any]] = []
    number: dict[str, str] = {}
    for collection, letter in _ITEM_KINDS:
        for doc in (before, after):
            for item in doc.get(collection) or []:
                number[item["id"]] = f"{letter}{item.get('numericId')}"
        changes += _keyed(
            before.get(collection) or [],
            after.get(collection) or [],
            lambda item, letter=letter: f"{letter}{item.get('numericId')}",
        )
    for section in ("applicationInfo", "architecture", "dataflow"):
        fields = _field_changes(before.get(section) or {}, after.get(section) or {})
        if fields:
            changes.append({"op": "change", "item": section, "fields": fields})

    def links(doc: dict[str, Any], name: str, left: str) -> set[str]:
        return {
            f"{number.get(x[left], x[left])} -> {number.get(x['linkedId'], x['linkedId'])}"
            for x in doc.get(name) or []
        }

    for name, left in (
        ("mitigationLinks", "mitigationId"),
        ("assumptionLinks", "assumptionId"),
    ):
        old, new = links(before, name, left), links(after, name, left)
        changes += [{"op": "unlink", "link": x} for x in sorted(old - new)]
        changes += [{"op": "link", "link": x} for x in sorted(new - old)]
    return changes


def diff_system_model(before: dict[str, Any], after: dict[str, Any]) -> list[dict]:
    """Changes to zones, elements and flows."""
    changes: list[dict[str, Any]] = []
    for collection in ("zones", "elements", "flows"):
        changes += _keyed(
            before.get(collection) or [],
            after.get(collection) or [],
            lambda item, c=collection[:-1]: f"{c} {item['id']}",
        )
    return changes
