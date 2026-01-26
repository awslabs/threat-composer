"""
Metrics computation for threat model evaluation.

Provides distribution comparison, consistency metrics, and aggregate scoring.
"""

import math
from collections import Counter
from dataclasses import dataclass

from .report import DistributionComparison, LinkGraphComparison


@dataclass
class ConsistencyMetrics:
    """Aggregate consistency metrics across runs."""

    # Count-based metrics
    threat_count_a: int = 0
    threat_count_b: int = 0
    mitigation_count_a: int = 0
    mitigation_count_b: int = 0
    assumption_count_a: int = 0
    assumption_count_b: int = 0

    # Match rates
    threat_match_rate: float = 0.0
    mitigation_match_rate: float = 0.0
    assumption_match_rate: float = 0.0

    # Average similarities for matched items
    avg_threat_similarity: float = 0.0
    avg_mitigation_similarity: float = 0.0
    avg_assumption_similarity: float = 0.0

    @property
    def count_consistency(self) -> float:
        """How consistent are the counts between runs (0-1)."""
        scores = []
        if self.threat_count_a > 0 or self.threat_count_b > 0:
            max_t = max(self.threat_count_a, self.threat_count_b)
            min_t = min(self.threat_count_a, self.threat_count_b)
            scores.append(min_t / max_t if max_t > 0 else 1.0)

        if self.mitigation_count_a > 0 or self.mitigation_count_b > 0:
            max_m = max(self.mitigation_count_a, self.mitigation_count_b)
            min_m = min(self.mitigation_count_a, self.mitigation_count_b)
            scores.append(min_m / max_m if max_m > 0 else 1.0)

        return sum(scores) / len(scores) if scores else 1.0


class DistributionMetrics:
    """Computes distribution similarity metrics."""

    @staticmethod
    def extract_stride_distribution(threats: list[dict]) -> dict[str, int]:
        """Extract STRIDE category distribution from threats."""
        counter: Counter = Counter()

        for threat in threats:
            metadata = threat.get("metadata", []) or []
            for m in metadata:
                if m.get("key") == "STRIDE":
                    values = m.get("value", [])
                    if isinstance(values, list):
                        counter.update(values)

        return dict(counter)

    @staticmethod
    def extract_priority_distribution(threats: list[dict]) -> dict[str, int]:
        """Extract Priority distribution from threats."""
        counter: Counter = Counter()

        for threat in threats:
            metadata = threat.get("metadata", []) or []
            for m in metadata:
                if m.get("key") == "Priority":
                    value = m.get("value")
                    if value:
                        counter[value] += 1

        return dict(counter)

    @staticmethod
    def extract_tags_distribution(items: list[dict]) -> dict[str, int]:
        """Extract tags distribution from any list of items."""
        counter: Counter = Counter()

        for item in items:
            tags = item.get("tags", []) or []
            counter.update(tags)

        return dict(counter)

    @staticmethod
    def jensen_shannon_similarity(
        dist_a: dict[str, int], dist_b: dict[str, int]
    ) -> float:
        """
        Compute Jensen-Shannon similarity between two distributions.

        Returns value between 0 (completely different) and 1 (identical).
        """
        # Get all keys
        all_keys = set(dist_a.keys()) | set(dist_b.keys())

        if not all_keys:
            return 1.0  # Both empty

        # Normalize to probability distributions
        total_a = sum(dist_a.values()) or 1
        total_b = sum(dist_b.values()) or 1

        p = [dist_a.get(k, 0) / total_a for k in all_keys]
        q = [dist_b.get(k, 0) / total_b for k in all_keys]

        # Compute JS divergence
        m = [(pi + qi) / 2 for pi, qi in zip(p, q, strict=False)]

        def kl_divergence(p_dist, q_dist):
            """KL divergence with smoothing."""
            result = 0.0
            for pi, qi in zip(p_dist, q_dist, strict=False):
                if pi > 0 and qi > 0:
                    result += pi * math.log2(pi / qi)
            return result

        js_div = 0.5 * kl_divergence(p, m) + 0.5 * kl_divergence(q, m)

        # Convert to similarity (JS divergence is bounded by 1 for log base 2)
        return 1.0 - min(js_div, 1.0)

    def compare_distributions(
        self, name: str, dist_a: dict[str, int], dist_b: dict[str, int]
    ) -> DistributionComparison:
        """Compare two distributions and return comparison result."""
        similarity = self.jensen_shannon_similarity(dist_a, dist_b)

        return DistributionComparison(
            name=name,
            distribution_a=dist_a,
            distribution_b=dist_b,
            similarity=similarity,
            chi_square_p_value=None,  # Could add chi-square test if scipy available
        )


class LinkGraphMetrics:
    """Computes metrics for relationship graphs."""

    @staticmethod
    def compare_mitigation_links(
        links_a: list[dict],
        links_b: list[dict],
        threat_id_map: dict[str, str],  # Maps threat IDs from A to B
        mitigation_id_map: dict[str, str],  # Maps mitigation IDs from A to B
    ) -> LinkGraphComparison:
        """
        Compare mitigation-threat link graphs.

        Args:
            links_a: Mitigation links from run A
            links_b: Mitigation links from run B
            threat_id_map: Mapping of matched threat IDs (A -> B)
            mitigation_id_map: Mapping of matched mitigation IDs (A -> B)
        """
        # Convert links to normalized edge sets
        edges_a = set()
        for link in links_a:
            mit_id = link.get("mitigationId", "")
            threat_id = link.get("linkedId", "")
            # Map to B's IDs if possible
            mapped_mit = mitigation_id_map.get(mit_id, mit_id)
            mapped_threat = threat_id_map.get(threat_id, threat_id)
            edges_a.add((mapped_mit, mapped_threat))

        edges_b = set()
        for link in links_b:
            mit_id = link.get("mitigationId", "")
            threat_id = link.get("linkedId", "")
            edges_b.add((mit_id, threat_id))

        # Compute overlap
        matched = len(edges_a & edges_b)
        total = len(edges_a | edges_b)
        similarity = matched / total if total > 0 else 1.0

        return LinkGraphComparison(
            link_type="mitigation_links",
            links_a_count=len(links_a),
            links_b_count=len(links_b),
            matched_links=matched,
            similarity=similarity,
        )
