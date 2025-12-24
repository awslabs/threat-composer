"""Graphviz installation validation for threat-composer-ai."""

import shutil
import subprocess

from ..logging import log_debug, log_error, log_success


def validate_graphviz_installation() -> bool:
    """
    Validate that Graphviz is installed and accessible.

    Graphviz is required for the diagrams library to generate DFD diagrams.

    Returns:
        bool: True if Graphviz is installed, False otherwise

    Raises:
        SystemExit: If Graphviz is not found with installation instructions
    """
    log_debug("Checking Graphviz installation")

    # Check if 'dot' command is available (main Graphviz executable)
    dot_path = shutil.which("dot")

    if dot_path is None:
        log_error("Graphviz is not installed or not in PATH")
        log_error("")
        log_error("Graphviz is required for generating Data Flow Diagrams.")
        log_error("Please install Graphviz using one of these methods:")
        log_error("")
        log_error("  macOS (Homebrew):")
        log_error("    brew install graphviz")
        log_error("")
        log_error("  Ubuntu/Debian:")
        log_error("    sudo apt-get install graphviz")
        log_error("")
        log_error("  Fedora/RHEL:")
        log_error("    sudo dnf install graphviz")
        log_error("")
        log_error("After installation, ensure 'dot' is in your PATH.")
        log_error("For more info: https://graphviz.org/download/")
        raise SystemExit(1)

    # Verify it actually works by getting version
    try:
        result = subprocess.run(
            ["dot", "-V"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        # dot -V outputs to stderr
        version_output = result.stderr.strip() or result.stdout.strip()
        log_debug(f"Graphviz found at: {dot_path}")
        log_debug(f"Graphviz version: {version_output}")
        log_success("Graphviz installation validated")
        return True

    except subprocess.TimeoutExpired:
        log_error("Graphviz check timed out")
        log_error("Please verify your Graphviz installation is working correctly")
        raise SystemExit(1) from None

    except subprocess.SubprocessError as e:
        log_error(f"Failed to run Graphviz: {e}")
        log_error("Please verify your Graphviz installation is working correctly")
        raise SystemExit(1) from None

    except Exception as e:
        log_error(f"Unexpected error checking Graphviz: {e}")
        raise SystemExit(1) from None
