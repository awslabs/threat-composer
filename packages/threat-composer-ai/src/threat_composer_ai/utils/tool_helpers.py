"""
Utility functions for working with tools.

This module provides helper functions for tool operations that need to be
shared across multiple modules without creating circular dependencies.
"""


def get_tool_name(tool_func) -> str:
    """
    Safely extract the name from a tool function or FunctionTool object.

    Args:
        tool_func: Either a regular function or a FunctionTool object

    Returns:
        The name of the tool
    """
    # Check if it's a FunctionTool object (has 'name' attribute)
    if hasattr(tool_func, "name"):
        return tool_func.name
    # Otherwise assume it's a regular function with __name__
    elif hasattr(tool_func, "__name__"):
        return tool_func.__name__
    # Fallback to string representation
    else:
        return str(tool_func)
