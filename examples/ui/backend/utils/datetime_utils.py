"""
DateTime utility functions for the PandaAGI SDK API.
"""

import datetime
from typing import Optional


def parse_timestamp(timestamp: Optional[str]) -> Optional[datetime.datetime]:
    """
    Parse a timestamp string into a datetime object.

    Supports both ISO format timestamps and Unix timestamps.

    Args:
        timestamp: The timestamp string to parse. Can be:
            - ISO format (e.g., "2023-12-01T10:30:00Z" or "2023-12-01T10:30:00+00:00")
            - Unix timestamp (e.g., "1701426600")
            - None (returns None)

    Returns:
        A datetime object or None if timestamp is None or parsing fails
    """
    if not timestamp:
        return None

    try:
        # If timestamp is already in ISO format, parse it to datetime
        if "T" in timestamp:
            if timestamp.endswith("Z"):
                timestamp = timestamp[:-1] + "+00:00"
            return datetime.datetime.fromisoformat(timestamp)
        else:
            # If it's a Unix timestamp, convert it
            return datetime.datetime.fromtimestamp(int(timestamp))
    except (ValueError, TypeError, OSError):
        # Return None if parsing fails for any reason
        return None
