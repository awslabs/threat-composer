"""All MCP tools for threat-composer-ai."""

import asyncio
import json
import threading
from pathlib import Path
from typing import Any

from fastmcp import FastMCP

from ..core import SessionDiscovery, WorkflowLock, WorkflowRunner
from ..models import ThreatComposerV1Model
from ..tools.threat_composer_validate_tc_v1_schema import validate_tc_data_pydantic


def get_tool_name(tool_func) -> str:
    """
    Safely extract the name from a tool function or FunctionTool object.

    Args:
        tool_func: Either a regular function or a FunctionTool object

    Returns:
        The name of the tool
    """
    # Check if it's a FunctionTool object (has 'name' attribute)
    if hasattr(tool_func, "name"):
        return tool_func.name
    # Otherwise assume it's a regular function with __name__
    elif hasattr(tool_func, "__name__"):
        return tool_func.__name__
    # Fallback to string representation
    else:
        return str(tool_func)


def register_tools(mcp: FastMCP) -> None:
    """Register all MCP tools with the FastMCP server."""

    # ============================================================================
    # SCHEMA VALIDATION TOOLS
    # ============================================================================

    @mcp.tool()
    def threat_modeling_validate_tc_schema(
        data: str = None, file_path: str = None
    ) -> str:
        """
        Validate JSON data against the Threat Composer v1 schema.

        This tool validates threat composer data using the ThreatComposerV1Model Pydantic model.
        It provides detailed validation feedback optimized for AI agent consumption.

        Args:
            data: Raw JSON string to validate (optional)
            file_path: Path to JSON file to validate (optional)

        Returns:
            Detailed validation report as a string. Success message if valid,
            comprehensive error list if invalid.

        Note:
            Exactly one of 'data' or 'file_path' must be provided.
        """
        if not data and not file_path:
            return "❌ Error: Either 'data' or 'file_path' parameter must be provided"

        if data and file_path:
            return "❌ Error: Only one of 'data' or 'file_path' should be provided, not both"

        try:
            if file_path:
                # Handle file path validation
                file_path_obj = Path(file_path)
                if not file_path_obj.exists():
                    return f"❌ File not found: {file_path}"

                try:
                    with open(file_path_obj, encoding="utf-8") as f:
                        json_data = json.load(f)
                except json.JSONDecodeError as e:
                    return f"❌ Invalid JSON format in file '{file_path}': {str(e)}"
                except Exception as e:
                    return f"❌ Error reading file '{file_path}': {str(e)}"
            else:
                # Handle raw JSON data validation
                try:
                    json_data = json.loads(data)
                except json.JSONDecodeError as e:
                    return f"❌ Invalid JSON format in data: {str(e)}"

            # Validate using the existing validation function
            is_valid, error_message = validate_tc_data_pydantic(json_data)

            if is_valid:
                return "✅ Validation successful! The data conforms to the Threat Composer v1 schema."
            else:
                return f"❌ {error_message}"

        except Exception as e:
            return f"❌ Validation error: {str(e)}"

    @mcp.tool()
    def threat_modeling_get_tc_schema() -> str:
        """
        Get the Threat Composer v1 schema JSON content.

        Returns the complete JSON schema definition for the Threat Composer v1 format
        generated from the ThreatComposerV1Model Pydantic model.

        Returns:
            JSON schema content as a string, or error message if schema cannot be generated.
        """
        try:
            # Generate schema from Pydantic model
            schema = ThreatComposerV1Model.model_json_schema()

            # Return as formatted JSON string
            return json.dumps(schema, indent=2)

        except Exception as e:
            return f"❌ Error generating schema: {str(e)}"

    # ============================================================================
    # WORKFLOW MANAGEMENT TOOLS
    # ============================================================================

    @mcp.tool()
    def threat_modeling_start_workflow(
        directory_path: str,
        rerun_from_session_id: str = None,
        search_directory: str = None,
    ) -> str:
        """
        Start a new threat modeling workflow or re-run from previous session.

        Validates AWS credentials and inference before starting. Prevents
        concurrent workflow execution.

        **Logging & Output:**
        - Comprehensive startup banner logged to /logs/ directory
        - Includes invocation source (MCP), model config, session ID, and runtime settings
        - All configuration details captured in /config/run-metadata.json

        **Invocation Tracking:**
        - Invocation source automatically set to "MCP"
        - Recorded in logs, STDOUT, and run-metadata.json for audit trail

        **Configuration (from environment variables or defaults):**
        - THREAT_COMPOSER_OUTPUT_DIR: Output directory
        - THREAT_COMPOSER_VERBOSE: Enable verbose logging (true/false)
        - THREAT_COMPOSER_ENABLE_TELEMETRY: Enable telemetry (true/false)
        - AWS_REGION or AWS_DEFAULT_REGION: AWS region
        - THREAT_COMPOSER_AWS_MODEL_ID: AWS Bedrock model ID
        - THREAT_COMPOSER_EXECUTION_TIMEOUT: Execution timeout in seconds
        - THREAT_COMPOSER_NODE_TIMEOUT: Node timeout in seconds

        Args:
            directory_path: Path to directory to analyze (required)
            rerun_from_session_id: Session ID to re-run from (optional)
            search_directory: Directory to search for rerun session (required if rerun_from_session_id provided)

        Returns:
            JSON with session_id, output_directory, and status. Use threat_modeling_get_workflow_logs() to monitor progress.
        """
        try:
            # Validate directory
            dir_path = Path(directory_path)
            if not dir_path.exists() or not dir_path.is_dir():
                return json.dumps(
                    {
                        "status": "error",
                        "message": f"Invalid directory: {directory_path}",
                    }
                )

            # Handle rerun session lookup
            previous_session_path = None
            if rerun_from_session_id:
                if not search_directory:
                    return json.dumps(
                        {
                            "status": "error",
                            "message": "search_directory required when rerun_from_session_id is provided",
                        }
                    )

                discovery = SessionDiscovery(Path(search_directory))
                session_path = discovery.get_session_path(rerun_from_session_id)
                if not session_path:
                    return json.dumps(
                        {
                            "status": "error",
                            "message": f"Session not found: {rerun_from_session_id}",
                        }
                    )
                # Use parent directory (output directory) not session directory
                # The session directory contains session.json, agents/, multi_agents/
                # The output directory (parent) contains components/, logs/, etc.
                previous_session_path = str(session_path.parent)

            # Create runner with full initialization using factory method
            # All configuration comes from environment variables or defaults
            runner = WorkflowRunner.create_from_params(
                working_directory=dir_path,
                previous_session_path=previous_session_path,
                invocation_source="MCP",
                setup_logging=True,
            )

            # Validate AWS credentials BEFORE starting background thread
            invocation_args = {
                "directory_path": str(directory_path),
                "rerun_from_session_id": rerun_from_session_id,
            }

            success, error = runner.setup(
                invocation_args=invocation_args,
                skip_validation=False,  # Always validate
            )

            if not success:
                return json.dumps(
                    {"status": "error", "message": f"Setup failed: {error}"}
                )

            # Acquire workflow lock
            lock = WorkflowLock(WorkflowLock.get_default_lock_path())

            def run_workflow_thread():
                """Run workflow in background thread."""

                async def run_workflow():
                    try:
                        with lock.acquire():
                            # Execute workflow (setup already done)
                            await runner.execute_async()

                    except RuntimeError as e:
                        print(f"Workflow lock error: {e}")
                    except Exception as e:
                        print(f"Workflow execution error: {e}")

                asyncio.run(run_workflow())

            # Start workflow thread
            workflow_thread = threading.Thread(target=run_workflow_thread, daemon=True)
            workflow_thread.start()

            return json.dumps(
                {
                    "status": "started",
                    "session_id": runner.session_manager.session_id,
                    "output_directory": str(runner.config.output_directory),
                    "message": "Workflow started successfully",
                    "instructions": f"Use {get_tool_name(threat_modeling_get_workflow_logs)}(session_id='{runner.session_manager.session_id}', output_directory='{runner.config.output_directory}') to get logs of progress and use to create a summary",
                }
            )

        except Exception as e:
            return json.dumps(
                {"status": "error", "message": f"Failed to start workflow: {str(e)}"}
            )

    @mcp.tool()
    def threat_modeling_get_workflow_logs(
        session_id: str, output_directory: str, tail_lines: int = None
    ) -> str:
        """
        Get the workflow logs for a running or completed session.

        Retrieves log content from the logs subdirectory of the workflow output directory.
        Returns the raw log content as plaintext.

        Args:
            session_id: The session ID returned by start_workflow
            output_directory: The output directory path returned by start_workflow
            tail_lines: Optional number of lines to return from end of log (default: all lines)

        Returns:
            Log content as plaintext string, or error message if logs cannot be retrieved
        """
        try:
            from ..config import AppConfig

            # Construct path to logs directory using config constant
            output_path = Path(output_directory)
            logs_dir = output_path / AppConfig.logs_output_sub_dir

            if not logs_dir.exists():
                return f"❌ Error: Logs directory not found: {logs_dir}"

            # Find log files in the logs directory
            log_files = list(logs_dir.glob("*.log"))

            if not log_files:
                return f"❌ Error: No log files found in {logs_dir}"

            # Use the most recent log file (or first if only one)
            log_file = sorted(log_files, key=lambda f: f.stat().st_mtime, reverse=True)[
                0
            ]

            # Read log content
            with open(log_file, encoding="utf-8") as f:
                if tail_lines:
                    # Read all lines and return last N lines
                    lines = f.readlines()
                    log_content = "".join(lines[-tail_lines:])
                else:
                    # Return entire log
                    log_content = f.read()

            # Return plaintext with header
            header = f"=== Workflow Logs for Session: {session_id} ===\n"
            header += f"Log file: {log_file.name}\n"
            header += f"Log path: {log_file}\n"
            if tail_lines:
                header += f"Showing last {tail_lines} lines\n"
            header += "=" * 60 + "\n\n"

            return header + log_content

        except Exception as e:
            return f"❌ Error: Failed to retrieve logs: {str(e)}"

    @mcp.tool()
    def threat_modeling_list_workflow_sessions(
        search_directory: str, limit: int = 50, sort_by: str = "created_at"
    ) -> str:
        """
        List available workflow sessions in a directory.

        Recursively searches for session_ directories and validates them
        using FileSessionManager. Returns a markdown table with session details.

        Args:
            search_directory: Directory to recursively search for sessions
            limit: Maximum number of sessions to return (default: 50)
            sort_by: Sort order - "created_at", "updated_at", or "session_id" (default: "created_at")

        Returns:
            Markdown table of sessions with ID, start time, end time, status, and age
        """
        try:
            search_path = Path(search_directory)
            if not search_path.exists():
                return f"❌ Error: Search directory does not exist: {search_directory}"

            # Discover sessions
            discovery = SessionDiscovery(search_path)
            sessions = discovery.list_sessions(limit=limit, sort_by=sort_by)

            if not sessions:
                return f"No sessions found in {search_directory}"

            # Format as aligned table (works well as both markdown and plain text)
            lines = [
                "Workflow Sessions",
                f"\nFound {len(sessions)} session(s) in {search_directory}\n",
            ]

            # Calculate column widths based on actual data
            max_id_len = max(len(s.session_id) for s in sessions)
            max_id_len = max(max_id_len, len("Session ID"))

            # Fixed widths for other columns
            time_width = 19  # "YYYY-MM-DD HH:MM:SS"
            status_width = 14  # "✅ completed"
            age_width = 8  # "999.9d"

            # Create header
            header = (
                f"| {'Session ID'.ljust(max_id_len)} | "
                f"{'Start Time'.ljust(time_width)} | "
                f"{'End Time'.ljust(time_width)} | "
                f"{'Status'.ljust(status_width)} | "
                f"{'Age'.ljust(age_width)} |"
            )
            separator = (
                f"|{'-' * (max_id_len + 2)}|"
                f"{'-' * (time_width + 2)}|"
                f"{'-' * (time_width + 2)}|"
                f"{'-' * (status_width + 2)}|"
                f"{'-' * (age_width + 2)}|"
            )

            lines.append(header)
            lines.append(separator)

            for session in sessions:
                # Format timestamps
                start_time = session.created_at.strftime("%Y-%m-%d %H:%M:%S")
                end_time = session.updated_at.strftime("%Y-%m-%d %H:%M:%S")

                # Format age in human-readable format
                age_seconds = session.age_seconds
                if age_seconds < 60:
                    age = f"{age_seconds:.0f}s"
                elif age_seconds < 3600:
                    age = f"{age_seconds / 60:.1f}m"
                elif age_seconds < 86400:
                    age = f"{age_seconds / 3600:.1f}h"
                else:
                    age = f"{age_seconds / 86400:.1f}d"

                # Add status emoji
                status_display = session.status
                if session.status == "completed":
                    status_display = "✅ completed"
                elif session.status == "failed":
                    status_display = "❌ failed"
                elif session.status == "running":
                    status_display = "🔄 running"

                # Create aligned row
                row = (
                    f"| {session.session_id.ljust(max_id_len)} | "
                    f"{start_time.ljust(time_width)} | "
                    f"{end_time.ljust(time_width)} | "
                    f"{status_display.ljust(status_width)} | "
                    f"{age.rjust(age_width)} |"
                )
                lines.append(row)

            return "\n".join(lines)

        except Exception as e:
            return f"❌ Error: Failed to list sessions: {str(e)}"


def _format_session_data(session_data: Any) -> dict[str, Any] | None:
    """Format session data for JSON serialization."""
    if not session_data:
        return None

    def format_timestamp(timestamp):
        """Handle both datetime objects and ISO strings."""
        if not timestamp:
            return None
        if hasattr(timestamp, "isoformat"):
            return timestamp.isoformat()
        return str(timestamp)  # Already a string

    return {
        "session_id": getattr(session_data, "session_id", None),
        "session_type": str(getattr(session_data, "session_type", None)),
        "created_at": format_timestamp(getattr(session_data, "created_at", None)),
        "updated_at": format_timestamp(getattr(session_data, "updated_at", None)),
    }
