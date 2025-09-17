from typing import Any, Dict, Optional

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .custom_tools_ops import CustomToolRegistry, execute_custom_tool


class CustomToolExecutorHandler(ToolHandler):
    """Generic handler for executing custom tools directly"""

    def __init__(self, tool_name: str):
        super().__init__()
        self.tool_name = tool_name

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        # Check if custom tool exists
        if not CustomToolRegistry.get_tool(self.tool_name):
            available_tools = CustomToolRegistry.list_tools()
            return f"Custom tool '{self.tool_name}' not found. Available custom tools: {', '.join(available_tools) if available_tools else 'None'}"

        # Get the tool to validate parameters
        tool_obj = CustomToolRegistry.get_tool(self.tool_name)
        required_params = [p.name for p in tool_obj.parameters if p.required]

        # Check for missing required parameters
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters for '{self.tool_name}': {', '.join(missing)}"

        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        try:
            # Add initial event for custom tool execution
            await self.add_event(
                EventType.USE_CUSTOM_TOOL,
                {"tool_name": self.tool_name, "parameters": params},
            )

            # Execute the custom tool
            result = await execute_custom_tool(self.tool_name, params)

            # Add completion event with result
            await self.add_event(
                EventType.USE_CUSTOM_TOOL_RESULT,
                {
                    "tool_name": self.tool_name,
                    "parameters": params,
                    "result": {"success": True, "data": result},
                },
            )

            return ToolResult(
                success=True,
                data={"tool_name": self.tool_name, "result": result},
                error=None,
            )

        except Exception as e:
            # Add error event
            await self.add_event(
                EventType.USE_CUSTOM_TOOL_RESULT,
                {
                    "tool_name": self.tool_name,
                    "parameters": params,
                    "result": {"success": False, "error": str(e)},
                },
            )

            return ToolResult(
                success=False,
                data={"tool_name": self.tool_name},
                error=f"Error executing custom tool '{self.tool_name}': {str(e)}",
            )
