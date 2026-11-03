"""
Strands tool for recording the dataflow analysis as structured data.

The dataflow agent passes trust zones, elements, flows and assumptions. From
that one input the tool writes:

- dataflowSystem.json        the structured system model
- dataflowDescription.tc.json  the dataflow markdown and assumptions, as before
- dataflowDiagram.svg        the DFD, drawn from the same data

The markdown table and the diagram are rendered from the same model, so their
DF identifiers always agree, and the same input always gives the same diagram.
"""

import json

from pydantic import ValidationError
from strands import tool

from ..builder import model_ops as ops
from ..builder.render import RenderError, dataflow_markdown, render_dfd_svg
from ..builder.system_model import Element, FlowInput, SystemModel, Zone
from ..config import get_global_config
from .threat_composer_dia_common import write_hash_file

AGENT_NAME = "dataflow"


def _errors(e: ValidationError) -> str:
    return "; ".join(
        f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in e.errors()
    )


@tool(
    name="threat_composer_write_dataflow",
    description=(
        "Record the dataflow analysis. Writes the dataflow description, its "
        "assumptions and the data flow diagram from one structured input. Element "
        "kinds: human_actor, external_entity, process, data_store. Flows without an "
        "id are numbered DF1, DF2, ... in order. Fails without writing anything if "
        "a flow or element refers to an unknown id."
    ),
)
def threat_composer_write_dataflow(
    zones: list[Zone],
    elements: list[Element],
    flows: list[FlowInput],
    assumptions: list[ops.AssumptionInput] | None = None,
) -> str:
    """Write the dataflow description, system model and DFD.

    Args:
        zones: Trust zones. Elements in different zones are separated by a trust
            boundary. Give each a short id (Z1, Z2) and a trust level.
        elements: Human actors, external entities, processes and data stores, each
            with a short id (U1, E1, P1, DS1), a kind, a name, and its zone id.
            Set high_value on data stores holding sensitive data. Add evidence as
            path:line where the code shows the element.
        flows: Data flows between element ids, with a short description, the
            assets carried and evidence as path:line.
        assumptions: Assumptions made during the analysis.
    """
    config = get_global_config()
    if not config:
        raise ValueError("Global configuration is not initialized")

    try:
        system = SystemModel.build(zones, elements, flows)
        assumption_inputs = [
            ops.AssumptionInput.model_validate(a) for a in assumptions or []
        ]
    except ValidationError as e:
        raise ValueError(f"Invalid input, nothing written: {_errors(e)}") from e

    problems = system.problems()
    if problems:
        raise ValueError(
            "Fix these references, nothing written: " + "; ".join(problems)
        )

    component = {
        "schema": 1,
        "dataflow": {"description": dataflow_markdown(system)},
        "assumptions": [],
    }
    added = ops.add_assumptions(component, assumption_inputs, agent=AGENT_NAME)
    if added["rejected"]:
        raise ValueError(
            f"Invalid assumptions, nothing written: {json.dumps(added['rejected'])}"
        )
    schema_errors = ops.validate_document(component)
    if schema_errors:
        raise ValueError("Output would be invalid: " + "; ".join(schema_errors[:10]))

    # Render before writing anything, so a failed render leaves no partial output
    try:
        svg = render_dfd_svg(system, title="Data Flow Diagram")
    except RenderError as e:
        raise ValueError(f"Diagram rendering failed, nothing written: {e}") from e

    components = config.output_directory / config.components_output_sub_dir
    components.mkdir(parents=True, exist_ok=True)
    outputs = {
        config.dataflow_system_filename: json.dumps(system.model_dump(), indent=2),
        config.dataflow_description_filename: json.dumps(component, indent=2),
        config.dataflow_diagram_filename: svg,
    }
    for filename, content in outputs.items():
        path = components / filename
        path.write_text(content + ("" if content.endswith("\n") else "\n"), "utf-8")
        write_hash_file(path)

    crossing = sum(1 for f in system.flows if system.boundaries_crossed(f))
    return (
        f"Wrote {len(system.zones)} zones, {len(system.elements)} elements, "
        f"{len(system.flows)} flows ({crossing} crossing a trust boundary) and "
        f"{len(component['assumptions'])} assumptions, with the data flow diagram."
    )
