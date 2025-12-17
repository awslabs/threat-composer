"""
Architecture Diagram generation tool using mingrammer/diagrams library.

This tool executes Python code that defines an architecture diagram using
the diagrams library, then outputs an SVG file.

Security: Only diagram-related classes are exposed in the execution namespace.
No access to os, subprocess, file operations, or other dangerous modules.
"""

from pathlib import Path
from typing import Any

from diagrams import Node
from strands.types.tools import ToolResult, ToolUse

from threat_composer_ai.config import get_global_config
from threat_composer_ai.tools.threat_composer_dia_common import (
    execute_diagram_code,
    get_base_builtins,
    get_core_diagram_classes,
)

TOOL_SPEC = {
    "name": "threat_composer_dia_architecture",
    "description": """Execute Python code to generate an Architecture Diagram as SVG.

IMPORTANT: All diagram classes are pre-imported and available directly. DO NOT write import statements.
Just use the class names directly (e.g., EC2, Lambda, RDS, S3, VPC, Cluster, Diagram, Edge).

NODE CONSTRUCTOR RULES:
- All node classes take ONLY a label string: `EC2("My Server")`, `S3("Bucket")`
- Do NOT pass extra positional arguments: `General("label", "type")` is WRONG
- Use keyword args for styling: `EC2("Server", fontsize="10")`

CRITICAL CONNECTION RULES:
- You CAN connect a single node to a list: `lb >> [web1, web2, web3]`
- You CAN connect a list to a single node: `[web1, web2, web3] >> db`
- You CANNOT use Edge() with lists: `node >> Edge(label="x") >> [a, b]` FAILS with 'list has no attribute nodeid'
- For labeled connections to multiple targets, connect each individually:
  ```python
  kms >> Edge(label="Encrypt") >> bucket1
  kms >> bucket2  # unlabeled is fine
  kms >> bucket3
  ```

Example code (note: NO imports needed):
```python
with Diagram("Web Service Architecture", show=False, direction="LR"):
    with Cluster("VPC"):
        lb = ELB("Load Balancer")
        with Cluster("Application Tier"):
            svc = [EC2("web1"), EC2("web2"), EC2("web3")]
        with Cluster("Database Tier"):
            db = RDS("PostgreSQL")
    lb >> svc >> db
```

The output SVG file path is determined automatically from configuration.
""",
    "inputSchema": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python code defining the architecture diagram using diagrams library",
            },
        },
        "required": ["code"],
    },
}


def _safe_import(name: str, globals_dict=None, locals_dict=None, fromlist=(), level=0):
    """
    Safe import function that only allows diagrams-related imports.
    """
    allowed_prefixes = ["diagrams"]

    if any(name.startswith(prefix) for prefix in allowed_prefixes):
        return __import__(name, globals_dict, locals_dict, fromlist, level)

    raise ImportError(
        f"Import of '{name}' is not allowed. Only diagrams library imports are permitted."
    )


def _get_restricted_namespace() -> dict[str, Any]:
    """
    Create a restricted namespace for executing architecture diagram code.

    Pre-imports all diagrams library classes to make the namespace resilient
    to LLM import mistakes (e.g., importing S3 from wrong module).
    """
    import diagrams

    namespace = get_core_diagram_classes()
    namespace["Node"] = Node
    namespace["diagrams"] = diagrams

    # Add builtins with safe import
    builtins = get_base_builtins()
    builtins["__import__"] = _safe_import
    namespace["__builtins__"] = builtins

    # Pre-import all diagram classes into namespace to handle LLM import mistakes
    # This makes the code resilient even if LLM imports from wrong submodule
    _preload_diagram_modules(namespace)

    return namespace


def _preload_diagram_modules(namespace: dict[str, Any]) -> None:
    """
    Pre-import all classes from diagrams submodules into the namespace.

    This makes the execution resilient to LLM mistakes like importing
    S3 from diagrams.aws.database instead of diagrams.aws.storage.

    Uses dynamic discovery to automatically pick up new modules when
    the diagrams library is updated.
    """
    import importlib
    import pkgutil

    import diagrams

    def import_all_from_module(module_name: str) -> None:
        """Import all public classes from a module into namespace."""
        try:
            # Not  user controlled input, hence nosec
            module = importlib.import_module(module_name)  # nosec
            # Get all public names (those in __all__ or not starting with _)
            names = getattr(module, "__all__", None)
            if names is None:
                names = [n for n in dir(module) if not n.startswith("_")]
            for name in names:
                obj = getattr(module, name, None)
                if obj is not None:
                    namespace[name] = obj
        except (ImportError, AttributeError):
            pass  # Skip modules that fail to import

    def discover_leaf_modules(package) -> list[str]:
        """Recursively discover all leaf modules (those with actual classes)."""
        leaf_modules = []
        package_path = getattr(package, "__path__", None)
        if not package_path:
            return leaf_modules

        for _importer, modname, ispkg in pkgutil.walk_packages(
            package_path, prefix=package.__name__ + "."
        ):
            if ispkg:
                # It's a subpackage, recurse into it
                try:
                    # Not user controlled input, hence nosec
                    subpkg = importlib.import_module(modname)  # nosec
                    leaf_modules.extend(discover_leaf_modules(subpkg))
                except ImportError:
                    pass
            else:
                # It's a module (leaf), add it
                leaf_modules.append(modname)

        return leaf_modules

    # Discover and import all leaf modules from diagrams package
    for module_name in discover_leaf_modules(diagrams):
        import_all_from_module(module_name)


def _get_output_path() -> Path:
    """Get the output path for the architecture diagram from config."""
    config = get_global_config()
    if not config:
        raise ValueError("Global config not initialized")

    return (
        config.output_directory
        / config.components_output_sub_dir
        / config.architecture_diagram_filename
    )


def threat_composer_dia_architecture(tool: ToolUse, **kwargs: Any) -> ToolResult:
    """Execute Python diagram code and generate SVG output."""
    return execute_diagram_code(
        tool=tool,
        diagram_type="Architecture",
        output_path=_get_output_path(),
        namespace=_get_restricted_namespace(),
        **kwargs,
    )
