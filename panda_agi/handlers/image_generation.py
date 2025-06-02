from typing import Any, Dict, Optional

import requests

from ..client.models import EventType
from ..envs import BaseEnv
from .base import HandlerResult, ToolHandler
from .registry import HandlerRegistry


@HandlerRegistry.register("generate_image")
class ImageGenerationHandler(ToolHandler):
    """Handler for image generation results"""

    def __init__(self, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.output_dir = "images"

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        if not tool_call.get("success", False):
            error_msg = tool_call.get("message", "Unknown error")
            self.logger.error(f"Image generation failed: {error_msg}")
            await self.add_event(EventType.IMAGE_GENERATION, tool_call)
            return HandlerResult(
                success=False, error=f"Image generation failed: {error_msg}"
            )

        if not self.environment:
            return HandlerResult(
                success=False, error="No environment available to save images"
            )

        try:
            # Create the output directory if it doesn't exist
            output_path = self.environment._resolve_path(self.output_dir)
            if not output_path.exists():
                output_path.mkdir(parents=True, exist_ok=True)

            saved_files = []
            images = []
            for image_data in tool_call.get("images", []):
                # Extract data
                image_url = image_data.get("url")
                filename = image_data.get("filename")

                if not image_url or not filename:
                    self.logger.warning("Missing URL or filename in image result")
                    continue

                # Construct file path in the environment
                filepath = f"{self.output_dir}/{filename}"

                # Download and save the image
                try:
                    self.logger.info(f"Downloading image from {image_url}")
                    image_response = requests.get(image_url)
                    if image_response.status_code == 200:
                        # Use environment to write the binary file
                        result = await self.environment.write_file(
                            filepath, image_response.content, mode="wb", encoding=None
                        )

                        if result.get("status") == "success":
                            self.logger.info(f"Saved image to {result.get('path')}")
                            saved_files.append(result.get("path"))
                            images.append(filepath)
                        else:
                            self.logger.error(
                                f"Failed to save image: {result.get('message')}"
                            )
                    else:
                        self.logger.error(
                            f"Failed to download image: HTTP {image_response.status_code}"
                        )
                except Exception as e:
                    self.logger.error(f"Failed to save image {filename}: {str(e)}")

            result = {
                "message": f"Saved {len(saved_files)} image(s)",
                "saved_files": saved_files,
                "images": images,
            }

            await self.add_event(EventType.IMAGE_GENERATION, result)
            return HandlerResult(
                success=True,
                data=result,
            )

        except Exception as e:
            self.logger.error(f"Error handling image generation result: {str(e)}")
            return HandlerResult(
                success=False, error=f"Error processing image: {str(e)}"
            )
