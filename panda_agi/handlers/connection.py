import asyncio
from typing import Any, Dict, Optional

from panda_agi.client.models import EventType

from ..envs import BaseEnv
from .base import HandlerResult, ToolHandler
from .registry import HandlerRegistry


@HandlerRegistry.register("connection_success")
class ConnectionSuccessHandler(ToolHandler):
    """Handler for connection success messages"""

    def __init__(self, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.initialization_complete: asyncio.Event = asyncio.Event()

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        self.logger.info(f"Received connection success message: {tool_call}")

        # Check if we should return the file system
        if tool_call.get("request_file_system", False):
            try:
                # Get the current file system structure
                if self.agent:
                    file_system = await self.agent.current_file_system
                    self.logger.info("SENDING FILE SYSTEM STRUCTURE")

                    # Set the event to indicate initialization is complete
                    self.initialization_complete.set()

                    await self.add_event(
                        EventType.AGENT_CONNECTION_SUCCESS,
                        {
                            "file_system": file_system,
                        },
                    )

                    return HandlerResult(
                        success=True,
                        data={
                            "message": "Connection established successfully",
                            "file_system": file_system,
                        },
                    )
            except Exception as e:
                self.logger.error(f"Error handling connection success: {e}")
                return HandlerResult(
                    success=False, error=f"Error retrieving file system: {str(e)}"
                )

        # Set the event to indicate initialization is complete
        self.initialization_complete.set()

        return HandlerResult(
            success=True, data={"message": "Connection established successfully"}
        )
