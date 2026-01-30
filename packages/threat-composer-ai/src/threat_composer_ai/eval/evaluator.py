"""
Main evaluator for comparing threat model runs.

Orchestrates all comparison logic and produces comprehensive evaluation reports.
"""

from pathlib import Path

from .comparators import (
    AssumptionComparator,
    MitigationComparator,
    SemanticComparator,
    ThreatComparator,
)
from .loader import RunData, RunLoader
from .metrics import DistributionMetrics, LinkGraphMetrics
from .report import (
    ComponentScore,
    EvalReport,
)


class ThreatModelEvaluator:
    """
    Comprehensive evaluator for comparing threat model runs.

    Compares all components with field-level granularity and produces
    detailed reports for tracking consistency across tuning iterations.

    Usage:
        evaluator = ThreatModelEvaluator()
        report = evaluator.compare_runs("path/to/run_a", "path/to/run_b")
        report.print_summary()
    """

    def __init__(
        self,
        use_embeddings: bool = True,
        embedding_model: str = "all-MiniLM-L6-v2",
        match_threshold: float = 0.4,
    ):
        """
        Initialize evaluator.

        Args:
            use_embeddings: Use sentence-transformers for semantic similarity
            embedding_model: Model name for sentence-transformers
            match_threshold: Minimum similarity to consider items matched
        """
        self.loader = RunLoader(validate=False)
        self.semantic = SemanticComparator(
            model_name=embedding_model,
            use_embeddings=use_embeddings,
        )
        self.threat_comparator = ThreatComparator(self.semantic)
        self.mitigation_comparator = MitigationComparator(self.semantic)
        self.assumption_comparator = AssumptionComparator(self.semantic)
        self.distribution_metrics = DistributionMetrics()
        self.match_threshold = match_threshold

    def compare_runs(
        self,
        run_a_path: str | Path,
        run_b_path: str | Path,
    ) -> EvalReport:
        """
        Compare two threat model runs and produce evaluation report.

        Args:
            run_a_path: Path to first run (baseline)
            run_b_path: Path to second run (comparison)

        Returns:
            EvalReport with comprehensive comparison results
        """
        # Load both runs
        run_a = self.loader.load_run(run_a_path)
        run_b = self.loader.load_run(run_b_path)

        # Initialize report
        report = EvalReport(
            run_a_path=str(run_a_path),
            run_b_path=str(run_b_path),
            run_a_timestamp=run_a.timestamp,
            run_b_timestamp=run_b.timestamp,
        )

        # Compare each component
        report.application_info_score = self._compare_application_info(run_a, run_b)
        report.architecture_score = self._compare_architecture(run_a, run_b)
        report.dataflow_score = self._compare_dataflow(run_a, run_b)

        # Compare threats with detailed matching
        report.threat_matches = self.threat_comparator.compare_threats(
            run_a.threats, run_b.threats, self.match_threshold
        )
        report.threats_score = self._score_from_matches(
            "threats",
            report.threat_matches,
            len(run_a.threats),
            len(run_b.threats),
        )

        # Compare mitigations
        report.mitigation_matches = self.mitigation_comparator.compare_mitigations(
            run_a.mitigations, run_b.mitigations, self.match_threshold
        )
        report.mitigations_score = self._score_from_matches(
            "mitigations",
            report.mitigation_matches,
            len(run_a.mitigations),
            len(run_b.mitigations),
        )

        # Compare assumptions
        report.assumption_matches = self.assumption_comparator.compare_assumptions(
            run_a.assumptions, run_b.assumptions, self.match_threshold
        )
        report.assumptions_score = self._score_from_matches(
            "assumptions",
            report.assumption_matches,
            len(run_a.assumptions),
            len(run_b.assumptions),
        )

        # Distribution comparisons
        report.stride_distribution = self._compare_stride_distribution(run_a, run_b)
        report.priority_distribution = self._compare_priority_distribution(run_a, run_b)
        report.tags_distribution = self._compare_tags_distribution(run_a, run_b)

        # Link graph comparisons
        report.mitigation_links_comparison = self._compare_mitigation_links(
            run_a, run_b, report
        )

        # Calculate overall score
        report.overall_consistency_score = self._calculate_overall_score(report)

        return report

    def _compare_application_info(
        self, run_a: RunData, run_b: RunData
    ) -> ComponentScore:
        """Compare applicationInfo components."""
        data_a = run_a.application_info_raw or {}
        data_b = run_b.application_info_raw or {}

        app_a = data_a.get("applicationInfo", {}) or {}
        app_b = data_b.get("applicationInfo", {}) or {}

        field_scores = {}
        field_values_a = {}
        field_values_b = {}

        # Compare name
        name_a = app_a.get("name", "") or ""
        name_b = app_b.get("name", "") or ""
        name_sim = self.semantic.text_similarity(name_a, name_b)
        field_scores["name"] = name_sim
        field_values_a["name"] = name_a
        field_values_b["name"] = name_b

        # Compare description (semantic)
        desc_a = app_a.get("description", "") or ""
        desc_b = app_b.get("description", "") or ""
        desc_sim = self.semantic.text_similarity(desc_a, desc_b)
        field_scores["description"] = desc_sim
        field_values_a["description"] = desc_a
        field_values_b["description"] = desc_b

        # Weight description more heavily
        overall = name_sim * 0.3 + desc_sim * 0.7

        return ComponentScore(
            component_name="application_info",
            overall_score=overall,
            field_scores=field_scores,
            field_values_a=field_values_a,
            field_values_b=field_values_b,
            item_count_a=1 if app_a else 0,
            item_count_b=1 if app_b else 0,
            matched_count=1 if app_a and app_b else 0,
        )

    def _compare_architecture(self, run_a: RunData, run_b: RunData) -> ComponentScore:
        """Compare architecture components."""
        data_a = run_a.architecture_raw or {}
        data_b = run_b.architecture_raw or {}

        arch_a = data_a.get("architecture", {}) or {}
        arch_b = data_b.get("architecture", {}) or {}

        field_scores = {}
        field_values_a = {}
        field_values_b = {}

        # Compare description
        desc_a = arch_a.get("description", "") or ""
        desc_b = arch_b.get("description", "") or ""
        desc_sim = self.semantic.text_similarity(desc_a, desc_b)
        field_scores["description"] = desc_sim
        field_values_a["description"] = desc_a
        field_values_b["description"] = desc_b

        # Note: We skip image comparison (binary data)

        return ComponentScore(
            component_name="architecture",
            overall_score=desc_sim,
            field_scores=field_scores,
            field_values_a=field_values_a,
            field_values_b=field_values_b,
            item_count_a=1 if arch_a.get("description") else 0,
            item_count_b=1 if arch_b.get("description") else 0,
            matched_count=1
            if arch_a.get("description") and arch_b.get("description")
            else 0,
            notes="Image comparison skipped (binary data)",
        )

    def _compare_dataflow(self, run_a: RunData, run_b: RunData) -> ComponentScore:
        """Compare dataflow components."""
        data_a = run_a.dataflow_raw or {}
        data_b = run_b.dataflow_raw or {}

        df_a = data_a.get("dataflow", {}) or {}
        df_b = data_b.get("dataflow", {}) or {}

        field_scores = {}
        field_values_a = {}
        field_values_b = {}

        # Compare description
        desc_a = df_a.get("description", "") or ""
        desc_b = df_b.get("description", "") or ""
        desc_sim = self.semantic.text_similarity(desc_a, desc_b)
        field_scores["description"] = desc_sim
        field_values_a["description"] = desc_a
        field_values_b["description"] = desc_b

        return ComponentScore(
            component_name="dataflow",
            overall_score=desc_sim,
            field_scores=field_scores,
            field_values_a=field_values_a,
            field_values_b=field_values_b,
            item_count_a=1 if df_a.get("description") else 0,
            item_count_b=1 if df_b.get("description") else 0,
            matched_count=1
            if df_a.get("description") and df_b.get("description")
            else 0,
            notes="Image comparison skipped (binary data)",
        )

    def _score_from_matches(
        self,
        component_name: str,
        matches: list,
        count_a: int,
        count_b: int,
    ) -> ComponentScore:
        """Create ComponentScore from match results."""
        matched = sum(1 for m in matches if m.is_matched)
        unmatched_a = sum(1 for m in matches if not m.is_matched)
        unmatched_b = max(0, count_b - matched)

        # Calculate average similarity of matched items
        matched_sims = [m.overall_similarity for m in matches if m.is_matched]
        avg_sim = sum(matched_sims) / len(matched_sims) if matched_sims else 0.0

        # Overall score considers both match rate and quality
        match_rate = matched / count_a if count_a > 0 else 1.0
        count_ratio = (
            min(count_a, count_b) / max(count_a, count_b)
            if max(count_a, count_b) > 0
            else 1.0
        )

        # Weighted combination
        overall = match_rate * 0.4 + avg_sim * 0.4 + count_ratio * 0.2

        return ComponentScore(
            component_name=component_name,
            overall_score=overall,
            field_scores={
                "match_rate": match_rate,
                "avg_similarity": avg_sim,
                "count_ratio": count_ratio,
            },
            item_count_a=count_a,
            item_count_b=count_b,
            matched_count=matched,
            unmatched_a_count=unmatched_a,
            unmatched_b_count=unmatched_b,
        )

    def _compare_stride_distribution(self, run_a: RunData, run_b: RunData):
        """Compare STRIDE category distributions."""
        dist_a = self.distribution_metrics.extract_stride_distribution(run_a.threats)
        dist_b = self.distribution_metrics.extract_stride_distribution(run_b.threats)
        return self.distribution_metrics.compare_distributions("STRIDE", dist_a, dist_b)

    def _compare_priority_distribution(self, run_a: RunData, run_b: RunData):
        """Compare Priority distributions."""
        dist_a = self.distribution_metrics.extract_priority_distribution(run_a.threats)
        dist_b = self.distribution_metrics.extract_priority_distribution(run_b.threats)
        return self.distribution_metrics.compare_distributions(
            "Priority", dist_a, dist_b
        )

    def _compare_tags_distribution(self, run_a: RunData, run_b: RunData):
        """Compare tags distributions across all threats."""
        dist_a = self.distribution_metrics.extract_tags_distribution(run_a.threats)
        dist_b = self.distribution_metrics.extract_tags_distribution(run_b.threats)
        return self.distribution_metrics.compare_distributions("Tags", dist_a, dist_b)

    def _compare_mitigation_links(
        self, run_a: RunData, run_b: RunData, report: EvalReport
    ):
        """Compare mitigation-threat link graphs."""
        # Build ID mappings from match results
        threat_id_map = {}
        for match in report.threat_matches:
            if match.is_matched:
                threat_id_map[match.threat_a_id] = match.threat_b_id

        mitigation_id_map = {}
        for match in report.mitigation_matches:
            if match.is_matched:
                mitigation_id_map[match.mitigation_a_id] = match.mitigation_b_id

        return LinkGraphMetrics.compare_mitigation_links(
            run_a.mitigation_links,
            run_b.mitigation_links,
            threat_id_map,
            mitigation_id_map,
        )

    def _calculate_overall_score(self, report: EvalReport) -> float:
        """Calculate weighted overall consistency score."""
        weights = {
            "application_info": 0.10,
            "architecture": 0.10,
            "dataflow": 0.10,
            "threats": 0.35,
            "mitigations": 0.25,
            "assumptions": 0.10,
        }

        total_weight = 0.0
        weighted_sum = 0.0

        scores = report.get_component_scores()
        for name, score in scores.items():
            weight = weights.get(name, 0.1)
            weighted_sum += score * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0.0

    def compare_multiple_runs(
        self,
        run_paths: list[str | Path],
        baseline_index: int = 0,
    ) -> list[EvalReport]:
        """
        Compare multiple runs against a baseline.

        Args:
            run_paths: List of run directory paths
            baseline_index: Index of the baseline run (default: first)

        Returns:
            List of EvalReports comparing each run to baseline
        """
        if len(run_paths) < 2:
            raise ValueError("Need at least 2 runs to compare")

        baseline_path = run_paths[baseline_index]
        reports = []

        for i, run_path in enumerate(run_paths):
            if i != baseline_index:
                report = self.compare_runs(baseline_path, run_path)
                reports.append(report)

        return reports

    def find_and_compare_latest(
        self,
        base_path: str | Path,
        n_runs: int = 2,
    ) -> EvalReport | None:
        """
        Find the N most recent runs and compare them.

        Args:
            base_path: Base directory containing runs (e.g., .threat-composer/)
            n_runs: Number of recent runs to compare (default: 2)

        Returns:
            EvalReport comparing the two most recent runs, or None if insufficient runs
        """
        runs = self.loader.find_runs(base_path)

        if len(runs) < n_runs:
            return None

        # Compare the two most recent
        return self.compare_runs(runs[-2], runs[-1])
