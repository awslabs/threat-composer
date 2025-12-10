"""Workflow execution lock to prevent concurrent runs."""

import fcntl
from contextlib import contextmanager
from pathlib import Path


class WorkflowLock:
    """File-based lock to prevent concurrent workflow execution."""

    def __init__(self, lock_file_path: Path):
        """
        Initialize workflow lock.

        Args:
            lock_file_path: Path to lock file
        """
        self.lock_file_path = lock_file_path
        self.lock_file = None

    @contextmanager
    def acquire(self, timeout: float = 0):
        """
        Acquire workflow lock.

        Args:
            timeout: Timeout in seconds (0 = non-blocking)

        Raises:
            RuntimeError: If lock cannot be acquired

        Yields:
            None
        """
        try:
            # Ensure lock directory exists
            self.lock_file_path.parent.mkdir(parents=True, exist_ok=True)

            # Open lock file
            self.lock_file = open(self.lock_file_path, "w")

            # Try to acquire exclusive lock (non-blocking)
            try:
                fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as e:
                # Lazy import to get tool name dynamically
                from ..agents.common import get_tool_name
                from ..mcp.tools import threat_modeling_list_workflow_sessions

                raise RuntimeError(
                    f"Another workflow is currently running. "
                    f"Please wait for it to complete or check running workflows with {get_tool_name(threat_modeling_list_workflow_sessions)}."
                ) from e

            yield

        finally:
            # Release lock
            if self.lock_file:
                try:
                    fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_UN)
                    self.lock_file.close()
                except Exception:
                    pass

    @staticmethod
    def get_default_lock_path() -> Path:
        """
        Get default lock file path.

        Returns:
            Path to default lock file
        """
        return Path.home() / ".threat-composer-ai" / "workflow.lock"
