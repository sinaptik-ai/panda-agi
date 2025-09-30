from typing import Any, Dict, Optional


class ToolResult:
    """Standardized result type for handler operations"""

    def __init__(
        self,
        success: bool,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        self.success = success
        self.data = data or {}
        self.error = error

    def to_payload(self) -> Dict[str, Any]:
        """Convert to WebSocket message payload"""
        payload = {}
        if self.success:
            payload.update(self.data)
        else:
            payload["message"] = self.error or "Unknown error"
        return payload
