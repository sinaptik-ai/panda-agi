import asyncio
import json
import logging
import uuid
from typing import Dict, Optional, Union

import websockets

from .models import WebSocketMessage
from .state import AgentState

logger = logging.getLogger("AgentClient")
logger.setLevel(logging.INFO)


class WebSocketClient:
    """WebSocket client for managing connections and message handling"""

    def __init__(
        self,
        host: str = "localhost",
        api_key: str = None,
        conversation_id: Optional[str] = None,
        auto_reconnect: bool = True,
        reconnect_interval: float = 5.0,
        state: AgentState = None,
    ):
        self.host = host
        self.api_key = api_key
        self.websocket = None
        self.conversation_id = conversation_id or str(uuid.uuid4())
        self.auto_reconnect = auto_reconnect
        self.reconnect_interval = reconnect_interval

        # Use AgentState for connection state management
        self.state = state or AgentState()
        self.state.connection_id = self.conversation_id

        self._message_loop_task = None

        # Message handler callback
        self._message_handler = None

    @property
    def is_connected(self) -> bool:
        """Get connection status from agent state"""
        return self.state.is_connected

    @is_connected.setter
    def is_connected(self, value: bool):
        """Set connection status in agent state"""
        self.state.is_connected = value

    @property
    def running(self) -> bool:
        """Get running status from agent state"""
        return self.state.is_running

    @running.setter
    def running(self, value: bool):
        """Set running status in agent state"""
        self.state.is_running = value

    def reset_connection_state(self):
        """Reset connection state in AgentState"""
        self.state.is_connected = False
        self.state.is_running = False
        self.websocket = None

    @property
    def url(self) -> str:
        return f"{self.host}/ws/{self.conversation_id}/chat"

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        return headers

    def set_message_handler(self, handler):
        """Set the message handler callback"""
        self._message_handler = handler

    async def connect(self) -> None:
        """Connect to the WebSocket server"""
        try:
            if not self.api_key:
                logger.error("Cannot connect: No API key provided")
                raise ValueError(
                    "API key is required for connection. Please set PANDA_AGI_KEY environment variable or pass api_key parameter."
                )
            self.websocket = await websockets.connect(
                self.url, additional_headers=self._headers()
            )
            self.is_connected = True
            logger.info(f"✅ Connected (Client ID: {self.conversation_id})")

            # Cancel existing message loop task if it exists
            if self._message_loop_task and not self._message_loop_task.done():
                self._message_loop_task.cancel()
                try:
                    await self._message_loop_task
                except asyncio.CancelledError:
                    pass

            # Start new message handling loop
            self._message_loop_task = asyncio.create_task(self._message_loop())

        except Exception as e:
            logger.error(f"❌ Failed to connect: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from the WebSocket server"""
        self.running = False
        if self._message_loop_task and not self._message_loop_task.done():
            self._message_loop_task.cancel()
            try:
                await self._message_loop_task
            except asyncio.CancelledError:
                pass
        if self.websocket:
            await self.websocket.close()
            logger.info("🔌 Disconnected from server")

        # Reset connection state and clear initialization
        self.reset_connection_state()
        self.state.initialization_complete.clear()

    async def _message_loop(self):
        """Internal message handling loop"""
        self.running = True
        while self.running:
            try:
                if not self.is_connected:
                    if self.auto_reconnect:
                        logger.info("Attempting to reconnect...")
                        await self._reconnect()
                        if not self.is_connected:
                            continue
                    else:
                        break

                # Wait for a message from the server and handle it
                message = await self.websocket.recv()
                data = json.loads(message)
                if self._message_handler:
                    await self._message_handler(data)

            except websockets.exceptions.ConnectionClosed:
                logger.info("🔌 Connection closed by server")
                self.is_connected = False
                if self.auto_reconnect:
                    logger.info("Attempting to reconnect...")
                    await self._reconnect()
                else:
                    self.running = False
            except Exception as e:
                logger.error(f"❌ Error in message loop: {e}")
                self.is_connected = False
                if self.auto_reconnect:
                    await self._reconnect()
                else:
                    self.running = False

    async def _reconnect(self):
        """Attempt to reconnect to the server"""
        logger.info("🔌 Reconnecting...")
        logger.info(f"Running: {self.running}")
        logger.info(f"Is connected: {self.is_connected}")

        # Close existing websocket if it exists
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception as e:
                logger.error(f"Error closing existing websocket: {e}")
            self.websocket = None

        while self.running and not self.is_connected:
            try:
                logger.info(f"Sleeping for {self.reconnect_interval} seconds")
                await asyncio.sleep(self.reconnect_interval)
                logger.info("RECONNECTING...")

                # Attempt to establish new connection
                self.websocket = await websockets.connect(self.url)
                self.is_connected = True
                logger.info("✅ Reconnected successfully")
                return
            except Exception as e:
                logger.error(f"❌ Reconnection failed: {e}")
                self.is_connected = False
                self.websocket = None

    async def send_message(self, message: Union[WebSocketMessage, dict]) -> str:
        """Send a message to the server"""
        logger.info(f"[WEBSOCKET] Sending message: {message}")
        try:
            if not self.is_connected:
                raise ConnectionError("Not connected to server")
            if isinstance(message, dict):
                message = WebSocketMessage(**message)

            await self.websocket.send(message.to_json())
            logger.info(f"[WEBSOCKET] Sent message: {message.type}")
            return message.id
        except Exception as e:
            logger.error(f"❌ Error sending message: {e}")
            raise
