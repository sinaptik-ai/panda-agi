from typing import Any, Dict

from panda_agi.client.models import EventType

from .base import ToolHandler, ToolResult
from .file_system_ops.utils import _get_system_info
from .registry import ToolRegistry


@ToolRegistry.register("connection_success")
class ConnectionSuccessHandler(ToolHandler):
    """Handler for connection success messages"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        self.logger.info(f"Received connection success message: {params}")

        result = {"directory": {}, "file_structure": {}, "system_info": {}}
        if params.get("request_file_system", False):
            try:
                # Get the current file system structure
                if self.agent:
                    system_info = await _get_system_info()
                    file_system = await self.agent.current_file_system

                    result["directory"] = file_system.get("directory")
                    result["file_structure"] = file_system.get("structure")
                    result["system_info"] = system_info

            except Exception as e:
                self.logger.error(f"Error handling connection success: {e}")
                return ToolResult(
                    success=False, error=f"Error retrieving file system: {str(e)}"
                )
        await self.add_event(EventType.AGENT_CONNECTION_SUCCESS, result)
        # set the state to connected
        self.agent.state.initialization_complete.set()
        return ToolResult(success=True, data=result)
