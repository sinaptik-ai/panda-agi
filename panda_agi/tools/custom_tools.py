from typing import Any, Dict, Optional

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .registry import ToolRegistry
from .custom_tools_ops import CustomToolRegistry, execute_custom_tool


@ToolRegistry.register(
    "use_custom_tool",
    xml_tag="use_custom_tool",
    required_params=["tool_name"],
    optional_params=["parameters"],
    attribute_mappings={"tool_name": "tool_name"},
)
class UseCustomToolHandler(ToolHandler):
    """Handler for using custom tools"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["tool_name"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"

        # Check if custom tool exists
        tool_name = params["tool_name"]
        if not CustomToolRegistry.get_tool(tool_name):
            available_tools = CustomToolRegistry.list_tools()
            return f"Custom tool '{tool_name}' not found. Available custom tools: {', '.join(available_tools) if available_tools else 'None'}"

        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        tool_name = params["tool_name"]
        tool_parameters = params.get("parameters", {})

        try:
            # Add initial event for custom tool execution
            await self.add_event(
                EventType.USE_CUSTOM_TOOL,
                {"tool_name": tool_name, "parameters": tool_parameters},
            )

            # Execute the custom tool
            result = await execute_custom_tool(tool_name, tool_parameters)

            # Add completion event with result
            await self.add_event(
                EventType.USE_CUSTOM_TOOL_RESULT,
                {
                    "tool_name": tool_name,
                    "parameters": tool_parameters,
                    "result": {"success": True, "data": result},
                },
            )

            return ToolResult(
                success=True,
                data={"tool_name": tool_name, "result": result},
                error=None,
            )

        except Exception as e:
            # Add error event
            await self.add_event(
                EventType.USE_CUSTOM_TOOL_RESULT,
                {
                    "tool_name": tool_name,
                    "parameters": tool_parameters,
                    "result": {"success": False, "error": str(e)},
                },
            )

            return ToolResult(
                success=False,
                data={"tool_name": tool_name},
                error=f"Error executing custom tool '{tool_name}': {str(e)}",
            )
