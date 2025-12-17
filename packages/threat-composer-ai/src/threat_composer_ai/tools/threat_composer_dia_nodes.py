"""
Custom DFD (Data Flow Diagram) node types for threat-composer-ai.

This module provides custom node classes for creating Data Flow Diagrams
using the mingrammer/diagrams library with DFD-specific shapes:
- ExternalEntity: Rectangle representing external actors/systems
- HumanActor: Stick figure representing human users
- Process: Oval representing processing/transformation
- Datastore: Cylinder representing data storage
- TrustBoundary: Dashed rectangle cluster for trust zones
"""

from pathlib import Path

from diagrams import Cluster, Node
from diagrams.custom import Custom

# Get the path to the DFD assets directory
DFD_ASSETS_DIR = Path(__file__).parent.parent / "assets" / "dfd"


class ExternalEntity(Node):
    """
    External Entity node (Rectangle).

    Represents actors or systems outside the system boundary,
    such as users, external services, or third-party systems.
    """

    def __init__(self, label: str = "", **kwargs):
        kwargs.setdefault("shape", "rectangle")
        kwargs.setdefault("labelloc", "c")
        super().__init__(label, **kwargs)


class HumanActor(Custom):
    """
    Human Actor node (Stick figure).

    Represents human users interacting with the system.
    """

    def __init__(self, label: str = "", **kwargs):
        icon_path = str(DFD_ASSETS_DIR / "dfd-human_actor.png")
        super().__init__(label, icon_path, **kwargs)


class Process(Node):
    """
    Process node (Oval/Ellipse).

    Represents a process that transforms or manipulates data.
    """

    _icon = None  # No icon

    def __init__(self, label: str = "", **kwargs):
        # Set shape to oval, but allow it to be overridden by kwargs
        kwargs.setdefault("shape", "oval")
        kwargs.setdefault("width", "2.0")  # Wider
        kwargs.setdefault("height", "1.0")  # Less tall
        kwargs.setdefault("fixedsize", "true")  # Enforce the dimensions
        kwargs.setdefault("labelloc", "c")
        super().__init__(label, **kwargs)


class Datastore(Node):
    """
    Datastore node (Cylinder).

    Represents data storage such as databases, files, or caches.
    """

    _icon = None  # No icon

    def __init__(self, label: str = "", **kwargs):
        # Set shape to oval, but allow it to be overridden by kwargs
        kwargs.setdefault("shape", "cylinder")
        kwargs.setdefault("labelloc", "c")
        super().__init__(label, **kwargs)


class TrustBoundary(Cluster):
    """
    Trust Boundary (Dashed rectangle cluster).

    Represents a security trust zone that groups related components.
    Components within the same trust boundary share a common trust level.
    """

    def __init__(self, label: str = "", **kwargs):
        # Set default graph attributes for dashed border
        graph_attr = kwargs.pop("graph_attr", {})
        graph_attr.setdefault("style", "dashed")
        graph_attr.setdefault("color", "#64748b")
        graph_attr.setdefault("penwidth", "2")
        graph_attr.setdefault("bgcolor", "#f8fafc")
        graph_attr.setdefault("fontcolor", "#475569")
        graph_attr.setdefault("fontsize", "12")

        super().__init__(label, graph_attr=graph_attr, **kwargs)
