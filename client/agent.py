import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, Optional, Union

from dotenv import load_dotenv

from envs import BaseEnv, LocalEnv
from handlers import (
    ConnectionSuccessHandler,
    DefaultMessageHandler,
    FileSystemHandler,
    ImageGenerationHandler,
    ShellOpsHandler,
    ToolHandler,
    UserNotificationHandler,
    WebNavigation,
    WebSearchHandler,
)
from tools.file_system.file_ops import file_explore_directory

from .models import COMPLETION_MESSAGE_TYPES, EventSource, MessageType, WebSocketMessage
from .websocket_client import WebSocketClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("AgentClient")
logger.setLevel(logging.WARNING)


class Agent:
    """Agent class for managing WebSocket connections and tool handlers"""

    def __init__(
        self,
        # host: str = "wss://agi-api.pandas-ai.com",
        host: str = "ws://localhost:8000",
        api_key: str = None,
        conversation_id: Optional[str] = None,
        auto_reconnect: bool = False,
        reconnect_interval: float = 5.0,
        tools_handlers: Optional[Dict[str, ToolHandler]] = None,
        environment: Optional[BaseEnv] = None,
    ):
        load_dotenv()
        self.api_key = api_key or os.getenv("PANDA_API_KEY")
        if not self.api_key:
            logger.warning(
                "No API key provided. Please set PANDA_API_KEY in environment or pass api_key parameter"
            )

        self.conversation_id = conversation_id or str(uuid.uuid4())
        self.environment = environment or LocalEnv("./tmp/agent_workspace")

        # Initialize WebSocket client
        self.ws_client = WebSocketClient(
            host=host,
            api_key=self.api_key,
            conversation_id=self.conversation_id,
            auto_reconnect=auto_reconnect,
            reconnect_interval=reconnect_interval,
        )

        # Set up message handler
        self.ws_client.set_message_handler(self._handle_message)

        self._current_request_future = None
        self._connection_initialized = False

        logger.info(
            f"Agent initialized with environment at: {self.environment.base_path}"
        )

        # Set up message handlers with environment support
        self.tool_handlers = tools_handlers or self._create_default_handlers()

        # Set agent reference for all handlers
        for handler in self.tool_handlers.values():
            handler.set_agent(self)

    def _create_default_handlers(self) -> Dict[str, ToolHandler]:
        """Create default tool handlers"""
        handlers = {}
        handlers["default"] = DefaultMessageHandler(logger, self.environment)
        handlers["user_send_message"] = UserNotificationHandler(self.environment)
        handlers["user_ask_question"] = UserNotificationHandler(self.environment)
        handlers["error"] = UserNotificationHandler(self.environment)
        handlers["completed_task"] = UserNotificationHandler(self.environment)
        handlers["web_search"] = WebSearchHandler("tavily", self.environment)
        handlers["web_visit_page"] = WebNavigation("beautifulsoup", self.environment)
        handlers["generate_image"] = ImageGenerationHandler(self.environment)
        handlers["connection_success"] = ConnectionSuccessHandler(self.environment)
        handlers["file_read"] = FileSystemHandler("file_read", self.environment)
        handlers["file_write"] = FileSystemHandler("file_write", self.environment)
        handlers["file_replace"] = FileSystemHandler("file_replace", self.environment)
        handlers["file_find_in_content"] = FileSystemHandler(
            "file_find_in_content", self.environment
        )
        handlers["file_search_by_name"] = FileSystemHandler(
            "file_search_by_name", self.environment
        )
        handlers["explore_directory"] = FileSystemHandler(
            "explore_directory", self.environment
        )
        handlers["shell_exec_command"] = ShellOpsHandler(
            "shell_exec_command", self.environment
        )
        handlers["shell_view_output"] = ShellOpsHandler(
            "shell_view_output", self.environment
        )
        handlers["shell_write_to_process"] = ShellOpsHandler(
            "shell_write_to_process", self.environment
        )
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
        connection_handler: ConnectionSuccessHandler = self.tool_handlers.get(
            "connection_success"
        )
        if connection_handler:
            connection_handler.initialization_complete.clear()
        self._connection_initialized = False
        await self.ws_client.disconnect()

    async def _handle_message(self, data: Dict[str, Any]):
        """Handle incoming messages"""
        logger.info(f"Handling message: {data}")

        msg_type = data.get("type", "default")
        msg_id = data.get("id")

        # Use message handlers
        handler = self.tool_handlers.get(msg_type)
        if handler:
            logger.info(f"Handling message with handler: {handler}")
            msg_id = data.get("id")
            payload = data.get("payload")
            await self.ws_client.put_event(
                {
                    "event_source": EventSource.AGENT.value,
                    "data": data,
                }
            )
            await handler.handle(msg_id, payload)

            # Check if this is related to the current request
        if msg_type in COMPLETION_MESSAGE_TYPES:
            logger.info(f"Received stop event: {msg_type}")
            if self._current_request_future and not self._current_request_future.done():
                self._current_request_future.set_result(
                    {"event_source": EventSource.COMPLETION.value}
                )
                return

    async def send_message(self, message: Union[WebSocketMessage, dict]) -> str:
        """Send a message to the server"""
        return await self.ws_client.send_message(message)

    async def wait_for_initialization(self, timeout=30.0):
        """
        Wait for the connection handler to complete initialization.

        Args:
            timeout: Maximum time to wait in seconds

        Returns:
            True if initialization completed, False if timed out
        """
        connection_handler: ConnectionSuccessHandler = self.tool_handlers.get(
            "connection_success"
        )
        if not connection_handler or not hasattr(
            connection_handler, "initialization_complete"
        ):
            logger.warning("No connection handler with initialization tracking found")
            return False

        try:
            await asyncio.wait_for(
                connection_handler.initialization_complete.wait(), timeout
            )
            self._connection_initialized = True
            return True
        except asyncio.TimeoutError:
            logger.warning(
                f"Timed out waiting for connection initialization after {timeout}s"
            )
            return False

    async def run(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = 30.0,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send a request and stream events from both in and out queues as they occur"""
        # Restart the connection for each run
        if self.is_connected:
            logger.info("Restarting connection for new request...")
            await self.disconnect()
            self._connection_initialized = False

        logger.info("Connecting before sending request...")
        await self.connect()

        # Wait for connection initialization if needed
        if not self._connection_initialized:
            logger.info("Waiting for connection initialization before sending request")
            await self.wait_for_initialization()

        message = WebSocketMessage(
            type=MessageType.REQUEST.value,
            payload={
                "query": query,
                "context": context or {},
            },
        )

        # Store the message ID to track related events
        message_id = message.id

        # Create a new future for this request
        self._current_request_future = asyncio.get_event_loop().create_future()

        try:
            # Send the message
            await self.send_message(message)

            # Setup monitoring of both queues
            queue_task = None

            # Track if we've seen events or if we've timed out
            seen_events = False
            start_time = asyncio.get_event_loop().time()

            while True:
                # Check for timeout if specified
                if (
                    timeout
                    and (asyncio.get_event_loop().time() - start_time > timeout)
                    and not seen_events
                ):
                    raise TimeoutError(f"No events received within {timeout} seconds")

                # Create task for event queue if not already monitoring
                if queue_task is None or queue_task.done():
                    queue_task = asyncio.create_task(self.ws_client.get_event())

                # Add the current request future to our wait set
                wait_tasks = [queue_task]
                if (
                    self._current_request_future
                    and not self._current_request_future.done()
                ):
                    wait_tasks.append(self._current_request_future)

                # Wait for either queue to have an event or the request to complete
                done, pending = await asyncio.wait(
                    wait_tasks,
                    return_when=asyncio.FIRST_COMPLETED,
                    timeout=1.0,  # Short timeout to check for cancellation
                )

                # No events ready yet, continue waiting
                if not done:
                    continue

                # Process completed tasks
                for task in done:
                    try:
                        event = task.result()
                        seen_events = True
                        yield event
                        logger.info(f"DEBUG: Task: {task}")
                        logger.info(
                            f"DEBUG: Current request future: {self._current_request_future}"
                        )
                        if task == self._current_request_future:
                            logger.info("Request completed due to stop event")
                            return

                    except Exception as e:
                        logger.error(f"Error processing event: {e}")

        except asyncio.CancelledError:
            # Handle cancellation gracefully
            logger.info(f"Request {message_id} cancelled")
            # Clean up the current request future
            self._current_request_future = None
            raise
        except Exception as e:
            # Clean up
            self._current_request_future = None
            logger.error(f"Error in run: {e}")
            raise

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
        return await file_explore_directory(self.environment, path="/", max_depth=2)

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
