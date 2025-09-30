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
        print(f"User message: {params}")

        if not params.get("text"):
            return ToolResult(
                success=False,
                error="Missing text parameter. Please provide a message.",
            )

        return ToolResult(
            success=True,
            data="Message received successfully, continue with your task or set idle.",
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
    "set_idle",
    aliases=[
        "set_idle/",
        "set_idle /"
    ],  # This is to solve hallucination issue when calling set_idle tool
    xml_tag="set_idle",
    is_breaking=True,  # This tool should break execution as it indicates completion
)
class SetIdleHandler(ToolHandler):
    """Handler for set idle messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        return ToolResult(success=True, data={})
