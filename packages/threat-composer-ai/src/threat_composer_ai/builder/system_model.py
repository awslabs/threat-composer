"""
Structured system model kept beside the threat model.

Threat Composer stores architecture and dataflow only as markdown plus an
image, which gives a threat analyst nothing to iterate over. This sidecar
holds the elements, trust zones and data flows as data, so that:

- the dataflow markdown and the DFD are rendered from one source, and their
  DF identifiers always agree
- trust boundary crossings are computed, not asserted
- coverage can be checked element by element
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Short identifiers, because threats carry them as tags and tags are capped at
# 30 characters by the Threat Composer schema.
ID_PATTERN = r"^[A-Za-z][A-Za-z0-9_-]{0,29}$"

ElementKind = Literal["human_actor", "external_entity", "process", "data_store"]

# Control-plane calls create or change resources and their policies; data-plane
# calls use them. Control-plane flows are the usual paths to elevation of
# privilege and tampering with configuration.
Plane = Literal["control", "data"]

# STRIDE-per-element: the categories that apply to each element type.
STRIDE_BY_KIND: dict[str, list[str]] = {
    "human_actor": ["S", "R"],
    "external_entity": ["S", "R"],
    "process": ["S", "T", "R", "I", "D", "E"],
    "data_store": ["T", "R", "I", "D"],
    "data_flow": ["T", "I", "D"],
}


class Evidenced(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence: list[str] = Field(
        default_factory=list,
        description="Where this was found, as path:line or path:start-end",
    )


class Zone(Evidenced):
    """A trust zone. Elements in different zones are separated by a boundary.

    A zone can sit inside a parent zone, for example a compute zone inside a
    cloud account. A flow between two zones crosses each boundary on the path
    between them, up to the innermost zone that holds both.
    """

    id: str = Field(..., pattern=ID_PATTERN)
    name: str = Field(..., max_length=100)
    trust_level: str = Field("", max_length=100, description="For example: untrusted")
    parent: str | None = Field(
        None, description="Id of the zone that contains this zone; omit if top level"
    )


class Element(Evidenced):
    id: str = Field(..., pattern=ID_PATTERN)
    kind: ElementKind
    name: str = Field(..., max_length=100)
    zone: str | None = Field(None, description="Zone id; omit if unzoned")
    description: str = Field("", max_length=500)
    high_value: bool = Field(False, description="Data stores holding high-value data")


class Flow(Evidenced):
    id: str = Field(..., pattern=r"^DF[0-9]+$")
    source: str = Field(..., description="Element id")
    target: str = Field(..., description="Element id")
    description: str = Field(..., max_length=200)
    protocol: str = Field("", max_length=50)
    assets: list[str] = Field(default_factory=list)
    plane: Plane | None = Field(
        None,
        description=(
            "control: creates or changes resources, roles or policies. "
            "data: uses resources. Omit if neither applies."
        ),
    )


class FlowInput(BaseModel):
    """A data flow as a caller supplies it; omit id to have the next DFn assigned."""

    model_config = ConfigDict(extra="forbid")

    id: str | None = Field(None, pattern=r"^DF[0-9]+$")
    source: str = Field(..., description="Element id")
    target: str = Field(..., description="Element id")
    description: str = Field(..., max_length=200)
    protocol: str = Field("", max_length=50)
    assets: list[str] = Field(default_factory=list)
    plane: Plane | None = Field(
        None,
        description=(
            "control: creates or changes resources, roles or policies. "
            "data: uses resources. Omit if neither applies."
        ),
    )
    evidence: list[str] = Field(default_factory=list, description="path:line")


class SystemModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zones: list[Zone] = Field(default_factory=list)
    elements: list[Element] = Field(default_factory=list)
    flows: list[Flow] = Field(default_factory=list)

    @field_validator("elements")
    @classmethod
    def _unique_elements(cls, v: list[Element]) -> list[Element]:
        _require_unique([e.id for e in v], "element")
        return v

    @field_validator("zones")
    @classmethod
    def _unique_zones(cls, v: list[Zone]) -> list[Zone]:
        _require_unique([z.id for z in v], "zone")
        return v

    @field_validator("flows")
    @classmethod
    def _unique_flows(cls, v: list[Flow]) -> list[Flow]:
        _require_unique([f.id for f in v], "flow")
        return v

    def problems(self) -> list[str]:
        """Cross-reference errors: unknown zones and flow endpoints."""
        zone_ids = {z.id for z in self.zones}
        element_ids = {e.id for e in self.elements}
        out = [
            f"element {e.id}: unknown zone '{e.zone}'"
            for e in self.elements
            if e.zone and e.zone not in zone_ids
        ]
        parents = {z.id: z.parent for z in self.zones}
        for z in self.zones:
            if z.parent and z.parent not in zone_ids:
                out.append(f"zone {z.id}: unknown parent '{z.parent}'")
            seen, cur = set(), z.id
            while cur in parents and cur not in seen:
                seen.add(cur)
                cur = parents[cur]
            if cur == z.id:
                out.append(f"zone {z.id}: parent chain loops back to itself")
        for f in self.flows:
            for end in ("source", "target"):
                ref = getattr(f, end)
                if ref not in element_ids:
                    out.append(f"flow {f.id}: unknown {end} '{ref}'")
        overlap = element_ids & {f.id for f in self.flows}
        out += [f"id '{i}' is used by both an element and a flow" for i in overlap]
        return out

    def element(self, element_id: str) -> Element | None:
        return next((e for e in self.elements if e.id == element_id), None)

    def zone_name(self, zone_id: str | None) -> str:
        zone = next((z for z in self.zones if z.id == zone_id), None)
        return zone.name if zone else "unzoned"

    def zone_chain(self, zone_id: str | None) -> list[str]:
        """The zone and its ancestors, innermost first. [] for no zone."""
        parents = {z.id: z.parent for z in self.zones}
        chain: list[str] = []
        cur = zone_id
        while cur and cur not in chain:  # problems() reports loops
            chain.append(cur)
            cur = parents.get(cur)
        return chain

    def common_zone(self, flow: Flow) -> str | None:
        """Id of the innermost zone that holds both ends of a flow, or None.

        None for a flow that crosses a boundary means it crosses the outer
        perimeter of the system: no zone contains both ends.
        """
        src, dst = self.element(flow.source), self.element(flow.target)
        if not src or not dst:
            return None
        outer = set(self.zone_chain(dst.zone))
        return next((z for z in self.zone_chain(src.zone) if z in outer), None)

    def boundaries_crossed(self, flow: Flow) -> list[str]:
        """The zones a flow passes through, from the source zone to the target
        zone, or [] if it stays in one zone.

        The path goes up from the source to the innermost zone that holds both
        ends, then down to the target. For sibling zones A and B inside P the
        path is [A, B]; for a flow from A out to an element directly in P it
        is [A, P].
        """
        src, dst = self.element(flow.source), self.element(flow.target)
        if not src or not dst or src.zone == dst.zone:
            return []
        up, down = self.zone_chain(src.zone), self.zone_chain(dst.zone)
        common = self.common_zone(flow)
        if common:
            up = up[: up.index(common)] or [common]
            down = down[: down.index(common)] or [common]
        path = [self.zone_name(z) for z in up] + [
            self.zone_name(z) for z in reversed(down)
        ]
        if not up:
            path.insert(0, self.zone_name(None))
        if not down:
            path.append(self.zone_name(None))
        return path

    def next_flow_id(self) -> str:
        numbers = [int(f.id[2:]) for f in self.flows]
        return f"DF{max(numbers, default=0) + 1}"

    @classmethod
    def build(
        cls,
        zones: list[Zone | dict] | None = None,
        elements: list[Element | dict] | None = None,
        flows: list[FlowInput | dict] | None = None,
    ) -> "SystemModel":
        """Build a model from caller input, assigning DFn ids to flows without one.

        Raises pydantic.ValidationError on bad input. Cross-reference problems
        (unknown zones or flow endpoints) are left for problems() to report.
        """
        model = cls(
            zones=[Zone.model_validate(z) for z in zones or []],
            elements=[Element.model_validate(e) for e in elements or []],
        )
        for raw in flows or []:
            flow = FlowInput.model_validate(raw)
            flow_id = flow.id or model.next_flow_id()
            model.flows.append(Flow(**{**flow.model_dump(), "id": flow_id}))
        return cls.model_validate(model.model_dump())


def _require_unique(ids: list[str], what: str) -> None:
    seen: set[str] = set()
    for i in ids:
        if i in seen:
            raise ValueError(f"duplicate {what} id '{i}'")
        seen.add(i)
