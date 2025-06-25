import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Callable, Dict, List, Literal, Optional, Union

from dotenv import load_dotenv

from ..envs import BaseEnv, LocalEnv
from ..handlers.base_handler import BaseHandler
from ..tools import ToolRegistry
from ..tools.base import ToolHandler
from ..tools.file_system_ops import file_explore_directory
from ..tools.skills_ops import Skill
from .event_manager import EventManager
from .models import (
    AgentResponse,
    BaseStreamEvent,
    Knowledge,
    MessageType,
    WebSocketMessage,
)
from .state import AgentState
from .websocket_client import WebSocketClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("AgentClient")
logger.setLevel(logging.WARNING)

MAX_KNOWLEDGE_LENGTH = 10
MAX_SKILLS_LENGTH = 10


class Agent:
    """Agent class for managing WebSocket connections and tool"""

    def __init__(
        self,
        host: str = "wss://agi-api.pandas-ai.com",
        api_key: str = None,
        llm_type: Literal["annie-lite", "annie-pro", "auto"] = "annie-pro",
        conversation_id: Optional[str] = None,
        auto_reconnect: bool = False,
        reconnect_interval: float = 5.0,
        tools_handlers: Optional[Dict[str, Any]] = None,
        environment: Optional[BaseEnv] = None,
        event_handlers: Optional[
            List[
                Union[
                    Callable[[BaseStreamEvent], Optional[BaseStreamEvent]], BaseHandler
                ]
            ]
        ] = None,
        knowledge: Optional[List[Knowledge]] = None,
        skills: Optional[List[Callable]] = None,
    ):
        load_dotenv()
        self.api_key = api_key or os.getenv("PANDA_AGI_KEY")
        self.llm_type = llm_type
        if not self.api_key:
            logger.warning(
                "No API key provided. Please set PANDA_AGI_KEY in environment or pass api_key parameter"
            )

        self.conversation_id = conversation_id or str(uuid.uuid4())
        self.environment = environment or LocalEnv("./tmp/agent_workspace")
        self.event_handlers = event_handlers

        self.state = AgentState()
        if knowledge and len(knowledge) > MAX_KNOWLEDGE_LENGTH:
            raise ValueError(
                f"Knowledge length is greater than {MAX_KNOWLEDGE_LENGTH}. Reduce the number of knowledge items."
            )
        else:
            self.state.knowledge = knowledge or []

        if skills:
            if len(skills) > MAX_SKILLS_LENGTH:
                raise ValueError(
                    f"Skills length is greater than {MAX_SKILLS_LENGTH}. Reduce the number of skills."
                )
            self._process_skills(skills)

        # Initialize event manager
        self.event_manager = EventManager()

        # Initialize WebSocket client
        self.ws_client = WebSocketClient(
            host=host,
            api_key=self.api_key,
            conversation_id=self.conversation_id,
            auto_reconnect=auto_reconnect,
            reconnect_interval=reconnect_interval,
            state=self.state,
        )

        # Set up message handler
        self.ws_client.set_message_handler(self._handle_message)

        self._request_complete = None

        logger.info(
            f"Agent initialized with environment at: {self.environment.base_path}"
        )

        # Set up message handlers with environment support
        self.tool_handlers = tools_handlers or self._create_handlers()

        # Set agent and event manager and environment references for all handlers
        for handler in self.tool_handlers.values():
            handler.set_agent(self)
            handler.set_event_manager(self.event_manager)
            handler.set_environment(self.environment)

    def _create_handlers(self) -> Dict[str, ToolHandler]:
        """Create handlers using the new unified tool system"""
        # Use new tool registry to create all tools
        handlers = ToolRegistry.create_all_handlers()
        return handlers

    @property
    def is_connected(self) -> bool:
        """Check if the WebSocket client is connected"""
        return self.ws_client.is_connected

    async def connect(self) -> None:
        """Connect to the WebSocket server"""
        await self.ws_client.connect()

    async def disconnect(self) -> None:
        """Disconnect from the WebSocket server"""
        self.state.initialization_complete.clear()
        await self.ws_client.disconnect()

    async def _handle_message(self, data: Dict[str, Any]):
        """Handle incoming messages"""
        logger.info(f"Handling message: {data}")

        msg_type = data.get("type", "default")
        msg_id = data.get("id")

        # Use message handlers with new tool system
        handler = self.tool_handlers.get(msg_type)
        if handler:
            logger.info(f"Handling message with handler: {handler}")
            payload = data.get("payload")
            await handler.handle(msg_id, payload)
        else:
            logger.warning(f"No handler found for message type: {msg_type}")

    async def send_message(self, message: Union[WebSocketMessage, dict]) -> str:
        """Send a message to the server"""
        return await self.ws_client.send_message(message)

    async def wait_for_initialization(self, timeout=30.0):
        """
        Wait for connection initialization (simplified).

        Args:
            timeout: Maximum time to wait in seconds

        Returns:
            True if initialization completed, False if timed out
        """
        try:
            await asyncio.wait_for(self.state.initialization_complete.wait(), timeout)
            return True
        except asyncio.TimeoutError:
            logger.warning(
                f"Timed out waiting for connection initialization after {timeout}s"
            )
            return False

    def add_knowledge(self, knowledge: Knowledge):
        """Add knowledge to the agent"""
        if len(self.state.knowledge) >= MAX_KNOWLEDGE_LENGTH:
            raise ValueError(
                f"Knowledge length is greater than {MAX_KNOWLEDGE_LENGTH}. Reduce the number of knowledge items."
            )
        self.state.knowledge.append(knowledge)

    def add_skill(self, skill_function: Callable):
        """Add skill to the agent"""
        if len(self.state.skills) >= MAX_SKILLS_LENGTH:
            raise ValueError(
                f"Skills length is greater than {MAX_SKILLS_LENGTH}. Reduce the number of skills."
            )
        self.state.skills.append(self._process_single_skill(skill_function))

    async def run_stream(
        self,
        query: str,
    ) -> AsyncGenerator[BaseStreamEvent, None]:
        """Send a request and stream events from both in and out queues as they occur"""

        # Restart the connection for each run
        if self.is_connected:
            logger.info("Restarting connection for new request...")
            await self.disconnect()

        logger.info("Connecting before sending request...")
        await self.connect()

        # Wait for connection initialization if needed
        if not self.state.initialization_complete.is_set():
            logger.info("Waiting for connection initialization before sending request")
            await self.wait_for_initialization()

        message = WebSocketMessage(
            type=MessageType.REQUEST.value,
            payload={
                "query": query,
                "knowledge": [k.content for k in self.state.knowledge],
                "skills": [s.to_string() for s in self.state.skills],
                "llm_type": self.llm_type,
            },
        )
        try:
            # Send the message
            await self.send_message(message)

            # Stream events using the event manager
            async for event in self.event_manager.stream_events():
                await asyncio.sleep(0.01)
                yield event

        except Exception as e:
            logger.error(f"Error in run: {e}")
            raise e

        finally:
            await self.disconnect()

    def change_working_directory(self, path: str):
        """
        Change the working directory in the current environment.

        Args:
            path: New working directory path
        """
        self.environment.change_directory(path)
        logger.info(
            f"Changed working directory to: {self.environment.current_directory}"
        )

    def get_working_directory(self) -> str:
        """
        Get the current working directory.

        Returns:
            Current working directory path
        """
        return str(self.environment.current_directory)

    @property
    async def current_file_system(self) -> Dict[str, Any]:
        """
        Get the current file system structure with depth 2.

        Returns:
            Dictionary representing the file system structure
        """
        file_system = await file_explore_directory(
            self.environment, path="/", max_depth=2
        )
        return {
            "directory": file_system.get("directory", {}),
            "structure": file_system.get("structure", {}),
        }

    @asynccontextmanager
    async def connection(self):
        """Context manager for automatic connection/disconnection"""
        await self.connect()
        try:
            yield self
        finally:
            await self.disconnect()

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

    async def run(
        self,
        query: str,
        event_handlers: List[
            Union[Callable[[BaseStreamEvent], Optional[BaseStreamEvent]], BaseHandler]
        ] = None,
    ) -> AgentResponse:
        """
        Run the agent and return a response with all collected events and final output.

        This method consumes all events and returns an AgentResponse object which contains
        all events and the final response from the agent, typically from a UserNotificationEvent.

        Args:
            query: The query to send to the agent
            event_handlers: Optional list of handlers - each handler can be:
                          - A callable function: (event) -> Optional[event]
                          - A BaseHandler subclass with a process(event) method
                          Handlers will be executed in the order they are provided in the list.

        Returns:
            An AgentResponse object containing all events and the final output
        """
        response = AgentResponse()

        # Run and collect all events
        async for event in self.run_stream(query):
            # Process the event with the appropriate handlers
            active_handlers = event_handlers or self.event_handlers
            processed_event = (
                self._process_event_with_handlers(event, active_handlers)
                if active_handlers
                else event
            )

            # Skip events that couldn't be processed
            if processed_event is None:
                continue

            # Add the processed event to the response
            response.add_event(processed_event)

        return response

    def _process_event_with_handlers(
        self, event: BaseStreamEvent, event_handlers: List[Union[Callable, BaseHandler]]
    ) -> Optional[BaseStreamEvent]:
        """
        Process an event with the provided handlers.

        Supports both callable functions and handler classes with a process method.
        Processes multiple handlers in sequence.

        Args:
            event: The event to process
            event_handlers: List of handlers to use

        Returns:
            Processed event or None if processing failed
        """
        if event_handlers is None:
            return event

        current_event = event

        # Process through each handler in order
        for handler in event_handlers:
            if handler is None:
                continue

            try:
                # Check if it's a handler class with a process method
                if hasattr(handler, "process") and callable(
                    getattr(handler, "process")
                ):
                    # Call the process method (handler classes typically don't return events)
                    handler.process(current_event)
                    # Keep the current event for the next handler
                # Check if it's a callable (backward compatibility)
                elif callable(handler):
                    processed = handler(current_event)
                    # Update current_event if the callable returned something
                    if processed is not None:
                        current_event = processed
                else:
                    logger.warning(
                        f"Handler is neither callable nor has a process method: {type(handler)}"
                    )
                    continue

            except Exception as e:
                logger.error(
                    f"Error processing event with handler {getattr(handler, 'name', type(handler).__name__)}: {e}"
                )
                # Continue processing with other handlers even if one fails
                continue
        return current_event

    def _process_single_skill(self, skill_function: Callable):
        """
        Process a single skill function and extract its Skill object.
        """
        if not hasattr(skill_function, "_skill"):
            raise ValueError(
                f"Function '{skill_function.__name__}' is not decorated with @skill. "
                "Please ensure all functions in the skills list are decorated with @skill."
            )

        skill_obj = skill_function._skill
        if not isinstance(skill_obj, Skill):
            raise ValueError(
                f"Invalid skill object found for function '{skill_function.__name__}'. "
                "Expected Skill instance."
            )

        return skill_obj

    def _process_skills(self, skill_functions: List[Callable]):
        """
        Process a list of decorated functions and extract their Skill objects.

        Args:
            skill_functions: List of functions decorated with @skill

        Raises:
            ValueError: If a function is not decorated with @skill
        """
        if len(skill_functions) > MAX_SKILLS_LENGTH:
            raise ValueError(
                f"Skills length is greater than {MAX_SKILLS_LENGTH}. Reduce the number of skills."
            )

        for func in skill_functions:
            self.add_skill(func)

        logger.info(
            f"Processed {len(skill_functions)} skills: {[s.name for s in self.state.skills]}"
        )
