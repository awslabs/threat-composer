# Threat Model Evaluation Module

Semantic comparison and consistency scoring between threat model runs.

## Purpose

Track output stability across prompt/model/tool tuning iterations to ensure
users get consistent results between runs.

## Installation

The eval module requires additional dependencies:

```bash
# Required for semantic similarity (recommended)
pip install sentence-transformers

# Required for optimal matching algorithm
pip install scipy

# Or install all eval dependencies
pip install sentence-transformers scipy numpy
```

## Usage

### CLI Commands

```bash
# Compare two specific runs
threat-composer-ai-eval compare path/to/run_a path/to/run_b

# Compare the two most recent runs
threat-composer-ai-eval latest .threat-composer/

# View consistency history across all runs
threat-composer-ai-eval history .threat-composer/ --output history.json

# Disable embeddings for faster (but less accurate) comparison
threat-composer-ai-eval compare run_a run_b --no-embeddings
```

### Python API

```python
from threat_composer_ai.eval import ThreatModelEvaluator

# Initialize evaluator
evaluator = ThreatModelEvaluator(
    use_embeddings=True,  # Use sentence-transformers
    match_threshold=0.4,  # Minimum similarity for matching
)

# Compare two runs
report = evaluator.compare_runs(
    "path/to/run_a",
    "path/to/run_b"
)

# Print summary
report.print_summary()

# Access detailed results
print(f"Overall consistency: {report.overall_consistency_score:.1%}")
print(f"Threats matched: {report.threats_score.matched_count}")

# Save detailed report
report.to_json("eval_report.json")
```

## What Gets Compared

### Component Files

| File | Fields Compared |
|------|-----------------|
| `applicationInfo.tc.json` | name, description, assumptions |
| `architectureDescription.tc.json` | description (images skipped) |
| `dataflowDescription.tc.json` | description (images skipped) |
| `threats.tc.json` | All threat fields + STRIDE/Priority metadata |
| `mitigations.tc.json` | content, status, tags, links |

### Threat Field Comparison

Each threat is compared on:
- `threatSource` - semantic similarity
- `prerequisites` - semantic similarity
- `threatAction` - semantic similarity (weighted higher)
- `threatImpact` - semantic similarity
- `impactedGoal` - set overlap (CIA triad)
- `impactedAssets` - semantic set matching
- `statement` - full semantic similarity (weighted highest)
- `status` - exact match
- `tags` - set overlap
- `metadata.STRIDE` - set overlap
- `metadata.Priority` - exact match

### Distribution Metrics

- STRIDE category distribution (Jensen-Shannon similarity)
- Priority distribution (High/Medium/Low)
- Tags distribution

### Relationship Graphs

- Mitigation-threat links
- Assumption links

## Scoring

### Overall Consistency Score

Weighted combination of component scores:
- Threats: 35%
- Mitigations: 25%
- Application Info: 10%
- Architecture: 10%
- Dataflow: 10%
- Assumptions: 10%

### Match Quality Levels

| Quality | Similarity Range |
|---------|-----------------|
| EXACT | ≥ 0.95 |
| HIGH | 0.85 - 0.95 |
| MODERATE | 0.60 - 0.85 |
| LOW | 0.40 - 0.60 |
| NO_MATCH | < 0.40 |

## Interpreting Results

- **≥ 70%**: Good consistency - tuning is working well
- **50-70%**: Moderate consistency - some variance expected
- **< 50%**: Low consistency - significant differences between runs

## How It Works

### Semantic Similarity

The eval module uses `sentence-transformers` with the `all-MiniLM-L6-v2` model to compare text semantically rather than by word overlap. Text is converted into 384-dimensional embeddings, then cosine similarity measures how close two pieces of text are in meaning.

This means "unauthorized access to database" and "attacker gains DB access" score high even though they share few words.

### Matching Algorithm

For threats, mitigations, and assumptions:

1. Extract the primary text field (e.g., `statement` for threats, `content` for mitigations)
2. Build a similarity matrix comparing every item in run A against every item in run B
3. Use the Hungarian algorithm (`scipy.optimize.linear_sum_assignment`) to find the optimal 1:1 matching that maximizes total similarity
4. Pairs with similarity below 0.4 are considered unmatched

### Field Comparison Weights

Different fields contribute differently to the overall similarity score:

| Weight | Fields |
|--------|--------|
| 1.5x | statement, content (most important) |
| 1.2x | threatAction |
| 1.0x | threatSource, threatImpact, prerequisites |
| 0.8x | impactedGoal, impactedAssets, STRIDE |
| 0.5x | tags, Priority |
| 0.3x | status |

### Distribution Metrics

Uses Jensen-Shannon divergence to compare how categories are distributed across runs. This catches shifts like one run being heavy on "Spoofing" threats while another emphasizes "Tampering".

### Overall Score Calculation

Component weights for the final score:

| Component | Weight |
|-----------|--------|
| Threats | 35% |
| Mitigations | 25% |
| Application Info | 10% |
| Architecture | 10% |
| Dataflow | 10% |
| Assumptions | 10% |

## Fallback Mode

If `sentence-transformers` is not installed, the module falls back to
Jaccard token similarity (word overlap), which is faster but less semantically aware.
