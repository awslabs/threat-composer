"""
CLI commands for threat model evaluation.
"""

import json
from pathlib import Path

import click

from .benchmark import BenchmarkConfig, BenchmarkRunner
from .evaluator import ThreatModelEvaluator
from .suite import SuiteConfig, SuiteRunner


@click.group()
def eval_cli():
    """Threat model evaluation commands."""
    pass


@eval_cli.command("compare")
@click.argument("run_a", type=click.Path(exists=True, path_type=Path))
@click.argument("run_b", type=click.Path(exists=True, path_type=Path))
@click.option(
    "--output",
    "-o",
    type=click.Path(path_type=Path),
    help="Output JSON file for detailed results",
)
@click.option(
    "--threshold",
    type=float,
    default=0.4,
    help="Minimum similarity threshold for matching (default: 0.4)",
)
@click.option("--verbose", "-v", is_flag=True, help="Show detailed match information")
def compare_runs(
    run_a: Path,
    run_b: Path,
    output: Path | None,
    threshold: float,
    verbose: bool,
):
    """
    Compare two threat model runs for consistency.

    RUN_A: Path to first run directory (baseline)
    RUN_B: Path to second run directory (comparison)
    """
    click.echo("Comparing runs...")
    click.echo(f"  Run A: {run_a}")
    click.echo(f"  Run B: {run_b}")

    evaluator = ThreatModelEvaluator(
        match_threshold=threshold,
    )

    try:
        report = evaluator.compare_runs(run_a, run_b)
    except FileNotFoundError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    # Print summary
    report.print_summary()

    # Show detailed matches if verbose
    if verbose:
        _print_verbose_matches(report)

    # Save to file if requested
    if output:
        report.to_json(output)
        click.echo(f"\nDetailed results saved to: {output}")

    # Return exit code based on consistency
    if report.overall_consistency_score < 0.5:
        click.echo("\n⚠ Warning: Low consistency score detected")
        raise SystemExit(2)


@eval_cli.command("latest")
@click.argument("base_path", type=click.Path(exists=True, path_type=Path))
@click.option(
    "--output",
    "-o",
    type=click.Path(path_type=Path),
    help="Output JSON file for detailed results",
)
def compare_latest(
    base_path: Path,
    output: Path | None,
):
    """
    Compare the two most recent runs in a directory.

    BASE_PATH: Directory containing run folders (e.g., .threat-composer/)
    """
    evaluator = ThreatModelEvaluator()

    report = evaluator.find_and_compare_latest(base_path)

    if report is None:
        click.echo("Error: Need at least 2 runs to compare", err=True)
        raise SystemExit(1)

    report.print_summary()

    if output:
        report.to_json(output)
        click.echo(f"\nDetailed results saved to: {output}")


@eval_cli.command("history")
@click.argument("base_path", type=click.Path(exists=True, path_type=Path))
@click.option(
    "--output",
    "-o",
    type=click.Path(path_type=Path),
    help="Output JSON file for history data",
)
def eval_history(
    base_path: Path,
    output: Path | None,
):
    """
    Evaluate consistency across all runs in a directory.

    Compares each consecutive pair of runs to show consistency trends.

    BASE_PATH: Directory containing run folders (e.g., .threat-composer/)
    """
    from .loader import RunLoader

    loader = RunLoader()
    runs = loader.find_runs(base_path)

    if len(runs) < 2:
        click.echo("Error: Need at least 2 runs for history analysis", err=True)
        raise SystemExit(1)

    click.echo(f"Found {len(runs)} runs")
    click.echo("\nConsistency History (consecutive pairs):")
    click.echo("-" * 60)

    evaluator = ThreatModelEvaluator()
    history = []

    for i in range(len(runs) - 1):
        run_a = runs[i]
        run_b = runs[i + 1]

        report = evaluator.compare_runs(run_a, run_b)

        score = report.overall_consistency_score
        indicator = "✓" if score >= 0.7 else "⚠" if score >= 0.5 else "✗"

        click.echo(f"{indicator} {run_a.name} → {run_b.name}: {score:.1%}")

        history.append(
            {
                "run_a": run_a.name,
                "run_b": run_b.name,
                "overall_score": score,
                "component_scores": report.get_component_scores(),
            }
        )

    # Summary statistics
    scores = [h["overall_score"] for h in history]
    avg_score = sum(scores) / len(scores)
    min_score = min(scores)
    max_score = max(scores)

    click.echo("\n" + "-" * 60)
    click.echo("SUMMARY")
    click.echo("-" * 60)
    click.echo(f"Average consistency: {avg_score:.1%}")
    click.echo(f"Min: {min_score:.1%}  Max: {max_score:.1%}")
    click.echo(
        f"Trend: {'↑ Improving' if scores[-1] > scores[0] else '↓ Declining' if scores[-1] < scores[0] else '→ Stable'}"
    )

    if output:
        with open(output, "w") as f:
            json.dump(
                {
                    "runs": [str(r) for r in runs],
                    "history": history,
                    "summary": {
                        "average": avg_score,
                        "min": min_score,
                        "max": max_score,
                    },
                },
                f,
                indent=2,
            )
        click.echo(f"\nHistory data saved to: {output}")


@eval_cli.command("benchmark")
@click.argument(
    "directory_path",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
)
@click.option(
    "--runs",
    "-n",
    type=int,
    default=3,
    help="Number of runs to execute (default: 3)",
)
@click.option(
    "--name",
    type=str,
    default=None,
    help="Experiment name (default: auto-generated from timestamp)",
)
@click.option(
    "--description",
    type=str,
    default="",
    help="Experiment description",
)
@click.option(
    "--output-dir",
    "-o",
    type=click.Path(path_type=Path),
    help="Base output directory for all runs",
)
@click.option("--aws-region", type=str, help="AWS region for Bedrock API calls")
@click.option(
    "--aws-model-id", type=str, help="AWS Bedrock model ID (frozen across all runs)"
)
@click.option("--aws-profile", type=str, help="AWS profile name")
@click.option(
    "--execution-timeout", type=float, help="Maximum execution timeout in seconds"
)
@click.option(
    "--node-timeout", type=float, help="Maximum timeout per agent node in seconds"
)
@click.option(
    "--skip-validation",
    is_flag=True,
    help="Skip AWS credential validation",
)
@click.option(
    "--enable-telemetry",
    is_flag=True,
    help="Enable Jaeger telemetry tracing",
)
@click.option(
    "--dimension",
    type=click.Choice(["baseline", "model", "prompt", "tools", "temperature"]),
    default="baseline",
    help="Experiment dimension being tested (default: baseline)",
)
@click.option(
    "--dimension-value",
    type=str,
    default="",
    help="Value for the experiment dimension (e.g. model name, prompt version)",
)
def benchmark(
    directory_path: Path,
    runs: int,
    name: str | None,
    description: str,
    output_dir: Path | None,
    aws_region: str | None,
    aws_model_id: str | None,
    aws_profile: str | None,
    execution_timeout: float | None,
    node_timeout: float | None,
    skip_validation: bool,
    enable_telemetry: bool,
    dimension: str,
    dimension_value: str,
):
    """
    Run threat modeling N times and evaluate consistency.

    Executes threat-composer-ai against DIRECTORY_PATH multiple times with
    identical configuration, then runs pairwise eval across all successful
    runs to produce a consistency score.

    \b
    Examples:
        # Baseline: 5 runs with default model
        threat-composer-ai-eval benchmark ./my-app -n 5

        # Model experiment: test a different model
        threat-composer-ai-eval benchmark ./my-app -n 3 \\
            --aws-model-id us.anthropic.claude-sonnet-4-20250514-v1:0 \\
            --dimension model \\
            --dimension-value claude-sonnet-4

        # Custom output location
        threat-composer-ai-eval benchmark ./my-app -n 3 -o ./benchmarks/
    """
    from datetime import datetime, timezone

    if runs < 2:
        click.echo("Error: Need at least 2 runs for consistency evaluation", err=True)
        raise SystemExit(1)

    experiment_name = (
        name or f"benchmark-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    )

    config = BenchmarkConfig(
        experiment_name=experiment_name,
        experiment_description=description,
        working_directory=directory_path.resolve(),
        num_runs=runs,
        aws_model_id=aws_model_id,
        aws_region=aws_region,
        aws_profile=aws_profile,
        execution_timeout=execution_timeout,
        node_timeout=node_timeout,
        output_base_dir=output_dir.resolve() if output_dir else None,
        skip_validation=skip_validation,
        enable_telemetry=enable_telemetry,
        dimension=dimension,
        dimension_value=dimension_value or (aws_model_id or "default"),
    )

    runner = BenchmarkRunner(config)
    report = runner.run()
    report.print_summary()

    if report.successful_runs < 2:
        raise SystemExit(1)
    if report.consistency_score < 0.5:
        raise SystemExit(2)


@eval_cli.command("suite")
@click.argument(
    "config_file",
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
)
@click.option(
    "--output-dir",
    "-o",
    type=click.Path(path_type=Path),
    help="Override output directory for all suite results",
)
@click.option(
    "--runs",
    "-n",
    type=int,
    default=None,
    help="Override runs_per_target from config file",
)
@click.option("--aws-region", type=str, help="Override AWS region from config")
@click.option("--aws-model-id", type=str, help="Override model ID from config")
@click.option("--aws-profile", type=str, help="Override AWS profile from config")
@click.option(
    "--skip-validation",
    is_flag=True,
    help="Skip AWS credential validation",
)
def suite(
    config_file: Path,
    output_dir: Path | None,
    runs: int | None,
    aws_region: str | None,
    aws_model_id: str | None,
    aws_profile: str | None,
    skip_validation: bool,
):
    """
    Run benchmarks across multiple codebases from a config file.

    CONFIG_FILE: Path to a JSON or YAML suite configuration file.

    \b
    The config file defines multiple target codebases and shared settings.
    Each target is benchmarked independently, then results are aggregated
    into an overall consistency score.

    \b
    Example JSON config (suite.json):
        {
          "name": "baseline-v1",
          "description": "Baseline across diverse codebases",
          "runs_per_target": 3,
          "config": {
            "aws_model_id": "global.anthropic.claude-sonnet-4-20250514-v1:0"
          },
          "targets": [
            {"name": "browser-ext", "path": "./codebases/browser-ext"},
            {"name": "dns-infra", "path": "./codebases/dns-infra"},
            {"name": "ecommerce", "path": "./codebases/ecommerce"}
          ]
        }

    \b
    Example YAML config (suite.yaml) - requires pyyaml:
        name: baseline-v1
        runs_per_target: 3
        config:
          aws_model_id: global.anthropic.claude-sonnet-4-20250514-v1:0
        targets:
          - name: browser-ext
            path: ./codebases/browser-ext
          - name: dns-infra
            path: ./codebases/dns-infra

    \b
    Examples:
        threat-composer-ai-eval suite ./suite.json
        threat-composer-ai-eval suite ./suite.yaml -n 5
        threat-composer-ai-eval suite ./suite.json -o ./results/
    """
    config = SuiteConfig.from_file(config_file)

    # Apply CLI overrides
    if runs is not None:
        config.runs_per_target = runs
    if aws_region:
        config.aws_region = aws_region
    if aws_model_id:
        config.aws_model_id = aws_model_id
    if aws_profile:
        config.aws_profile = aws_profile
    if skip_validation:
        config.skip_validation = True
    if output_dir:
        config.output_base_dir = output_dir.resolve()

    if not config.targets:
        click.echo("Error: No targets defined in suite config", err=True)
        raise SystemExit(1)

    runner = SuiteRunner(config)
    report = runner.run()
    report.print_summary()

    if report.targets_completed == 0:
        raise SystemExit(1)
    if report.overall_consistency_score < 0.5:
        raise SystemExit(2)


@eval_cli.command("eval-files")
@click.argument("files", nargs=-1, type=click.Path(exists=True, path_type=Path))
@click.option(
    "--output",
    "-o",
    type=click.Path(path_type=Path),
    help="Output JSON file for results",
)
@click.option("--name", type=str, default=None, help="Experiment name")
@click.option(
    "--dimension",
    type=click.Choice(["baseline", "model", "prompt", "tools", "temperature"]),
    default="baseline",
    help="Experiment dimension being tested",
)
@click.option("--dimension-value", type=str, default=None, help="Dimension value label")
@click.option(
    "--embedding-model",
    type=str,
    default=None,
    help="Embedding model name (default: all-mpnet-base-v2). Supports sentence-transformers or HuggingFace models.",
)
def eval_files(
    files: tuple[Path, ...],
    output: Path | None,
    name: str | None,
    dimension: str,
    dimension_value: str | None,
    embedding_model: str | None,
):
    """
    Evaluate consistency across existing threat model files.

    Pass 2 or more paths to .tc.json files (or directories containing
    threatmodel.tc.json). Runs pairwise eval without any inference.

    This works with threat model files produced by any tool, not just
    threat-composer-ai. Files can have any name as long as they follow
    the Threat Composer v1 schema.

    \b
    Examples:
        # Compare 3 files directly
        threat-composer-ai-eval eval-files run1.tc.json run2.tc.json run3.tc.json

        # Compare directories containing threatmodel.tc.json
        threat-composer-ai-eval eval-files ./session-1/ ./session-2/ ./session-3/

        # Mix files and directories
        threat-composer-ai-eval eval-files ./output1.json ./session-2/ ./other.tc.json

        # With experiment metadata
        threat-composer-ai-eval eval-files *.tc.json --name "opus-vs-sonnet" \\
            --dimension model --dimension-value opus-4.6
    """
    from datetime import datetime, timezone

    if len(files) < 2:
        click.echo("Error: Need at least 2 files to compare", err=True)
        raise SystemExit(1)

    timestamp = datetime.now(timezone.utc).isoformat()
    experiment_name = (
        name or f"eval-files-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    )

    click.echo(f"Evaluating {len(files)} threat model files...")
    for f in files:
        click.echo(f"  {f}")

    eval_kwargs = {}
    if embedding_model:
        eval_kwargs["embedding_model"] = embedding_model
        click.echo(f"  Embedding model: {embedding_model}")
    evaluator = ThreatModelEvaluator(**eval_kwargs)

    n = len(files)
    pairs = []
    all_scores = []

    for i in range(n):
        for j in range(i + 1, n):
            click.echo(f"  Comparing {files[i].name} vs {files[j].name}...", nl=False)
            try:
                report = evaluator.compare_runs(files[i], files[j])
            except FileNotFoundError as e:
                click.echo(f" ERROR: {e}")
                continue

            score = report.overall_consistency_score
            analytical = report.analytical_consistency_score
            all_scores.append(score)
            click.echo(f" {score:.1%} (analytical: {analytical:.1%})")

            pairs.append(
                {
                    "run_a": i,
                    "run_a_path": str(files[i]),
                    "run_b": j,
                    "run_b_path": str(files[j]),
                    "score": score,
                    "analytical_score": analytical,
                    "component_scores": report.get_component_scores(),
                }
            )

    if not all_scores:
        click.echo("Error: No successful comparisons", err=True)
        raise SystemExit(1)

    avg = sum(all_scores) / len(all_scores)
    mn = min(all_scores)
    mx = max(all_scores)

    all_analytical = [p["analytical_score"] for p in pairs]
    analytical_avg = (
        sum(all_analytical) / len(all_analytical) if all_analytical else 0.0
    )

    # Print summary in benchmark report format
    print("\n" + "=" * 70)
    print("CONSISTENCY REPORT")
    print("=" * 70)
    print(f"Experiment: {experiment_name}")
    print(f"Timestamp:  {timestamp}")
    print(f"Files:      {n}")
    print(f"Pairs:      {len(pairs)}")

    print(f"\n{'OVERALL CONSISTENCY SCORE:':<30} {avg:.1%}")
    print(
        f"{'ANALYTICAL SCORE:':<30} {analytical_avg:.1%}"
        f"  (threats/mitigations/assumptions only)"
    )

    print("\nPairwise scores:")
    for pair in pairs:
        print(
            f"  {Path(pair['run_a_path']).name} ↔ "
            f"{Path(pair['run_b_path']).name}: {pair['score']:.1%}"
        )

    # Component averages
    component_names = set()
    for pair in pairs:
        component_names.update(pair["component_scores"].keys())

    if component_names:
        print("\nComponent averages:")
        for comp in sorted(component_names):
            comp_scores = [
                p["component_scores"][comp]
                for p in pairs
                if comp in p["component_scores"]
            ]
            comp_avg = sum(comp_scores) / len(comp_scores) if comp_scores else 0
            print(f"  {comp:<20} {comp_avg:.1%}")

    print(f"\nAverage: {avg:.1%}  Min: {mn:.1%}  Max: {mx:.1%}")

    if avg >= 0.7:
        assessment = "✓ HIGH consistency"
    elif avg >= 0.5:
        assessment = "⚠ MODERATE consistency"
    else:
        assessment = "✗ LOW consistency"
    print(f"\nAssessment: {assessment}")
    print("=" * 70)

    # Save report
    report_data = {
        "experiment_name": experiment_name,
        "timestamp": timestamp,
        "config": {
            "dimension": dimension,
            "dimension_value": dimension_value,
            "files": [str(f) for f in files],
        },
        "eval_summary": {
            "average": avg,
            "min": mn,
            "max": mx,
            "num_pairs": len(pairs),
            "num_files": n,
        },
        "pairwise_scores": pairs,
        "consistency_score": avg,
    }

    if output:
        with open(output, "w") as f_out:
            json.dump(report_data, f_out, indent=2)
        click.echo(f"\nResults saved to: {output}")


# Main entry point for standalone use
if __name__ == "__main__":
    eval_cli()


def _print_verbose_matches(report):
    """Print detailed match information for all components."""
    # Application Info
    if report.application_info_score:
        click.echo("\n" + "=" * 70)
        click.echo("APPLICATION INFO COMPARISON")
        click.echo("=" * 70)
        _print_component_details(report.application_info_score)

    # Architecture
    if report.architecture_score:
        click.echo("\n" + "=" * 70)
        click.echo("ARCHITECTURE COMPARISON")
        click.echo("=" * 70)
        _print_component_details(report.architecture_score)

    # Dataflow
    if report.dataflow_score:
        click.echo("\n" + "=" * 70)
        click.echo("DATAFLOW COMPARISON")
        click.echo("=" * 70)
        _print_component_details(report.dataflow_score)

    # Threat matches
    click.echo("\n" + "=" * 70)
    click.echo("DETAILED THREAT MATCHES")
    click.echo("=" * 70)

    for match in report.threat_matches:
        status = "✓" if match.is_matched else "✗"
        quality_color = {
            "exact": "green",
            "high": "green",
            "moderate": "yellow",
            "low": "red",
            "no_match": "red",
        }.get(match.match_quality.value, "white")

        # Show index mapping (e.g., "A[3] → B[7]" for out-of-order matches)
        if match.is_matched:
            index_info = f"A[{match.index_a + 1}] → B[{match.index_b + 1}]"
            if match.index_a != match.index_b:
                index_info += " (reordered)"
        else:
            index_info = f"A[{match.index_a + 1}] → (unmatched)"

        click.echo(f"\n{status} {index_info} {match.match_quality.value.upper()}")
        click.echo(f"   Run A: {_truncate(match.threat_a_statement, 80)}")

        if match.is_matched:
            click.echo(f"   Run B: {_truncate(match.threat_b_statement, 80)}")
            click.secho(
                f"   Overall Similarity: {match.overall_similarity:.1%}",
                fg=quality_color,
            )

            # Show field-level breakdown for non-exact matches
            if match.match_quality.value not in ("exact", "high"):
                click.echo("   Field Breakdown:")
                for fc in match.field_comparisons:
                    if fc.similarity < 0.95:  # Only show fields with differences
                        indicator = (
                            "✓"
                            if fc.similarity >= 0.7
                            else "⚠"
                            if fc.similarity >= 0.4
                            else "✗"
                        )
                        click.echo(
                            f"     {indicator} {fc.field_name}: {fc.similarity:.1%}"
                        )
                        if fc.similarity < 0.7 and fc.value_a and fc.value_b:
                            # Show actual values for low-similarity fields
                            click.echo(f"        A: {_truncate(str(fc.value_a), 60)}")
                            click.echo(f"        B: {_truncate(str(fc.value_b), 60)}")
        else:
            click.echo("   Run B: (no match found)")

    # Mitigation matches
    if report.mitigation_matches:
        click.echo("\n" + "=" * 70)
        click.echo("DETAILED MITIGATION MATCHES")
        click.echo("=" * 70)

        for match in report.mitigation_matches:
            status = "✓" if match.is_matched else "✗"
            if match.is_matched:
                index_info = f"A[{match.index_a + 1}] → B[{match.index_b + 1}]"
                if match.index_a != match.index_b:
                    index_info += " (reordered)"
            else:
                index_info = f"A[{match.index_a + 1}] → (unmatched)"

            click.echo(
                f"\n{status} {index_info} {match.match_quality.value.upper()} ({match.overall_similarity:.1%})"
            )
            click.echo(f"   Run A: {_truncate(match.mitigation_a_content, 80)}")
            if match.is_matched:
                click.echo(f"   Run B: {_truncate(match.mitigation_b_content, 80)}")
            else:
                click.echo("   Run B: (no match found)")

    # Assumption matches
    if report.assumption_matches:
        click.echo("\n" + "=" * 70)
        click.echo("DETAILED ASSUMPTION MATCHES")
        click.echo("=" * 70)

        for match in report.assumption_matches:
            status = "✓" if match.is_matched else "✗"
            if match.is_matched:
                index_info = f"A[{match.index_a + 1}] → B[{match.index_b + 1}]"
                if match.index_a != match.index_b:
                    index_info += " (reordered)"
            else:
                index_info = f"A[{match.index_a + 1}] → (unmatched)"

            click.echo(
                f"\n{status} {index_info} {match.match_quality.value.upper()} ({match.overall_similarity:.1%})"
            )
            click.echo(f"   Run A: {_truncate(match.assumption_a_content, 80)}")
            if match.is_matched:
                click.echo(f"   Run B: {_truncate(match.assumption_b_content, 80)}")
            else:
                click.echo("   Run B: (no match found)")

    # Distribution details
    if report.stride_distribution:
        click.echo("\n" + "=" * 70)
        click.echo("STRIDE DISTRIBUTION COMPARISON")
        click.echo("=" * 70)
        click.echo(f"   Similarity: {report.stride_distribution.similarity:.1%}")
        click.echo(f"   Run A: {report.stride_distribution.distribution_a}")
        click.echo(f"   Run B: {report.stride_distribution.distribution_b}")

    if report.priority_distribution:
        click.echo("\n" + "-" * 40)
        click.echo("PRIORITY DISTRIBUTION")
        click.echo(f"   Similarity: {report.priority_distribution.similarity:.1%}")
        click.echo(f"   Run A: {report.priority_distribution.distribution_a}")
        click.echo(f"   Run B: {report.priority_distribution.distribution_b}")


def _truncate(text: str, max_len: int) -> str:
    """Truncate text with ellipsis if too long."""
    if not text:
        return "(empty)"
    text = text.replace("\n", " ").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _print_component_details(score):
    """Print detailed component comparison with field values."""
    click.echo(f"   Overall: {score.overall_score:.1%}")

    for field_name, field_score in score.field_scores.items():
        indicator = "✓" if field_score >= 0.7 else "⚠" if field_score >= 0.4 else "✗"
        click.echo(f"\n   {indicator} {field_name}: {field_score:.1%}")

        # Show actual values
        val_a = score.field_values_a.get(field_name, "")
        val_b = score.field_values_b.get(field_name, "")

        if val_a or val_b:
            # For long text (like descriptions), show a preview
            if len(str(val_a)) > 100 or len(str(val_b)) > 100:
                click.echo(f"      Run A: {_truncate(str(val_a), 200)}")
                click.echo(f"      Run B: {_truncate(str(val_b), 200)}")
            else:
                click.echo(f"      Run A: {val_a or '(empty)'}")
                click.echo(f"      Run B: {val_b or '(empty)'}")

    if score.notes:
        click.echo(f"\n   Note: {score.notes}")


@eval_cli.command("matrix")
@click.argument("run_paths", nargs=-1, type=click.Path(exists=True, path_type=Path))
@click.option(
    "--output",
    "-o",
    type=click.Path(path_type=Path),
    help="Output JSON file for matrix data",
)
def compare_matrix(
    run_paths: tuple[Path, ...],
    output: Path | None,
):
    """
    Compare multiple runs against each other (pairwise matrix).

    Pass 2 or more run paths to compare all pairs.

    Example:
        threat-composer-ai-eval matrix run1/ run2/ run3/ run4/ run5/
    """
    if len(run_paths) < 2:
        click.echo("Error: Need at least 2 runs to compare", err=True)
        raise SystemExit(1)

    runs = list(run_paths)
    n = len(runs)

    click.echo(f"Comparing {n} runs ({n * (n - 1) // 2} pairs)...")

    evaluator = ThreatModelEvaluator()

    # Build similarity matrix
    matrix = [[0.0] * n for _ in range(n)]
    pair_results = []

    for i in range(n):
        matrix[i][i] = 1.0  # Self-similarity is 1.0
        for j in range(i + 1, n):
            click.echo(f"  Comparing {runs[i].name} vs {runs[j].name}...", nl=False)
            report = evaluator.compare_runs(runs[i], runs[j])
            score = report.overall_consistency_score
            matrix[i][j] = score
            matrix[j][i] = score
            click.echo(f" {score:.1%}")

            pair_results.append(
                {
                    "run_a": runs[i].name,
                    "run_b": runs[j].name,
                    "score": score,
                    "component_scores": report.get_component_scores(),
                }
            )

    # Calculate statistics
    all_scores = [p["score"] for p in pair_results]
    avg_score = sum(all_scores) / len(all_scores)
    min_score = min(all_scores)
    max_score = max(all_scores)

    # Find most/least similar pairs
    sorted_pairs = sorted(pair_results, key=lambda x: x["score"], reverse=True)

    # Print matrix
    click.echo("\n" + "=" * 60)
    click.echo("SIMILARITY MATRIX")
    click.echo("=" * 60)

    # Header
    header = "         " + "  ".join(f"{r.name[-8:]:<8}" for r in runs)
    click.echo(header)

    for i, run in enumerate(runs):
        row = f"{run.name[-8:]:<8} "
        for j in range(n):
            if i == j:
                row += "   --    "
            else:
                score = matrix[i][j]
                row += f"  {score:.1%}  "
        click.echo(row)

    # Summary
    click.echo("\n" + "-" * 60)
    click.echo("SUMMARY")
    click.echo("-" * 60)
    click.echo(f"Average pairwise similarity: {avg_score:.1%}")
    click.echo(f"Range: {min_score:.1%} - {max_score:.1%}")
    click.echo(
        f"\nMost similar:  {sorted_pairs[0]['run_a']} ↔ {sorted_pairs[0]['run_b']} ({sorted_pairs[0]['score']:.1%})"
    )
    click.echo(
        f"Least similar: {sorted_pairs[-1]['run_a']} ↔ {sorted_pairs[-1]['run_b']} ({sorted_pairs[-1]['score']:.1%})"
    )

    # Consistency assessment
    if avg_score >= 0.7:
        assessment = "✓ HIGH consistency - outputs are stable"
    elif avg_score >= 0.5:
        assessment = "⚠ MODERATE consistency - some variance between runs"
    else:
        assessment = "✗ LOW consistency - significant differences between runs"

    click.echo(f"\nAssessment: {assessment}")
    click.echo("=" * 60)

    if output:
        import json

        with open(output, "w") as f:
            json.dump(
                {
                    "runs": [str(r) for r in runs],
                    "matrix": matrix,
                    "pairs": pair_results,
                    "summary": {
                        "average": avg_score,
                        "min": min_score,
                        "max": max_score,
                        "most_similar": sorted_pairs[0],
                        "least_similar": sorted_pairs[-1],
                    },
                },
                f,
                indent=2,
            )
        click.echo(f"\nMatrix data saved to: {output}")
