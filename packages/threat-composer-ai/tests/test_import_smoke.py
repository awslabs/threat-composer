"""Import smoke tests for the runtime-critical modules.

Nothing else in the suite imports the workflow or MCP server modules, so a
broken dependency resolution can ship undetected. That is exactly what
happened in issue #362: after fastmcp 4.1.3 was published, an unpinned
install selected the placeholder strands-agents==0.0.1 (an empty stub with
no `strands` module), and the CLI and MCP server crashed at runtime with
`ModuleNotFoundError: No module named 'strands'`. The logic tests all pass
under the committed lock, so none of them would have caught it.

These tests import each module that a user actually runs, plus the specific
third-party symbol (`strands.multiagent.GraphBuilder`) whose absence broke
the server. They fail loudly in any environment where the dependency graph
resolves to a placeholder or otherwise-broken release.
"""

import importlib

import pytest

# Modules a user exercises by running the CLI or the MCP server. Each must
# import cleanly; baseline_threat_modeling is the one that crashed in #362.
RUNTIME_MODULES = [
    "threat_composer_ai.__main__",
    "threat_composer_ai.mcp.server",
    "threat_composer_ai.mcp.tools",
    "threat_composer_ai.workflows.baseline_threat_modeling",
]


@pytest.mark.parametrize("module", RUNTIME_MODULES)
def test_runtime_module_imports(module: str) -> None:
    """Every runtime-critical module imports without error."""
    importlib.import_module(module)


def test_strands_graphbuilder_importable() -> None:
    """The exact third-party import that broke in issue #362."""
    from strands.multiagent import GraphBuilder

    assert GraphBuilder is not None


@pytest.mark.asyncio
async def test_mcp_server_registers_expected_tools() -> None:
    """The MCP server builds and registers its five tools.

    Guards both the import break and a silent tool-registration regression.
    The names match the server's documented contract in mcp/server.py.
    """
    from threat_composer_ai.mcp.server import create_mcp_server

    server = create_mcp_server()
    tools = await server.list_tools()
    names = {tool.name for tool in tools}

    expected = {
        "threat_modeling_start_workflow",
        "threat_modeling_get_workflow_logs",
        "threat_modeling_list_workflow_sessions",
        "threat_modeling_validate_tc_schema",
        "threat_modeling_get_tc_schema",
    }
    assert names == expected
