"""
Benchmark runner for consistency evaluation.

Runs threat-composer-ai N times against the same source code with identical config,
then evaluates consistency across all runs.

Supports scoped experiments along 3 dimensions:
- Model change (aws-model-id)
- System prompt change (future)
- Tool change (future)
"""

import json
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from ..core import WorkflowRunner


@dataclass
class BenchmarkConfig:
    """Configuration for a benchmark experiment."""

    # Experiment identity
    experiment_name: str
    experiment_description: str = ""

    # Source under test
    working_directory: Path = field(default_factory=lambda: Path("."))

    # How many runs
    num_runs: int = 3

    # Frozen config (same for every run)
    aws_model_id: str | None = None
    aws_region: str | None = None
    aws_profile: str | None = None
    execution_timeout: float | None = None
    node_timeout: float | None = None

    # Output
    output_base_dir: Path | None = None

    # Validation
    skip_validation: bool = False

    # Telemetry
    enable_telemetry: bool = False

    # Experiment dimension tags (for later comparison)
    dimension: str = "baseline"  # "baseline", "model", "prompt", "tools"
    dimension_value: str = ""  # e.g. "claude-sonnet-4", "v2-prompt", etc.

    def to_dict(self) -> dict:
        """Serialize to dict."""
        d = {}
        for k, v in self.__dict__.items():
            if isinstance(v, Path):
                d[k] = str(v)
            else:
                d[k] = v
        return d


@dataclass
class RunResult:
    """Result of a single benchmark run."""

    run_index: int
    run_path: Path | None = None
    success: bool = False
    error: str | None = None
    duration_seconds: float = 0.0
    start_time: str = ""
    end_time: str = ""


@dataclass
class BenchmarkReport:
    """Complete benchmark report with run results and eval scores."""

    # Experiment metadata
    experiment_name: str
    config: dict = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    # Run results
    runs: list[dict] = field(default_factory=list)
    successful_runs: int = 0
    failed_runs: int = 0

    # Eval results (from matrix comparison)
    eval_summary: dict = field(default_factory=dict)
    pairwise_scores: list[dict] = field(default_factory=list)
    consistency_score: float = 0.0

    # Timing
    total_duration_seconds: float = 0.0

    def to_json(self, path: str | Path) -> None:
        """Save report to JSON."""
        with open(path, "w") as f:
            json.dump(asdict(self), f, indent=2, default=str)

    def print_summary(self) -> None:
        """Print human-readable summary."""
        print("\n" + "=" * 70)
        print("BENCHMARK CONSISTENCY REPORT")
        print("=" * 70)
        print(f"Experiment: {self.experiment_name}")
        print(f"Timestamp:  {self.timestamp}")
        print(f"Config:     {json.dumps(self.config, indent=2, default=str)}")

        print(f"\nRuns: {self.successful_runs} succeeded, {self.failed_runs} failed")
        print(f"Total duration: {self.total_duration_seconds:.0f}s")

        for run in self.runs:
            status = "✓" if run["success"] else "✗"
            duration = run.get("duration_seconds", 0)
            path = run.get("run_path", "N/A")
            error = run.get("error", "")
            print(f"  {status} Run {run['run_index']}: {path} ({duration:.0f}s)")
            if error:
                print(f"    Error: {error}")

        if self.successful_runs >= 2:
            print(f"\n{'OVERALL CONSISTENCY SCORE:':<30} {self.consistency_score:.1%}")

            if self.pairwise_scores:
                print("\nPairwise scores:")
                for pair in self.pairwise_scores:
                    print(
                        f"  Run {pair['run_a']} ↔ Run {pair['run_b']}: "
                        f"{pair['score']:.1%}"
                    )

            if self.eval_summary:
                avg = self.eval_summary.get("average", 0)
                mn = self.eval_summary.get("min", 0)
                mx = self.eval_summary.get("max", 0)
                print(f"\nAverage: {avg:.1%}  Min: {mn:.1%}  Max: {mx:.1%}")

            if self.consistency_score >= 0.7:
                assessment = "✓ HIGH consistency"
            elif self.consistency_score >= 0.5:
                assessment = "⚠ MODERATE consistency"
            else:
                assessment = "✗ LOW consistency"
            print(f"\nAssessment: {assessment}")
        else:
            print("\nInsufficient successful runs for eval (need >= 2)")

        print("=" * 70)


class BenchmarkRunner:
    """
    Orchestrates N runs of threat-composer-ai with identical config,
    then evaluates consistency across all runs.
    """

    def __init__(self, config: BenchmarkConfig):
        self.config = config
        self._shutdown_event = threading.Event()

    def run(self) -> BenchmarkReport:
        """Execute the full benchmark: N runs + eval."""
        report = BenchmarkReport(
            experiment_name=self.config.experiment_name,
            config=self.config.to_dict(),
        )

        benchmark_start = time.time()
        run_results: list[RunResult] = []

        # Determine output base
        output_base = self.config.output_base_dir or (
            self.config.working_directory / ".threat-composer"
        )

        print(f"\nStarting benchmark: {self.config.experiment_name}")
        print(f"  Working directory: {self.config.working_directory}")
        print(f"  Number of runs:    {self.config.num_runs}")
        print(f"  Output base:       {output_base}")
        if self.config.aws_model_id:
            print(f"  Model:             {self.config.aws_model_id}")
        print()

        # Execute N runs sequentially
        for i in range(self.config.num_runs):
            if self._shutdown_event.is_set():
                print(f"\nBenchmark interrupted at run {i + 1}")
                break

            result = self._execute_single_run(i, output_base)
            run_results.append(result)

            if result.success:
                report.successful_runs += 1
                print(
                    f"  ✓ Run {i + 1}/{self.config.num_runs} completed "
                    f"({result.duration_seconds:.0f}s) → {result.run_path}"
                )
            else:
                report.failed_runs += 1
                print(f"  ✗ Run {i + 1}/{self.config.num_runs} failed: {result.error}")

        report.runs = [self._run_result_to_dict(r) for r in run_results]
        report.total_duration_seconds = time.time() - benchmark_start

        # Run eval if we have >= 2 successful runs
        successful_paths = [r.run_path for r in run_results if r.success and r.run_path]

        if len(successful_paths) >= 2:
            print(f"\nRunning eval across {len(successful_paths)} runs...")
            eval_result = self._run_eval(successful_paths)
            report.consistency_score = eval_result.get("average", 0.0)
            report.eval_summary = eval_result.get("summary", {})
            report.pairwise_scores = eval_result.get("pairs", [])

        # Save report
        report_path = output_base / f"benchmark-{self.config.experiment_name}.json"
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report.to_json(report_path)
        print(f"\nBenchmark report saved to: {report_path}")

        return report

    def _execute_single_run(self, run_index: int, output_base: Path) -> RunResult:
        """Execute a single threat modeling run."""
        result = RunResult(run_index=run_index)
        start = time.time()
        result.start_time = datetime.now(timezone.utc).isoformat()

        try:
            runner = WorkflowRunner.create_from_params(
                working_directory=self.config.working_directory,
                output_directory=output_base,
                aws_region=self.config.aws_region,
                aws_model_id=self.config.aws_model_id,
                aws_profile=self.config.aws_profile,
                execution_timeout=self.config.execution_timeout,
                node_timeout=self.config.node_timeout,
                enable_telemetry=self.config.enable_telemetry,
                invocation_source="BENCHMARK",
                setup_logging=(run_index == 0),  # Only log banner on first run
            )

            invocation_args = {
                "benchmark": True,
                "experiment_name": self.config.experiment_name,
                "run_index": run_index,
                "num_runs": self.config.num_runs,
                "aws_model_id": self.config.aws_model_id,
                "aws_region": self.config.aws_region,
            }

            success, error = runner.setup(
                invocation_args=invocation_args,
                skip_validation=self.config.skip_validation or (run_index > 0),
            )

            if not success:
                result.error = error
                return result

            runner.execute_sync()

            result.success = True
            result.run_path = runner.config.output_directory

        except KeyboardInterrupt:
            self._shutdown_event.set()
            result.error = "Interrupted by user"
        except Exception as e:
            result.error = str(e)
        finally:
            result.end_time = datetime.now(timezone.utc).isoformat()
            result.duration_seconds = time.time() - start

        return result

    def _run_eval(self, run_paths: list[Path]) -> dict:
        """Run pairwise eval across all successful runs."""
        from .evaluator import ThreatModelEvaluator

        evaluator = ThreatModelEvaluator(use_embeddings=True)
        n = len(run_paths)
        pairs = []
        all_scores = []

        for i in range(n):
            for j in range(i + 1, n):
                report = evaluator.compare_runs(run_paths[i], run_paths[j])
                score = report.overall_consistency_score
                all_scores.append(score)
                pairs.append(
                    {
                        "run_a": i,
                        "run_a_path": str(run_paths[i]),
                        "run_b": j,
                        "run_b_path": str(run_paths[j]),
                        "score": score,
                        "component_scores": report.get_component_scores(),
                    }
                )

        avg = sum(all_scores) / len(all_scores) if all_scores else 0.0
        mn = min(all_scores) if all_scores else 0.0
        mx = max(all_scores) if all_scores else 0.0

        return {
            "average": avg,
            "pairs": pairs,
            "summary": {
                "average": avg,
                "min": mn,
                "max": mx,
                "num_pairs": len(pairs),
                "num_runs": n,
            },
        }

    @staticmethod
    def _run_result_to_dict(r: RunResult) -> dict:
        """Convert RunResult to serializable dict."""
        return {
            "run_index": r.run_index,
            "run_path": str(r.run_path) if r.run_path else None,
            "success": r.success,
            "error": r.error,
            "duration_seconds": r.duration_seconds,
            "start_time": r.start_time,
            "end_time": r.end_time,
        }
