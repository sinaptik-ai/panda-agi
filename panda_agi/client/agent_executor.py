"""
Annie Agent Core

This module contains the core functionality for the Annie AI agent with XML-based tool calling.
"""

import logging
from typing import Any, Dict, List, Optional, Type, Union

from app.agents.response_processor import ResponseProcessor
from app.knowledge.knowledge_manager import KnowledgeManager
from app.llm.litellm_client import LiteLLMClient
from app.skills.models import Skill
from app.tools.tool import Tool
from app.tools.tool_registry import ToolRegistry
from dotenv import load_dotenv

from .message_processor import MessageProcessor
from .models import AgentConfig, Message
from .prompt_builder import PromptBuilder
from .state_manager import StateManager

logger = logging.getLogger("BaseAgent")
logger.setLevel(logging.WARNING)

# Load environment variables
load_dotenv()


class BaseAgent:
    """Base Annie AI Agent class with XML-based tool calling."""

    def __init__(
        self,
        conversation_id: str,
        user_id: str,
        knowledge_manager: KnowledgeManager,
        skills: Optional[List[Skill]] = None,
        config: Optional[AgentConfig] = None,
    ):
        """Initialize the base agent."""

        self.config = config or AgentConfig()
        self.tool_registry = ToolRegistry()
        self.response_processor = ResponseProcessor(
            self.tool_registry, self.add_message
        )

        self.socket_manager = socket_manager
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.system_prompt = system_prompt
        self.skills = skills or []

        # Initialize components
        self.state_manager = StateManager()
        self.prompt_builder = PromptBuilder(self.tool_registry)

        # Initialize LLM client
        try:
            self.llm_client = LiteLLMClient(
                model=config.model,
                temperature=config.temperature,
            )

            self.knowledge_manager = knowledge_manager

            # Initialize message processor
            self.message_processor = MessageProcessor(
                llm_client=self.llm_client,
                response_processor=self.response_processor,
                prompt_builder=self.prompt_builder,
                state_manager=self.state_manager,
                socket_manager=self.socket_manager,
                knowledge_manager=self.knowledge_manager,
                conversation_id=self.conversation_id,
                user_id=self.user_id,
                system_prompt=self.system_prompt,
            )

        except Exception as e:
            logger.warning(
                f"Failed to initialize LLM client: {str(e)}. Running without LLM capabilities."
            )
            self.llm_client = None
            self.message_processor = None

        logger.info(f"{self.__class__.__name__} initialized with XML tool calling")

    def add_tool(
        self,
        tool_class: Type[Tool],
        function_names: Optional[List[str]] = None,
        **kwargs,
    ):
        """Add a tool to the Agent."""
        self.tool_registry.register_tool(tool_class, function_names, **kwargs)

    async def add_message(
        self,
        thread_id: str,
        type: str,
        content: Union[Dict[str, Any], List[Any], str],
    ):
        """Callback to add a message to the agent state."""
        logger.info(f"Adding message to thread {thread_id}: {type} - {content}")

    async def process_message(
        self,
        message: Optional[Union[Message, List[Message]]] = None,
    ) -> Dict[str, Any]:
        """
        Process a user message and generate a response with XML tool calling.

        Args:
            message: User message

        Returns:
            Dict containing the agent's response
        """
        if not self.message_processor:
            raise ValueError("Message processor not available")

        return await self.message_processor.process_message(
            message, streaming=True, loop=self.config.loop
        )

    def get_state(self) -> Dict[str, Any]:
        """
        Get the current state of the agent.

        Returns:
            Dict containing the agent's state
        """
        return self.state_manager.get_state()

    def reset_state(self) -> None:
        """Reset the agent's state."""
        self.state_manager.reset_state()

    def get_system_info_message(
        self,
        system_info: Dict[str, Any],
    ) -> Message:
        message = f"""
<environment>
Current directory:
{system_info.get("directory", "Unknown")}

File system structure:
{system_info.get("file_structure", "Unknown")}

System Info:
{system_info.get("system_info", "Unknown")}
</environment>
"""
        return Message(role="assistant", content=message)
