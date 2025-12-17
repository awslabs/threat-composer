"""
Data Flow Diagram generation tool using mingrammer/diagrams library.

This tool executes Python code that defines a DFD diagram using custom
DFD node classes and the diagrams library, then outputs an SVG file.

Security: Only diagram-related classes are exposed in the execution namespace.
No access to os, subprocess, file operations, or other dangerous modules.
"""

from pathlib import Path
from typing import Any

from strands.types.tools import ToolResult, ToolUse

from threat_composer_ai.config import get_global_config
from threat_composer_ai.tools.threat_composer_dia_common import (
    execute_diagram_code,
    get_base_builtins,
    get_core_diagram_classes,
)
from threat_composer_ai.tools.threat_composer_dia_nodes import (
    Datastore,
    ExternalEntity,
    HumanActor,
    Process,
    TrustBoundary,
)

TOOL_SPEC = {
    "name": "threat_composer_dia_dfd",
    "description": """Execute Python code to generate a Data Flow Diagram (DFD) as SVG.

IMPORTANT: All DFD classes are pre-imported and available directly. DO NOT write import statements.
Just use the class names directly.

NODE CONSTRUCTOR RULES:
- All node classes take ONLY a label string: `Process("My Service")`, `Datastore("DB")`
- Do NOT pass extra positional arguments: `Process("label", "type")` is WRONG

Available DFD node classes:
- ExternalEntity: Rectangle representing external actors/systems
- HumanActor: Stick figure representing human users
- Process: Oval representing processing/transformation
- Datastore: Cylinder representing data storage
- TrustBoundary: Dashed rectangle cluster for trust zones (use as context manager)
- Diagram: Container for the diagram (use as context manager)
- Edge: Arrow representing data flow between nodes
- Cluster: Generic grouping container

CRITICAL CONNECTION RULES:
- You CAN connect a single node to a list: `api >> [svc1, svc2]`
- You CAN connect a list to a single node: `[svc1, svc2] >> db`
- You CANNOT connect TO a list with Edge labels: `node >> Edge(label="x") >> [a, b]` FAILS
- For labeled connections to multiple nodes, connect individually or use a loop:
  ```python
  for server in servers:
      api >> Edge(label="Request") >> server
  ```

Example code (note: NO imports needed):
```python
with Diagram("System DFD", show=False, direction="LR"):
    user = HumanActor("User")

    with TrustBoundary("DMZ"):
        api = Process("API Gateway")

    with TrustBoundary("Internal"):
        service = Process("Backend Service")
        db = Datastore("Database")

    user >> Edge(label="DF1: Request") >> api
    api >> Edge(label="DF2: Forward") >> service
    service >> Edge(label="DF3: Query") >> db
```

The output SVG file path is determined automatically from configuration.
""",
    "inputSchema": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python code defining the DFD diagram using diagrams library and custom DFD nodes",
            },
        },
        "required": ["code"],
    },
}


def _get_restricted_namespace() -> dict[str, Any]:
    """
    Create a restricted namespace for executing DFD diagram code.

    Only exposes diagram-related classes and custom DFD nodes for safety.
    No access to os, subprocess, file operations, etc.
    """
    namespace = get_core_diagram_classes()

    # Add custom DFD node classes
    namespace["ExternalEntity"] = ExternalEntity
    namespace["HumanActor"] = HumanActor
    namespace["Process"] = Process
    namespace["Datastore"] = Datastore
    namespace["TrustBoundary"] = TrustBoundary

    # Add builtins (no __import__ for DFD - uses predefined nodes only)
    namespace["__builtins__"] = get_base_builtins()

    return namespace


def _get_output_path() -> Path:
    """Get the output path for the DFD diagram from config."""
    config = get_global_config()
    if not config:
        raise ValueError("Global config not initialized")

    return (
        config.output_directory
        / config.components_output_sub_dir
        / config.dataflow_diagram_filename
    )


def threat_composer_dia_dfd(tool: ToolUse, **kwargs: Any) -> ToolResult:
    """Execute Python diagram code and generate SVG output."""
    return execute_diagram_code(
        tool=tool,
        diagram_type="DFD",
        output_path=_get_output_path(),
        namespace=_get_restricted_namespace(),
        **kwargs,
    )
