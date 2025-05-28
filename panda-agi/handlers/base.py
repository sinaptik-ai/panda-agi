from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, Dict, Optional

from envs import BaseEnv

if TYPE_CHECKING:
    from client.agent import Agent


class ToolHandler(ABC):
    """Abstract base class for handling different message types"""

    def __init__(self, environment: Optional[BaseEnv] = None):
        self.agent: "Agent" = None  # Will be set by the Agent class
        self.environment = environment

    def set_agent(self, agent: "Agent"):
        """Set reference to the agent instance for sending messages"""
        self.agent = agent

    @abstractmethod
    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        pass
