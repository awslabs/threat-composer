"""
Dynamic relative path utilities for reducing token usage in system prompts.

This module provides utilities to automatically convert absolute paths to relative paths
based on the current working directory context, without hardcoded mappings.
"""

import os
from pathlib import Path

from ..config import get_global_config


def make_relative_to_working_dir(absolute_path: str) -> str:
    """
    Convert an absolute path to a relative path from the working directory.

    Args:
        absolute_path: The absolute path to convert

    Returns:
        Relative path string, or original path if conversion fails

    Examples:
        If working_directory is "/Users/user/project":
        >>> make_relative_to_working_dir("/Users/user/project/src/main.py")
        "./src/main.py"

        >>> make_relative_to_working_dir("/Users/user/project/.threat-composer/components/app.json")
        "./.threat-composer/components/app.json"
    """
    config = get_global_config()
    if not config:
        return absolute_path

    try:
        abs_path = Path(absolute_path).resolve()
        working_dir = config.working_directory.resolve()

        # Calculate relative path from working directory
        relative_path = abs_path.relative_to(working_dir)

        # Ensure it starts with "./" for clarity
        return f"./{relative_path}"

    except (ValueError, OSError):
        # If path is not relative to working directory or other error, return original
        return absolute_path


def resolve_relative_path(relative_path: str) -> str:
    """
    Resolve a relative path to an absolute path based on the working directory.

    Args:
        relative_path: The relative path to resolve (e.g., "./components/file.json")

    Returns:
        Absolute path string

    Examples:
        If working_directory is "/Users/user/project":
        >>> resolve_relative_path("./src/main.py")
        "/Users/user/project/src/main.py"

        >>> resolve_relative_path("./.threat-composer/components/app.json")
        "/Users/user/project/.threat-composer/components/app.json"
    """
    config = get_global_config()
    if not config:
        return relative_path

    try:
        # Handle paths that start with "./"
        if relative_path.startswith("./"):
            relative_path = relative_path[2:]

        # Resolve relative to working directory
        absolute_path = (config.working_directory / relative_path).resolve()
        return str(absolute_path)

    except (ValueError, OSError):
        # If resolution fails, return original
        return relative_path


def format_path_for_prompt(path: str, prefer_relative: bool = True) -> str:
    """
    Format a path for use in system prompts, preferring relative paths to reduce tokens.

    Args:
        path: The path to format (can be absolute or relative)
        prefer_relative: Whether to prefer relative paths (default: True)

    Returns:
        Formatted path string optimized for prompts
    """
    if not prefer_relative:
        return path

    # If it's already a relative path starting with "./", keep it
    if path.startswith("./"):
        return path

    # If it's an absolute path, try to make it relative
    if os.path.isabs(path):
        return make_relative_to_working_dir(path)

    # If it's a relative path not starting with "./", add the prefix
    return f"./{path}" if not path.startswith(".") else path


def create_prompt_path_from_config(
    config_attr_path: str,
    config_attr_subdir: str | None = None,
    filename: str | None = None,
) -> str:
    """
    Create a relative path for prompts from config attributes.

    Args:
        config_attr_path: Config attribute for the base path (e.g., "output_directory")
        config_attr_subdir: Optional config attribute for subdirectory (e.g., "components_output_sub_dir")
        filename: Optional filename to append

    Returns:
        Relative path string for use in prompts

    Examples:
        >>> create_prompt_path_from_config("output_directory", "components_output_sub_dir", "app.json")
        "./.threat-composer/components/app.json"
    """
    config = get_global_config()
    if not config:
        return filename or ""

    try:
        # Get the base path from config
        base_path = getattr(config, config_attr_path)

        # Add subdirectory if specified
        if config_attr_subdir:
            subdir = getattr(config, config_attr_subdir)
            base_path = base_path / subdir

        # Add filename if specified
        if filename:
            base_path = base_path / filename

        # Convert to relative path
        return make_relative_to_working_dir(str(base_path))

    except (AttributeError, OSError):
        return filename or ""
