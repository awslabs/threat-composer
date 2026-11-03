"""
Model builder: deterministic operations for building a Threat Composer model
one item at a time, exposed as MCP tools for Claude-driven threat modeling.

Nothing in this package calls a language model or depends on Strands, so it can
be used by the MCP server, the existing agents, or tests alike.
"""

from .coverage import coverage_report, link_problems
from .model_ops import (
    AssumptionInput,
    BuilderError,
    MitigationInput,
    ThreatInput,
    empty_model,
    validate_document,
)
from .statement import compose_statement
from .system_model import STRIDE_BY_KIND, Element, Flow, SystemModel, Zone
from .workspace import Workspace, WorkspaceError

__all__ = [
    "STRIDE_BY_KIND",
    "AssumptionInput",
    "BuilderError",
    "Element",
    "Flow",
    "MitigationInput",
    "SystemModel",
    "ThreatInput",
    "Workspace",
    "WorkspaceError",
    "Zone",
    "compose_statement",
    "coverage_report",
    "empty_model",
    "link_problems",
    "validate_document",
]
