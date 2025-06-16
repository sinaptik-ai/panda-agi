import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    from ..client.agent import Agent

from ..client.event_manager import EventManager
from ..client.models import EventType, MessageType, WebSocketMessage
from ..envs import BaseEnv

logger = logging.getLogger("AgentClient")


class ToolResult:
    """Standardized result type for handler operations"""

    def __init__(
        self,
        success: bool,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        self.success = success
        self.data = data or {}
        self.error = error

    def to_payload(self) -> Dict[str, Any]:
        """Convert to WebSocket message payload"""
        payload = {}
        if self.success:
            payload.update(self.data)
        else:
            payload["message"] = self.error or "Unknown error"
        return payload


class ToolHandler(ABC):
    """Abstract base class for handling different message types"""

    def __init__(
        self,
    ):
        self.agent: Optional["Agent"] = None
        self.environment: Optional[BaseEnv] = None
        self.event_manager: Optional[EventManager] = None

        self.logger = logging.getLogger(
            f"{self.__class__.__module__}.{self.__class__.__name__}"
        )
        self.logger.setLevel(logging.WARNING)

    def set_agent(self, agent: "Agent"):
        """Set reference to the agent instance for sending messages"""
        self.agent = agent

    def set_event_manager(self, event_manager: EventManager):
        """Set the event manager instance"""
        self.event_manager = event_manager

    def set_environment(self, environment: BaseEnv):
        """Set the environment instance"""
        self.environment = environment

    async def add_event(self, event_type: EventType, data: Dict[str, Any]):
        """Convenience method to add events to the queue"""
        if not self.event_manager:
            self.logger.warning("No event manager set")
            return

        await self.event_manager.add_event(event_type, data)

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        """Validate input parameters. Return error message if invalid, None if valid"""
        return None

    async def send_response(self, msg_id: str, result: ToolResult) -> None:
        """Send standardized response message"""

        if not self.agent or not self.agent.is_connected:
            self.logger.warning("Cannot send response: agent not connected")
            return

        response_message = WebSocketMessage(
            id=msg_id,
            type=MessageType.TOOL_RESULT.value,
            payload=result.data,
        )

        try:
            await self.agent.send_message(response_message)
            self.logger.info(f"Sent response for {self.__class__.__name__}: {result}")
        except Exception as e:
            self.logger.error(f"Failed to send response: {e}")

    async def handle(self, msg_id: str, params: Dict[str, Any]) -> None:
        """Main handle method with standardized error handling and response"""
        self.logger.info(f"Handling message: {params}")

        try:
            # Validate input
            validation_error = self.validate_input(params)
            if validation_error:
                result = ToolResult(success=False, error=validation_error)
                await self.send_response(msg_id, result)
                return

            # Execute the actual handler logic
            result = await self.execute(params)
            await self.send_response(msg_id, result)

        except Exception as e:
            self.logger.error(f"Error in {self.__class__.__name__}: {e}", exc_info=True)
            error_result = ToolResult(success=False, error=str(e))
            await self.send_response(msg_id, error_result)

    @abstractmethod
    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        """Execute the handler-specific logic. Must return ToolResult"""
        pass
