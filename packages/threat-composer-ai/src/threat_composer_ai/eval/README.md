# Threat Model Evaluation Module

Semantic comparison and consistency scoring for threat model outputs. Works with any tool that produces Threat Composer v1 schema JSON files.

## Purpose

Track output stability across prompt, model, tool, and temperature tuning iterations. The eval module answers: "If I run the same threat modeling process twice, how similar are the results?"

## Dependencies

The eval module requires these packages (install via `pip install threat-composer-ai[eval]` or manually):

```bash
pip install sentence-transformers scipy numpy
```

All three are required — there is no fallback mode.

## CLI Commands

All commands are available via `threat-composer-ai-eval`.

### eval-files — Compare existing threat model files

The most general-purpose command. Point it at 2+ threat model JSON files (from any tool) and get a consistency report with per-component scores.

```bash
# Compare 3 files directly
threat-composer-ai-eval eval-files run1.tc.json run2.tc.json run3.tc.json

# Compare directories containing threatmodel.tc.json
threat-composer-ai-eval eval-files ./session-1/ ./session-2/ ./session-3/

# Mix files and directories
threat-composer-ai-eval eval-files ./output1.json ./session-2/ ./other.tc.json

# With experiment metadata and output
threat-composer-ai-eval eval-files *.tc.json \
    --name "opus-vs-sonnet" \
    --dimension model \
    --dimension-value opus-4.6 \
    -o results.json
```

Files can have any name and live anywhere. They just need to follow the Threat Composer v1 schema with keys like `applicationInfo`, `architecture`, `dataflow`, `threats`, `mitigations`, `assumptions`.

### benchmark — Run inference N times and evaluate

Runs `threat-composer-ai` against a codebase multiple times, then evaluates pairwise consistency across all runs.

```bash
# Basic: 3 runs with default model
threat-composer-ai-eval benchmark ./my-app -n 3

# Test a different model
threat-composer-ai-eval benchmark ./my-app -n 3 \
    --aws-model-id us.anthropic.claude-sonnet-4-20250514-v1:0 \
    --dimension model \
    --dimension-value claude-sonnet-4

# Track a prompt change
threat-composer-ai-eval benchmark ./my-app -n 3 \
    --dimension prompt \
    --dimension-value "structured-mitigations-v1"

# Custom output location
threat-composer-ai-eval benchmark ./my-app -n 3 -o ./benchmarks/
```

Options:
- `-n, --runs` — Number of runs (default: 3)
- `--name` — Experiment name (default: auto-generated timestamp)
- `--dimension` — What you're testing: `baseline`, `model`, `prompt`, `tools`, `temperature`
- `--dimension-value` — Label for the dimension value
- `--aws-model-id` — Override the Bedrock model ID
- `--aws-region`, `--aws-profile` — AWS configuration

### suite — Benchmark across multiple codebases

Runs benchmarks across multiple target codebases defined in a config file, then aggregates results.

```bash
threat-composer-ai-eval suite ./suite.json
threat-composer-ai-eval suite ./suite.yaml -n 5
threat-composer-ai-eval suite ./suite.json -o ./results/
```

Example JSON config:
```json
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
```

Example YAML config (requires `pyyaml`):
```yaml
name: baseline-v1
runs_per_target: 3
config:
  aws_model_id: global.anthropic.claude-sonnet-4-20250514-v1:0
targets:
  - name: browser-ext
    path: ./codebases/browser-ext
  - name: dns-infra
    path: ./codebases/dns-infra
```

### compare — Compare two runs

```bash
threat-composer-ai-eval compare path/to/run_a path/to/run_b
threat-composer-ai-eval compare run_a run_b --verbose
```

### matrix — Pairwise comparison matrix

```bash
threat-composer-ai-eval matrix run1/ run2/ run3/ run4/ run5/
```

### latest — Compare two most recent runs

```bash
threat-composer-ai-eval latest .threat-composer/
```

### history — Consistency trend across all runs

```bash
threat-composer-ai-eval history .threat-composer/ --output history.json
```

## Input Format

The eval module reads `threatmodel.tc.json` files following the Threat Composer v1 schema. It extracts per-component data using these schema keys:

| Schema Key | Component | What's Compared |
|-----------|-----------|-----------------|
| `applicationInfo` | Application Info | name, description |
| `architecture` | Architecture | description (images skipped) |
| `dataflow` | Dataflow | description (images skipped) |
| `threats` | Threats | All threat fields + STRIDE/Priority metadata |
| `mitigations` | Mitigations | content, status, tags |
| `assumptions` | Assumptions | content, tags |
| `mitigationLinks` | Links | mitigation-threat relationships |
| `assumptionLinks` | Links | assumption relationships |

When pointing at a directory, the loader looks for `threatmodel.tc.json` in that directory. When pointing at a file, it reads it directly regardless of filename.

</text>
</invoke>

## Python API

```python
from threat_composer_ai.eval import ThreatModelEvaluator

evaluator = ThreatModelEvaluator(
    match_threshold=0.4,      # Minimum similarity for matching
)

# Compare two runs (directories or files)
report = evaluator.compare_runs("path/to/run_a", "path/to/run_b")

report.print_summary()
print(f"Overall consistency: {report.overall_consistency_score:.1%}")
print(f"Threats matched: {report.threats_score.matched_count}")

report.to_json("eval_report.json")
```

## How Scoring Works

### Overall Consistency Score

Weighted combination of component scores:

| Component | Weight |
|-----------|--------|
| Threats | 35% |
| Mitigations | 25% |
| Application Info | 10% |
| Architecture | 10% |
| Dataflow | 10% |
| Assumptions | 10% |

### Semantic Similarity

Uses `sentence-transformers` with `all-mpnet-base-v2` to compare text semantically. "Unauthorized access to database" and "attacker gains DB access" score high even though they share few words.

### Matching Algorithm

For threats, mitigations, and assumptions:
1. Build a similarity matrix comparing every item in run A against every item in run B
2. Use the Hungarian algorithm (`scipy.optimize.linear_sum_assignment`) for optimal 1:1 matching
3. Pairs below the match threshold (default 0.4) are considered unmatched

### Component Scoring (F1-Symmetric)

Each list-type component (threats, mitigations, assumptions) is scored using F1-symmetric matching:

```
recall_a = matched / count_a    (% of A's items found in B)
recall_b = matched / count_b    (% of B's items found in A)
f1_match_rate = harmonic_mean(recall_a, recall_b)
overall = f1_match_rate * 0.5 + avg_similarity * 0.5
```

This ensures unmatched items in either run penalise the score equally, regardless of which run is "A" vs "B".

### Threat Field Weights

| Weight | Fields |
|--------|--------|
| 1.5x | statement, content |
| 1.2x | threatAction |
| 1.0x | threatSource, threatImpact, prerequisites |
| 0.8x | impactedGoal, impactedAssets, STRIDE |
| 0.5x | tags, Priority |
| 0.3x | status |

### Interpreting Results

| Score | Assessment |
|-------|-----------|
| ≥ 70% | HIGH consistency — outputs are stable |
| 50-70% | MODERATE consistency — some variance between runs |
| < 50% | LOW consistency — significant differences |

## Typical Workflow

1. Establish a baseline: `benchmark ./my-app -n 3 --dimension baseline`
2. Make a change (prompt, model, temperature, etc.)
3. Run another benchmark: `benchmark ./my-app -n 3 --dimension prompt --dimension-value "my-change"`
4. Compare results in the benchmark reports
5. Or re-evaluate existing outputs: `eval-files run1/ run2/ run3/`
