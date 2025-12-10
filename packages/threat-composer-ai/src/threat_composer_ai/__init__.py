"""
Threat Composer AI - Agentic Threat Modeling System

An AI-powered automated threat modeling system that uses Strands agents to perform
comprehensive security analysis of codebases and generate Threat Composer-compatible outputs.
"""

from .config import AppConfig
from .models import ThreatComposerV1Model
from .workflows import create_baseline_threat_modeling_workflow

__version__ = "0.1.0"

__all__ = [
    # Configuration
    "AppConfig",
    # Models
    "ThreatComposerV1Model",
    # Main workflow
    "create_baseline_threat_modeling_workflow",
]
