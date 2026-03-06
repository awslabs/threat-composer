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


def _write_threatmodel(run_dir, data):
    """Helper to write a threatmodel.tc.json into a run directory."""
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "threatmodel.tc.json").write_text(json.dumps(data))


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
        """Test loading a run from threatmodel.tc.json."""
        run_dir = tmp_path / "20260123-0100"
        _write_threatmodel(
            run_dir,
            {
                "schema": 1,
                "applicationInfo": {
                    "name": "Test App",
                    "description": "Test description",
                },
                "architecture": {"description": "Microservices architecture"},
                "dataflow": {"description": "API gateway to backend"},
                "assumptions": [{"id": "1", "content": "Test assumption"}],
                "threats": [{"id": "t1", "statement": "Test threat"}],
                "mitigations": [{"id": "m1", "content": "Test mitigation"}],
                "mitigationLinks": [{"mitigationId": "m1", "linkedId": "t1"}],
                "assumptionLinks": [],
            },
        )

        loader = RunLoader()
        run_data = loader.load_run(run_dir)

        assert run_data.timestamp == "20260123-0100"
        assert run_data.application_info["name"] == "Test App"
        assert run_data.architecture["description"] == "Microservices architecture"
        assert run_data.dataflow["description"] == "API gateway to backend"
        assert len(run_data.threats) == 1
        assert len(run_data.mitigations) == 1
        assert len(run_data.assumptions) == 1
        assert len(run_data.mitigation_links) == 1

    def test_load_run_missing_file(self, tmp_path):
        """Test error when threatmodel.tc.json is missing."""
        run_dir = tmp_path / "20260123-0100"
        run_dir.mkdir(parents=True)

        loader = RunLoader()
        with pytest.raises(FileNotFoundError, match="Threat model file not found"):
            loader.load_run(run_dir)

    def test_load_run_direct_file(self, tmp_path):
        """Test loading by pointing directly to a .tc.json file."""
        run_dir = tmp_path / "20260123-0100"
        _write_threatmodel(
            run_dir,
            {
                "schema": 1,
                "applicationInfo": {"name": "Direct"},
                "threats": [{"id": "t1", "statement": "Test"}],
            },
        )

        loader = RunLoader()
        run_data = loader.load_run(run_dir / "threatmodel.tc.json")

        assert run_data.application_info["name"] == "Direct"
        assert len(run_data.threats) == 1

    def test_backward_compat_raw_accessors(self, tmp_path):
        """Test that *_raw properties work for evaluator compatibility."""
        run_dir = tmp_path / "20260123-0100"
        _write_threatmodel(
            run_dir,
            {
                "schema": 1,
                "applicationInfo": {"name": "Test", "description": "Desc"},
                "architecture": {"description": "Arch desc"},
                "dataflow": {"description": "DF desc"},
            },
        )

        loader = RunLoader()
        run_data = loader.load_run(run_dir)

        # These are used by evaluator._compare_application_info etc.
        assert run_data.application_info_raw["applicationInfo"]["name"] == "Test"
        assert run_data.architecture_raw["architecture"]["description"] == "Arch desc"
        assert run_data.dataflow_raw["dataflow"]["description"] == "DF desc"

    def test_find_runs(self, tmp_path):
        """Test finding run directories with threatmodel.tc.json."""
        for name in ["20260101-0100", "20260102-0200", "20260103-0300"]:
            _write_threatmodel(tmp_path / name, {"schema": 1})

        # Also create a dir without threatmodel.tc.json — should be skipped
        (tmp_path / "no-threatmodel").mkdir()

        loader = RunLoader()
        runs = loader.find_runs(tmp_path)

        assert len(runs) == 3
        assert runs[0].name == "20260101-0100"
        assert runs[2].name == "20260103-0300"


class TestThreatModelEvaluator:
    """Integration tests for ThreatModelEvaluator."""

    def test_compare_identical_runs(self, tmp_path):
        """Comparing identical runs should give high consistency."""
        tm_data = {
            "schema": 1,
            "applicationInfo": {
                "name": "Test App",
                "description": "A test application",
            },
            "architecture": {"description": "Simple architecture"},
            "dataflow": {"description": "Simple dataflow"},
            "assumptions": [{"id": "a1", "content": "Users are authenticated"}],
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
            "mitigations": [{"id": "m1", "content": "Implement rate limiting"}],
            "mitigationLinks": [],
            "assumptionLinks": [],
        }

        for run_name in ["run_a", "run_b"]:
            _write_threatmodel(tmp_path / run_name, tm_data)

        evaluator = ThreatModelEvaluator(use_embeddings=False)
        report = evaluator.compare_runs(tmp_path / "run_a", tmp_path / "run_b")

        assert report.overall_consistency_score > 0.9
        assert report.threats_score.matched_count == 1

    def test_compare_different_runs(self, tmp_path):
        """Comparing different runs should show lower consistency."""
        _write_threatmodel(
            tmp_path / "run_a",
            {
                "schema": 1,
                "applicationInfo": {
                    "name": "App A",
                    "description": "First application",
                },
                "threats": [{"id": "t1", "statement": "SQL injection attack"}],
            },
        )

        _write_threatmodel(
            tmp_path / "run_b",
            {
                "schema": 1,
                "applicationInfo": {
                    "name": "App B",
                    "description": "Different application",
                },
                "threats": [{"id": "t2", "statement": "Denial of service attack"}],
            },
        )

        evaluator = ThreatModelEvaluator(use_embeddings=False)
        report = evaluator.compare_runs(tmp_path / "run_a", tmp_path / "run_b")

        assert report.overall_consistency_score < 0.9

    def test_report_to_json(self, tmp_path):
        """Test saving report to JSON."""
        for run_name in ["run_a", "run_b"]:
            _write_threatmodel(
                tmp_path / run_name,
                {
                    "schema": 1,
                    "applicationInfo": {"name": "Test"},
                },
            )

        evaluator = ThreatModelEvaluator(use_embeddings=False)
        report = evaluator.compare_runs(tmp_path / "run_a", tmp_path / "run_b")

        output_path = tmp_path / "report.json"
        report.to_json(output_path)

        assert output_path.exists()
        with open(output_path) as f:
            data = json.load(f)
        assert "overall_consistency_score" in data
