"""
Test security restrictions for the threat_composer_workdir_file_write tool.

This test validates that the file_write tool properly prevents directory traversal
attacks and unauthorized file writes outside the output directory.
"""

import os
import tempfile
from pathlib import Path

import pytest

from threat_composer_ai.config import AppConfig, register_global_config
from threat_composer_ai.tools.threat_composer_workdir_file_write import (
    threat_composer_workdir_file_write,
)


class TestFileWriteSecurity:
    """Test security restrictions for the file_write tool."""

    @pytest.fixture
    def setup_test_environment(self):
        """Set up a test environment with working directory and external directories."""
        # Bypass tool consent for Strands Tools
        os.environ["BYPASS_TOOL_CONSENT"] = "true"

        # Create temporary directories
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create working directory
            working_dir = temp_path / "working_dir"
            working_dir.mkdir()

            # Create a subdirectory inside working directory
            allowed_subdir = working_dir / "allowed_subdir"
            allowed_subdir.mkdir()

            # Create a directory outside working directory
            forbidden_dir = temp_path / "forbidden_dir"
            forbidden_dir.mkdir()

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

            yield {
                "working_dir": working_dir,
                "allowed_subdir": allowed_subdir,
                "forbidden_dir": forbidden_dir,
                "temp_dir": temp_path,
                "output_dir": actual_output_dir,
                "config": config,
            }

            # Clean up environment variable
            if "BYPASS_TOOL_CONSENT" in os.environ:
                del os.environ["BYPASS_TOOL_CONSENT"]

    def test_can_write_file_inside_output_directory(self, setup_test_environment):
        """Test that files can be written inside the output directory."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Create tool use request for allowed file in output directory
        test_content = "This file should be written successfully"
        allowed_file = output_dir / "allowed_write.txt"

        tool_use = {
            "toolUseId": "test-1",
            "input": {"path": str(allowed_file), "content": test_content},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify success
        assert result["status"] != "error"

        # Verify the file was actually written with correct content
        assert allowed_file.exists()
        assert allowed_file.read_text() == test_content

    def test_can_write_file_in_subdirectory(self, setup_test_environment):
        """Test that files can be written in subdirectories within output directory."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Create a subdirectory in output directory
        output_subdir = output_dir / "subdir"
        output_subdir.mkdir(parents=True, exist_ok=True)

        # Create tool use request for file in subdirectory
        test_content = "This file should be written in subdirectory"
        subdir_file = output_subdir / "subdir_file.txt"

        tool_use = {
            "toolUseId": "test-subdir",
            "input": {"path": str(subdir_file), "content": test_content},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify success
        assert result["status"] != "error"

        # Verify the file was actually written
        assert subdir_file.exists()
        assert subdir_file.read_text() == test_content

    def test_cannot_write_to_working_directory(self, setup_test_environment):
        """Test that files cannot be written to working directory (only output directory allowed)."""
        env = setup_test_environment

        # Try to write to working directory (should be denied)
        working_file = env["working_dir"] / "should_not_write.txt"
        test_content = "This should not be written to working directory"

        tool_use = {
            "toolUseId": "test-working-dir",
            "input": {"path": str(working_file), "content": test_content},
        }

        result = threat_composer_workdir_file_write(tool_use)

        # Verify access denied
        assert result["status"] == "error"
        assert "Access denied" in str(result["content"])
        assert "outside the allowed output directory" in str(result["content"])

        # Verify the file was NOT written
        assert not working_file.exists()

    def test_cannot_write_file_outside_output_directory_absolute_path(
        self, setup_test_environment
    ):
        """Test that files cannot be written outside output directory using absolute paths."""
        env = setup_test_environment

        # Try to write to forbidden directory (absolute path)
        forbidden_file = env["forbidden_dir"] / "forbidden_write.txt"
        test_content = "This should not be written"

        tool_use = {
            "toolUseId": "test-2",
            "input": {"path": str(forbidden_file), "content": test_content},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify access denied
        assert result["status"] == "error"
        assert "Access denied" in str(result["content"])
        assert "outside the allowed output directory" in str(result["content"])

        # Verify the file was NOT written
        assert not forbidden_file.exists()

    def test_cannot_write_file_outside_output_directory_relative_traversal(
        self, setup_test_environment
    ):
        """Test that directory traversal attacks using relative paths are blocked."""
        env = setup_test_environment

        # Try to write outside output directory using directory traversal
        relative_path = "../forbidden_traversal.txt"
        test_content = "This should not be written via traversal"

        tool_use = {
            "toolUseId": "test-3",
            "input": {"path": relative_path, "content": test_content},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify access denied
        assert result["status"] == "error"
        assert "Access denied" in str(result["content"])
        assert "outside the allowed output directory" in str(result["content"])

        # Verify the file was NOT written
        forbidden_file = env["temp_dir"] / "forbidden_traversal.txt"
        assert not forbidden_file.exists()

    def test_cannot_write_to_system_locations(self, setup_test_environment):
        """Test that system files cannot be written."""

        # Try to write to system locations
        system_paths = [
            "/etc/malicious.txt",
            "/tmp/system_write.txt",
            "/var/log/malicious.log",
        ]

        test_content = "Malicious content"

        for system_path in system_paths:
            # Create a safe ID by replacing path separators
            safe_id = system_path.replace("/", "-").replace("\\", "-")
            tool_use = {
                "toolUseId": f"test-system-{safe_id}",
                "input": {"path": system_path, "content": test_content},
            }

            # Call the tool
            result = threat_composer_workdir_file_write(tool_use)

            # Verify access denied
            assert result["status"] == "error"
            assert "Access denied" in str(result["content"])

            # Verify the file was NOT written (if we can check safely)
            system_file = Path(system_path)
            if system_file.parent.exists():
                assert not system_file.exists()

    def test_cannot_write_to_home_directory(self, setup_test_environment):
        """Test that files cannot be written to user's home directory."""

        # Use absolute paths to home directory files
        home_dir = os.path.expanduser("~")
        home_paths = [
            f"{home_dir}/malicious.txt",
            f"{home_dir}/Documents/malicious.txt",
            f"{home_dir}/.bashrc_backup",
        ]

        test_content = "Malicious content"

        for home_path in home_paths:
            # Create a safe ID by replacing path separators
            safe_id = home_path.replace("/", "-").replace("\\", "-")
            tool_use = {
                "toolUseId": f"test-home-{safe_id}",
                "input": {"path": home_path, "content": test_content},
            }

            # Call the tool
            result = threat_composer_workdir_file_write(tool_use)

            # Verify access denied
            assert result["status"] == "error"
            assert "Access denied" in str(result["content"])

            # Verify the file was NOT written
            home_file = Path(home_path)
            assert not home_file.exists()

    def test_complex_directory_traversal_attempts(self, setup_test_environment):
        """Test various complex directory traversal attack patterns."""
        env = setup_test_environment

        # Various directory traversal patterns
        traversal_patterns = [
            "../../forbidden_traversal.txt",
            "../../../forbidden_traversal.txt",
            "./../forbidden_traversal.txt",
            "./../../forbidden_traversal.txt",
            "subdir/../../../forbidden_traversal.txt",
        ]

        test_content = "This should not be written"

        for pattern in traversal_patterns:
            tool_use = {
                "toolUseId": f"test-traversal-{hash(pattern)}",
                "input": {"path": pattern, "content": test_content},
            }

            # Call the tool
            result = threat_composer_workdir_file_write(tool_use)

            # Verify access denied
            assert result["status"] == "error", f"Pattern '{pattern}' should be blocked"
            assert "Access denied" in str(result["content"])

        # Verify no forbidden files were created
        forbidden_file = env["temp_dir"] / "forbidden_traversal.txt"
        assert not forbidden_file.exists()

    def test_symlink_traversal_protection(self, setup_test_environment):
        """Test that symlinks cannot be used to escape the output directory."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Create a symlink pointing outside the output directory
        symlink_path = output_dir / "escape_link"

        try:
            # Create symlink to forbidden directory
            symlink_path.symlink_to(env["forbidden_dir"])

            # Try to write through the symlink
            symlink_file = symlink_path / "escaped_write.txt"
            test_content = "This should not be written via symlink"

            tool_use = {
                "toolUseId": "test-symlink",
                "input": {"path": str(symlink_file), "content": test_content},
            }

            # Call the tool
            result = threat_composer_workdir_file_write(tool_use)

            # Verify access denied (symlink resolution should detect the escape)
            assert result["status"] == "error"
            assert "Access denied" in str(result["content"])

            # Verify the file was NOT written in the forbidden directory
            forbidden_file = env["forbidden_dir"] / "escaped_write.txt"
            assert not forbidden_file.exists()

        except OSError:
            # Symlink creation might fail on some systems, skip this test
            pytest.skip("Symlink creation not supported on this system")

    def test_actual_io_operations_are_performed(self, setup_test_environment):
        """Test that actual I/O operations are performed and not just mocked."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Create a unique file with specific content in output directory
        test_content = f"Unique test content: {os.urandom(16).hex()}"
        test_file = output_dir / "io_test_write.txt"

        tool_use = {
            "toolUseId": "test-io",
            "input": {"path": str(test_file), "content": test_content},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify success
        assert result["status"] != "error"

        # Verify the file actually exists on disk with correct content
        assert test_file.exists()
        assert test_file.read_text() == test_content

        # Verify file permissions are reasonable (readable by owner)
        assert test_file.is_file()
        assert os.access(test_file, os.R_OK)

    def test_overwrite_existing_file(self, setup_test_environment):
        """Test that existing files can be overwritten within output directory."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Create an existing file in output directory
        test_file = output_dir / "overwrite_test.txt"
        original_content = "Original content"
        test_file.write_text(original_content)

        # Overwrite with new content
        new_content = "New overwritten content"
        tool_use = {
            "toolUseId": "test-overwrite",
            "input": {"path": str(test_file), "content": new_content},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify success
        assert result["status"] != "error"

        # Verify the file was overwritten with new content
        assert test_file.exists()
        assert test_file.read_text() == new_content
        assert test_file.read_text() != original_content

    def test_create_directories_automatically(self, setup_test_environment):
        """Test that directories are created automatically when writing files."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Try to write to a file in a non-existent subdirectory within output directory
        nested_file = output_dir / "new_dir" / "nested_dir" / "auto_created.txt"
        test_content = "Content in auto-created directory"

        tool_use = {
            "toolUseId": "test-auto-dir",
            "input": {"path": str(nested_file), "content": test_content},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify success
        assert result["status"] != "error"

        # Verify the directories were created and file was written
        assert nested_file.exists()
        assert nested_file.read_text() == test_content
        assert nested_file.parent.exists()
        assert nested_file.parent.parent.exists()

    def test_missing_required_parameters(self, setup_test_environment):
        """Test error handling for missing required parameters."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Test missing path parameter
        tool_use_no_path = {
            "toolUseId": "test-no-path",
            "input": {"content": "Some content"},
        }

        result = threat_composer_workdir_file_write(tool_use_no_path)
        assert result["status"] == "error"
        assert "path parameter is required" in str(result["content"])

        # Test missing content parameter
        tool_use_no_content = {
            "toolUseId": "test-no-content",
            "input": {"path": str(output_dir / "test.txt")},
        }

        result = threat_composer_workdir_file_write(tool_use_no_content)
        assert result["status"] == "error"
        assert "content parameter is required" in str(result["content"])

    def test_empty_content_allowed(self, setup_test_environment):
        """Test that empty content is allowed for file writes."""
        env = setup_test_environment
        output_dir = env["output_dir"]

        # Write a file with empty content in output directory
        test_file = output_dir / "empty_file.txt"

        tool_use = {
            "toolUseId": "test-empty",
            "input": {"path": str(test_file), "content": ""},
        }

        # Call the tool
        result = threat_composer_workdir_file_write(tool_use)

        # Verify success
        assert result["status"] != "error"

        # Verify the empty file was created
        assert test_file.exists()
        assert test_file.read_text() == ""
        assert test_file.stat().st_size == 0
