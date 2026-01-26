"""
Evaluation report data structures for threat model comparison.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any


class MatchQuality(Enum):
    """Quality level of a semantic match between items."""

    EXACT = "exact"  # Near-identical content
    HIGH = "high"  # Strong semantic similarity (>0.85)
    MODERATE = "moderate"  # Moderate similarity (0.6-0.85)
    LOW = "low"  # Weak similarity (0.4-0.6)
    NO_MATCH = "no_match"  # No suitable match found (<0.4)


@dataclass
class FieldComparison:
    """Comparison result for a single field."""

    field_name: str
    value_a: Any
    value_b: Any
    similarity: float  # 0.0 to 1.0
    comparison_method: str  # "exact", "semantic", "set_overlap", "distribution"
    notes: str = ""


@dataclass
class ThreatMatchResult:
    """Result of matching a threat from run A to run B."""

    threat_a_id: str
    threat_a_statement: str
    threat_b_id: str | None
    threat_b_statement: str | None
    match_quality: MatchQuality
    overall_similarity: float
    field_comparisons: list[FieldComparison] = field(default_factory=list)

    @property
    def is_matched(self) -> bool:
        return self.threat_b_id is not None


@dataclass
class MitigationMatchResult:
    """Result of matching a mitigation from run A to run B."""

    mitigation_a_id: str
    mitigation_a_content: str
    mitigation_b_id: str | None
    mitigation_b_content: str | None
    match_quality: MatchQuality
    overall_similarity: float
    field_comparisons: list[FieldComparison] = field(default_factory=list)

    @property
    def is_matched(self) -> bool:
        return self.mitigation_b_id is not None


@dataclass
class AssumptionMatchResult:
    """Result of matching an assumption from run A to run B."""

    assumption_a_id: str
    assumption_a_content: str
    assumption_b_id: str | None
    assumption_b_content: str | None
    match_quality: MatchQuality
    overall_similarity: float
    field_comparisons: list[FieldComparison] = field(default_factory=list)

    @property
    def is_matched(self) -> bool:
        return self.assumption_b_id is not None


@dataclass
class ComponentScore:
    """Score for a single component type."""

    component_name: str
    overall_score: float  # 0.0 to 1.0
    field_scores: dict[str, float] = field(default_factory=dict)
    item_count_a: int = 0
    item_count_b: int = 0
    matched_count: int = 0
    unmatched_a_count: int = 0  # Items in A not found in B
    unmatched_b_count: int = 0  # Items in B not found in A
    notes: str = ""


@dataclass
class DistributionComparison:
    """Comparison of categorical distributions (e.g., STRIDE, Priority)."""

    name: str
    distribution_a: dict[str, int]
    distribution_b: dict[str, int]
    similarity: float  # 0.0 to 1.0 (using Jensen-Shannon or similar)
    chi_square_p_value: float | None = None


@dataclass
class LinkGraphComparison:
    """Comparison of relationship graphs (mitigation-threat links, etc.)."""

    link_type: str  # "mitigation_links" or "assumption_links"
    links_a_count: int
    links_b_count: int
    matched_links: int
    similarity: float


@dataclass
class EvalReport:
    """Complete evaluation report comparing two threat model runs."""

    # Metadata
    run_a_path: str
    run_b_path: str
    run_a_timestamp: str
    run_b_timestamp: str
    evaluation_timestamp: str = field(
        default_factory=lambda: datetime.now().isoformat()
    )

    # Overall scores
    overall_consistency_score: float = 0.0

    # Component scores
    application_info_score: ComponentScore | None = None
    architecture_score: ComponentScore | None = None
    dataflow_score: ComponentScore | None = None
    threats_score: ComponentScore | None = None
    mitigations_score: ComponentScore | None = None
    assumptions_score: ComponentScore | None = None

    # Detailed match results
    threat_matches: list[ThreatMatchResult] = field(default_factory=list)
    mitigation_matches: list[MitigationMatchResult] = field(default_factory=list)
    assumption_matches: list[AssumptionMatchResult] = field(default_factory=list)

    # Distribution comparisons
    stride_distribution: DistributionComparison | None = None
    priority_distribution: DistributionComparison | None = None
    tags_distribution: DistributionComparison | None = None

    # Link graph comparisons
    mitigation_links_comparison: LinkGraphComparison | None = None
    assumption_links_comparison: LinkGraphComparison | None = None

    # Warnings and notes
    warnings: list[str] = field(default_factory=list)

    def get_component_scores(self) -> dict[str, float]:
        """Get all component scores as a dictionary."""
        scores = {}
        if self.application_info_score:
            scores["application_info"] = self.application_info_score.overall_score
        if self.architecture_score:
            scores["architecture"] = self.architecture_score.overall_score
        if self.dataflow_score:
            scores["dataflow"] = self.dataflow_score.overall_score
        if self.threats_score:
            scores["threats"] = self.threats_score.overall_score
        if self.mitigations_score:
            scores["mitigations"] = self.mitigations_score.overall_score
        if self.assumptions_score:
            scores["assumptions"] = self.assumptions_score.overall_score
        return scores

    def print_summary(self) -> None:
        """Print a human-readable summary of the evaluation."""
        print("\n" + "=" * 60)
        print("THREAT MODEL CONSISTENCY EVALUATION REPORT")
        print("=" * 60)
        print(f"\nRun A: {self.run_a_path} ({self.run_a_timestamp})")
        print(f"Run B: {self.run_b_path} ({self.run_b_timestamp})")
        print(f"Evaluated: {self.evaluation_timestamp}")

        print(
            f"\n{'OVERALL CONSISTENCY SCORE:':<30} {self.overall_consistency_score:.1%}"
        )

        print("\n" + "-" * 40)
        print("COMPONENT SCORES")
        print("-" * 40)

        for name, score in self.get_component_scores().items():
            indicator = "✓" if score >= 0.7 else "⚠" if score >= 0.5 else "✗"
            print(f"  {indicator} {name:<25} {score:.1%}")

        # Threat details
        if self.threats_score:
            print(
                f"\n  Threats: {self.threats_score.item_count_a} (A) vs {self.threats_score.item_count_b} (B)"
            )
            print(f"    Matched: {self.threats_score.matched_count}")
            print(f"    Only in A: {self.threats_score.unmatched_a_count}")
            print(f"    Only in B: {self.threats_score.unmatched_b_count}")

        # Distribution comparisons
        if self.stride_distribution:
            print(
                f"\n  STRIDE Distribution Similarity: {self.stride_distribution.similarity:.1%}"
            )
        if self.priority_distribution:
            print(
                f"  Priority Distribution Similarity: {self.priority_distribution.similarity:.1%}"
            )

        # Warnings
        if self.warnings:
            print("\n" + "-" * 40)
            print("WARNINGS")
            print("-" * 40)
            for warning in self.warnings:
                print(f"  ⚠ {warning}")

        print("\n" + "=" * 60)

    def to_dict(self) -> dict:
        """Convert report to dictionary for JSON serialization."""

        def serialize(obj, depth=0):
            if depth > 50:  # Prevent infinite recursion
                return str(obj)
            if obj is None:
                return None
            if isinstance(obj, (str, int, float, bool)):
                return obj
            if isinstance(obj, Enum):
                return obj.value
            if isinstance(obj, Path):
                return str(obj)
            if isinstance(obj, list):
                return [serialize(item, depth + 1) for item in obj]
            if isinstance(obj, dict):
                return {k: serialize(v, depth + 1) for k, v in obj.items()}
            if hasattr(obj, "__dataclass_fields__"):
                return {k: serialize(v, depth + 1) for k, v in obj.__dict__.items()}
            # For other objects, convert to string
            return str(obj)

        return serialize(self)

    def to_json(self, path: str | Path) -> None:
        """Save report to JSON file."""
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_json(cls, path: str | Path) -> "EvalReport":
        """Load report from JSON file."""
        with open(path) as f:
            data = json.load(f)
        # Note: This is a simplified loader; full deserialization would need more work
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
