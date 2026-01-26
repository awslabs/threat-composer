"""
CLI commands for threat model evaluation.
"""

import json
from pathlib import Path

import click

from .evaluator import ThreatModelEvaluator


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
    "--no-embeddings",
    is_flag=True,
    help="Disable embedding-based similarity (faster, less accurate)",
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
    no_embeddings: bool,
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
        use_embeddings=not no_embeddings,
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
        click.echo("\n" + "-" * 40)
        click.echo("DETAILED THREAT MATCHES")
        click.echo("-" * 40)

        for match in report.threat_matches:
            status = "✓" if match.is_matched else "✗"
            click.echo(f"\n{status} Threat: {match.threat_a_statement[:60]}...")
            if match.is_matched:
                click.echo(f"   Matched to: {match.threat_b_statement[:60]}...")
                click.echo(f"   Similarity: {match.overall_similarity:.1%}")
                click.echo(f"   Quality: {match.match_quality.value}")
            else:
                click.echo("   No match found in Run B")

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
@click.option(
    "--no-embeddings", is_flag=True, help="Disable embedding-based similarity"
)
def compare_latest(
    base_path: Path,
    output: Path | None,
    no_embeddings: bool,
):
    """
    Compare the two most recent runs in a directory.

    BASE_PATH: Directory containing run folders (e.g., .threat-composer/)
    """
    evaluator = ThreatModelEvaluator(use_embeddings=not no_embeddings)

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
@click.option(
    "--no-embeddings", is_flag=True, help="Disable embedding-based similarity"
)
def eval_history(
    base_path: Path,
    output: Path | None,
    no_embeddings: bool,
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

    evaluator = ThreatModelEvaluator(use_embeddings=not no_embeddings)
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


# Main entry point for standalone use
if __name__ == "__main__":
    eval_cli()


@eval_cli.command("matrix")
@click.argument("run_paths", nargs=-1, type=click.Path(exists=True, path_type=Path))
@click.option(
    "--output",
    "-o",
    type=click.Path(path_type=Path),
    help="Output JSON file for matrix data",
)
@click.option(
    "--no-embeddings", is_flag=True, help="Disable embedding-based similarity"
)
def compare_matrix(
    run_paths: tuple[Path, ...],
    output: Path | None,
    no_embeddings: bool,
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

    evaluator = ThreatModelEvaluator(use_embeddings=not no_embeddings)

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
