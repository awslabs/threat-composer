"""
Threat Composer AI Models

This module provides Pydantic models for Threat Composer data structures,
generated from the official JSON schemas.

Available Models:
- ThreatComposerV1Model: Model for threat-composer-v1.schema.json

Usage:
    from threat_composer_ai.models import ThreatComposerV1Model

    # Create and validate threat composer data
    data = {"schema": 1, "applicationInfo": {"name": "My Application"}}
    model = ThreatComposerV1Model(**data)
"""

from .threat_composer_v1 import ThreatComposerV1Model

__all__ = [
    "ThreatComposerV1Model",
]
