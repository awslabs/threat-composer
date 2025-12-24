"""Session discovery and listing using FileSessionManager."""

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from strands.session import FileSessionManager


@dataclass
class SessionInfo:
    """Session metadata from FileSessionManager."""

    session_id: str
    session_path: Path
    session_type: str
    created_at: datetime
    updated_at: datetime
    status: str  # "completed", "running", "failed", "unknown"
    age_seconds: float
    # Multi-agent data (if available)
    completed_nodes: list[str] | None = None
    failed_nodes: list[str] | None = None
    total_execution_time: float | None = None


class SessionDiscovery:
    """Discover and query workflow sessions using FileSessionManager."""

    def __init__(self, base_search_dir: Path):
        """
        Initialize session discovery.

        Args:
            base_search_dir: Directory to recursively search for session_ folders
        """
        self.base_search_dir = base_search_dir

    def find_session_directories(self) -> list[Path]:
        """
        Recursively find all directories starting with 'session_'.

        Returns:
            List of paths to potential session directories
        """
        session_dirs = []
        for path in self.base_search_dir.rglob("session_*"):
            if path.is_dir():
                session_dirs.append(path)
        return session_dirs

    def validate_session(self, session_dir: Path) -> tuple[bool, str | None]:
        """
        Validate session directory using FileSessionManager.

        Args:
            session_dir: Path to potential session directory

        Returns:
            (is_valid: bool, session_id: str | None)
        """
        try:
            # Extract session_id from directory name (remove 'session_' prefix)
            dir_name = session_dir.name
            if not dir_name.startswith("session_"):
                return False, None

            session_id = dir_name[8:]  # Remove 'session_' prefix

            # Check for required files
            session_json = session_dir / "session.json"

            if not session_json.exists():
                return False, None

            # Try to read session using FileSessionManager
            storage_dir = str(session_dir.parent)
            sm = FileSessionManager(session_id=session_id, storage_dir=storage_dir)

            # Attempt to read session data
            session_data = sm.read_session(session_id)
            if not session_data:
                return False, None

            return True, session_id

        except Exception:
            return False, None

    def get_session_info(
        self, session_dir: Path, session_id: str
    ) -> SessionInfo | None:
        """
        Get detailed session information using FileSessionManager.

        Args:
            session_dir: Path to session directory
            session_id: Session ID

        Returns:
            SessionInfo object or None if unable to read
        """
        try:
            storage_dir = str(session_dir.parent)
            sm = FileSessionManager(session_id=session_id, storage_dir=storage_dir)

            # Read session data
            session_data = sm.read_session(session_id)
            if not session_data:
                return None

            # Read multi-agent data (if available)
            multi_agent_data = None
            try:
                multi_agent_data = sm.read_multi_agent(session_id, "default_graph")
            except Exception:
                pass  # Multi-agent data may not exist yet

            # Determine status from multi-agent data
            status = "unknown"
            completed_nodes = None
            failed_nodes = None
            total_execution_time = None

            if multi_agent_data:
                status = multi_agent_data.get("status", "unknown")
                completed_nodes = multi_agent_data.get("completed_nodes", [])
                failed_nodes = multi_agent_data.get("failed_nodes", [])

                # Calculate total execution time from node_results
                node_results = multi_agent_data.get("node_results", {})
                if node_results:
                    total_execution_time = (
                        sum(
                            node.get("execution_time", 0)
                            for node in node_results.values()
                        )
                        / 1000.0
                    )  # Convert ms to seconds

            # Parse timestamps - they may be datetime objects or ISO strings
            created_at = session_data.created_at
            updated_at = session_data.updated_at

            if isinstance(created_at, str):
                from dateutil import parser

                created_at = parser.isoparse(created_at)
            if isinstance(updated_at, str):
                from dateutil import parser

                updated_at = parser.isoparse(updated_at)

            # Calculate age
            now = datetime.now(created_at.tzinfo)
            age_seconds = (now - created_at).total_seconds()

            return SessionInfo(
                session_id=session_id,
                session_path=session_dir,
                session_type=str(session_data.session_type),
                created_at=created_at,
                updated_at=updated_at,
                status=status,
                age_seconds=age_seconds,
                completed_nodes=completed_nodes,
                failed_nodes=failed_nodes,
                total_execution_time=total_execution_time,
            )

        except Exception:
            return None

    def list_sessions(
        self, limit: int = 50, sort_by: str = "created_at"
    ) -> list[SessionInfo]:
        """
        List all valid sessions in the search directory.

        Args:
            limit: Maximum number of sessions to return
            sort_by: Sort field - "created_at", "updated_at", or "session_id"

        Returns:
            List of SessionInfo objects, sorted and limited
        """
        sessions = []

        # Find all potential session directories
        session_dirs = self.find_session_directories()

        # Validate and collect session info
        for session_dir in session_dirs:
            is_valid, session_id = self.validate_session(session_dir)
            if is_valid and session_id:
                session_info = self.get_session_info(session_dir, session_id)
                if session_info:
                    sessions.append(session_info)

        # Sort sessions
        if sort_by == "created_at":
            sessions.sort(key=lambda s: s.created_at, reverse=True)
        elif sort_by == "updated_at":
            sessions.sort(key=lambda s: s.updated_at, reverse=True)
        elif sort_by == "session_id":
            sessions.sort(key=lambda s: s.session_id)

        # Apply limit
        return sessions[:limit]

    def get_session_path(self, session_id: str) -> Path | None:
        """
        Get full path to session directory by session_id.

        Args:
            session_id: Session ID to find

        Returns:
            Path to session directory or None if not found
        """
        session_dirs = self.find_session_directories()

        for session_dir in session_dirs:
            is_valid, found_id = self.validate_session(session_dir)
            if is_valid and found_id == session_id:
                return session_dir

        return None
