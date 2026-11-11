"""
Diagram Icons Listing Tool.

Lists the icons the architecture diagram tool accepts. Supports filtering by
provider (aws, gcp, azure, etc.) and service (compute, database, etc.). Filters
are looked up in the icon index and are never used to build file paths.
"""

from typing import Any

from strands.types.tools import ToolResult, ToolUse

from threat_composer_ai.logging import log_debug, log_error
from threat_composer_ai.tools.threat_composer_dia_architecture import icon_tree

TOOL_SPEC = {
    "name": "threat_composer_dia_list_icons",
    "description": """List available icons from the diagrams library for architecture diagrams.

Use this tool to discover available icon classes that can be used when creating architecture diagrams.
The diagrams library supports multiple cloud providers and services.

Examples:
- No filters: Returns list of available providers (aws, gcp, azure, k8s, etc.)
- provider_filter="aws": Returns all AWS services and their icons
- provider_filter="aws", service_filter="compute": Returns only AWS compute icons (EC2, Lambda, etc.)

Common providers: aws, gcp, azure, k8s, onprem, generic, programming, saas
Common services: compute, database, network, storage, security, analytics, integration
""",
    "inputSchema": {
        "type": "object",
        "properties": {
            "provider_filter": {
                "type": "string",
                "description": "Filter by provider name (e.g., 'aws', 'gcp', 'azure', 'k8s')",
            },
            "service_filter": {
                "type": "string",
                "description": "Filter by service name (e.g., 'compute', 'database', 'network'). Requires provider_filter.",
            },
        },
        "required": [],
    },
}


def _format_services(provider: str, services: dict[str, list[str]]) -> str:
    lines = []
    for service, icons in sorted(services.items()):
        lines.append(f"\n### {service}")
        lines.append(f"Icons: {', '.join(icons)}")
        lines.append(f'Use as icon: "{provider}.{service}.{icons[0]}"')
    return "\n".join([f"\n## {provider}", *lines])


def _list_icons(provider_filter: str | None, service_filter: str | None) -> str:
    """Answer a query from the icon index only."""
    tree = icon_tree()
    if service_filter and not provider_filter:
        return "Error: Service filter requires provider filter"
    if not provider_filter:
        return f"Available providers: {', '.join(sorted(tree))}"
    services = tree.get(provider_filter)
    if services is None:
        return "Error: Provider not found"
    if service_filter:
        if service_filter not in services:
            return "Error: Service not found"
        services = {service_filter: services[service_filter]}
    return _format_services(provider_filter, services)


def threat_composer_dia_list_icons(tool: ToolUse, **kwargs: Any) -> ToolResult:
    """List available icons from the icon index."""
    tool_input = tool.get("input") or {}
    provider_filter = tool_input.get("provider_filter")
    service_filter = tool_input.get("service_filter")

    log_debug(
        f"Listing diagram icons - provider: {provider_filter}, service: {service_filter}"
    )

    try:
        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "success",
            "content": [{"text": _list_icons(provider_filter, service_filter)}],
        }
    except Exception as e:
        error_msg = f"Error listing diagram icons: {e}"
        log_error(error_msg)
        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "error",
            "content": [{"text": error_msg}],
        }
