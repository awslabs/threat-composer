"""Datetime utilities for consistent timestamp handling across the application."""

from datetime import datetime, timezone


def format_utc_timestamp(dt: datetime) -> str:
    """
    Always return UTC datetime in consistent Z format.

    Args:
        dt: datetime object (timezone-aware or naive)

    Returns:
        ISO 8601 formatted string with Z suffix (e.g., "2025-11-05T12:40:25.127767Z")
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def parse_utc_timestamp(timestamp_str: str) -> datetime:
    """
    Always parse to UTC datetime, handling both Z and +00:00 formats.

    Args:
        timestamp_str: ISO 8601 timestamp string

    Returns:
        timezone-aware datetime object in UTC

    Raises:
        ValueError: If timestamp string is invalid
    """
    if timestamp_str.endswith("Z"):
        # Replace Z with +00:00 for fromisoformat compatibility
        return datetime.fromisoformat(timestamp_str[:-1] + "+00:00")

    # Handle existing +00:00 format or other timezone formats
    dt = datetime.fromisoformat(timestamp_str)

    # Ensure it's in UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    return dt


def now_utc_timestamp() -> str:
    """
    Get current UTC timestamp in standardized format.

    Returns:
        Current UTC timestamp as ISO 8601 string with Z suffix
    """
    return format_utc_timestamp(datetime.now(timezone.utc))
