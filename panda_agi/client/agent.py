import logging
import os
import uuid
from typing import (
    Any,
    AsyncGenerator,
    Callable,
    Dict,
    List,
    Literal,
    Optional,
    Union,
)

from dotenv import load_dotenv

from ..environments import BaseEnv, LocalEnv
from ..handlers.base_handler import BaseHandler
from ..tools import ToolRegistry
from ..tools.base import ToolHandler
from ..tools.file_system_ops import file_explore_directory
from ..tools.skills_ops import Skill
from .event_manager import EventManager
from .models import (
    AgentRequestMessage,
    AgentResponse,
    BaseStreamEvent,
    Knowledge,
)
from .panda_agi_client import PandaAgiClient
from .state import AgentState
from .token_processor import TokenProcessor

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
        base_url: str = None,
        api_key: str = None,
        model: Literal["annie-lite", "annie-pro", "auto"] = "auto",
        conversation_id: Optional[str] = None,
        use_internet: bool = True,
        use_filesystem: bool = True,
        use_shell: bool = True,
        use_image_generation: bool = True,
        environment: Optional[BaseEnv] = None,
        knowledge: Optional[List[Knowledge]] = None,
        skills: Optional[List[Callable]] = None,
    ):
        load_dotenv()
        self.api_key = api_key or os.getenv("PANDA_AGI_KEY")
        self.base_url = base_url or os.getenv(
            "PANDA_AGI_BASE_URL",
            "localhost:8000/v2",  # "wss://agi-api.pandas-ai.com/"
        )
        self.model = model
        if not self.api_key:
            raise ValueError(
                "No API key provided. Please set PANDA_AGI_KEY in environment or pass api_key parameter"
            )

        self.conversation_id = conversation_id or str(
            uuid.uuid4()
        )  # Generate a new UUID if not provided
        self.environment = environment or LocalEnv("./tmp/agent_workspace")

        self.state = AgentState()
        self.event_manager = EventManager()

        # Initialize HTTP client and token processor
        self.client = PandaAgiClient(
            base_url=self.base_url,
            api_key=self.api_key,
            conversation_id=self.conversation_id,
            state=self.state,
        )
        self.token_processor = TokenProcessor()

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

        self.state.use_internet = use_internet
        self.state.use_filesystem = use_filesystem
        self.state.use_shell = use_shell
        self.state.use_image_generation = use_image_generation

        # Initialize event manager
        logger.info(
            f"Agent initialized with environment at: {self.environment.base_path}"
        )

    def _create_handlers(self) -> Dict[str, ToolHandler]:
        """Create handlers using the new unified tool system"""
        # Use new tool registry to create all tools
        handlers = ToolRegistry.create_all_handlers()
        return handlers

    async def send_request(self, request: Union[AgentRequestMessage, dict]) -> dict:
        """Send a request to the server"""
        return await self.client.send_request(request)

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

        request = AgentRequestMessage(
            api_key=self.api_key,
            conversation_id=self.conversation_id,
            query=query,
            model=self.model,
            use_internet=self.state.use_internet,
            use_filesystem=self.state.use_filesystem,
            use_shell=self.state.use_shell,
            use_image_generation=self.state.use_image_generation,
            knowledge=self.state.knowledge,
            skills=self.state.skills,
        )

        try:
            # Reset token processor for new request
            self.token_processor.reset()

            # Send streaming request and process tokens
            token_stream = self.client.send_streaming_request(request)

            # Process tokens through the token processor
            async for processed_event in self.token_processor.process_token_stream(
                token_stream
            ):
                # Convert processed token events to BaseStreamEvent format
                # For now, we'll yield the processed events directly
                # In the future, this can be enhanced to create proper BaseStreamEvent objects
                yield processed_event

        except Exception as e:
            logger.error(f"Error in run_stream: {e}")
            raise e

        finally:
            await self.client.disconnect()

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
        file_system_info = await file_explore_directory(
            self.environment, path="/", max_depth=2
        )
        return file_system_info

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
            # Process the event with the appropriate handlers if they exist
            if event_handlers:
                processed_event = self._process_event_with_handlers(
                    event, event_handlers
                )

                # Skip events that couldn't be processed
                if processed_event is None:
                    continue

                # Add the processed event to the response
                response.add_event(processed_event)
            else:
                # No handlers, add event directly
                response.add_event(event)

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
