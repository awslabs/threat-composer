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
