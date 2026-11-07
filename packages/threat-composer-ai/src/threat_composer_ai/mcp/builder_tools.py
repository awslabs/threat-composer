"""
MCP tools for building a threat model one item at a time.

Two files per model, both inside the model directory (THREAT_COMPOSER_AI_MODEL_DIR,
default: the server's working directory):

    <name>.tc.json      the Threat Composer v1 document (tm_* tools)
    <name>.system.json  elements, trust zones and data flows (sys_* tools)

Identifiers, numericIds, threat statements and links are produced here, so the
calling agent never writes Threat Composer JSON itself. Every write validates
the whole document first and changes nothing if it would become invalid.
"""

from typing import Annotated, Any, Literal

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from pydantic import Field, ValidationError

from ..builder import model_ops as ops
from ..builder.coverage import coverage_report, link_problems
from ..builder.render import RenderError, dataflow_markdown, render_dfd_svg
from ..builder.system_model import (
    STRIDE_BY_KIND,
    Element,
    Flow,
    FlowInput,
    SystemModel,
    Zone,
)
from ..builder.viewer import render_dfd_html
from ..builder.workspace import Workspace, WorkspaceError
from ..tools.threat_composer_svg_to_data_url import threat_composer_svg_to_data_url

READ_ONLY = {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False}
WRITE = {"readOnlyHint": False, "destructiveHint": False, "openWorldHint": False}
DESTRUCTIVE = {"readOnlyHint": False, "destructiveHint": True, "openWorldHint": False}

ModelPath = Annotated[
    str,
    Field(description="Model file relative to the model directory, e.g. 'app.tc.json'"),
]
Agent = Annotated[
    str | None, Field(description="Your agent name, recorded as custom:agent metadata")
]


def _fail(e: Exception) -> ToolError:
    return ToolError(str(e))


def register_builder_tools(mcp: FastMCP, workspace: Workspace | None = None) -> None:
    ws = workspace or Workspace()

    # -- shared helpers -----------------------------------------------------

    def load_system(model: str) -> SystemModel | None:
        _, system_path, _ = ws.model_paths(model)
        if not system_path.exists():
            return None
        try:
            return SystemModel.model_validate(ws.read_json(system_path))
        except ValidationError as e:
            raise ToolError(f"{ws.display(system_path)} is invalid: {e}") from e

    def known_targets(model: str) -> set[str] | None:
        system = load_system(model)
        if system is None:
            return None
        return {e.id for e in system.elements} | {f.id for f in system.flows}

    def change_model(model: str, change) -> Any:
        """Apply a change to the threat model, validate, then write."""
        tc_path, _, _ = ws.model_paths(model)

        def apply(doc: dict[str, Any]) -> Any:
            result = change(doc)
            errors = ops.validate_document(doc)
            if errors:
                raise ops.BuilderError(
                    "change rejected, document would be invalid: "
                    + "; ".join(errors[:10])
                )
            return result

        try:
            return ws.update_json(tc_path, apply)
        except (WorkspaceError, ops.BuilderError) as e:
            raise _fail(e) from e

    def read_model(model: str) -> dict[str, Any]:
        try:
            tc_path, _, _ = ws.model_paths(model)
            return ws.read_json(tc_path)
        except WorkspaceError as e:
            raise _fail(e) from e

    # -- threat model -------------------------------------------------------

    @mcp.tool(annotations=WRITE)
    def tm_init(
        model: ModelPath,
        name: Annotated[str, Field(max_length=200)],
        description: Annotated[str, Field(description="applicationInfo markdown")] = "",
        overwrite: bool = False,
    ) -> dict[str, Any]:
        """Create an empty Threat Composer model. Fails if it exists unless overwrite."""
        try:
            tc_path, _, _ = ws.model_paths(model)
            with ws.lock(tc_path):
                if tc_path.exists() and not overwrite:
                    raise WorkspaceError(
                        f"{model} exists; pass overwrite=true to replace it"
                    )
                ws.write_json(tc_path, ops.empty_model(name, description))
        except WorkspaceError as e:
            raise _fail(e) from e
        return {"model": ws.display(tc_path), "path": str(tc_path)}

    @mcp.tool(annotations=WRITE)
    def tm_set_section(
        model: ModelPath,
        section: ops.Section,
        description: Annotated[
            str | None, Field(description="Markdown; H3 or lower")
        ] = None,
        name: Annotated[str | None, Field(description="applicationInfo only")] = None,
        image_path: Annotated[
            str | None, Field(description="SVG in the model directory to embed")
        ] = None,
    ) -> dict[str, Any]:
        """Set the description, name or diagram of applicationInfo, architecture or
        dataflow. Prefer sys_render for dataflow."""
        image = None
        if image_path is not None:
            try:
                svg = ws.resolve(image_path).read_text(encoding="utf-8")
            except (WorkspaceError, OSError) as e:
                raise _fail(e) from e
            image = threat_composer_svg_to_data_url(svg)
            if image.startswith("❌"):
                raise ToolError(image)
        change_model(
            model, lambda d: ops.set_section(d, section, description, name, image)
        )
        return {"section": section, "updated": True}

    @mcp.tool(annotations=WRITE)
    def tm_add_threats(
        model: ModelPath, threats: list[ops.ThreatInput], agent: Agent = None
    ) -> dict[str, Any]:
        """Add threats. The statement is composed from the grammar fields. Element ids
        are checked against the system model when one exists. Valid items are added,
        invalid ones returned under 'rejected' by index."""
        known = known_targets(model)
        return change_model(model, lambda d: ops.add_threats(d, threats, known, agent))

    @mcp.tool(annotations=WRITE)
    def tm_add_mitigations(
        model: ModelPath, mitigations: list[ops.MitigationInput], agent: Agent = None
    ) -> dict[str, Any]:
        """Add mitigations and link each to its threats. Set existing=true for controls
        the code already implements."""
        return change_model(model, lambda d: ops.add_mitigations(d, mitigations, agent))

    @mcp.tool(annotations=WRITE)
    def tm_add_assumptions(
        model: ModelPath, assumptions: list[ops.AssumptionInput], agent: Agent = None
    ) -> dict[str, Any]:
        """Add assumptions, optionally linked to threats or mitigations."""
        return change_model(model, lambda d: ops.add_assumptions(d, assumptions, agent))

    @mcp.tool(annotations=WRITE)
    def tm_link(
        model: ModelPath,
        kind: Literal["mitigation", "assumption"],
        from_id: str,
        to_ids: list[str],
        unlink: bool = False,
    ) -> dict[str, Any]:
        """Link a mitigation to threats, or an assumption to threats or mitigations.
        unlink=true removes those links instead."""
        return change_model(model, lambda d: ops.link(d, kind, from_id, to_ids, unlink))

    @mcp.tool(annotations=WRITE)
    def tm_update_threat(
        model: ModelPath, threat_id: str, threat: ops.ThreatInput, agent: Agent = None
    ) -> dict[str, Any]:
        """Replace a threat's content. Its id, numericId and links are kept."""
        known = known_targets(model)
        return change_model(
            model, lambda d: ops.update_threat(d, threat_id, threat, known, agent)
        )

    @mcp.tool(annotations=WRITE)
    def tm_update_mitigation(
        model: ModelPath,
        mitigation_id: str,
        mitigation: ops.MitigationInput,
        agent: Agent = None,
    ) -> dict[str, Any]:
        """Replace a mitigation's content and threat links. Its id is kept."""
        return change_model(
            model, lambda d: ops.update_mitigation(d, mitigation_id, mitigation, agent)
        )

    @mcp.tool(annotations=WRITE)
    def tm_set_status(
        model: ModelPath,
        kind: Literal["threat", "mitigation"],
        ids: list[str],
        status: Annotated[
            str,
            Field(
                description="threat: threatIdentified | threatResolved | "
                "threatResolvedNotUseful. mitigation: mitigationIdentified | "
                "mitigationInProgress | mitigationResolved | "
                "mitigationResolvedWillNotAction"
            ),
        ],
    ) -> dict[str, Any]:
        """Set status on threats or mitigations. Use threatResolvedNotUseful to
        dismiss a threat while keeping a record of it."""
        return change_model(model, lambda d: ops.set_status(d, kind, ids, status))

    @mcp.tool(annotations=WRITE)
    def tm_add_tags(
        model: ModelPath, kind: ops.Kind, ids: list[str], tags: list[str]
    ) -> dict[str, Any]:
        """Add tags to threats, mitigations or assumptions. Changes only tags; the
        content, status, metadata and links stay the same. A tag that the item
        already has is not added again. Tags are 1 to 30 characters. If an id is
        unknown or a tag is invalid, nothing changes."""
        return change_model(model, lambda d: ops.add_tags(d, kind, ids, tags))

    @mcp.tool(annotations=WRITE)
    def tm_remove_tags(
        model: ModelPath, kind: ops.Kind, ids: list[str], tags: list[str]
    ) -> dict[str, Any]:
        """Remove tags from threats, mitigations or assumptions. Changes only tags;
        the content, status, metadata and links stay the same. A tag that the item
        does not have is ignored. If an id is unknown, nothing changes."""
        return change_model(model, lambda d: ops.remove_tags(d, kind, ids, tags))

    @mcp.tool(annotations=DESTRUCTIVE)
    def tm_remove(model: ModelPath, kind: ops.Kind, ids: list[str]) -> dict[str, Any]:
        """Delete threats, mitigations or assumptions and every link to them."""
        return change_model(model, lambda d: ops.remove(d, kind, ids))

    @mcp.tool(annotations=READ_ONLY)
    def tm_get(
        model: ModelPath,
        sections: list[Literal["info", "threats", "mitigations", "assumptions"]]
        | None = None,
        priority: ops.Priority | None = None,
        element: Annotated[
            str | None, Field(description="Only threats on this element or flow id")
        ] = None,
        threat_status: Annotated[
            list[ops.ThreatStatus] | None,
            Field(description="Only threats with one of these statuses"),
        ] = None,
        mitigation_status: Annotated[
            list[ops.MitigationStatus] | None,
            Field(description="Only mitigations with one of these statuses"),
        ] = None,
    ) -> dict[str, Any]:
        """Compact view of the model: ids, statements, priorities, elements and
        links. Omits descriptions and images. Use this instead of reading the file.
        priority, element and threat_status select threats. When you set one of
        them, mitigations shows only the mitigations linked to a selected threat."""
        return ops.summary(
            read_model(model),
            sections,
            priority,
            element,
            known_targets(model),
            threat_status,
            mitigation_status,
        )

    @mcp.tool(annotations=READ_ONLY)
    def tm_validate(model: ModelPath) -> dict[str, Any]:
        """Validate the model against the Threat Composer v1 schema and check links."""
        doc = read_model(model)
        errors = ops.validate_document(doc) + link_problems(doc)
        return {"valid": not errors, "errors": errors}

    @mcp.tool(annotations=READ_ONLY)
    def tm_coverage_report(model: ModelPath) -> dict[str, Any]:
        """Find gaps: elements and flows with no threats, missing STRIDE categories per
        element, boundary-crossing flows with no threats, High/Medium threats with no
        mitigation, unlinked items and dangling links. Run before finishing."""
        return coverage_report(read_model(model), load_system(model))

    # -- system model -------------------------------------------------------

    @mcp.tool(annotations=WRITE)
    def sys_upsert(
        model: ModelPath,
        zones: list[Zone] | None = None,
        elements: list[Element] | None = None,
        flows: list[FlowInput] | None = None,
    ) -> dict[str, Any]:
        """Add or replace (by id) trust zones, elements and data flows in the system
        model. Element kinds: human_actor, external_entity, process, data_store.
        Flows without an id get the next DFn. Reference errors are returned under
        'problems' and do not block the write."""
        try:
            _, system_path, _ = ws.model_paths(model)
        except WorkspaceError as e:
            raise _fail(e) from e

        def apply(data: dict[str, Any]) -> dict[str, Any]:
            system = SystemModel.model_validate(data)
            for attr, items in (("zones", zones), ("elements", elements)):
                current = {x.id: x for x in getattr(system, attr)}
                for item in items or []:
                    current[item.id] = item
                setattr(system, attr, list(current.values()))
            assigned = []
            current_flows = {f.id: f for f in system.flows}
            for item in flows or []:
                flow_id = (
                    item.id
                    or SystemModel(flows=list(current_flows.values())).next_flow_id()
                )
                current_flows[flow_id] = Flow(**{**item.model_dump(), "id": flow_id})
                assigned.append(flow_id)
            system.flows = list(current_flows.values())
            system = SystemModel.model_validate(system.model_dump())
            data.clear()
            data.update(system.model_dump())
            return {
                "zones": len(system.zones),
                "elements": len(system.elements),
                "flows": len(system.flows),
                "flow_ids": assigned,
                "problems": system.problems(),
            }

        try:
            return ws.update_json(
                system_path, apply, default=SystemModel().model_dump()
            )
        except (WorkspaceError, ValidationError) as e:
            raise _fail(e) from e

    @mcp.tool(annotations=DESTRUCTIVE)
    def sys_remove(model: ModelPath, ids: list[str]) -> dict[str, Any]:
        """Remove zones, elements or flows by id. Flows touching a removed element
        are removed too."""
        try:
            _, system_path, _ = ws.model_paths(model)
        except WorkspaceError as e:
            raise _fail(e) from e

        def apply(data: dict[str, Any]) -> dict[str, Any]:
            system = SystemModel.model_validate(data)
            gone = set(ids)
            system.zones = [z for z in system.zones if z.id not in gone]
            system.elements = [e for e in system.elements if e.id not in gone]
            system.flows = [
                f
                for f in system.flows
                if f.id not in gone and f.source not in gone and f.target not in gone
            ]
            data.clear()
            data.update(system.model_dump())
            return {"problems": system.problems()}

        try:
            return ws.update_json(system_path, apply)
        except (WorkspaceError, ValidationError) as e:
            raise _fail(e) from e

    @mcp.tool(annotations=READ_ONLY)
    def sys_get(model: ModelPath) -> dict[str, Any]:
        """The system model, with each flow's computed boundary crossing."""
        system = load_system(model)
        if system is None:
            raise ToolError(f"no system model yet for {model}; add one with sys_upsert")
        data = system.model_dump()
        for flow, raw in zip(system.flows, data["flows"], strict=True):
            raw["boundaries_crossed"] = system.boundaries_crossed(flow)
        data["problems"] = system.problems()
        data["stride_by_kind"] = STRIDE_BY_KIND
        return data

    @mcp.tool(annotations=WRITE)
    def sys_render(
        model: ModelPath,
        diagram: Annotated[bool, Field(description="Also render the DFD")] = True,
        view: Annotated[
            Literal["full", "boundary"],
            Field(
                description=(
                    "full: draw all elements and flows. boundary: draw only "
                    "the flows that cross a trust boundary, and the elements "
                    "at their ends. Use boundary for large systems."
                )
            ),
        ] = "full",
    ) -> dict[str, Any]:
        """Write the dataflow section of the threat model from the system model, and
        render the DFD (needs Graphviz) into <name>.dfd.svg and dataflow.image.
        The dataflow table always lists all flows, for each view. Also write an
        interactive DFD viewer to <name>.dfd.html for large systems."""
        system = load_system(model)
        if system is None:
            raise ToolError(f"no system model yet for {model}; add one with sys_upsert")
        problems = system.problems()
        if problems:
            raise ToolError("fix the system model first: " + "; ".join(problems))

        result: dict[str, Any] = {"markdown": True, "diagram": None, "viewer": None}
        image = None
        if diagram:
            tc_path, _, dfd_path = ws.model_paths(model)
            info = (read_model(model).get("applicationInfo") or {}).get("name")
            # The viewer needs no Graphviz, so write it even if the SVG fails.
            viewer_path = dfd_path.with_suffix(".html")
            ws.write_text(
                viewer_path,
                render_dfd_html(system, title=info or "Data Flow Diagram"),
            )
            result["viewer"] = ws.display(viewer_path)
            try:
                svg = render_dfd_svg(
                    system,
                    title=info or "Data Flow Diagram",
                    boundary_only=view == "boundary",
                )
                ws.write_text(dfd_path, svg)
                image = threat_composer_svg_to_data_url(svg)
                result["diagram"] = ws.display(dfd_path)
            except RenderError as e:
                result["diagram_error"] = str(e)

        markdown = dataflow_markdown(system)
        change_model(
            model, lambda d: ops.set_section(d, "dataflow", markdown, None, image)
        )
        return result
