from typing import Any, Dict

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .registry import ToolRegistry


@ToolRegistry.register("user_send_message")
class UserNotificationHandler(ToolHandler):
    """Handler for user notification messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # Add event to event manager
        await self.event_manager.add_event(
            EventType.USER_NOTIFICATION,
            data=params,
        )

        return ToolResult(success=True, data={})


@ToolRegistry.register("user_ask_question")
class UserQuestionHandler(ToolHandler):
    """Handler for user question messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.event_manager.add_event(
            EventType.USER_QUESTION,
            data=params,
        )
        return ToolResult(success=True, data={})


@ToolRegistry.register("error")
class ErrorHandler(ToolHandler):
    """Handler for error messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.event_manager.add_event(
            EventType.ERROR,
            data=params,
        )
        return ToolResult(success=True, data={})


@ToolRegistry.register("completed_task")
class CompletedTaskHandler(ToolHandler):
    """Handler for completed task messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.event_manager.add_event(
            EventType.COMPLETED_TASK,
            data=params,
        )
        return ToolResult(success=True, data={})
