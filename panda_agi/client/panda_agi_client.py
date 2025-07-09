import logging
import uuid
from typing import AsyncGenerator, Dict, Optional, Union

import httpx

from .models import AgentRequestMessage
from .state import AgentState

logger = logging.getLogger("AgentClient")
logger.setLevel(logging.INFO)


class PandaAgiClient:
    """HTTP client for managing streaming requests and message handling"""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: str = None,
        conversation_id: Optional[str] = None,
        timeout: float = 60.0,
        state: AgentState = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.conversation_id = conversation_id or str(uuid.uuid4())
        self.timeout = timeout

        self.state = state or AgentState()
        self.state.conversation_id = self.conversation_id

        # HTTP client
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self._headers(),
            timeout=httpx.Timeout(timeout=self.timeout),
        )

    def _headers(self) -> Dict[str, str]:
        """Get headers for HTTP requests"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        return headers

    async def send_streaming_request(
        self, request: Union[AgentRequestMessage, dict]
    ) -> AsyncGenerator[str, None]:
        """Send a streaming HTTP request and yield tokens"""
        try:
            # Convert request to dict if it's an AgentRequestMessage
            if isinstance(request, AgentRequestMessage):
                request_data = request.model_dump()
            else:
                request_data = request

            # Send streaming POST request
            endpoint = "/v2/chat/completions"
            logger.info(f"[HTTP] Sending streaming request to: {endpoint}")

            async with self._client.stream(
                "POST",
                endpoint,
                json=request_data,
            ) as response:
                response.raise_for_status()

                # Process the streaming response
                async for line in response.aiter_lines():
                    if line.strip():
                        # Handle Server-Sent Events format
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix
                            if data.strip() == "[DONE]":
                                logger.info("Stream completed")
                                break
                            yield data
                        else:
                            # Handle plain text streaming
                            yield line

        except httpx.HTTPStatusError as e:
            logger.error(f"❌ HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in streaming request: {e}")
            raise
