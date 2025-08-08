"""
Event processing utilities for the PandaAGI SDK API.
"""

import logging
from typing import Dict, Optional, Union

from panda_agi.client.models import BaseStreamEvent, EventType

logger = logging.getLogger("panda_agi_api")


def should_render_event(event: dict) -> bool:
    """
    Check if event should be rendered - same logic as CLI.

    Args:
        event: The event to check, either a BaseStreamEvent or string event type

    Returns:
        bool: True if the event should be rendered, False otherwise
    """

    if not isinstance(event, dict):
        return False

    event_type = event.get("event_type", None)

    if event_type == "tool_end" or event_type == "tool_start":
        return True

    return False


def truncate_long_content(data, max_length: int = 5000):
    """
    Recursively truncate long string values in a dictionary or list.

    Args:
        data: The data structure to truncate (dict, list, or any other type)
        max_length: Maximum length for string values before truncation

    Returns:
        The data structure with truncated string values
    """
    if isinstance(data, dict):
        return {
            key: truncate_long_content(value, max_length) for key, value in data.items()
        }
    elif isinstance(data, list):
        return [truncate_long_content(item, max_length) for item in data]
    elif isinstance(data, str) and len(data) > max_length:
        return data[:max_length] + "\n\n... [Content truncated]"
    else:
        return data


def process_event_for_frontend(event) -> Optional[Dict]:
    """
    Process an event for frontend consumption with type safety.

    Args:
        event: The event to process

    Returns:
        Optional[Dict]: Processed event data or None if processing failed
    """
    try:
        if isinstance(event, BaseStreamEvent):
            event_type = (
                event.type.value if hasattr(event.type, "value") else str(event.type)
            )

            # Get the event data
            event_data = event.to_dict()

            # Apply truncation to all string fields
            event_data = truncate_long_content(event_data)

            return {
                "data": {
                    "type": event_type,
                    "payload": event_data,
                    "timestamp": event.timestamp,
                    "id": getattr(event, "id", None),
                },
            }
        else:
            # Handle legacy events with truncation
            event_type = (
                event.type.value if hasattr(event.type, "value") else str(event.type)
            )

            event_data = event.data
            # Apply truncation to all string fields
            event_data = truncate_long_content(event_data)

            return {
                "data": {
                    "type": event_type,
                    "payload": event_data,
                    "timestamp": getattr(event, "timestamp", ""),
                    "id": getattr(event, "id", None),
                },
            }
    except Exception as e:
        logger.error(f"Error processing event: {e}")
        return None
