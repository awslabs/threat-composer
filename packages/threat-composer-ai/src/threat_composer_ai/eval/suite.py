"""
Suite runner for multi-target consistency evaluation.

Runs benchmarks across multiple diverse codebases to establish a
system-level consistency baseline. Aggregates per-target scores into
an overall assessment of how stable threat-composer-ai is across
different types of projects.

Suite config format (JSON or YAML):

    name: "baseline-v1"
    description: "Baseline consistency across diverse codebases"
    dimension: "baseline"
    dimension_value: "claude-sonnet-4-default"
    runs_per_target: 3

    config:
      aws_model_id: "global.anthropic.claude-sonnet-4-20250514-v1:0"
      aws_region: "us-west-2"

    targets:
      - name: "browser-extension"
        path: "./test-codebases/browser-extension"
      - name: "dns-infrastructure"
        path: "./test-codebases/dns-infra"
      - name: "ecommerce-platform"
        path: "./test-codebases/ecommerce"
"""

import json
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .benchmark import BenchmarkConfig, BenchmarkReport, BenchmarkRunner


@dataclass
class SuiteTarget:
    """A single codebase target within a suite."""

    name: str
    path: str
    # Optional per-target overrides
    runs: int | None = None  # Override suite-level runs_per_target


@dataclass
class SuiteConfig:
    """Configuration for a multi-target benchmark suite."""

    name: str
    targets: list[SuiteTarget]
    description: str = ""
    runs_per_target: int = 3

    # Shared frozen config
    aws_model_id: str | None = None
    aws_region: str | None = None
    aws_profile: str | None = None
    execution_timeout: float | None = None
    node_timeout: float | None = None

    # Output
    output_base_dir: Path | None = None

    # Validation
    skip_validation: bool = False

    # Experiment dimension
    dimension: str = "baseline"
    dimension_value: str = ""

    @classmethod
    def from_file(cls, path: str | Path) -> "SuiteConfig":
        """Load suite config from a JSON or YAML file.

        Paths in the config are resolved relative to the config file's
        parent directory.
        """
        path = Path(path)
        config_dir = path.parent.resolve()

        text = path.read_text(encoding="utf-8")

        if path.suffix in (".yaml", ".yml"):
            data = _load_yaml(text)
        else:
            data = json.loads(text)

        # Extract shared config block
        shared = data.get("config", {})

        # Parse targets
        raw_targets = data.get("targets", [])
        targets = []
        for t in raw_targets:
            target_path = t["path"]
            # Resolve relative paths against config file location
            resolved = Path(target_path)
            if not resolved.is_absolute():
                resolved = config_dir / resolved
            targets.append(
                SuiteTarget(
                    name=t["name"],
                    path=str(resolved.resolve()),
                    runs=t.get("runs"),
                )
            )

        # Resolve output_base_dir if present
        output_base = data.get("output_base_dir") or shared.get("output_base_dir")
        if output_base:
            output_path = Path(output_base)
            if not output_path.is_absolute():
                output_path = config_dir / output_path
            output_base = output_path.resolve()
        else:
            output_base = None

        return cls(
            name=data.get("name", path.stem),
            description=data.get("description", ""),
            targets=targets,
            runs_per_target=data.get("runs_per_target", 3),
            aws_model_id=shared.get("aws_model_id"),
            aws_region=shared.get("aws_region"),
            aws_profile=shared.get("aws_profile"),
            execution_timeout=shared.get("execution_timeout"),
            node_timeout=shared.get("node_timeout"),
            output_base_dir=output_base,
            skip_validation=data.get("skip_validation", False),
            dimension=data.get("dimension", "baseline"),
            dimension_value=data.get("dimension_value", ""),
        )

    def to_dict(self) -> dict:
        """Serialize to dict."""
        return {
            "name": self.name,
            "description": self.description,
            "runs_per_target": self.runs_per_target,
            "dimension": self.dimension,
            "dimension_value": self.dimension_value,
            "aws_model_id": self.aws_model_id,
            "aws_region": self.aws_region,
            "num_targets": len(self.targets),
            "targets": [{"name": t.name, "path": t.path} for t in self.targets],
        }


@dataclass
class SuiteReport:
    """Aggregated report across all targets in a suite."""

    # Suite metadata
    suite_name: str
    config: dict = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    # Per-target results
    target_results: list[dict] = field(default_factory=list)

    # Aggregate scores
    overall_consistency_score: float = 0.0
    per_target_scores: dict[str, float] = field(default_factory=dict)

    # Stats
    targets_completed: int = 0
    targets_failed: int = 0
    total_runs: int = 0
    total_successful_runs: int = 0
    total_duration_seconds: float = 0.0

    def to_json(self, path: str | Path) -> None:
        """Save report to JSON."""
        with open(path, "w") as f:
            json.dump(asdict(self), f, indent=2, default=str)

    def print_summary(self) -> None:
        """Print human-readable summary."""
        print("\n" + "=" * 70)
        print("SUITE CONSISTENCY REPORT")
        print("=" * 70)
        print(f"Suite:       {self.suite_name}")
        print(f"Timestamp:   {self.timestamp}")
        print(f"Dimension:   {self.config.get('dimension', 'baseline')}")
        dim_val = self.config.get("dimension_value", "")
        if dim_val:
            print(f"Dim Value:   {dim_val}")
        print(f"Model:       {self.config.get('aws_model_id', 'default')}")
        print(
            f"\nTargets: {self.targets_completed} completed, "
            f"{self.targets_failed} failed"
        )
        print(f"Total runs: {self.total_successful_runs}/{self.total_runs} succeeded")
        print(f"Total duration: {self.total_duration_seconds:.0f}s")

        # Per-target breakdown
        if self.per_target_scores:
            print("\n" + "-" * 50)
            print("PER-TARGET CONSISTENCY")
            print("-" * 50)

            for name, score in sorted(
                self.per_target_scores.items(), key=lambda x: x[1], reverse=True
            ):
                indicator = "✓" if score >= 0.7 else "⚠" if score >= 0.5 else "✗"
                print(f"  {indicator} {name:<30} {score:.1%}")

            scores = list(self.per_target_scores.values())
            print(f"\n  Mean:   {sum(scores) / len(scores):.1%}")
            print(f"  Min:    {min(scores):.1%}")
            print(f"  Max:    {max(scores):.1%}")
            spread = max(scores) - min(scores)
            print(f"  Spread: {spread:.1%}")

        # Overall
        print(
            f"\n{'OVERALL CONSISTENCY SCORE:':<30} {self.overall_consistency_score:.1%}"
        )

        if self.overall_consistency_score >= 0.7:
            assessment = "✓ HIGH consistency across targets"
        elif self.overall_consistency_score >= 0.5:
            assessment = "⚠ MODERATE consistency across targets"
        else:
            assessment = "✗ LOW consistency across targets"
        print(f"Assessment: {assessment}")

        print("=" * 70)


class SuiteRunner:
    """
    Orchestrates benchmarks across multiple diverse codebases
    and aggregates results into a system-level consistency score.
    """

    def __init__(self, config: SuiteConfig):
        self.config = config

    def run(self) -> SuiteReport:
        """Execute the full suite: benchmark each target, then aggregate."""
        report = SuiteReport(
            suite_name=self.config.name,
            config=self.config.to_dict(),
        )

        suite_start = time.time()
        target_reports: list[tuple[str, BenchmarkReport | None]] = []

        # Determine suite output base
        suite_output = self.config.output_base_dir or Path(
            f".threat-composer-suite/{self.config.name}"
        )
        suite_output = Path(suite_output)
        suite_output.mkdir(parents=True, exist_ok=True)

        print("\n" + "=" * 70)
        print(f"SUITE: {self.config.name}")
        print("=" * 70)
        print(f"  Description:    {self.config.description}")
        print(f"  Targets:        {len(self.config.targets)}")
        print(f"  Runs/target:    {self.config.runs_per_target}")
        print(f"  Dimension:      {self.config.dimension}")
        if self.config.aws_model_id:
            print(f"  Model:          {self.config.aws_model_id}")
        print(f"  Output:         {suite_output}")
        print()

        for idx, target in enumerate(self.config.targets):
            num_runs = target.runs or self.config.runs_per_target
            report.total_runs += num_runs

            print(f"\n{'─' * 70}")
            print(
                f"Target {idx + 1}/{len(self.config.targets)}: "
                f"{target.name} ({target.path})"
            )
            print(f"{'─' * 70}")

            # Validate target path exists
            target_path = Path(target.path)
            if not target_path.exists() or not target_path.is_dir():
                print(f"  ✗ Skipping: directory not found: {target.path}")
                report.targets_failed += 1
                target_reports.append((target.name, None))
                continue

            # Build per-target output dir
            target_output = suite_output / target.name

            # Create BenchmarkConfig for this target
            bench_config = BenchmarkConfig(
                experiment_name=f"{self.config.name}-{target.name}",
                experiment_description=(
                    f"Suite '{self.config.name}' target '{target.name}'"
                ),
                working_directory=target_path.resolve(),
                num_runs=num_runs,
                aws_model_id=self.config.aws_model_id,
                aws_region=self.config.aws_region,
                aws_profile=self.config.aws_profile,
                execution_timeout=self.config.execution_timeout,
                node_timeout=self.config.node_timeout,
                output_base_dir=target_output,
                skip_validation=self.config.skip_validation,
                dimension=self.config.dimension,
                dimension_value=self.config.dimension_value,
            )

            try:
                runner = BenchmarkRunner(bench_config)
                bench_report = runner.run()
                target_reports.append((target.name, bench_report))

                report.total_successful_runs += bench_report.successful_runs
                report.targets_completed += 1

                if bench_report.successful_runs >= 2:
                    report.per_target_scores[target.name] = (
                        bench_report.consistency_score
                    )
                else:
                    print(f"  ⚠ {target.name}: insufficient successful runs for eval")

            except KeyboardInterrupt:
                print(f"\n  Suite interrupted at target: {target.name}")
                target_reports.append((target.name, None))
                break
            except Exception as e:
                print(f"  ✗ {target.name} failed: {e}")
                report.targets_failed += 1
                target_reports.append((target.name, None))

        # Aggregate
        report.total_duration_seconds = time.time() - suite_start

        if report.per_target_scores:
            scores = list(report.per_target_scores.values())
            report.overall_consistency_score = sum(scores) / len(scores)

        # Build target_results for serialization
        for name, bench_report in target_reports:
            if bench_report:
                report.target_results.append(
                    {
                        "target_name": name,
                        "consistency_score": bench_report.consistency_score,
                        "successful_runs": bench_report.successful_runs,
                        "failed_runs": bench_report.failed_runs,
                        "duration_seconds": bench_report.total_duration_seconds,
                        "eval_summary": bench_report.eval_summary,
                    }
                )
            else:
                report.target_results.append(
                    {
                        "target_name": name,
                        "consistency_score": 0.0,
                        "successful_runs": 0,
                        "failed_runs": 0,
                        "duration_seconds": 0.0,
                        "error": "Target skipped or failed",
                    }
                )

        # Save suite report
        report_path = suite_output / f"suite-report-{self.config.name}.json"
        report.to_json(report_path)
        print(f"\nSuite report saved to: {report_path}")

        return report


def _load_yaml(text: str) -> dict:
    """Load YAML text, with graceful fallback if pyyaml not installed."""
    try:
        import yaml

        return yaml.safe_load(text)
    except ImportError:
        raise ImportError(
            "PyYAML is required for YAML suite configs. "
            "Install it with: pip install pyyaml\n"
            "Alternatively, use a JSON config file instead."
        ) from None
