import logging
from typing import AsyncGenerator, Dict, List, Optional, Union

import httpx
from pydantic import BaseModel, Field

from .models import AgentRequestModel
from .state import AgentState

logger = logging.getLogger("AgentClient")
logger.setLevel(logging.INFO)


class ImageGenerationRequest(BaseModel):
    """Request model for image generation."""

    prompt: str = Field(
        ..., description="The text description of the image to generate"
    )
    size: str = Field(
        "1024x1024",
        description="Image size. Options: '1024x1024', '1792x1024', or '1024x1792'",
    )
    quality: str = Field(
        "standard", description="Image quality. Options: 'standard' or 'hd'"
    )
    n: int = Field(1, description="Number of images to generate (1-4)", ge=1, le=4)
    filename: Optional[str] = Field(
        None, description="Optional filename for the image (without extension)"
    )


class ImageResult(BaseModel):
    """Result model for a single generated image."""

    url: str
    filename: str


class ImageGenerationResponse(BaseModel):
    """Response model for image generation."""

    success: bool
    images: List[ImageResult]
    message: str


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
        self.conversation_id = conversation_id
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
            headers["X-API-Key"] = f"{self.api_key}"

        return headers

    async def send_streaming_request(
        self, request: Union[AgentRequestModel, dict]
    ) -> AsyncGenerator[str, None]:
        """Send a streaming HTTP request and yield tokens"""
        print(f"Sending agent request: {request}")
        try:
            # Convert request to dict if it's an AgentRequestModel
            if isinstance(request, AgentRequestModel):
                request_data = request.model_dump()
            else:
                request_data = request

            # Send streaming POST request
            endpoint = "/v2/agent/stream"
            logger.info(f"[HTTP] Sending streaming request to: {endpoint}")

            async with self._client.stream(
                "POST",
                endpoint,
                json=request_data,
                headers=self._headers(),
            ) as response:
                response.raise_for_status()

                # Process the streaming response
                async for line in response.aiter_lines():
                    if line.strip():
                        # Handle Server-Sent Events format
                        if line.startswith("data: "):
                            data = line.replace("data: ", "").strip()
                            if data.strip() == "[DONE]":
                                logger.info("Stream completed")
                                break
                            yield data
                        elif line.startswith("conversation_id: "):
                            self.conversation_id = line.replace(
                                "conversation_id: ", ""
                            ).strip()
                            logger.info(
                                f"[HTTP] Received conversation_id: {self.conversation_id}"
                            )
                            yield {
                                "type": "conversation_id",
                                "conversation_id": self.conversation_id,
                            }
                        else:
                            # Handle plain text streaming
                            yield line + "\n"

        except httpx.HTTPStatusError as e:
            logger.error(f"❌ HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in streaming request: {e}")
            raise

    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
        filename: Optional[str] = None,
    ) -> ImageGenerationResponse:
        """Generate an image using the image generation API.
        
        Args:
            prompt: The text description of the image to generate
            size: Image size. Options: '1024x1024', '1792x1024', or '1024x1792'
            quality: Image quality. Options: 'standard' or 'hd'
            n: Number of images to generate (1-4)
            filename: Optional filename for the image (without extension)
            
        Returns:
            ImageGenerationResponse containing image URLs and metadata
            
        Raises:
            httpx.HTTPStatusError: If the API request fails
            Exception: For other errors during the request
        """
        try:
            # Create the request model
            request = ImageGenerationRequest(
                prompt=prompt,
                size=size,
                quality=quality,
                n=n,
                filename=filename,
            )
            
            # Send POST request to image generation endpoint
            endpoint = "/image/generate"
            logger.info(f"[HTTP] Sending image generation request to: {endpoint}")
            
            response = await self._client.post(
                endpoint,
                json=request.model_dump(),
                headers=self._headers(),
            )
            response.raise_for_status()
            
            # Parse the response
            response_data = response.json()
            return ImageGenerationResponse(**response_data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ HTTP error in image generation: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in image generation request: {e}")
            raise

    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
