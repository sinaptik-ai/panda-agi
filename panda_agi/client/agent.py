import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, Optional, Union

from dotenv import load_dotenv

from ..envs import BaseEnv, LocalEnv
from ..handlers import ConnectionSuccessHandler
from ..handlers.base import ToolHandler
from ..handlers.registry import HandlerRegistry
from ..tools.file_system.file_ops import file_explore_directory
from .event_manager import EventManager
from .models import (
    COMPLETION_MESSAGE_TYPES,
    EventType,
    MessageType,
    StreamEvent,
    WebSocketMessage,
)
from .websocket_client import WebSocketClient

# Configure logging
logging.basicConfig(
    level=logging.WARNING,
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
        tools_handlers: Optional[Dict[str, Any]] = None,
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

        # Initialize event manager
        self.event_manager = EventManager()

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
        self.tool_handlers = tools_handlers or self._create_handlers()

        # Set agent and event manager references for all handlers
        for handler in self.tool_handlers.values():
            handler.set_agent(self)
            handler.set_event_manager(self.event_manager)

    def _create_handlers(self) -> Dict[str, ToolHandler]:
        """Create handlers using the registry system"""
        # Use registry to create all registered handlers
        handlers = HandlerRegistry.create_all_handlers(self.environment)

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
            await handler.handle(msg_id, payload)

        if msg_type in COMPLETION_MESSAGE_TYPES:
            logger.info(f"Received stop event: {msg_type}")
            if self._current_request_future and not self._current_request_future.done():
                self._current_request_future.set_result(
                    StreamEvent(
                        type=EventType.COMPLETED_TASK,
                        data={},
                        timestamp=datetime.now().isoformat(),
                    )
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
    ) -> AsyncGenerator[StreamEvent, None]:
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
            },
        )
        # Create a new future for this request
        self._current_request_future = asyncio.get_event_loop().create_future()

        try:
            # Send the message
            await self.send_message(message)

            # Set the request future in the event manager
            self.event_manager.set_request_future(self._current_request_future)

            # Stream events using the event manager
            async for event in self.event_manager.stream_events():
                yield event

        except asyncio.CancelledError:
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
