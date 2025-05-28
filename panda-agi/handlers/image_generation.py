import logging
from typing import Any, Dict, Optional

import requests
from envs import BaseEnv

from client.models import MessageType, WebSocketMessage

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class ImageGenerationHandler(ToolHandler):
    """Handler for image generation results"""

    def __init__(self, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.output_dir = "generated_images"

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        logger.info("Received image generation result")

        try:
            if not tool_call.get("success", False):
                logger.error(
                    f"Image generation failed: {tool_call.get('message', 'Unknown error')}"
                )
                return

            if not self.environment:
                logger.error("No environment available to save images")
                return

            # Create the output directory if it doesn't exist
            output_path = self.environment._resolve_path(self.output_dir)
            if not output_path.exists():
                output_path.mkdir(parents=True, exist_ok=True)

            saved_files = []
            for image_data in tool_call.get("images", []):
                # Extract data
                image_url = image_data.get("url")
                filename = image_data.get("filename")

                if not image_url or not filename:
                    logger.warning("Missing URL or filename in image result")
                    continue

                # Construct file path in the environment
                filepath = f"{self.output_dir}/{filename}"

                # Download and save the image
                try:
                    logger.info(f"Downloading image from {image_url}")
                    image_response = requests.get(image_url)
                    if image_response.status_code == 200:
                        # Use environment to write the binary file
                        result = await self.environment.write_file(
                            filepath, image_response.content, mode="wb", encoding=None
                        )

                        if result.get("status") == "success":
                            logger.info(f"Saved image to {result.get('path')}")
                            saved_files.append(result.get("path"))
                        else:
                            logger.error(
                                f"Failed to save image: {result.get('message')}"
                            )
                    else:
                        logger.error(
                            f"Failed to download image: HTTP {image_response.status_code}"
                        )
                except Exception as e:
                    logger.error(f"Failed to save image {filename}: {str(e)}")

            # Send response with the saved file paths
            if self.agent and self.agent.is_connected:
                response_message = WebSocketMessage(
                    id=msg_id,
                    type=MessageType.TOOL_RESULT.value,
                    payload={
                        "status": "success",
                        "message": f"Saved {len(saved_files)} image(s)",
                        "saved_files": saved_files,
                    },
                )

                await self.agent.send_message(response_message)
                logger.info(f"Sent response for image generation: {saved_files}")

        except Exception as e:
            logger.error(f"Error handling image generation result: {str(e)}")
            if self.agent and self.agent.is_connected:
                error_message = WebSocketMessage(
                    id=msg_id,
                    type=MessageType.TOOL_RESULT.value,
                    payload={
                        "status": "error",
                        "message": f"Error processing image: {str(e)}",
                    },
                )
                await self.agent.send_message(error_message)
