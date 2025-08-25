"""
Interact with environment and return relevant files
"""

import re
from typing import List, Set
from urllib.parse import urlparse

from .chat_env import get_env
from .files import FilesService
from panda_agi.envs.base_env import BaseEnv
import logging
import traceback

logger = logging.getLogger(__name__)


class ArtifactsService:

    @staticmethod
    def replace_window_location_origin(
        content: str, artifact_id: str, file_path: str
    ) -> str:
        """
        Replace window.location.origin with the dynamic path for HTML and JavaScript content.

        Args:
            content: The content to process
            artifact_id: The artifact ID
            file_path: The file path

        Returns:
            The content with window.location.origin replaced
        """
        # Replace window.location.origin with the dynamic path
        replacement = f"`${{window.location.origin}}/artifacts/{artifact_id}`"
        return content.replace("window.location.origin", replacement)

    @staticmethod
    def get_relative_filepath(type: str, file_path: str) -> str:
        """
        Get the file content for an artifact.
        """

        if type == "iframe":
            return ArtifactsService.get_main_html_file_from_url(file_path)

        return file_path

    @staticmethod
    def get_main_html_file_from_url(url: str) -> str:
        """
        Extract the HTML file path from a website URL.

        Args:
            url: Website URL like http://localhost:3000, http://localhost:3000/dashboard.html, etc.

        Returns:
            The HTML file path (e.g., 'index.html', 'dashboard.html', 'test/index.html')
        """
        parsed_url = urlparse(url)
        path = parsed_url.path

        # Remove leading slash if present
        if path.startswith("/"):
            path = path[1:]

        # If path is empty or ends with '/', default to index.html
        if not path or path.endswith("/"):
            return "index.html"

        # If path doesn't have an extension, assume it's a directory and add index.html
        if "." not in path.split("/")[-1]:
            return f"{path}/index.html"

        # Return the path as is if it already has an extension
        return path

    @staticmethod
    async def get_files_for_artifact(
        type: str, filepath: str, conversation_id: str, artifact_id: str = None
    ):

        env: BaseEnv = await get_env(
            {"conversation_id": conversation_id}, force_new=conversation_id is None
        )

        if type == "markdown":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_markdown(filepath, env, artifact_id):
                yield file_bytes, relative_path
        elif type == "iframe":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_iframe(filepath, env, artifact_id):
                yield file_bytes, relative_path
        else:
            raise ValueError(f"Error: Unsupported creation type provided {type}")

    @staticmethod
    def extract_relative_paths_from_markdown(markdown_text: str) -> List[str]:
        # Match markdown links and images: ![alt](path) or [text](path)
        pattern = r"!?\[.*?\]\((.*?)\)"
        matches = re.findall(pattern, markdown_text)

        relative_paths = []
        for path in matches:
            # Clean up optional titles after space (e.g., [text](path "title"))
            cleaned_path = path.split()[0]

            # Check if it's a relative path
            if not cleaned_path.startswith(("http://", "https://", "/", "#")):
                # Remove ./ prefix if present
                if cleaned_path.startswith("./"):
                    cleaned_path = cleaned_path[2:]
                relative_paths.append(cleaned_path)

        return relative_paths

    @staticmethod
    async def get_files_for_markdown(
        filepath: str, env: BaseEnv, artifact_id: str = None
    ):
        """
        Recursively get all files referenced in markdown content.
        This includes files referenced in the main markdown file and any markdown files
        that are referenced within those files.
        """
        # Set to track all processed files to avoid infinite loops
        processed_files = set()
        files_to_process = [filepath]

        while files_to_process:
            current_file = files_to_process.pop(0)

            if current_file in processed_files:
                continue

            processed_files.add(current_file)

            try:
                content_bytes, _ = await FilesService.get_file_from_env(
                    current_file, env
                )
                yield content_bytes, current_file

                # Only process markdown files for further path extraction
                if current_file.lower().endswith((".md", ".markdown")):
                    markdown_text = content_bytes.decode("utf-8")
                    relative_paths = (
                        ArtifactsService.extract_relative_paths_from_markdown(
                            markdown_text
                        )
                    )

                    # Add new markdown files to processing queue
                    for relative_path in relative_paths:
                        if (
                            relative_path not in processed_files
                            and relative_path not in files_to_process
                        ):
                            # Check if it's a markdown file to process recursively
                            if relative_path.lower().endswith((".md", ".markdown")):
                                files_to_process.append(relative_path)
                            else:
                                # For non-markdown files, yield them immediately
                                try:
                                    file_content_bytes, _ = (
                                        await FilesService.get_file_from_env(
                                            relative_path, env
                                        )
                                    )
                                    yield file_content_bytes, relative_path
                                    processed_files.add(relative_path)
                                except Exception as e:
                                    logger.warning(
                                        f"Failed to get file {relative_path}: {e}"
                                    )

            except Exception as e:
                logger.warning(f"Failed to get file {current_file}: {e}")
                continue

    @staticmethod
    async def get_files_for_iframe(
        filepath: str, env: BaseEnv, artifact_id: str = None
    ):
        """
        Get all relevant files for the index_html_file_path following a simplified approach:
        1. Get all file names with asset extensions
        2. Check which files are referenced in the index HTML file
        3. Recursively check referenced files for further dependencies
        4. Return all files needed to construct the page
        5. Replace window.location.origin for .js and .html files
        """
        index_html_file_path = ArtifactsService.get_main_html_file_from_url(filepath)

        # Step 1: Get all files with asset extensions
        asset_extensions = (
            ".png",
            ".jpg",
            ".jpeg",
            ".svg",
            ".gif",
            ".ico",
            ".woff",
            ".woff2",
            ".ttf",
            ".otf",
            ".eot",
            ".json",
            ".csv",
            ".js",
            ".css",
            ".html",
        )

        files = await env.list_files(recursive=True)
        all_files = {
            file["relative_path"]: file
            for file in files["files"]
            if file["type"] == "file"
            and any(file["name"].endswith(ext) for ext in asset_extensions)
        }

        # Step 2 & 3: Find all files referenced in the index HTML and recursively
        referenced_files = set()
        files_to_check = [index_html_file_path]

        while files_to_check:
            current_file = files_to_check.pop(0)
            if current_file in referenced_files:
                continue

            referenced_files.add(current_file)

            try:
                file_path = None
                content_bytes, mime_type = await FilesService.get_file_from_env(
                    current_file, env
                )
                file_content = content_bytes.decode("utf-8")

                # Find all asset references in this file
                for file_path in all_files.keys():
                    filename = all_files[file_path]["name"]
                    if filename in file_content and file_path not in referenced_files:
                        files_to_check.append(file_path)

            except Exception:

                # Skip files that don't exist
                logger.error(
                    f"Error getting file {file_path}: {traceback.format_exc()}"
                )
                continue

        # Step 4 & 5: Return all referenced files with window.location.origin replacement
        for file_path in referenced_files:
            try:
                content_bytes, mime_type = await FilesService.get_file_from_env(
                    file_path, env
                )

                # Replace window.location.origin for HTML and JavaScript files if artifact_id is provided
                if artifact_id and mime_type in ["text/html", "text/javascript"]:
                    file_content = content_bytes.decode("utf-8")
                    file_content = ArtifactsService.replace_window_location_origin(
                        file_content, artifact_id, file_path
                    )
                    content_bytes = file_content.encode("utf-8")

                yield content_bytes, file_path

            except Exception:
                # Skip files that don't exist in the environment
                logger.error(
                    f"Error getting file {file_path}: {traceback.format_exc()}"
                )
                continue
