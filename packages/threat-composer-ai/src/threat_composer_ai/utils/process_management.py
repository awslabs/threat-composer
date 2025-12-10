"""Process and signal management utilities."""

import os
import signal
import threading
import time

from ..logging import log_debug, log_error


def force_kill_all_processes():
    """Aggressively terminate all processes and threads."""
    try:
        import psutil

        current_process = psutil.Process()

        # Kill all child processes
        children = current_process.children(recursive=True)
        for child in children:
            try:
                log_debug(f"Terminating child process {child.pid}")
                child.terminate()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        # Wait briefly for graceful termination
        time.sleep(0.2)

        # Force kill any remaining children
        for child in children:
            try:
                if child.is_running():
                    log_debug(f"Force killing child process {child.pid}")
                    child.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

    except ImportError:
        # Fallback if psutil not available - use process group termination
        try:
            # Kill entire process group
            os.killpg(os.getpgrp(), signal.SIGTERM)
            time.sleep(0.2)
            os.killpg(os.getpgrp(), signal.SIGKILL)
        except (OSError, AttributeError):
            pass


def terminate_all_threads():
    """Attempt to terminate all non-main threads."""
    try:
        main_thread = threading.main_thread()
        for thread in threading.enumerate():
            if thread != main_thread and thread.is_alive():
                try:
                    log_debug(f"Found active thread: {thread.name}")
                    # Set daemon flag to ensure they don't prevent exit
                    thread.daemon = True
                except Exception:
                    pass
    except Exception as e:
        log_debug(f"Error enumerating threads: {e}")


def create_signal_handler(shutdown_event: threading.Event, active_workflow_ref: dict):
    """Create a signal handler for SIGINT (Ctrl+C) to ensure proper program termination.

    Args:
        shutdown_event: Threading event to signal shutdown
        active_workflow_ref: Dictionary containing 'workflow' key with current workflow reference
    """

    def signal_handler(signum, frame):
        """Handle SIGINT (Ctrl+C) to ensure proper program termination including async processes."""
        log_error("Analysis interrupted by user (Ctrl+C)")

        # Set shutdown flag
        shutdown_event.set()

        # Attempt to gracefully terminate the workflow if it's running
        active_workflow = active_workflow_ref.get("workflow")
        if active_workflow is not None:
            try:
                log_debug("Attempting to terminate running workflow...")
                # Try to access workflow termination methods if available
                if hasattr(active_workflow, "stop"):
                    active_workflow.stop()
                elif hasattr(active_workflow, "cancel"):
                    active_workflow.cancel()
                elif hasattr(active_workflow, "shutdown"):
                    active_workflow.shutdown()
            except Exception as e:
                log_debug(f"Could not gracefully terminate workflow: {e}")

        # Give a brief moment for graceful shutdown
        time.sleep(0.3)

        log_debug("Terminating all threads...")
        terminate_all_threads()

        log_debug("Force killing all child processes...")
        force_kill_all_processes()

        log_error("Forcing immediate process termination...")

        # Use os._exit() instead of sys.exit() to bypass cleanup and exit immediately
        os._exit(1)

    return signal_handler


def setup_local_telemetry(
    endpoint_host: str,
    endpoint_port: int,
    service_name: str,
):
    """Set up local telemetry to send to an OTLP endpoint.

    Args:
        endpoint_host: Hostname or IP of the OTLP endpoint
        endpoint_port: Port of the OTLP endpoint
        service_name: Service name for telemetry identification

    Returns:
        bool: True if telemetry was successfully configured, False otherwise
    """
    try:
        import socket

        from strands.telemetry import StrandsTelemetry

        from ..logging import log_success, log_warning

        # Test if telemetry endpoint is reachable
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)  # 1 second timeout
        result = sock.connect_ex((endpoint_host, endpoint_port))
        sock.close()

        if result != 0:
            # Port is not open - telemetry endpoint is not reachable
            log_warning(
                f"Telemetry endpoint not detected on {endpoint_host}:{endpoint_port} - telemetry will be disabled"
            )
            return False

        # Configure OpenTelemetry
        os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = (
            f"http://{endpoint_host}:{endpoint_port}"
        )
        os.environ["OTEL_EXPORTER_OTLP_PROTOCOL"] = "http/protobuf"
        os.environ["OTEL_SERVICE_NAME"] = service_name
        os.environ["OTEL_LOG_LEVEL"] = "DEBUG"

        # Set up Strands telemetry
        strands_telemetry = StrandsTelemetry()
        strands_telemetry.setup_otlp_exporter()  # To OTLP endpoint
        # strands_telemetry.setup_console_exporter()  # Console debug

        # Calculate UI port (typically OTLP port + 12268 for Jaeger)
        ui_port = 16686 if endpoint_port == 4318 else endpoint_port + 12268
        log_success(
            f"Telemetry connected to {service_name} at http://{endpoint_host}:{ui_port}"
        )
        return True
    except Exception as e:
        log_error(f"Could not set up telemetry: {e}")
        return False
