import asyncio
import logging
from typing import Any, Dict, Optional

from envs import BaseEnv

from client.models import MessageType, WebSocketMessage

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class ConnectionSuccessHandler(ToolHandler):
    """Handler for connection success messages"""

    def __init__(self, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.initialization_complete: asyncio.Event = asyncio.Event()

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        logger.info(f"Received connection success message: {tool_call}")
        logger.info(f"ID: {msg_id}")

        # Check if we should return the file system
        if tool_call.get("request_file_system", False):
            try:
                # Get the current file system structure
                if self.agent:
                    file_system = await self.agent.current_file_system
                    logger.info("SENDING FILE SYSTEM STRUCTURE")

                    response_message = WebSocketMessage(
                        id=msg_id,
                        type=MessageType.TOOL_RESULT.value,
                        payload={
                            "status": "success",
                            "message": "Connection established successfully",
                            "file_system": file_system,
                        },
                    )

                    await self.agent.send_message(response_message)
                    logger.info(
                        "Sent file system structure in response to connection success"
                    )
            except Exception as e:
                logger.error(f"Error handling connection success: {e}")

                if self.agent and self.agent.is_connected:
                    error_message = WebSocketMessage(
                        id=msg_id,
                        type=MessageType.TOOL_RESULT.value,
                        payload={
                            "status": "error",
                            "message": f"Error retrieving file system: {str(e)}",
                        },
                    )
                    await self.agent.send_message(error_message)

        # Set the event to indicate initialization is complete
        self.initialization_complete.set()
