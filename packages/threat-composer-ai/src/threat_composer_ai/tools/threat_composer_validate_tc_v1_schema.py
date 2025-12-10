"""
Strands tool for validating Threat Composer schema compliance using Pydantic models.

This tool validates JSON data against the Threat Composer v1 schema using the
ThreatComposerV1Model Pydantic model, providing clear validation feedback optimized
for AI agent consumption.

This tool is restricted to reading files from the output directory only.

TOKEN OPTIMIZATION: Accepts relative paths (e.g., "./components/file.json") and uses
relative paths in all output messages to reduce token usage.
"""

import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from strands import tool

from ..models import ThreatComposerV1Model
from ..tools.path_validation import (
    create_path_validation_error_message,
    validate_output_directory_path,
)
from ..utils.relative_path_helper import (
    make_relative_to_working_dir,
    resolve_relative_path,
)


@tool(
    name="threat_composer_validate_tc_v1_schema",
    description="Validates a JSON file against the Threat Composer v1 schema using Pydantic models with AI-optimized error reporting",
)
def threat_composer_validate_tc_v1_schema(file_path: str) -> str:
    """
    Validate a JSON file against the Threat Composer v1 schema using Pydantic models.

    This tool reads a JSON file from the specified path and validates it using the
    ThreatComposerV1Model Pydantic model. It provides clear, structured validation
    feedback that is optimized for AI agent consumption with precise error messages
    and actionable information.

    Use this tool when:
    - Validating threat composer files (.tc.json files)
    - Checking imported threat model files for compliance
    - Debugging schema compliance issues
    - Ensuring data quality before processing files
    - Working with Python code that uses the ThreatComposerV1Model

    Args:
        file_path: Path to the JSON file to validate. Can be absolute or relative path.
                  Should point to a file containing threat composer data following the v1 schema format.

    Returns:
        A detailed validation report as a string. If validation passes, returns a success message.
        If validation fails, returns a comprehensive list of all validation errors with:
        - Specific field paths where errors occur
        - Clear descriptions of validation failures
        - Expected types and constraints
        - Current values that caused errors

    Example:
        >>> threat_composer_validate_tc_v1_schema("./my-threat-model.tc.json")
        "✅ Validation successful! The file conforms to the Threat Composer v1 schema."

        >>> threat_composer_validate_tc_v1_schema("./invalid-model.json")
        "❌ Validation failed with 1 error(s):
        1. Field 'schema' - Input should be less than or equal to 1 (current value: 2)"
    """
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

        try:
            with open(file_path_obj, encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            return f"❌ Invalid JSON format in file '{display_path}': {str(e)}"
        except Exception as e:
            return f"❌ Error reading file '{display_path}': {str(e)}"

        # Validate using the Pydantic model
        try:
            ThreatComposerV1Model(**data)
            return "✅ Validation successful! The data conforms to the Threat Composer v1 schema."

        except ValidationError as e:
            # Format Pydantic validation errors for AI consumption
            errors = e.errors()
            error_messages = []

            for i, error in enumerate(errors, 1):
                # Extract error details
                field_path = " -> ".join(str(loc) for loc in error.get("loc", []))
                field_path = field_path if field_path else "root"
                error_msg = error.get("msg", "Validation error")
                input_value = error.get("input", "")

                # Format input value for display (truncate if too long)
                if input_value is not None:
                    input_str = str(input_value)
                    if len(input_str) > 100:
                        input_str = input_str[:97] + "..."
                    value_info = f" (current value: {input_str})"
                else:
                    value_info = ""

                # Create formatted error message
                formatted_error = f"Field '{field_path}' - {error_msg}{value_info}"
                error_messages.append(f"{i}. {formatted_error}")

            result = f"❌ Validation failed with {len(errors)} error(s):\n"
            result += "\n".join(error_messages)

            return result

    except Exception as e:
        return f"❌ Validation error: {str(e)}"


# Additional utility function for programmatic use
def validate_tc_data_pydantic(data: dict[str, Any]) -> tuple[bool, str]:
    """
    Validate threat composer data directly (not from file) using Pydantic.

    This function is useful for validating data that's already loaded in memory,
    such as data received from APIs or generated programmatically.

    Args:
        data: Dictionary containing threat composer data to validate

    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if validation passed, False otherwise
        - error_message: Empty string if valid, error details if invalid

    Example:
        >>> data = {"schema": 1, "applicationInfo": {"name": "Test App"}}
        >>> is_valid, error_msg = validate_tc_data_pydantic(data)
        >>> if is_valid:
        ...     print(f"Valid! App name: {model.applicationInfo.name}")
        ... else:
        ...     print(f"Invalid: {error_msg}")
    """
    try:
        ThreatComposerV1Model(**data)
        return (
            True,
            "",
        )
    except ValidationError as e:
        errors = e.errors()
        error_messages = []

        for i, error in enumerate(errors, 1):
            field_path = " -> ".join(str(loc) for loc in error.get("loc", []))
            field_path = field_path if field_path else "root"
            error_msg = error.get("msg", "Validation error")
            input_value = error.get("input", "")

            if input_value is not None:
                input_str = str(input_value)
                if len(input_str) > 100:
                    input_str = input_str[:97] + "..."
                value_info = f" (current value: {input_str})"
            else:
                value_info = ""

            formatted_error = f"Field '{field_path}' - {error_msg}{value_info}"
            error_messages.append(f"{i}. {formatted_error}")

        error_message = f"Validation failed with {len(errors)} error(s):\n"
        error_message += "\n".join(error_messages)

        return False, error_message
    except Exception as e:
        return False, f"Validation error: {str(e)}"
