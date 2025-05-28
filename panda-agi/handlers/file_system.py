import logging
from typing import Any, Dict, Optional

from envs import BaseEnv
from tools.file_system.file_ops import (
    file_explore_directory,
    file_find_by_name,
    file_find_in_content,
    file_read,
    file_str_replace,
    file_write,
)

from client.models import MessageType, WebSocketMessage

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class FileSystemHandler(ToolHandler):
    """Handler for file system messages with environment support"""

    def __init__(self, file_system_type: str, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.file_system_type = file_system_type

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        logger.info(f"Received file system message: {tool_call}")
        logger.info(f"Type: {type(tool_call)}")

        if not self.environment:
            logger.error("No environment set for file system operations")
            return

        # Execute file operations with environment
        try:
            if self.file_system_type == "file_read":
                result = await file_read(self.environment, **tool_call)
            elif self.file_system_type == "file_write":
                result = await file_write(self.environment, **tool_call)
            elif self.file_system_type == "file_replace":
                result = await file_str_replace(self.environment, **tool_call)
            elif self.file_system_type == "file_find_in_content":
                result = await file_find_in_content(self.environment, **tool_call)
            elif self.file_system_type == "file_search_by_name":
                result = await file_find_by_name(self.environment, **tool_call)
            elif self.file_system_type == "explore_directory":
                result = await file_explore_directory(self.environment, **tool_call)
            else:
                result = {
                    "status": "error",
                    "message": f"Unknown file system operation: {self.file_system_type}",
                }
        except Exception as e:
            logger.error(f"Error in file system operation: {e}")
            result = {"status": "error", "message": str(e)}

        if self.agent and self.agent.is_connected:
            response_message = WebSocketMessage(
                id=msg_id,
                type=MessageType.TOOL_RESULT.value,
                payload=result,
            )

            try:
                await self.agent.send_message(response_message)
                logger.info(f"Sent response for file system op: {result}")
            except Exception as e:
                logger.error(f"Failed to send file system op response: {e}")
