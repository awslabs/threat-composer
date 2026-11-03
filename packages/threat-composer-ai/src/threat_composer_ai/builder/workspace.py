"""
Workspace: the one directory the model builder may read and write.

Every builder tool takes a path relative to this root. Paths are resolved
(following symlinks) and rejected if they land outside it, so the tools only
ever touch files in the model directory.

Writes are atomic (temp file + rename) and serialised per file with a lock,
because one MCP server process is shared by every subagent in a Claude Code
session and two of them may write the same model at once.
"""

import json
import os
import tempfile
import threading
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

ROOT_ENV_VAR = "THREAT_COMPOSER_AI_MODEL_DIR"
TC_SUFFIX = ".tc.json"
SYSTEM_SUFFIX = ".system.json"
DFD_SUFFIX = ".dfd.svg"


def _read_umask() -> int:
    # os.umask can only be read by setting it, so do it once at import, before
    # the server starts any threads.
    current = os.umask(0)
    os.umask(current)
    return current


# mkstemp creates files 0600. Written files should get the mode a plain open()
# would give them, so they stay readable by the Threat Composer app and CI.
_FILE_MODE = 0o666 & ~_read_umask()


class WorkspaceError(ValueError):
    """A path or file problem the caller can fix."""


class Workspace:
    """A directory that confines all builder file access."""

    def __init__(self, root: str | Path | None = None):
        chosen = root or os.environ.get(ROOT_ENV_VAR) or os.getcwd()
        self.root = Path(chosen).expanduser().resolve()
        self._locks: dict[Path, threading.RLock] = {}
        self._locks_guard = threading.Lock()

    def resolve(self, relative: str) -> Path:
        """Resolve a caller path, refusing anything outside the root."""
        if not relative or not relative.strip():
            raise WorkspaceError("path must not be empty")
        candidate = Path(relative).expanduser()
        if not candidate.is_absolute():
            candidate = self.root / candidate
        resolved = candidate.resolve()
        if resolved != self.root and self.root not in resolved.parents:
            raise WorkspaceError(
                f"path '{relative}' is outside the model directory {self.root}"
            )
        return resolved

    def model_paths(self, model: str) -> tuple[Path, Path, Path]:
        """Return (threat model, system model, DFD) paths for a model name.

        `model` is a path ending in .tc.json. The system model and DFD sit next
        to it with the same stem.
        """
        if not model.endswith(TC_SUFFIX):
            raise WorkspaceError(f"model path must end with '{TC_SUFFIX}': {model}")
        tc = self.resolve(model)
        stem = tc.name[: -len(TC_SUFFIX)]
        return (
            tc,
            tc.with_name(stem + SYSTEM_SUFFIX),
            tc.with_name(stem + DFD_SUFFIX),
        )

    def display(self, path: Path) -> str:
        """Path relative to the root, for messages."""
        try:
            return str(path.relative_to(self.root))
        except ValueError:
            return str(path)

    @contextmanager
    def lock(self, path: Path) -> Iterator[None]:
        with self._locks_guard:
            file_lock = self._locks.setdefault(path, threading.RLock())
        with file_lock:
            yield

    def read_json(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            raise WorkspaceError(f"file not found: {self.display(path)}")
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise WorkspaceError(f"invalid JSON in {self.display(path)}: {e}") from e
        if not isinstance(data, dict):
            raise WorkspaceError(f"{self.display(path)} is not a JSON object")
        return data

    def write_text(self, path: Path, text: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(text)
            os.chmod(tmp, _FILE_MODE)
            os.replace(tmp, path)
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise

    def write_json(self, path: Path, data: dict[str, Any]) -> None:
        self.write_text(path, json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    def update_json(
        self,
        path: Path,
        change: Callable[[dict[str, Any]], Any],
        default: dict[str, Any] | None = None,
    ) -> Any:
        """Read, change and write a JSON file under its lock.

        `change` mutates the dict in place and returns a result for the caller.
        If it raises, nothing is written.
        """
        with self.lock(path):
            if path.exists() or default is None:
                data = self.read_json(path)
            else:
                data = json.loads(json.dumps(default))
            result = change(data)
            self.write_json(path, data)
            return result
