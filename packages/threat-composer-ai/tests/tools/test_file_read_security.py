"""
Test security restrictions for the threat_composer_workdir_file_read tool.

This test validates that the file_read tool properly prevents directory traversal
attacks and unauthorized access to files outside the working directory and output directory.
"""

import os
import tempfile
from pathlib import Path

import pytest

from threat_composer_ai.config import AppConfig, register_global_config
from threat_composer_ai.tools.threat_composer_workdir_file_read import (
    threat_composer_workdir_file_read,
)


class TestFileReadSecurity:
    """Test security restrictions for the file_read tool."""

    @pytest.fixture
    def setup_test_environment(self):
        """Set up a test environment with working directory and external files."""
        # Create temporary directories
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create working directory
            working_dir = temp_path / "working_dir"
            working_dir.mkdir()

            # Create a file inside working directory
            allowed_file = working_dir / "allowed.txt"
            allowed_file.write_text("This file is inside the working directory")

            # Create a file outside working directory
            forbidden_file = temp_path / "forbidden.txt"
            forbidden_file.write_text("This file is outside the working directory")

            # Create base output directory (AppConfig.create will add timestamp subdirectory)
            base_output_dir = working_dir / ".threat-composer"

            # Register global config (this will create a timestamped subdirectory)
            config = AppConfig.create(
                working_directory=working_dir, output_directory=base_output_dir
            )
            register_global_config(config)

            # Get the actual output directory with timestamp from config
            actual_output_dir = config.output_directory
            actual_output_dir.mkdir(parents=True, exist_ok=True)

            # Create a file in output directory
            output_file = actual_output_dir / "output.txt"
            output_file.write_text("This file is in the output directory")

            yield {
                "working_dir": working_dir,
                "allowed_file": allowed_file,
                "forbidden_file": forbidden_file,
                "temp_dir": temp_path,
                "output_dir": actual_output_dir,
                "output_file": output_file,
                "config": config,
            }

    def test_can_read_file_inside_working_directory(self, setup_test_environment):
        """Test that files inside the working directory can be read."""
        env = setup_test_environment

        # Create tool use request for allowed file
        tool_use = {
            "toolUseId": "test-1",
            "input": {"path": str(env["allowed_file"]), "mode": "view"},
        }

        # Call the tool
        result = threat_composer_workdir_file_read(tool_use)

        # Verify success
        assert result["status"] != "error"
        assert "This file is inside the working directory" in str(result["content"])

    def test_can_read_file_inside_output_directory(self, setup_test_environment):
        """Test that files inside the output directory can be read."""
        env = setup_test_environment

        # Create tool use request for output file
        tool_use = {
            "toolUseId": "test-output",
            "input": {"path": str(env["output_file"]), "mode": "view"},
        }

        # Call the tool
        result = threat_composer_workdir_file_read(tool_use)

        # Verify success
        assert result["status"] != "error"
        assert "This file is in the output directory" in str(result["content"])

    def test_cannot_read_file_outside_working_directory_absolute_path(
        self, setup_test_environment
    ):
        """Test that files outside working directory cannot be read using absolute paths."""
        env = setup_test_environment

        # Create tool use request for forbidden file (absolute path)
        tool_use = {
            "toolUseId": "test-2",
            "input": {"path": str(env["forbidden_file"]), "mode": "view"},
        }

        # Call the tool
        result = threat_composer_workdir_file_read(tool_use)

        # Verify access denied
        assert result["status"] == "error"
        assert "Access denied" in str(result["content"])
        assert "outside both the allowed working directory" in str(result["content"])
        assert "and output directory" in str(result["content"])

    def test_cannot_read_file_outside_working_directory_relative_traversal(
        self, setup_test_environment
    ):
        """Test that directory traversal attacks using relative paths are blocked."""

        # Try to access forbidden file using directory traversal
        relative_path = "../forbidden.txt"

        tool_use = {
            "toolUseId": "test-3",
            "input": {"path": relative_path, "mode": "view"},
        }

        # Call the tool
        result = threat_composer_workdir_file_read(tool_use)

        # Verify access denied
        assert result["status"] == "error"
        assert "Access denied" in str(result["content"])
        assert "outside both the allowed working directory" in str(result["content"])
        assert "and output directory" in str(result["content"])

    def test_cannot_read_system_files(self, setup_test_environment):
        """Test that system files cannot be read."""

        # Try to access system files (common on Unix-like systems)
        # Focus on absolute paths that should be blocked by security validation
        system_paths = [
            "/etc/passwd",
            "/etc/hosts",
            "/proc/version",
        ]

        for system_path in system_paths:
            # Create a safe ID by replacing path separators
            safe_id = system_path.replace("/", "-").replace("\\", "-")
            tool_use = {
                "toolUseId": f"test-system-{safe_id}",
                "input": {"path": system_path, "mode": "view"},
            }

            # Call the tool
            result = threat_composer_workdir_file_read(tool_use)

            # Verify access denied (should be blocked by security validation)
            assert result["status"] == "error"
            assert "Access denied" in str(result["content"])

    def test_cannot_read_home_directory_files(self, setup_test_environment):
        """Test that files in user's home directory cannot be read using absolute paths."""

        # Use absolute paths to home directory files (these should be blocked)
        import os

        home_dir = os.path.expanduser("~")
        home_paths = [
            f"{home_dir}/.bashrc",
            f"{home_dir}/.profile",
            f"{home_dir}/Documents/sensitive.txt",
            f"{home_dir}/.ssh/id_rsa",
        ]

        for home_path in home_paths:
            # Create a safe ID by replacing path separators
            safe_id = home_path.replace("/", "-").replace("\\", "-")
            tool_use = {
                "toolUseId": f"test-home-{safe_id}",
                "input": {"path": home_path, "mode": "view"},
            }

            # Call the tool
            result = threat_composer_workdir_file_read(tool_use)

            # Verify access denied (absolute paths outside working dir should be blocked)
            assert result["status"] == "error"
            assert "Access denied" in str(result["content"])

    def test_complex_directory_traversal_attempts(self, setup_test_environment):
        """Test various complex directory traversal attack patterns."""

        # Focus on patterns that should be caught by security validation
        # These patterns resolve to paths outside the working directory
        traversal_patterns = [
            "../../forbidden.txt",
            "../../../forbidden.txt",
            "./../forbidden.txt",
            "./../../forbidden.txt",
        ]

        for pattern in traversal_patterns:
            tool_use = {
                "toolUseId": f"test-traversal-{hash(pattern)}",
                "input": {"path": pattern, "mode": "view"},
            }

            # Call the tool
            result = threat_composer_workdir_file_read(tool_use)

            # Verify access denied (these should resolve outside working directory)
            assert result["status"] == "error", f"Pattern '{pattern}' should be blocked"
            assert "Access denied" in str(result["content"])

    def test_symlink_traversal_protection(self, setup_test_environment):
        """Test that symlinks cannot be used to escape the working directory."""
        env = setup_test_environment

        # Create a symlink pointing outside the working directory
        symlink_path = env["working_dir"] / "escape_link"

        try:
            # Create symlink to forbidden file
            symlink_path.symlink_to(env["forbidden_file"])

            tool_use = {
                "toolUseId": "test-symlink",
                "input": {"path": str(symlink_path), "mode": "view"},
            }

            # Call the tool
            result = threat_composer_workdir_file_read(tool_use)

            # Verify access denied (symlink resolution should detect the escape)
            assert result["status"] == "error"
            assert "Access denied" in str(result["content"])

        except OSError:
            # Symlink creation might fail on some systems, skip this test
            pytest.skip("Symlink creation not supported on this system")

    def test_actual_io_operations_are_performed(self, setup_test_environment):
        """Test that actual I/O operations are performed and not just mocked."""
        env = setup_test_environment

        # Create a unique file with specific content
        test_content = f"Unique test content: {os.urandom(16).hex()}"
        test_file = env["working_dir"] / "io_test.txt"
        test_file.write_text(test_content)

        tool_use = {
            "toolUseId": "test-io",
            "input": {"path": str(test_file), "mode": "view"},
        }

        # Call the tool
        result = threat_composer_workdir_file_read(tool_use)

        # Verify the actual file content is returned
        assert result["status"] != "error"
        assert test_content in str(result["content"])

        # Verify the file actually exists on disk
        assert test_file.exists()
        assert test_file.read_text() == test_content

    def test_error_handling_for_nonexistent_files(self, setup_test_environment):
        """Test proper error handling for nonexistent files within working directory."""
        env = setup_test_environment

        # Try to read a nonexistent file within working directory
        nonexistent_file = env["working_dir"] / "does_not_exist.txt"

        tool_use = {
            "toolUseId": "test-nonexistent",
            "input": {"path": str(nonexistent_file), "mode": "view"},
        }

        # Call the tool
        result = threat_composer_workdir_file_read(tool_use)

        # Should not be a security error, but a file not found error
        # The security validation should pass, but the underlying file_read should fail
        # This tests that our security layer doesn't interfere with normal error handling
        assert "Access denied" not in str(result["content"])

    def test_missing_required_parameters(self, setup_test_environment):
        """Test error handling for missing required parameters."""
        env = setup_test_environment

        # Test missing path parameter
        tool_use_no_path = {"toolUseId": "test-no-path", "input": {"mode": "view"}}

        result = threat_composer_workdir_file_read(tool_use_no_path)
        assert result["status"] == "error"
        assert "path parameter is required" in str(result["content"])

        # Test missing mode parameter
        tool_use_no_mode = {
            "toolUseId": "test-no-mode",
            "input": {"path": str(env["allowed_file"])},
        }

        result = threat_composer_workdir_file_read(tool_use_no_mode)
        assert result["status"] == "error"
        assert "mode parameter is required" in str(result["content"])
