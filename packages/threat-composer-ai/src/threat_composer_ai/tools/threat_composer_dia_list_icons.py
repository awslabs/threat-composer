"""
Diagram Icons Listing Tool.

Lists available icons from the diagrams library for architecture diagram generation.
Supports filtering by provider (aws, gcp, azure, etc.) and service (compute, database, etc.).
"""

import importlib
import inspect
import os
from typing import Any

import diagrams
from strands.types.tools import ToolResult, ToolUse

from threat_composer_ai.logging import log_debug, log_error

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

# Directories to exclude when scanning
EXCLUDE_DIRS = ["__pycache__", "_template"]


def _get_diagrams_path() -> str:
    """Get the base path of the diagrams package."""
    return os.path.dirname(diagrams.__file__)


def _get_icons_from_module(module_path: str) -> list[str]:
    """Extract icon class names from a diagrams module."""
    icons = []
    try:
        # Not user controlled input, hence nosec
        service_module = importlib.import_module(module_path)  # nosec
        for name, obj in inspect.getmembers(service_module):
            # Skip private members and imported modules
            if name.startswith("_") or inspect.ismodule(obj):
                continue
            # Check if it's a class with _icon attribute (Node subclass)
            if inspect.isclass(obj) and hasattr(obj, "_icon"):
                icons.append(name)
    except (ImportError, AttributeError) as e:
        log_error(f"Error loading module {module_path}: {e}")
    return sorted(icons)


def _list_providers_only() -> dict[str, Any]:
    """List available providers without their services/icons."""
    diagrams_path = _get_diagrams_path()
    providers = {}

    for provider_name in os.listdir(diagrams_path):
        provider_path = os.path.join(diagrams_path, provider_name)
        if (
            not os.path.isdir(provider_path)
            or provider_name.startswith("_")
            or provider_name in EXCLUDE_DIRS
        ):
            continue
        providers[provider_name] = {}

    return {
        "providers": providers,
        "filtered": False,
        "filter_info": None,
    }


def _list_provider_services(provider_filter: str) -> dict[str, Any]:
    """List all services and icons for a specific provider."""
    diagrams_path = _get_diagrams_path()
    provider_path = os.path.join(diagrams_path, provider_filter)

    if not os.path.isdir(provider_path) or provider_filter in EXCLUDE_DIRS:
        return {
            "providers": {},
            "filtered": True,
            "filter_info": {"provider": provider_filter, "error": "Provider not found"},
        }

    providers = {provider_filter: {}}

    for service_file in os.listdir(provider_path):
        if not service_file.endswith(".py") or service_file.startswith("_"):
            continue

        service_name = service_file[:-3]  # Remove .py extension
        module_path = f"diagrams.{provider_filter}.{service_name}"
        icons = _get_icons_from_module(module_path)

        if icons:
            providers[provider_filter][service_name] = icons

    return {
        "providers": providers,
        "filtered": True,
        "filter_info": {"provider": provider_filter},
    }


def _list_service_icons(provider_filter: str, service_filter: str) -> dict[str, Any]:
    """List icons for a specific provider and service."""
    diagrams_path = _get_diagrams_path()
    provider_path = os.path.join(diagrams_path, provider_filter)

    if not os.path.isdir(provider_path) or provider_filter in EXCLUDE_DIRS:
        return {
            "providers": {},
            "filtered": True,
            "filter_info": {
                "provider": provider_filter,
                "service": service_filter,
                "error": "Provider not found",
            },
        }

    service_path = os.path.join(provider_path, f"{service_filter}.py")
    if not os.path.isfile(service_path):
        return {
            "providers": {provider_filter: {}},
            "filtered": True,
            "filter_info": {
                "provider": provider_filter,
                "service": service_filter,
                "error": "Service not found",
            },
        }

    module_path = f"diagrams.{provider_filter}.{service_filter}"
    icons = _get_icons_from_module(module_path)

    providers = {provider_filter: {}}
    if icons:
        providers[provider_filter][service_filter] = icons

    return {
        "providers": providers,
        "filtered": True,
        "filter_info": {"provider": provider_filter, "service": service_filter},
    }


def threat_composer_dia_list_icons(tool: ToolUse, **kwargs: Any) -> ToolResult:
    """List available icons from the diagrams library."""
    tool_input = tool.get("input", {})

    provider_filter = tool_input.get("provider_filter")
    service_filter = tool_input.get("service_filter")

    log_debug(
        f"Listing diagram icons - provider: {provider_filter}, service: {service_filter}"
    )

    try:
        # Service filter requires provider filter
        if service_filter and not provider_filter:
            result = {
                "providers": {},
                "filtered": True,
                "filter_info": {
                    "service": service_filter,
                    "error": "Service filter requires provider filter",
                },
            }
        elif not provider_filter and not service_filter:
            result = _list_providers_only()
        elif provider_filter and not service_filter:
            result = _list_provider_services(provider_filter)
        else:
            result = _list_service_icons(provider_filter, service_filter)

        # Format response text
        if result.get("filter_info", {}).get("error"):
            response_text = f"Error: {result['filter_info']['error']}"
        else:
            providers = result.get("providers", {})
            if not any(providers.values()):
                # Just listing provider names
                response_text = (
                    f"Available providers: {', '.join(sorted(providers.keys()))}"
                )
            else:
                # Format with services and icons
                lines = []
                for provider, services in sorted(providers.items()):
                    if services:
                        lines.append(f"\n## {provider}")
                        for service, icons in sorted(services.items()):
                            lines.append(f"\n### {service}")
                            lines.append(f"Icons: {', '.join(icons)}")
                            lines.append(
                                f"Import: from diagrams.{provider}.{service} import {icons[0]}"
                            )
                response_text = "\n".join(lines) if lines else "No icons found"

        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "success",
            "content": [{"text": response_text}],
        }

    except Exception as e:
        error_msg = f"Error listing diagram icons: {e}"
        log_error(error_msg)
        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "error",
            "content": [{"text": error_msg}],
        }
