"""
Tests for the threat model evaluation module.
"""

import json

import pytest

from threat_composer_ai.eval import (
    RunLoader,
    SemanticComparator,
    ThreatComparator,
    ThreatModelEvaluator,
)


class TestSemanticComparator:
    """Tests for SemanticComparator."""

    def test_exact_match(self):
        """Exact strings should have similarity 1.0."""
        comp = SemanticComparator(use_embeddings=False)
        assert comp.text_similarity("hello world", "hello world") == 1.0

    def test_empty_strings(self):
        """Empty strings should handle gracefully."""
        comp = SemanticComparator(use_embeddings=False)
        assert comp.text_similarity("", "") == 1.0
        assert comp.text_similarity("hello", "") == 0.0

    def test_jaccard_similarity(self):
        """Jaccard fallback should work."""
        comp = SemanticComparator(use_embeddings=False)
        # "hello world" vs "hello there" share "hello"
        sim = comp.text_similarity("hello world", "hello there")
        assert 0.0 < sim < 1.0

    def test_set_similarity(self):
        """Set similarity should compute Jaccard correctly."""
        comp = SemanticComparator(use_embeddings=False)

        # Identical sets
        assert comp.set_similarity(["a", "b"], ["a", "b"]) == 1.0

        # Disjoint sets
        assert comp.set_similarity(["a", "b"], ["c", "d"]) == 0.0

        # Partial overlap
        sim = comp.set_similarity(["a", "b", "c"], ["b", "c", "d"])
        assert sim == pytest.approx(0.5)  # 2 shared out of 4 total


class TestThreatComparator:
    """Tests for ThreatComparator."""

    @pytest.fixture
    def comparator(self):
        semantic = SemanticComparator(use_embeddings=False)
        return ThreatComparator(semantic)

    def test_identical_threats(self, comparator):
        """Identical threats should match with high similarity."""
        threats = [
            {
                "id": "123",
                "statement": "An attacker can exploit the API",
                "threatSource": "external attacker",
                "threatAction": "exploit the API",
                "impactedGoal": ["confidentiality"],
                "tags": ["API", "Security"],
            }
        ]

        results = comparator.compare_threats(threats, threats)

        assert len(results) == 1
        assert results[0].is_matched
        assert results[0].overall_similarity > 0.9

    def test_no_match(self, comparator):
        """Completely different threats should not match."""
        threats_a = [
            {
                "id": "123",
                "statement": "An attacker can steal credentials",
                "threatSource": "external attacker",
            }
        ]
        threats_b = [
            {
                "id": "456",
                "statement": "A system failure causes data loss",
                "threatSource": "system failure",
            }
        ]

        results = comparator.compare_threats(threats_a, threats_b, match_threshold=0.8)

        assert len(results) == 1
        # With high threshold, these shouldn't match
        assert not results[0].is_matched or results[0].overall_similarity < 0.5

    def test_empty_threats(self, comparator):
        """Empty threat lists should handle gracefully."""
        results = comparator.compare_threats([], [])
        assert results == []

        results = comparator.compare_threats([{"id": "1", "statement": "test"}], [])
        assert len(results) == 1
        assert not results[0].is_matched


class TestRunLoader:
    """Tests for RunLoader."""

    def test_load_run(self, tmp_path):
        """Test loading a run from directory."""
        # Create mock run structure
        run_dir = tmp_path / "20260123-0100"
        components_dir = run_dir / "components"
        components_dir.mkdir(parents=True)

        # Create mock applicationInfo.tc.json
        app_info = {
            "schema": 1,
            "applicationInfo": {"name": "Test App", "description": "Test description"},
            "assumptions": [{"id": "1", "content": "Test assumption"}],
        }
        (components_dir / "applicationInfo.tc.json").write_text(json.dumps(app_info))

        # Create mock threats.tc.json
        threats = {
            "schema": 1,
            "threats": [{"id": "t1", "statement": "Test threat"}],
        }
        (components_dir / "threats.tc.json").write_text(json.dumps(threats))

        # Load and verify
        loader = RunLoader()
        run_data = loader.load_run(run_dir)

        assert run_data.timestamp == "20260123-0100"
        assert run_data.application_info_raw is not None
        assert run_data.threats_raw is not None
        assert len(run_data.threats) == 1
        assert len(run_data.assumptions) == 1


class TestThreatModelEvaluator:
    """Integration tests for ThreatModelEvaluator."""

    def test_compare_identical_runs(self, tmp_path):
        """Comparing identical runs should give high consistency."""
        # Create two identical runs
        for run_name in ["run_a", "run_b"]:
            run_dir = tmp_path / run_name / "components"
            run_dir.mkdir(parents=True)

            app_info = {
                "schema": 1,
                "applicationInfo": {
                    "name": "Test App",
                    "description": "A test application",
                },
                "assumptions": [{"id": "a1", "content": "Users are authenticated"}],
            }
            (run_dir / "applicationInfo.tc.json").write_text(json.dumps(app_info))

            threats = {
                "schema": 1,
                "threats": [
                    {
                        "id": "t1",
                        "statement": "An attacker can exploit the login API",
                        "threatSource": "external attacker",
                        "threatAction": "exploit the login API",
                        "impactedGoal": ["confidentiality"],
                        "metadata": [{"key": "STRIDE", "value": ["S"]}],
                    }
                ],
            }
            (run_dir / "threats.tc.json").write_text(json.dumps(threats))

            mitigations = {
                "schema": 1,
                "mitigations": [{"id": "m1", "content": "Implement rate limiting"}],
            }
            (run_dir / "mitigations.tc.json").write_text(json.dumps(mitigations))

        # Compare
        evaluator = ThreatModelEvaluator(use_embeddings=False)
        report = evaluator.compare_runs(tmp_path / "run_a", tmp_path / "run_b")

        # Should have very high consistency
        assert report.overall_consistency_score > 0.9
        assert report.threats_score.matched_count == 1

    def test_compare_different_runs(self, tmp_path):
        """Comparing different runs should show lower consistency."""
        # Run A
        run_a = tmp_path / "run_a" / "components"
        run_a.mkdir(parents=True)
        (run_a / "applicationInfo.tc.json").write_text(
            json.dumps(
                {
                    "schema": 1,
                    "applicationInfo": {
                        "name": "App A",
                        "description": "First application",
                    },
                }
            )
        )
        (run_a / "threats.tc.json").write_text(
            json.dumps(
                {
                    "schema": 1,
                    "threats": [{"id": "t1", "statement": "SQL injection attack"}],
                }
            )
        )

        # Run B - different content
        run_b = tmp_path / "run_b" / "components"
        run_b.mkdir(parents=True)
        (run_b / "applicationInfo.tc.json").write_text(
            json.dumps(
                {
                    "schema": 1,
                    "applicationInfo": {
                        "name": "App B",
                        "description": "Different application",
                    },
                }
            )
        )
        (run_b / "threats.tc.json").write_text(
            json.dumps(
                {
                    "schema": 1,
                    "threats": [{"id": "t2", "statement": "Denial of service attack"}],
                }
            )
        )

        evaluator = ThreatModelEvaluator(use_embeddings=False)
        report = evaluator.compare_runs(tmp_path / "run_a", tmp_path / "run_b")

        # Should have lower consistency
        assert report.overall_consistency_score < 0.9

    def test_report_to_json(self, tmp_path):
        """Test saving report to JSON."""
        # Create minimal runs
        for run_name in ["run_a", "run_b"]:
            run_dir = tmp_path / run_name / "components"
            run_dir.mkdir(parents=True)
            (run_dir / "applicationInfo.tc.json").write_text(
                json.dumps(
                    {
                        "schema": 1,
                        "applicationInfo": {"name": "Test"},
                    }
                )
            )

        evaluator = ThreatModelEvaluator(use_embeddings=False)
        report = evaluator.compare_runs(tmp_path / "run_a", tmp_path / "run_b")

        output_path = tmp_path / "report.json"
        report.to_json(output_path)

        assert output_path.exists()
        with open(output_path) as f:
            data = json.load(f)
        assert "overall_consistency_score" in data
