"""Path formatting utilities for display purposes."""

from pathlib import Path


def format_path_for_display(
    full_path: str, analysis_directory: str, max_length: int = 50
) -> str:
    """
    Format a file path for display with intelligent truncation.

    Handles both relative and absolute paths gracefully.

    Prioritizes showing:
    1. Filename (always shown if possible)
    2. Root directory of relative path
    3. Middle parts truncated with "..." if needed

    Args:
        full_path: The path to format (can be relative or absolute)
        analysis_directory: The base directory being analyzed
        max_length: Maximum character length for the formatted path

    Returns:
        Formatted path string optimized for display

    Examples:
        >>> format_path_for_display(
        ...     "/Users/user/project/src/components/deep/nested/file.tsx",
        ...     "/Users/user/project",
        ...     30
        ... )
        "src/.../file.tsx"

        >>> format_path_for_display(
        ...     "./src/main.rs",
        ...     "/Users/user/project",
        ...     50
        ... )
        "src/main.rs"

        >>> format_path_for_display(
        ...     "/Users/user/project/package.json",
        ...     "/Users/user/project",
        ...     50
        ... )
        "package.json"
    """
    try:
        full_path_obj = Path(full_path)

        # If path is already relative, format it directly without resolution
        if not full_path_obj.is_absolute():
            return _format_relative_path(full_path, max_length)

        # For absolute paths, try to make relative to analysis directory
        analysis_dir_obj = Path(analysis_directory).resolve()
        full_path_obj = full_path_obj.resolve()

        try:
            relative_path = full_path_obj.relative_to(analysis_dir_obj)
            return _format_relative_path(str(relative_path), max_length)
        except ValueError:
            # Path is outside analysis directory
            # Try relative to current working directory
            try:
                cwd = Path.cwd()
                relative_to_cwd = full_path_obj.relative_to(cwd)
                return _format_relative_path(str(relative_to_cwd), max_length)
            except ValueError:
                # Not relative to cwd either, use filename only
                return _truncate_filename(full_path_obj.name, max_length)

    except Exception:
        # Fallback: return just the filename if anything goes wrong
        return Path(full_path).name


def _format_relative_path(relative_path: str, max_length: int) -> str:
    """
    Format a relative path string with intelligent truncation.

    Args:
        relative_path: The relative path string to format
        max_length: Maximum character length for the formatted path

    Returns:
        Formatted path string optimized for display
    """
    # If it fits, return as-is
    if len(relative_path) <= max_length:
        return relative_path

    # Parse into parts
    parts = Path(relative_path).parts
    if not parts:
        return relative_path

    filename = parts[-1]

    # If filename alone is too long, truncate it
    if len(filename) > max_length:
        return _truncate_filename(filename, max_length)

    # If only filename fits
    if len(filename) == max_length:
        return filename

    # Try to include root directory
    if len(parts) == 1:
        return filename

    root_dir = parts[0]
    available_space = max_length - len(filename) - 4  # 4 for ".../"

    if len(root_dir) <= available_space:
        if len(parts) == 2:
            return f"{root_dir}/{filename}"
        else:
            return f"{root_dir}/.../{filename}"
    else:
        truncated_root = _truncate_string(root_dir, available_space)
        if len(parts) == 2:
            return f"{truncated_root}/{filename}"
        else:
            return f"{truncated_root}/.../{filename}"


def _truncate_filename(filename: str, max_length: int) -> str:
    """Truncate a filename intelligently, preserving extension if possible."""
    if len(filename) <= max_length:
        return filename

    # Try to preserve file extension
    if "." in filename:
        name_part, ext_part = filename.rsplit(".", 1)
        ext_with_dot = f".{ext_part}"

        # If extension is reasonable length, preserve it
        if len(ext_with_dot) < max_length // 2:
            available_for_name = max_length - len(ext_with_dot) - 3  # 3 for "..."
            if available_for_name > 0:
                return f"{name_part[:available_for_name]}...{ext_with_dot}"

    # Fallback: simple truncation
    return (
        f"{filename[: max_length - 3]}..." if max_length > 3 else filename[:max_length]
    )


def _truncate_string(text: str, max_length: int) -> str:
    """Truncate a string with ellipsis."""
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 3]}..." if max_length > 3 else text[:max_length]
