"""FastMCP server implementation for threat-composer-ai."""

import logging
import os
import sys

from fastmcp import FastMCP

from ..logging.rich_logger import console
from .builder_tools import register_builder_tools
from .tools import register_tools

TOOLS_ENV_VAR = "THREAT_COMPOSER_AI_MCP_TOOLS"


def create_mcp_server() -> FastMCP:
    """
    Create and configure the FastMCP server for threat-composer-ai.

    Returns:
        Configured FastMCP server instance with registered tools.
    """
    # Create FastMCP server instance
    mcp = FastMCP("threat-composer-ai")

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Over stdio, stdout carries the MCP protocol. Workflow runs call
    # setup_rich_logging(), which logs through this shared console, so send
    # its output to stderr in the MCP server.
    console.file = sys.stderr

    # Register all tools
    # "builder" exposes only the tm_* and sys_* tools, for an agent that builds
    # the model itself and should not see the tools that start the Bedrock
    # workflow. "all" (the default) exposes everything.
    tool_set = os.environ.get(TOOLS_ENV_VAR, "all").strip().lower()
    if tool_set not in ("all", "builder"):
        raise ValueError(
            f"{TOOLS_ENV_VAR} must be 'all' or 'builder', not '{tool_set}'"
        )
    if tool_set == "all":
        register_tools(mcp)
    register_builder_tools(mcp)

    return mcp


def run_server() -> None:
    """Run the MCP server."""
    mcp = create_mcp_server()
    mcp.run()


def main() -> None:
    """
    Main entry point for the threat-composer-ai MCP server.

    This function starts the FastMCP server with threat composer schema validation
    and workflow management tools. The server provides tools for:

    1. threat_modeling_start_workflow - Start or re-run threat modeling workflows
    2. threat_modeling_get_workflow_logs - Get logs of running/completed workflows
    3. threat_modeling_list_workflow_sessions - List available workflow sessions
    4. threat_modeling_validate_tc_schema - Validates JSON data against the Threat Composer v1 schema
    5. threat_modeling_get_tc_schema - Returns the Threat Composer v1 schema JSON content
    6. tm_* and sys_* - build a threat model one item at a time (see builder_tools)

    Usage:
        threat-composer-ai-mcp

    The server will start and listen for MCP client connections using FastMCP defaults.
    """
    # stdout carries the MCP protocol on the stdio transport, so anything
    # human-readable goes to stderr. Printing to stdout corrupts the stream.
    try:
        print("Starting threat-composer-ai MCP server...", file=sys.stderr)

        run_server()

    except KeyboardInterrupt:
        print("\nMCP server stopped by user", file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        print(f"Error starting MCP server: {e}", file=sys.stderr)
        sys.exit(1)
