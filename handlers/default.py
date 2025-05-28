import logging
from typing import Any, Dict, Optional

from envs import BaseEnv

from client.models import MessageStatus, MessageType, WebSocketMessage

from .base import ToolHandler


class DefaultMessageHandler(ToolHandler):
    """Default message handler that just logs messages"""

    def __init__(self, logger: logging.Logger, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.logger = logger

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        msg_type = tool_call.get("type", "unknown")
        self.logger.info(f"Received message {msg_type}: {tool_call}")

        if self.agent and self.agent.is_connected:
            response_message = WebSocketMessage(
                id=msg_id,
                type=MessageType.TOOL_RESULT.value,
                payload={
                    "status": MessageStatus.PENDING.value,
                    "message": f"Received message of type {msg_type}",
                },
            )

            try:
                await self.agent.send_message(response_message)
                self.logger.info(f"Sent response for message: {response_message}")
            except Exception as e:
                self.logger.error(f"Failed to send response: {e}")
