"""
Loader for threat model run data from threatmodel.tc.json.

Loads the assembled threat model file and extracts per-component data
using the Threat Composer v1 schema keys.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

THREATMODEL_FILENAME = "threatmodel.tc.json"


@dataclass
class RunData:
    """Container for all data from a single threat model run."""

    run_path: Path
    timestamp: str  # Extracted from directory name

    # Raw data extracted from the assembled threatmodel.tc.json by schema key
    application_info: dict = field(default_factory=dict)
    architecture: dict = field(default_factory=dict)
    dataflow: dict = field(default_factory=dict)

    # List-type components
    threats_list: list[dict] = field(default_factory=list)
    mitigations_list: list[dict] = field(default_factory=list)
    assumptions_list: list[dict] = field(default_factory=list)
    mitigation_links_list: list[dict] = field(default_factory=list)
    assumption_links_list: list[dict] = field(default_factory=list)

    @property
    def threats(self) -> list[dict]:
        return self.threats_list

    @property
    def mitigations(self) -> list[dict]:
        return self.mitigations_list

    @property
    def assumptions(self) -> list[dict]:
        return self.assumptions_list

    @property
    def mitigation_links(self) -> list[dict]:
        return self.mitigation_links_list

    @property
    def assumption_links(self) -> list[dict]:
        return self.assumption_links_list

    # Backward-compatible raw accessors used by the evaluator's
    # _compare_application_info, _compare_architecture, _compare_dataflow
    @property
    def application_info_raw(self) -> dict:
        return {"applicationInfo": self.application_info}

    @property
    def architecture_raw(self) -> dict:
        return {"architecture": self.architecture}

    @property
    def dataflow_raw(self) -> dict:
        return {"dataflow": self.dataflow}


class RunLoader:
    """Loads threat model run data from a threatmodel.tc.json file."""

    def load_run(self, run_path: str | Path) -> RunData:
        """
        Load threat model data from the assembled threatmodel.tc.json.

        Searches for the file at:
          1. {run_path}/threatmodel.tc.json
          2. {run_path} itself (if it points directly to a .json file)

        Args:
            run_path: Path to the run directory or directly to a .tc.json file

        Returns:
            RunData with per-component data extracted from schema keys
        """
        run_path = Path(run_path)

        if not run_path.exists():
            raise FileNotFoundError(f"Run path not found: {run_path}")

        # Resolve the threatmodel file
        if run_path.is_file() and run_path.name.endswith(".tc.json"):
            tm_file = run_path
            timestamp = run_path.parent.name
        else:
            tm_file = run_path / THREATMODEL_FILENAME
            timestamp = run_path.name

        if not tm_file.exists():
            raise FileNotFoundError(
                f"Threat model file not found: {tm_file}. "
                f"Expected {THREATMODEL_FILENAME} in {run_path}"
            )

        data = self._load_json(tm_file)

        return RunData(
            run_path=run_path,
            timestamp=timestamp,
            application_info=data.get("applicationInfo", {}) or {},
            architecture=data.get("architecture", {}) or {},
            dataflow=data.get("dataflow", {}) or {},
            threats_list=data.get("threats", []) or [],
            mitigations_list=data.get("mitigations", []) or [],
            assumptions_list=data.get("assumptions", []) or [],
            mitigation_links_list=data.get("mitigationLinks", []) or [],
            assumption_links_list=data.get("assumptionLinks", []) or [],
        )

    def _load_json(self, path: Path) -> dict:
        """Load and parse a JSON file."""
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def find_runs(self, base_path: str | Path) -> list[Path]:
        """
        Find all run directories containing a threatmodel.tc.json.

        Args:
            base_path: Base directory (e.g., .threat-composer/)

        Returns:
            List of run directory paths, sorted by name
        """
        base_path = Path(base_path)
        runs = []

        for item in base_path.iterdir():
            if item.is_dir() and (item / THREATMODEL_FILENAME).exists():
                runs.append(item)

        return sorted(runs, key=lambda p: p.name)
