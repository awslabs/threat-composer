"""
Shared path validation utilities for working directory restricted tools.

This module provides common path validation functionality to ensure that
file operations are restricted to the configured working directory or output
directory, preventing path traversal attacks and unauthorized file access.
"""

import os

from threat_composer_ai.config import (
    get_global_config,
    validate_path_in_output_directory,
    validate_path_security,
)


def validate_single_path(path: str, operation: str = "access") -> str:
    """
    Validate that a single file path is within the working directory.

    Args:
        path: The file path to validate
        operation: Description of the operation (for error messages)

    Returns:
        The original path if valid

    Raises:
        ValueError: If path is outside working directory or config not available
    """
    config = get_global_config()
    if not config:
        raise ValueError(
            "Global configuration not available. Cannot validate file access. "
            "This tool requires the working directory to be configured."
        )

    # Expand the path to handle ~ and relative paths
    expanded_path = os.path.expanduser(path)

    if not validate_path_security(expanded_path):
        raise ValueError(
            f"Access denied: Path '{path}' resolves to '{expanded_path}' "
            f"which is outside the allowed working directory '{config.working_directory}'. "
            f"This tool can only {operation} files within the working directory to prevent "
            f"unauthorized file access."
        )

    return path


def validate_multiple_paths(paths: list[str], operation: str = "access") -> list[str]:
    """
    Validate that all paths in a list are within the working directory.

    Args:
        paths: List of file paths to validate
        operation: Description of the operation (for error messages)

    Returns:
        The original list if all paths are valid

    Raises:
        ValueError: If any path is outside working directory or config not available
    """
    config = get_global_config()
    if not config:
        raise ValueError(
            "Global configuration not available. Cannot validate file access. "
            "This tool requires the working directory to be configured."
        )

    invalid_paths = []
    for path in paths:
        if not validate_path_security(path):
            invalid_paths.append(path)

    if invalid_paths:
        raise ValueError(
            f"Access denied: The following paths are outside the allowed working directory "
            f"'{config.working_directory}': {', '.join(invalid_paths)}. "
            f"This tool can only {operation} files within the working directory to prevent "
            f"unauthorized file access."
        )

    return paths


def validate_expanded_paths(path_input: str, operation: str = "access") -> str:
    """
    Validate paths after expansion (wildcards, comma-separated, etc.).

    This function simulates the path expansion that file tools do internally
    to validate all potential file paths before they're accessed.

    Args:
        path_input: The original path input (may contain wildcards, comma-separated paths)
        operation: Description of the operation (for error messages)

    Returns:
        The original path_input if all expanded paths are valid

    Raises:
        ValueError: If any expanded path is outside working directory
    """
    # Split comma-separated paths like the original tools do
    paths = [p.strip() for p in path_input.split(",") if p.strip()]
    expanded_paths = [os.path.expanduser(p) for p in paths]

    # For each path, find all files it would match (similar to find_files logic)
    all_potential_files = []

    for pattern in expanded_paths:
        # Direct file/directory check
        if os.path.exists(pattern):
            if os.path.isfile(pattern):
                all_potential_files.append(pattern)
            elif os.path.isdir(pattern):
                # Add directory itself and potential files within
                all_potential_files.append(pattern)
                # Note: We don't recursively expand here as that would be expensive
                # The original tool will do the expansion, and we'll catch any violations
                # when it tries to access files outside the working directory
        else:
            # For glob patterns, we'll validate the pattern itself
            # The actual expansion will be validated when the original tool runs
            all_potential_files.append(pattern)

    # Validate all potential paths
    validate_multiple_paths(all_potential_files, operation)

    return path_input


def validate_output_directory_path(path: str, operation: str = "access") -> str:
    """
    Validate that a single file path is within the output directory.

    Args:
        path: The file path to validate
        operation: Description of the operation (for error messages)

    Returns:
        The original path if valid

    Raises:
        ValueError: If path is outside output directory or config not available
    """
    config = get_global_config()
    if not config:
        raise ValueError(
            "Global configuration not available. Cannot validate file access. "
            "This tool requires the output directory to be configured."
        )

    # Expand the path to handle ~ and relative paths
    expanded_path = os.path.expanduser(path)

    if not validate_path_in_output_directory(expanded_path):
        raise ValueError(
            f"Access denied: Path '{path}' resolves to '{expanded_path}' "
            f"which is outside the allowed output directory '{config.output_directory}'. "
            f"This tool can only {operation} files within the output directory to prevent "
            f"unauthorized file access."
        )

    return path


def validate_working_or_output_directory_path(
    path: str, operation: str = "access"
) -> str:
    """
    Validate that a single file path is within either the working directory OR output directory.

    Args:
        path: The file path to validate
        operation: Description of the operation (for error messages)

    Returns:
        The original path if valid

    Raises:
        ValueError: If path is outside both directories or config not available
    """
    config = get_global_config()
    if not config:
        raise ValueError(
            "Global configuration not available. Cannot validate file access. "
            "This tool requires the working and output directories to be configured."
        )

    # Expand the path to handle ~ and relative paths
    expanded_path = os.path.expanduser(path)

    # Check if path is in either working directory OR output directory
    in_working_dir = validate_path_security(expanded_path)
    in_output_dir = validate_path_in_output_directory(expanded_path)

    if not (in_working_dir or in_output_dir):
        raise ValueError(
            f"Access denied: Path '{path}' resolves to '{expanded_path}' "
            f"which is outside both the allowed working directory '{config.working_directory}' "
            f"and output directory '{config.output_directory}'. "
            f"This tool can only {operation} files within these directories to prevent "
            f"unauthorized file access."
        )

    return path


def create_path_validation_error_message(error: ValueError) -> str:
    """
    Create a user-friendly error message for path validation failures.

    Args:
        error: The ValueError raised by path validation

    Returns:
        Formatted error message string
    """
    return str(error)
