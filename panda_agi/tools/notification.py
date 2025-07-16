from typing import Any, Dict

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .registry import ToolRegistry


@ToolRegistry.register(
    "user_send_message",
    xml_tag="user_send_message",
    required_params=["text"],
    content_param="text",
    is_breaking=False,
)
class UserNotificationHandler(ToolHandler):
    """Handler for user notification messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # Add event to event manager
        await self.event_manager.add_event(
            EventType.USER_NOTIFICATION,
            data=params,
        )

        return ToolResult(
            success=True,
            data="Message received successfully, continue with your task or complete the task.",
        )


@ToolRegistry.register("error")
class ErrorHandler(ToolHandler):
    """Handler for error messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.event_manager.add_event(
            EventType.ERROR,
            data=params,
        )
        return ToolResult(success=True, data={"error": params.get("error")})


@ToolRegistry.register(
    "completed_task",
    xml_tag="completed_task",
    required_params=["success"],
    attribute_mappings={
        "success": "success",
    },
    is_breaking=True,  # This tool should break execution as it indicates completion
)
class CompletedTaskHandler(ToolHandler):
    """Handler for completed task messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.event_manager.add_event(
            EventType.COMPLETED_TASK,
            data=params,
        )
        return ToolResult(success=True, data={})
