from typing import Any, Dict, Tuple

import requests

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .registry import ToolRegistry


async def download_file(url: str, timeout: int = 30) -> Tuple[bool, bytes, str]:
    """
    Download a file from a URL.

    Args:
        url: The URL to download from
        timeout: Request timeout in seconds (default: 30)

    Returns:
        Tuple of (success: bool, content: bytes, error_message: str)
    """
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            return True, response.content, ""
        else:
            error_msg = f"HTTP {response.status_code}: {response.reason}"
            return False, b"", error_msg
    except requests.exceptions.Timeout:
        return False, b"", "Request timeout"
    except requests.exceptions.ConnectionError:
        return False, b"", "Connection error"
    except requests.exceptions.RequestException as e:
        return False, b"", f"Request failed: {str(e)}"
    except Exception as e:
        return False, b"", f"Unexpected error: {str(e)}"


@ToolRegistry.register("generate_image")
class ImageGenerationHandler(ToolHandler):
    """Handler for image generation results"""

    OUTPUT_DIR = "generated_images"

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        if not params.get("success", False):
            error_msg = params.get("message", "Unknown error")
            self.logger.error(f"Image generation failed: {error_msg}")
            await self.add_event(EventType.ERROR, {"error": error_msg})
            return ToolResult(
                success=False, error=f"Image generation failed: {error_msg}"
            )

        if not self.environment:
            return ToolResult(
                success=False, error="No environment available to save images"
            )

        try:
            # Create the output directory if it doesn't exist
            output_path = self.environment._resolve_path(self.OUTPUT_DIR)
            if not output_path.exists():
                output_path.mkdir(parents=True, exist_ok=True)

            saved_files = []
            for image_data in params.get("images", []):
                # Extract data
                image_url = image_data.get("url")
                filename = image_data.get("filename")

                if not image_url or not filename:
                    self.logger.warning("Missing URL or filename in image result")
                    continue

                # Construct file path in the environment
                filepath = f"{self.OUTPUT_DIR}/{filename}"

                # Download and save the image
                try:
                    self.logger.info(f"Downloading image from {image_url}")
                    success, content, error_msg = await download_file(image_url)
                    if success:
                        # Use environment to write the binary file
                        result = await self.environment.write_file(
                            filepath, content, mode="wb", encoding=None
                        )

                        if result.get("status") == "success":
                            self.logger.info(f"Saved image to {result.get('path')}")
                            saved_files.append(result.get("path"))
                        else:
                            self.logger.error(
                                f"Failed to save image: {result.get('message')}"
                            )
                    else:
                        self.logger.error(f"Failed to download image: {error_msg}")
                except Exception as e:
                    self.logger.error(f"Failed to save image {filename}: {str(e)}")

            result = {"saved_images": saved_files}

            await self.add_event(EventType.IMAGE_GENERATION, result)
            return ToolResult(
                success=True,
                data=result,
            )

        except Exception as e:
            self.logger.error(f"Error handling image generation result: {str(e)}")
            return ToolResult(success=False, error=f"Error processing image: {str(e)}")
