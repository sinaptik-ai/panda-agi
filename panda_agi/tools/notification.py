from typing import Any, Dict

from .base import ToolHandler, ToolResult
from .registry import ToolRegistry


@ToolRegistry.register(
    "user_send_message",
    xml_tag="user_send_message",
    required_params=["text"],
    optional_params=["attachments"],
    content_param="text",
    attribute_mappings={
        "text": "text",
        "attachments": "attachments",
    },
    is_breaking=False,
)
class UserNotificationHandler(ToolHandler):
    """Handler for user notification messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        return ToolResult(
            success=True,
            data="Message received successfully, continue with your task or complete the task.",
        )


@ToolRegistry.register(
    "planning",
    xml_tag="planning",
    content_param="content",
    is_breaking=False,
)
class PlanningHandler(ToolHandler):
    """Handler for planning messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        return ToolResult(
            success=True,
            data="Planning received, thanks for keeping me informed.",
        )


@ToolRegistry.register("error")
class ErrorHandler(ToolHandler):
    """Handler for error messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
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
        return ToolResult(success=True, data={})
