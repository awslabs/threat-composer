"""
Semantic comparison utilities for threat model components.

Provides embedding-based similarity and LLM-as-judge comparison methods.
"""

import hashlib
import re
from typing import Any

# numpy is optional - use fallback if not available
try:
    import numpy as np

    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    np = None  # type: ignore

from .report import (
    AssumptionMatchResult,
    FieldComparison,
    MatchQuality,
    MitigationMatchResult,
    ThreatMatchResult,
)


def _get_match_quality(similarity: float) -> MatchQuality:
    """Convert similarity score to match quality enum."""
    if similarity >= 0.95:
        return MatchQuality.EXACT
    elif similarity >= 0.85:
        return MatchQuality.HIGH
    elif similarity >= 0.6:
        return MatchQuality.MODERATE
    elif similarity >= 0.4:
        return MatchQuality.LOW
    else:
        return MatchQuality.NO_MATCH


class SemanticComparator:
    """
    Computes semantic similarity between text using embeddings.

    Uses sentence-transformers for local embedding computation.
    Falls back to simple text similarity if embeddings unavailable.
    """

    def __init__(
        self, model_name: str = "all-MiniLM-L6-v2", use_embeddings: bool = True
    ):
        """
        Initialize comparator.

        Args:
            model_name: Sentence transformer model name
            use_embeddings: If False, use simple text similarity instead
        """
        self.model_name = model_name
        self.use_embeddings = use_embeddings
        self._model = None
        self._embedding_cache: dict[str, np.ndarray] = {}

    @property
    def model(self):
        """Lazy-load the embedding model."""
        if self._model is None and self.use_embeddings:
            try:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(self.model_name)
            except ImportError:
                print(
                    "Warning: sentence-transformers not installed. Using fallback similarity."
                )
                self.use_embeddings = False
        return self._model

    def get_embedding(self, text: str) -> Any:
        """Get embedding for text, using cache."""
        if not self.use_embeddings or not HAS_NUMPY:
            return None

        # Check cache
        cache_key = hashlib.md5(text.encode()).hexdigest()
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        # Compute embedding
        if self.model:
            embedding = self.model.encode(text, convert_to_numpy=True)
            self._embedding_cache[cache_key] = embedding
            return embedding
        return None

    def cosine_similarity(self, vec_a: Any, vec_b: Any) -> float:
        """Compute cosine similarity between two vectors."""
        if not HAS_NUMPY:
            return 0.0
        dot = np.dot(vec_a, vec_b)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))

    def text_similarity(self, text_a: str, text_b: str) -> float:
        """
        Compute similarity between two texts.

        Uses embeddings if available, otherwise falls back to token overlap.
        """
        if not text_a or not text_b:
            return 0.0 if (text_a or text_b) else 1.0

        # Normalize texts
        text_a = text_a.strip().lower()
        text_b = text_b.strip().lower()

        # Exact match
        if text_a == text_b:
            return 1.0

        # Try embedding similarity
        emb_a = self.get_embedding(text_a)
        emb_b = self.get_embedding(text_b)

        if emb_a is not None and emb_b is not None:
            return self.cosine_similarity(emb_a, emb_b)

        # Fallback: Jaccard similarity on tokens
        return self._jaccard_similarity(text_a, text_b)

    def _jaccard_similarity(self, text_a: str, text_b: str) -> float:
        """Compute Jaccard similarity on word tokens."""
        tokens_a = set(re.findall(r"\w+", text_a.lower()))
        tokens_b = set(re.findall(r"\w+", text_b.lower()))

        if not tokens_a and not tokens_b:
            return 1.0
        if not tokens_a or not tokens_b:
            return 0.0

        intersection = len(tokens_a & tokens_b)
        union = len(tokens_a | tokens_b)
        return intersection / union if union > 0 else 0.0

    def set_similarity(self, set_a: list | set, set_b: list | set) -> float:
        """Compute Jaccard similarity between two sets."""
        set_a = set(set_a) if set_a else set()
        set_b = set(set_b) if set_b else set()

        if not set_a and not set_b:
            return 1.0
        if not set_a or not set_b:
            return 0.0

        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / union if union > 0 else 0.0

    def find_best_matches(
        self, items_a: list[str], items_b: list[str], threshold: float = 0.4
    ) -> list[tuple[int, int | None, float]]:
        """
        Find optimal bipartite matching between two lists of texts.

        Uses Hungarian algorithm for optimal assignment.

        Args:
            items_a: List of texts from run A
            items_b: List of texts from run B
            threshold: Minimum similarity to consider a match

        Returns:
            List of (index_a, index_b or None, similarity) tuples
        """
        if not items_a:
            return []
        if not items_b:
            return [(i, None, 0.0) for i in range(len(items_a))]

        # Compute similarity matrix
        n_a, _n_b = len(items_a), len(items_b)

        # Build similarity matrix as list of lists (no numpy required)
        sim_matrix = []
        for text_a in items_a:
            row = []
            for text_b in items_b:
                row.append(self.text_similarity(text_a, text_b))
            sim_matrix.append(row)

        # Try scipy for optimal matching, fall back to greedy
        try:
            import numpy as np
            from scipy.optimize import linear_sum_assignment

            sim_array = np.array(sim_matrix)
            cost_matrix = 1 - sim_array
            row_ind, col_ind = linear_sum_assignment(cost_matrix)

            results = []
            matched_b = set()

            for i in range(n_a):
                if i in row_ind:
                    idx = list(row_ind).index(i)
                    j = col_ind[idx]
                    sim = sim_matrix[i][j]
                    if sim >= threshold:
                        results.append((i, j, sim))
                        matched_b.add(j)
                    else:
                        results.append((i, None, 0.0))
                else:
                    results.append((i, None, 0.0))

            return results

        except ImportError:
            # Fallback: greedy matching
            return self._greedy_match(sim_matrix, threshold)

    def _greedy_match(
        self, sim_matrix: list[list[float]], threshold: float
    ) -> list[tuple[int, int | None, float]]:
        """Greedy matching fallback when scipy unavailable."""
        n_a = len(sim_matrix)
        n_b = len(sim_matrix[0]) if sim_matrix else 0
        results = []
        used_b = set()

        for i in range(n_a):
            best_j = None
            best_sim = threshold

            for j in range(n_b):
                if j not in used_b and sim_matrix[i][j] > best_sim:
                    best_j = j
                    best_sim = sim_matrix[i][j]

            if best_j is not None:
                results.append((i, best_j, best_sim))
                used_b.add(best_j)
            else:
                results.append((i, None, 0.0))

        return results


class ThreatComparator:
    """Compares threats between two runs with field-level granularity."""

    # Fields to compare and their comparison methods
    FIELD_CONFIGS = {
        "threatSource": ("semantic", 1.0),
        "prerequisites": ("semantic", 0.8),
        "threatAction": ("semantic", 1.2),
        "threatImpact": ("semantic", 1.0),
        "impactedGoal": ("set", 0.8),
        "impactedAssets": ("semantic_set", 0.8),
        "statement": ("semantic", 1.5),
        "status": ("exact", 0.3),
        "tags": ("set", 0.5),
    }

    def __init__(self, semantic_comparator: SemanticComparator):
        self.semantic = semantic_comparator

    def compare_threats(
        self, threats_a: list[dict], threats_b: list[dict], match_threshold: float = 0.4
    ) -> list[ThreatMatchResult]:
        """
        Compare threats between two runs.

        Args:
            threats_a: Threats from run A
            threats_b: Threats from run B
            match_threshold: Minimum similarity to consider a match

        Returns:
            List of ThreatMatchResult for each threat in A
        """
        if not threats_a:
            return []

        # Extract statements for matching
        statements_a = [t.get("statement", "") or "" for t in threats_a]
        statements_b = [t.get("statement", "") or "" for t in threats_b]

        # Find best matches using statements
        matches = self.semantic.find_best_matches(
            statements_a, statements_b, match_threshold
        )

        results = []
        for idx_a, idx_b, _match_sim in matches:
            threat_a = threats_a[idx_a]
            threat_b = threats_b[idx_b] if idx_b is not None else None

            # Compare all fields
            field_comparisons = self._compare_threat_fields(threat_a, threat_b)

            # Calculate weighted overall similarity
            overall_sim = self._calculate_weighted_similarity(field_comparisons)

            results.append(
                ThreatMatchResult(
                    threat_a_id=threat_a.get("id", ""),
                    threat_a_statement=threat_a.get("statement", ""),
                    threat_b_id=threat_b.get("id") if threat_b else None,
                    threat_b_statement=threat_b.get("statement") if threat_b else None,
                    match_quality=_get_match_quality(overall_sim),
                    overall_similarity=overall_sim,
                    field_comparisons=field_comparisons,
                    index_a=idx_a,
                    index_b=idx_b,
                )
            )

        return results

    def _compare_threat_fields(
        self, threat_a: dict, threat_b: dict | None
    ) -> list[FieldComparison]:
        """Compare all fields between two threats."""
        comparisons = []

        for field_name, (method, _weight) in self.FIELD_CONFIGS.items():
            val_a = threat_a.get(field_name)
            val_b = threat_b.get(field_name) if threat_b else None

            if method == "exact":
                sim = 1.0 if val_a == val_b else 0.0
            elif method == "semantic":
                sim = self.semantic.text_similarity(str(val_a or ""), str(val_b or ""))
            elif method == "set":
                sim = self.semantic.set_similarity(val_a or [], val_b or [])
            elif method == "semantic_set":
                sim = self._semantic_set_similarity(val_a or [], val_b or [])
            else:
                sim = 0.0

            comparisons.append(
                FieldComparison(
                    field_name=field_name,
                    value_a=val_a,
                    value_b=val_b,
                    similarity=sim,
                    comparison_method=method,
                )
            )

        # Compare STRIDE from metadata
        stride_a = self._extract_metadata_value(threat_a, "STRIDE")
        stride_b = (
            self._extract_metadata_value(threat_b, "STRIDE") if threat_b else None
        )
        comparisons.append(
            FieldComparison(
                field_name="metadata.STRIDE",
                value_a=stride_a,
                value_b=stride_b,
                similarity=self.semantic.set_similarity(stride_a or [], stride_b or []),
                comparison_method="set",
            )
        )

        # Compare Priority from metadata
        priority_a = self._extract_metadata_value(threat_a, "Priority")
        priority_b = (
            self._extract_metadata_value(threat_b, "Priority") if threat_b else None
        )
        comparisons.append(
            FieldComparison(
                field_name="metadata.Priority",
                value_a=priority_a,
                value_b=priority_b,
                similarity=1.0 if priority_a == priority_b else 0.0,
                comparison_method="exact",
            )
        )

        return comparisons

    def _extract_metadata_value(self, item: dict, key: str) -> Any:
        """Extract a value from metadata list by key."""
        metadata = item.get("metadata", []) or []
        for m in metadata:
            if m.get("key") == key:
                return m.get("value")
        return None

    def _semantic_set_similarity(self, list_a: list, list_b: list) -> float:
        """Compute semantic similarity between two lists of strings."""
        if not list_a and not list_b:
            return 1.0
        if not list_a or not list_b:
            return 0.0

        # Find best match for each item in A
        total_sim = 0.0
        for item_a in list_a:
            best_sim = max(
                self.semantic.text_similarity(str(item_a), str(item_b))
                for item_b in list_b
            )
            total_sim += best_sim

        return total_sim / len(list_a)

    def _calculate_weighted_similarity(
        self, comparisons: list[FieldComparison]
    ) -> float:
        """Calculate weighted average similarity from field comparisons."""
        total_weight = 0.0
        weighted_sum = 0.0

        for comp in comparisons:
            # Get weight from config, default to 1.0
            weight = 1.0
            if comp.field_name in self.FIELD_CONFIGS:
                weight = self.FIELD_CONFIGS[comp.field_name][1]
            elif comp.field_name == "metadata.STRIDE":
                weight = 0.8
            elif comp.field_name == "metadata.Priority":
                weight = 0.5

            weighted_sum += comp.similarity * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0.0


class MitigationComparator:
    """Compares mitigations between two runs."""

    FIELD_CONFIGS = {
        "content": ("semantic", 1.5),
        "status": ("exact", 0.3),
        "tags": ("set", 0.5),
    }

    def __init__(self, semantic_comparator: SemanticComparator):
        self.semantic = semantic_comparator

    def compare_mitigations(
        self,
        mitigations_a: list[dict],
        mitigations_b: list[dict],
        match_threshold: float = 0.4,
    ) -> list[MitigationMatchResult]:
        """Compare mitigations between two runs."""
        if not mitigations_a:
            return []

        # Extract content for matching
        content_a = [m.get("content", "") or "" for m in mitigations_a]
        content_b = [m.get("content", "") or "" for m in mitigations_b]

        matches = self.semantic.find_best_matches(content_a, content_b, match_threshold)

        results = []
        for idx_a, idx_b, _match_sim in matches:
            mit_a = mitigations_a[idx_a]
            mit_b = mitigations_b[idx_b] if idx_b is not None else None

            field_comparisons = self._compare_fields(mit_a, mit_b)
            overall_sim = self._calculate_weighted_similarity(field_comparisons)

            results.append(
                MitigationMatchResult(
                    mitigation_a_id=mit_a.get("id", ""),
                    mitigation_a_content=mit_a.get("content", ""),
                    mitigation_b_id=mit_b.get("id") if mit_b else None,
                    mitigation_b_content=mit_b.get("content") if mit_b else None,
                    match_quality=_get_match_quality(overall_sim),
                    overall_similarity=overall_sim,
                    field_comparisons=field_comparisons,
                    index_a=idx_a,
                    index_b=idx_b,
                )
            )

        return results

    def _compare_fields(self, mit_a: dict, mit_b: dict | None) -> list[FieldComparison]:
        """Compare all fields between two mitigations."""
        comparisons = []

        for field_name, (method, _weight) in self.FIELD_CONFIGS.items():
            val_a = mit_a.get(field_name)
            val_b = mit_b.get(field_name) if mit_b else None

            if method == "exact":
                sim = 1.0 if val_a == val_b else 0.0
            elif method == "semantic":
                sim = self.semantic.text_similarity(str(val_a or ""), str(val_b or ""))
            elif method == "set":
                sim = self.semantic.set_similarity(val_a or [], val_b or [])
            else:
                sim = 0.0

            comparisons.append(
                FieldComparison(
                    field_name=field_name,
                    value_a=val_a,
                    value_b=val_b,
                    similarity=sim,
                    comparison_method=method,
                )
            )

        return comparisons

    def _calculate_weighted_similarity(
        self, comparisons: list[FieldComparison]
    ) -> float:
        """Calculate weighted average similarity."""
        total_weight = 0.0
        weighted_sum = 0.0

        for comp in comparisons:
            weight = self.FIELD_CONFIGS.get(comp.field_name, ("", 1.0))[1]
            weighted_sum += comp.similarity * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0.0


class AssumptionComparator:
    """Compares assumptions between two runs."""

    FIELD_CONFIGS = {
        "content": ("semantic", 1.5),
        "tags": ("set", 0.5),
    }

    def __init__(self, semantic_comparator: SemanticComparator):
        self.semantic = semantic_comparator

    def compare_assumptions(
        self,
        assumptions_a: list[dict],
        assumptions_b: list[dict],
        match_threshold: float = 0.4,
    ) -> list[AssumptionMatchResult]:
        """Compare assumptions between two runs."""
        if not assumptions_a:
            return []

        content_a = [a.get("content", "") or "" for a in assumptions_a]
        content_b = [a.get("content", "") or "" for a in assumptions_b]

        matches = self.semantic.find_best_matches(content_a, content_b, match_threshold)

        results = []
        for idx_a, idx_b, _match_sim in matches:
            assum_a = assumptions_a[idx_a]
            assum_b = assumptions_b[idx_b] if idx_b is not None else None

            field_comparisons = self._compare_fields(assum_a, assum_b)
            overall_sim = self._calculate_weighted_similarity(field_comparisons)

            results.append(
                AssumptionMatchResult(
                    assumption_a_id=assum_a.get("id", ""),
                    assumption_a_content=assum_a.get("content", ""),
                    assumption_b_id=assum_b.get("id") if assum_b else None,
                    assumption_b_content=assum_b.get("content") if assum_b else None,
                    match_quality=_get_match_quality(overall_sim),
                    overall_similarity=overall_sim,
                    field_comparisons=field_comparisons,
                    index_a=idx_a,
                    index_b=idx_b,
                )
            )

        return results

    def _compare_fields(
        self, assum_a: dict, assum_b: dict | None
    ) -> list[FieldComparison]:
        """Compare all fields between two assumptions."""
        comparisons = []

        for field_name, (method, _weight) in self.FIELD_CONFIGS.items():
            val_a = assum_a.get(field_name)
            val_b = assum_b.get(field_name) if assum_b else None

            if method == "exact":
                sim = 1.0 if val_a == val_b else 0.0
            elif method == "semantic":
                sim = self.semantic.text_similarity(str(val_a or ""), str(val_b or ""))
            elif method == "set":
                sim = self.semantic.set_similarity(val_a or [], val_b or [])
            else:
                sim = 0.0

            comparisons.append(
                FieldComparison(
                    field_name=field_name,
                    value_a=val_a,
                    value_b=val_b,
                    similarity=sim,
                    comparison_method=method,
                )
            )

        return comparisons

    def _calculate_weighted_similarity(
        self, comparisons: list[FieldComparison]
    ) -> float:
        """Calculate weighted average similarity."""
        total_weight = 0.0
        weighted_sum = 0.0

        for comp in comparisons:
            weight = self.FIELD_CONFIGS.get(comp.field_name, ("", 1.0))[1]
            weighted_sum += comp.similarity * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0.0
