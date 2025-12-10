"""
Strands tool for recursively listing files with gitignore and custom exclusion filtering.

This tool provides a list of relative file paths to recursive files in a directory,
but excludes results that match any pattern found in any .gitignore file found
and also excludes a hardcoded set of glob patterns for common build/cache directories.

TOKEN OPTIMIZATION: Returns relative paths (e.g., "./src/main.py") instead of absolute
paths to significantly reduce token usage in tool outputs.
"""

import os
from pathlib import Path

import pathspec
from strands import tool

from ..config import (
    get_global_output_directory,
    get_global_working_directory,
    validate_path_security,
)


def find_gitignore_files(directory: Path) -> list[Path]:
    """Find all .gitignore files in the directory tree."""
    gitignore_files = []
    try:
        for root, _dirs, files in os.walk(directory, followlinks=False):
            if ".gitignore" in files:
                gitignore_files.append(Path(root) / ".gitignore")
    except (OSError, PermissionError):
        # Skip directories we can't access
        pass
    return gitignore_files


def load_gitignore_patterns(
    gitignore_files: list[Path], base_directory: Path
) -> pathspec.PathSpec:
    """Load and combine all gitignore patterns into a single PathSpec."""
    all_patterns = []

    for gitignore_file in gitignore_files:
        try:
            with open(gitignore_file, encoding="utf-8", errors="ignore") as f:
                patterns = f.read().splitlines()
                # Filter out empty lines and comments
                patterns = [
                    p.strip()
                    for p in patterns
                    if p.strip() and not p.strip().startswith("#")
                ]

                # Adjust patterns relative to the gitignore file location
                gitignore_dir = gitignore_file.parent
                if gitignore_dir != base_directory:
                    # Make patterns relative to base directory
                    relative_dir = gitignore_dir.relative_to(base_directory)
                    adjusted_patterns = []
                    for pattern in patterns:
                        if pattern.startswith("!"):
                            # Negation pattern
                            adjusted_patterns.append(f"!{relative_dir}/{pattern[1:]}")
                        else:
                            adjusted_patterns.append(f"{relative_dir}/{pattern}")
                    all_patterns.extend(adjusted_patterns)
                else:
                    all_patterns.extend(patterns)

        except (OSError, PermissionError, UnicodeDecodeError, ValueError):
            # Skip files we can't read or process
            continue

    # Create PathSpec from all patterns
    return pathspec.PathSpec.from_lines("gitwildmatch", all_patterns)


def get_hardcoded_exclusions(working_directory: Path) -> pathspec.PathSpec:
    """Get hardcoded exclusion patterns including dynamic output directory exclusions."""
    hardcoded_patterns = [
        # Always exclude .git directory
        ".git",
        ".git/**",
        # Exclude common build directories
        "**/cdk.out",
        "**/cdk.out/**",
    ]

    # Add dynamic output directory exclusions from global config
    output_directory_path = get_global_output_directory()
    if output_directory_path:
        try:
            output_directory = Path(output_directory_path).resolve()

            # Try to get relative path from working directory
            try:
                relative_output_path = output_directory.relative_to(working_directory)
                relative_output_str = str(relative_output_path).replace("\\", "/")

                # Extract the base output directory (without session subdirectory)
                # The output directory structure is: .threat-composer/YYYYMMDD-HHMM
                # We want to exclude the entire .threat-composer directory
                path_parts = Path(relative_output_str).parts
                if len(path_parts) >= 1:
                    base_output_dir = path_parts[0]  # e.g., ".threat-composer"

                    # Add exclusion patterns for the base output directory
                    # This excludes the entire output directory tree
                    # Note: patterns match against paths without the leading "./"
                    hardcoded_patterns.extend(
                        [
                            base_output_dir,
                            f"{base_output_dir}/**",
                        ]
                    )
                else:
                    # Fallback: use the full path if we can't extract base directory
                    hardcoded_patterns.extend(
                        [
                            relative_output_str,
                            f"{relative_output_str}/**",
                        ]
                    )
            except ValueError:
                # Output directory is outside working directory
                # This is expected behavior - output directory can be configured outside working dir
                pass
        except Exception:
            # If there's any error processing the output directory, continue without it
            # This ensures the tool remains functional even if output directory config is invalid
            pass

    return pathspec.PathSpec.from_lines("gitwildmatch", hardcoded_patterns)


def collect_files(
    directory: Path, include_hidden: bool, follow_symlinks: bool
) -> list[Path]:
    """Collect all files in the directory tree."""
    files = []

    try:
        for root, dirs, filenames in os.walk(directory, followlinks=follow_symlinks):
            root_path = Path(root)

            # Filter directories if not including hidden
            # This modifies dirs in-place to prevent os.walk from descending into hidden directories
            if not include_hidden:
                # Remove any directory that starts with a dot
                dirs[:] = [d for d in dirs if not d.startswith(".")]

            # Add files
            for filename in filenames:
                # Skip hidden files if not including them
                if not include_hidden and filename.startswith("."):
                    continue

                file_path = root_path / filename

                # Skip symlinks if not following them
                if not follow_symlinks and file_path.is_symlink():
                    continue

                files.append(file_path)

    except (OSError, PermissionError):
        # Skip directories we can't access
        pass

    return files


@tool(
    name="threat_composer_list_workdir_files_gitignore_filtered",
    description="Recursively lists all files in the working directory only, excluding files matching .gitignore patterns and hardcoded exclusion patterns",
)
def threat_composer_list_workdir_files_gitignore_filtered(
    include_hidden: bool = False, follow_symlinks: bool = False
) -> list[str]:
    """
    Recursively list all files in a static working directory with intelligent filtering.

    This tool scans a directory recursively and returns relative file paths,
    but excludes files that match:
    1. Any .gitignore patterns found in the directory tree
    2. Hardcoded exclusion patterns for common build/cache directories:
       - **/cdk.out and **/cdk.out/**
    3. Dynamic exclusion of the threat-composer-ai output directory (from global config)

    The tool respects gitignore files at any level in the directory tree,
    combining all patterns to create comprehensive exclusion rules.

    TOKEN OPTIMIZATION: Returns relative paths (e.g., "./src/main.py") instead of
    absolute paths to significantly reduce token usage in tool outputs.

    Use this tool when you need:
    - A clean list of source files without build artifacts
    - File discovery that respects project ignore patterns
    - Recursive file listing for code analysis or processing
    - Directory scanning that excludes temporary/generated files

    Args:
        include_hidden (bool, optional): Whether to include hidden files and directories
                                       (those starting with '.'). Defaults to False.
        follow_symlinks (bool, optional): Whether to follow symbolic links during traversal.
                                        Defaults to False for security and to avoid loops.

    Returns:
        List[str]: A list of relative file paths that don't match any exclusion patterns.
                  Paths are returned as strings starting with "./" for easy consumption by other tools.
                  Empty list if directory doesn't exist or no files match criteria.

    Example:
        >>> threat_composer_list_workdir_files_gitignore_filtered()
        ["./src/main.py", "./README.md", "./LICENSE", ...]

        >>> threat_composer_list_workdir_files_gitignore_filtered(include_hidden=True, follow_symlinks=True)
        ["./.env", "./src/app.py", "./.gitignore", ...]

    Note:
        - The tool automatically excludes common build directories like cdk.out
        - All .gitignore files in the directory tree are processed
        - Inaccessible files/directories are silently skipped
        - Malformed gitignore files are ignored gracefully
    """
    try:
        # Get the working directory from global config
        directory_path = get_global_working_directory()

        if not directory_path:
            return [
                "❌ No working directory configured. Global config not initialized."
            ]

        # Validate and resolve directory path
        directory = Path(directory_path).resolve()

        # Additional security validation to ensure we stay within working directory
        if not validate_path_security(str(directory)):
            return [
                f"❌ Security violation: Directory access outside working directory denied: {directory_path}"
            ]

        if not directory.exists():
            return [f"❌ Directory not found: {directory_path}"]

        if not directory.is_dir():
            return [f"❌ Path is not a directory: {directory_path}"]

        # Find all gitignore files
        gitignore_files = find_gitignore_files(directory)

        # Load gitignore patterns
        gitignore_spec = load_gitignore_patterns(gitignore_files, directory)

        # Get hardcoded exclusions
        hardcoded_spec = get_hardcoded_exclusions(directory)

        # Collect all files
        all_files = collect_files(directory, include_hidden, follow_symlinks)

        # Filter files against patterns
        filtered_files = []

        for file_path in all_files:
            try:
                # Get relative path from the base directory for pattern matching
                relative_path = file_path.relative_to(directory)
                relative_path_str = str(relative_path).replace(
                    "\\", "/"
                )  # Normalize path separators

                # Check against gitignore patterns
                if gitignore_spec.match_file(relative_path_str):
                    continue

                # Check against hardcoded exclusions
                if hardcoded_spec.match_file(relative_path_str):
                    continue

                # File passed all filters - use relative path to reduce token usage
                filtered_files.append(f"./{relative_path_str}")

            except (ValueError, OSError):
                # Skip files we can't process
                continue

        # Sort for consistent output
        filtered_files.sort()

        return filtered_files

    except Exception as e:
        return [f"❌ Error scanning directory: {str(e)}"]
