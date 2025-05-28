import logging
from typing import Any, Dict, Optional

from client.models import MessageType, WebSocketMessage
from envs import BaseEnv

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class UserNotificationHandler(ToolHandler):
    """Handler for user notification messages"""

    def __init__(self, environment: Optional[BaseEnv] = None):
        super().__init__(environment)

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        if self.agent and self.agent.is_connected:
            response_message = WebSocketMessage(
                id=msg_id,
                type=MessageType.TOOL_RESULT.value,
                payload={"message_received": True},
            )

            try:
                await self.agent.send_message(response_message)
                logger.info(f"Sent response for message: {response_message}")
            except Exception as e:
                logger.error(f"Failed to send response: {e}")
