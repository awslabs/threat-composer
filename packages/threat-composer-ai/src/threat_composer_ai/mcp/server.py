"""FastMCP server implementation for threat-composer-ai."""

import logging
import sys

from fastmcp import FastMCP

from .tools import register_tools


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

    # Register all tools
    register_tools(mcp)

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

    Usage:
        threat-composer-ai-mcp

    The server will start and listen for MCP client connections using FastMCP defaults.
    """
    try:
        print("Starting threat-composer-ai MCP server...")
        print("Available tools:")
        print(
            "  - threat_modeling_start_workflow: Start a new threat modeling workflow or re-run from previous session"
        )
        print(
            "  - threat_modeling_get_workflow_logs: Get logs for a running or completed workflow session"
        )
        print(
            "  - threat_modeling_list_workflow_sessions: List available workflow sessions in a directory"
        )
        print(
            "  - threat_modeling_validate_tc_schema: Validate JSON data against Threat Composer v1 schema"
        )
        print(
            "  - threat_modeling_get_tc_schema: Get the Threat Composer v1 schema JSON content"
        )
        print()

        run_server()

    except KeyboardInterrupt:
        print("\nMCP server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting MCP server: {e}")
        sys.exit(1)
