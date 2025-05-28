import logging
from typing import Any, Dict, Optional

from envs import BaseEnv
from tools.navigation.beautifulsoup import beautiful_soup_navigation

from client.models import MessageType, WebSocketMessage

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class WebNavigation(ToolHandler):
    """Handler for web navigation messages"""

    def __init__(
        self,
        web_navigation_type: str = "beautifulsoup",
        environment: Optional[BaseEnv] = None,
    ):
        super().__init__(environment)
        self.web_navigation_type = web_navigation_type

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        logger.info(f"Received web navigation message: {tool_call}")
        logger.info(f"Type: {type(tool_call)}")

        result = beautiful_soup_navigation(**tool_call)

        if self.agent and self.agent.is_connected:
            response_message = WebSocketMessage(
                id=msg_id,
                type=MessageType.TOOL_RESULT.value,
                payload=result,
            )

            try:
                await self.agent.send_message(response_message)
                logger.info(f"Sent response for web navigation: {result}")
            except Exception as e:
                logger.error(f"Failed to send web navigation response: {e}")
