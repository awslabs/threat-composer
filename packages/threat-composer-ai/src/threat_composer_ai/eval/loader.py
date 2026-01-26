"""
Loader for threat model run data from .tc.json files.
"""

import json
from dataclasses import dataclass
from pathlib import Path

from ..models.threat_composer_v1 import ThreatComposerV1Model


@dataclass
class RunData:
    """Container for all data from a single threat model run."""

    run_path: Path
    timestamp: str  # Extracted from directory name

    # Raw JSON data
    application_info_raw: dict | None = None
    architecture_raw: dict | None = None
    dataflow_raw: dict | None = None
    threats_raw: dict | None = None
    mitigations_raw: dict | None = None

    # Parsed models (optional, for validation)
    application_info_model: ThreatComposerV1Model | None = None
    threats_model: ThreatComposerV1Model | None = None
    mitigations_model: ThreatComposerV1Model | None = None

    @property
    def threats(self) -> list[dict]:
        """Get threats list from raw data."""
        if self.threats_raw and "threats" in self.threats_raw:
            return self.threats_raw["threats"]
        return []

    @property
    def mitigations(self) -> list[dict]:
        """Get mitigations list from raw data."""
        if self.mitigations_raw and "mitigations" in self.mitigations_raw:
            return self.mitigations_raw["mitigations"]
        return []

    @property
    def assumptions(self) -> list[dict]:
        """Get assumptions from application_info raw data."""
        if self.application_info_raw and "assumptions" in self.application_info_raw:
            return self.application_info_raw["assumptions"]
        return []

    @property
    def mitigation_links(self) -> list[dict]:
        """Get mitigation links from mitigations raw data."""
        if self.mitigations_raw and "mitigationLinks" in self.mitigations_raw:
            return self.mitigations_raw["mitigationLinks"]
        return []

    @property
    def assumption_links(self) -> list[dict]:
        """Get assumption links from mitigations raw data."""
        if self.mitigations_raw and "assumptionLinks" in self.mitigations_raw:
            return self.mitigations_raw["assumptionLinks"]
        return []


class RunLoader:
    """Loads threat model run data from a run directory."""

    COMPONENT_FILES = {
        "application_info": "applicationInfo.tc.json",
        "architecture": "architectureDescription.tc.json",
        "dataflow": "dataflowDescription.tc.json",
        "threats": "threats.tc.json",
        "mitigations": "mitigations.tc.json",
    }

    def __init__(self, validate: bool = False):
        """
        Initialize loader.

        Args:
            validate: If True, validate loaded data against Pydantic models
        """
        self.validate = validate

    def load_run(self, run_path: str | Path) -> RunData:
        """
        Load all component files from a run directory.

        Args:
            run_path: Path to the run directory (e.g., .threat-composer/20260123-0324)

        Returns:
            RunData containing all loaded components
        """
        run_path = Path(run_path)

        if not run_path.exists():
            raise FileNotFoundError(f"Run directory not found: {run_path}")

        # Extract timestamp from directory name
        timestamp = run_path.name

        # Determine components directory
        components_dir = run_path / "components"
        if not components_dir.exists():
            # Maybe the path IS the components directory
            if (run_path / "applicationInfo.tc.json").exists():
                components_dir = run_path
            else:
                raise FileNotFoundError(
                    f"Components directory not found in: {run_path}"
                )

        # Load each component file
        run_data = RunData(run_path=run_path, timestamp=timestamp)

        for attr_name, filename in self.COMPONENT_FILES.items():
            file_path = components_dir / filename
            if file_path.exists():
                data = self._load_json(file_path)
                setattr(run_data, f"{attr_name}_raw", data)

        # Optionally validate with Pydantic models
        if self.validate:
            self._validate_run_data(run_data)

        return run_data

    def _load_json(self, path: Path) -> dict:
        """Load and parse a JSON file."""
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _validate_run_data(self, run_data: RunData) -> None:
        """Validate loaded data against Pydantic models."""
        if run_data.application_info_raw:
            run_data.application_info_model = ThreatComposerV1Model(
                **run_data.application_info_raw
            )
        if run_data.threats_raw:
            run_data.threats_model = ThreatComposerV1Model(**run_data.threats_raw)
        if run_data.mitigations_raw:
            run_data.mitigations_model = ThreatComposerV1Model(
                **run_data.mitigations_raw
            )

    def find_runs(self, base_path: str | Path) -> list[Path]:
        """
        Find all run directories under a base path.

        Args:
            base_path: Base directory (e.g., .threat-composer/)

        Returns:
            List of run directory paths, sorted by timestamp
        """
        base_path = Path(base_path)
        runs = []

        for item in base_path.iterdir():
            if item.is_dir() and (item / "components").exists():
                runs.append(item)

        # Sort by directory name (timestamp)
        return sorted(runs, key=lambda p: p.name)
