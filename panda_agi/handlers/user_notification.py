from typing import Any, Dict

from ..client.models import EventType
from .base import HandlerResult, ToolHandler
from .registry import HandlerRegistry


@HandlerRegistry.register(
    "user_send_message", aliases=["user_ask_question", "error", "completed_task"]
)
class UserNotificationHandler(ToolHandler):
    """Handler for user notification messages"""

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        # Add event to event manager
        await self.event_manager.add_event(
            EventType.USER_NOTIFICATION,
            data=tool_call,
        )

        return HandlerResult(success=True, data={"message_received": True})
