import logging
from typing import Any, Dict, Optional

from envs import BaseEnv
from tools.search.tavily import tavily_search_web

from client.models import MessageType, WebSocketMessage

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class WebSearchHandler(ToolHandler):
    """Handler for web search messages"""

    def __init__(
        self, web_search_type: str = "tavily", environment: Optional[BaseEnv] = None
    ):
        super().__init__(environment)
        self.web_search_type = web_search_type

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        logger.info(f"Received web search message: {tool_call}")
        logger.info(f"Type: {type(tool_call)}")

        result = tavily_search_web(**tool_call)

        if self.agent and self.agent.is_connected:
            response_message = WebSocketMessage(
                id=msg_id,
                type=MessageType.TOOL_RESULT.value,
                payload=result,
            )

            try:
                await self.agent.send_message(response_message)
                logger.info(f"Sent response for web search: {result}")
            except Exception as e:
                logger.error(f"Failed to send web search response: {e}")
