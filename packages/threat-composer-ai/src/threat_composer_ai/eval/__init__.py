"""
Threat Composer AI Evaluation Module

Provides semantic comparison and consistency scoring between threat model runs.
Designed to track output stability across prompt/model/tool tuning iterations.

Usage:
    from threat_composer_ai.eval import ThreatModelEvaluator, EvalReport

    evaluator = ThreatModelEvaluator()
    report = evaluator.compare_runs("path/to/run_a", "path/to/run_b")
    report.print_summary()
    report.to_json("eval_results.json")
"""

from .benchmark import BenchmarkConfig, BenchmarkReport, BenchmarkRunner
from .comparators import (
    AssumptionComparator,
    MitigationComparator,
    SemanticComparator,
    ThreatComparator,
)
from .evaluator import ThreatModelEvaluator
from .loader import RunLoader
from .metrics import ConsistencyMetrics, DistributionMetrics
from .report import ComponentScore, EvalReport, ThreatMatchResult
from .suite import SuiteConfig, SuiteReport, SuiteRunner

__all__ = [
    "BenchmarkConfig",
    "BenchmarkReport",
    "BenchmarkRunner",
    "SuiteConfig",
    "SuiteReport",
    "SuiteRunner",
    "ThreatModelEvaluator",
    "EvalReport",
    "ComponentScore",
    "ThreatMatchResult",
    "RunLoader",
    "SemanticComparator",
    "ThreatComparator",
    "MitigationComparator",
    "AssumptionComparator",
    "ConsistencyMetrics",
    "DistributionMetrics",
]
