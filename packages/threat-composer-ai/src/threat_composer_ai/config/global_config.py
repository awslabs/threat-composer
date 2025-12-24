"""Global configuration registry for secure tool access."""

from threading import Lock
from typing import Optional

from .app_config import AppConfig


class GlobalConfigRegistry:
    """
    Thread-safe global configuration registry for tools.

    This registry ensures that tools can only access the configured working directory
    and prevents AI agents from manipulating file access paths for security.
    """

    _instance: Optional["GlobalConfigRegistry"] = None
    _lock = Lock()

    def __init__(self):
        self._config: AppConfig | None = None
        self._config_lock = Lock()

    @classmethod
    def get_instance(cls) -> "GlobalConfigRegistry":
        """Get the singleton instance of the config registry."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def register_config(self, config: AppConfig) -> None:
        """
        Register the application configuration.

        Args:
            config: The AppConfig instance to register globally
        """
        with self._config_lock:
            self._config = config

    def get_config(self) -> AppConfig | None:
        """
        Get the registered configuration.

        Returns:
            The registered AppConfig instance, or None if not registered
        """
        with self._config_lock:
            return self._config

    def get_working_directory(self) -> str | None:
        """
        Get the working directory path as a string.

        Returns:
            The working directory path as string, or None if config not registered
        """
        config = self.get_config()
        return str(config.working_directory) if config else None

    def get_output_directory(self) -> str | None:
        """
        Get the output directory path as a string.

        Returns:
            The output directory path as string, or None if config not registered
        """
        config = self.get_config()
        return str(config.output_directory) if config else None

    def is_path_within_working_directory(self, path: str) -> bool:
        """
        Check if a given path is within the configured working directory.

        This provides security validation to prevent directory traversal attacks
        or access to files outside the intended working directory.

        Args:
            path: The path to validate

        Returns:
            True if path is within working directory, False otherwise
        """
        config = self.get_config()
        if not config:
            return False

        try:
            from pathlib import Path

            # Resolve both paths to handle symlinks and relative paths
            working_dir = config.working_directory.resolve()
            target_path = Path(path).resolve()

            # Check if target path is within working directory
            try:
                target_path.relative_to(working_dir)
                return True
            except ValueError:
                # relative_to raises ValueError if target_path is not within working_dir
                return False

        except Exception:
            # Any error in path resolution means we should deny access
            return False

    def is_path_within_output_directory(self, path: str) -> bool:
        """
        Check if a given path is within the configured output directory.

        This provides security validation to prevent directory traversal attacks
        or access to files outside the intended output directory.

        Args:
            path: The path to validate

        Returns:
            True if path is within output directory, False otherwise
        """
        config = self.get_config()
        if not config:
            return False

        try:
            from pathlib import Path

            # Resolve both paths to handle symlinks and relative paths
            output_dir = config.output_directory.resolve()
            target_path = Path(path).resolve()

            # Check if target path is within output directory
            try:
                target_path.relative_to(output_dir)
                return True
            except ValueError:
                # relative_to raises ValueError if target_path is not within output_dir
                return False

        except Exception:
            # Any error in path resolution means we should deny access
            return False


# Global registry instance
_global_registry = GlobalConfigRegistry()


def register_global_config(config: AppConfig) -> None:
    """
    Register the application configuration globally.

    This should be called once during application initialization.

    Args:
        config: The AppConfig instance to register
    """
    _global_registry.register_config(config)


def get_global_config() -> AppConfig | None:
    """
    Get the globally registered configuration.

    Returns:
        The registered AppConfig instance, or None if not registered
    """
    return _global_registry.get_config()


def get_global_working_directory() -> str | None:
    """
    Get the globally configured working directory.

    Returns:
        The working directory path as string, or None if config not registered
    """
    return _global_registry.get_working_directory()


def get_global_output_directory() -> str | None:
    """
    Get the globally configured output directory.

    Returns:
        The output directory path as string, or None if config not registered
    """
    return _global_registry.get_output_directory()


def get_global_session_id() -> str | None:
    """
    Get the globally configured session ID.

    The session ID is extracted from the final directory name of the output directory.

    Returns:
        The session ID as string, or None if config not registered
    """
    config = _global_registry.get_config()
    return config.output_directory.name if config else None


def get_global_storage_directory() -> str | None:
    """
    Get the globally configured storage directory (parent of output directory).

    Returns:
        The storage directory path as string, or None if config not registered
    """
    config = _global_registry.get_config()
    return str(config.output_directory.parent) if config else None


def validate_path_security(path: str) -> bool:
    """
    Validate that a path is within the configured working directory.

    This function provides security validation for tools to prevent
    directory traversal attacks or unauthorized file access.

    Args:
        path: The path to validate

    Returns:
        True if path is safe to access, False otherwise
    """
    return _global_registry.is_path_within_working_directory(path)


def validate_path_in_output_directory(path: str) -> bool:
    """
    Validate that a path is within the configured output directory.

    This function provides security validation for tools to prevent
    directory traversal attacks or unauthorized file access outside
    the output directory.

    Args:
        path: The path to validate

    Returns:
        True if path is within output directory, False otherwise
    """
    return _global_registry.is_path_within_output_directory(path)
