"""
Strands tool for assembling complete threat model files from component segments.

This tool takes individual threat model component files (applicationInfo, architecture,
dataflow, threats, mitigations) and assembles them into a complete threat model following
the Threat Composer v1 schema with specific construction rules.

This tool is restricted to reading and writing files from the output directory only.
"""

import json
from pathlib import Path
from typing import Any

from strands import tool

from ..tools.path_validation import (
    create_path_validation_error_message,
    validate_output_directory_path,
)
from ..utils.relative_path_helper import (
    make_relative_to_working_dir,
    resolve_relative_path,
)
from .threat_composer_svg_to_data_url import threat_composer_svg_to_data_url
from .threat_composer_validate_tc_v1_schema import validate_tc_data_pydantic


@tool(
    name="threat_composer_assemble_tc_v1_model",
    description="Assembles a complete threat model from individual component files following Threat Composer v1 schema rules",
)
def threat_composer_assemble_tc_v1_model(
    application_info_path: str,
    architecture_description_path: str,
    architecture_diagram_path: str,
    dataflow_description_path: str,
    dataflow_diagram_path: str,
    threats_path: str,
    mitigations_path: str,
    output_path: str,
) -> str:
    """
    Assemble a complete threat model from individual component files.

    This tool takes paths to individual threat model component files and assembles them
    into a complete threat model following specific construction rules:

    - Schema: Always set to 1
    - applicationInfo: name and description from applicationInfo.tc.json
    - architecture: description from architectureDescription.tc.json, image from architectureDiagram.svg
    - dataflow: description from dataflowDescription.tc.json, image from architectureDiagram.svg
    - assumptions: Collected from all files in order, with sequential numericId assignment
    - threats: Directly from threatsPerElement.tc.json
    - mitigations: Directly from mitigations.tc.json
    - assumptionLinks: From threatsPerElement.tc.json
    - mitigationLinks: From mitigations.tc.json

    Use this tool when:
    - Assembling final threat models from AI-generated components
    - Combining threat model segments from different analysis phases
    - Creating complete threat models for validation or export
    - Integrating outputs from multiple threat modeling agents

    Args:
        application_info_path: Path to applicationInfo.tc.json file
        architecture_description_path: Path to architectureDescription.tc.json file
        architecture_diagram_path: Path to architectureDiagram.svg file
        dataflow_description_path: Path to dataflowDescription.tc.json file
        dataflow_diagram_path: Path to dataflowDiagram.svg file
        threats_path: Path to threats.tc.json file
        mitigations_path: Path to mitigations.tc.json file
        output_path: Path where the assembled threat model will be saved

    Returns:
        Success message with validation results, or detailed error information if assembly fails.

    Example:
        >>> threat_composer_assemble_tc_v1_model(
        ...     "./applicationInfo.tc.json",
        ...     "./architectureDescription.tc.json",
        ...     "./architectureDiagram.svg",
        ...     "./dataflowDescription.tc.json",
        ...     "./datflowDiagram.svg",
        ...     "./threats.tc.json",
        ...     "./mitigations.tc.json",
        ...     "./final.tc.json"
        ... )
        "✅ Successfully assembled threat model with 15 threats, 22 mitigations, and 13 assumptions. Validation passed."
    """
    try:
        # Load and validate all input files
        components = {}
        file_paths = {
            "application_info": application_info_path,
            "architecture_description": architecture_description_path,
            "dataflow_description": dataflow_description_path,
            "threats": threats_path,
            "mitigations": mitigations_path,
        }

        # Load each component file
        for component_name, file_path in file_paths.items():
            try:
                # Resolve relative path to absolute path for file operations
                resolved_file_path = resolve_relative_path(file_path)

                # Validate that the path is within the output directory
                try:
                    validate_output_directory_path(resolved_file_path, operation="read")
                except ValueError as e:
                    error_msg = create_path_validation_error_message(str(e))
                    return f"❌ {error_msg}"

                file_path_obj = Path(resolved_file_path)

                # Convert path back to relative for user-friendly messages
                display_path = make_relative_to_working_dir(resolved_file_path)

                if not file_path_obj.exists():
                    return f"❌ File not found: {display_path}"

                with open(file_path_obj, encoding="utf-8") as f:
                    data = json.load(f)
                    components[component_name] = data

            except json.JSONDecodeError as e:
                return f"❌ Invalid JSON format in file '{display_path}': {str(e)}"
            except Exception as e:
                return f"❌ Error reading file '{display_path}': {str(e)}"

        # Assemble the complete threat model
        assembled_model = _assemble_components(
            components, architecture_diagram_path, dataflow_diagram_path
        )

        # Validate the assembled model
        is_valid, error_message = validate_tc_data_pydantic(assembled_model)
        if not is_valid:
            return f"❌ Assembled model failed validation:\n{error_message}"

        # Write the assembled model to output file
        try:
            # Resolve relative output path to absolute path for file operations
            resolved_output_path = resolve_relative_path(output_path)

            # Validate that the output path is within the output directory
            try:
                validate_output_directory_path(resolved_output_path, operation="write")
            except ValueError as e:
                error_msg = create_path_validation_error_message(str(e))
                return f"❌ {error_msg}"

            output_path_obj = Path(resolved_output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path_obj, "w", encoding="utf-8") as f:
                json.dump(assembled_model, f, indent=2, ensure_ascii=False)

        except Exception as e:
            # Convert path back to relative for user-friendly messages
            display_output_path = make_relative_to_working_dir(
                resolve_relative_path(output_path)
            )
            return f"❌ Error writing output file '{display_output_path}': {str(e)}"

        # Generate success summary with relative path
        threat_count = len(assembled_model.get("threats", []))
        mitigation_count = len(assembled_model.get("mitigations", []))
        assumption_count = len(assembled_model.get("assumptions", []))

        display_output_path = make_relative_to_working_dir(
            resolve_relative_path(output_path)
        )
        return f"✅ Successfully assembled threat model with {threat_count} threats, {mitigation_count} mitigations, and {assumption_count} assumptions. Validation passed. Output saved to: {display_output_path}"

    except Exception as e:
        return f"❌ Assembly error: {str(e)}"


def _assemble_components(
    components: dict[str, dict[str, Any]],
    architecture_diagram_path: str,
    dataflow_diagram_path: str,
) -> dict[str, Any]:
    """
    Assemble the threat model components according to the construction rules.

    Args:
        components: Dictionary containing loaded component data
        architecture_diagram_path: Path to architecture diagram SVG file
        dataflow_diagram_path: Path to dataflow diagram SVG file

    Returns:
        Complete assembled threat model dictionary
    """
    assembled = {"schema": 1}

    # Extract applicationInfo (name and description only)
    app_info = components["application_info"].get("applicationInfo", {})
    assembled["applicationInfo"] = {
        "name": app_info.get("name", ""),
        "description": app_info.get("description", ""),
    }

    # Extract architecture description and load diagram image
    arch_info = components["architecture_description"].get("architecture", {})
    arch_image = _load_diagram_image(architecture_diagram_path)
    assembled["architecture"] = {
        "description": arch_info.get("description", ""),
        "image": arch_image,
    }

    # Extract dataflow description and load diagram image
    dataflow_info = components["dataflow_description"].get("dataflow", {})
    dataflow_image = _load_diagram_image(dataflow_diagram_path)
    assembled["dataflow"] = {
        "description": dataflow_info.get("description", ""),
        "image": dataflow_image,
    }

    # Collect assumptions from all files in specified order and reassign numericId
    all_assumptions = []
    assumption_sources = [
        "application_info",
        "architecture_description",
        "dataflow_description",
        "mitigations",
        "threats",
    ]

    for source in assumption_sources:
        assumptions = components[source].get("assumptions", [])
        all_assumptions.extend(assumptions)

    # Reassign sequential numericId values
    for i, assumption in enumerate(all_assumptions, 1):
        assumption["numericId"] = i

    assembled["assumptions"] = all_assumptions

    # Extract mitigations directly
    assembled["mitigations"] = components["mitigations"].get("mitigations", [])

    # Extract assumptionLinks from threats file
    assembled["assumptionLinks"] = components["threats"].get("assumptionLinks", [])

    # Extract mitigationLinks from mitigations file
    assembled["mitigationLinks"] = components["mitigations"].get("mitigationLinks", [])

    # Extract threats directly
    assembled["threats"] = components["threats"].get("threats", [])

    return assembled


def _load_diagram_image(diagram_path: str) -> str:
    """
    Load an SVG diagram file and convert it to a data URL.

    Args:
        diagram_path: Path to the SVG diagram file (can be relative or absolute)

    Returns:
        Data URL string for the SVG image, or empty string if loading fails
    """
    from threat_composer_ai.logging import log_debug, log_warning

    try:
        # Resolve relative path to absolute path for file operations
        resolved_diagram_path = resolve_relative_path(diagram_path)
        log_debug(f"Loading diagram from: {resolved_diagram_path}")

        # Validate that the path is within the output directory
        try:
            validate_output_directory_path(resolved_diagram_path, operation="read")
        except ValueError as e:
            log_warning(f"Diagram path validation failed: {e}")
            return ""

        diagram_path_obj = Path(resolved_diagram_path)

        if not diagram_path_obj.exists():
            log_warning(f"Diagram file not found: {resolved_diagram_path}")
            return ""

        # Read the SVG file content
        with open(diagram_path_obj, encoding="utf-8") as f:
            svg_content = f.read().strip()

        # Validate that we have content
        if not svg_content:
            log_warning(f"Diagram file is empty: {resolved_diagram_path}")
            return ""

        log_debug(f"SVG content length: {len(svg_content)} chars")

        # Convert SVG to data URL using the utility function
        data_url = threat_composer_svg_to_data_url(svg_content)

        # Check if the conversion was successful (utility returns error messages starting with ❌)
        if data_url.startswith("❌"):
            log_warning(f"SVG to data URL conversion failed: {data_url}")
            return ""

        log_debug(f"Successfully converted diagram to data URL ({len(data_url)} chars)")
        return data_url

    except Exception as e:
        log_warning(f"Error loading diagram '{diagram_path}': {e}")
        return ""
