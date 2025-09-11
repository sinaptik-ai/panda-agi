"""
Interact with environment and return relevant files
"""

import re
import os
from typing import List, Set
from urllib.parse import urlparse

from models.agent import ConversationMessage

from .chat_env import get_env
from .files import FilesService
from panda_agi.envs.base_env import BaseEnv
import logging
import traceback
from services.pxml import PXMLService

# Try to import OpenAI, but don't fail if it's not available
try:
    import openai

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)


DEFAULT_ARTIFACT_NAME = "New Creation"


class ArtifactsService:

    @staticmethod
    async def get_file_for_artifact(
        file_path: str,
        env: BaseEnv,
        conversation_messages: list[ConversationMessage] = None,
    ) -> str:
        """
        Get the name of an artifact based on its ID.
        """
        content_bytes = None
        mime_type = None
        if conversation_messages:
            content_bytes, mime_type = (
                await FilesService.get_file_from_conversation_messages(
                    conversation_messages, file_path
                )
            )

        if not content_bytes:
            return await FilesService.get_file_from_env(file_path, env)

        return content_bytes, mime_type

    @staticmethod
    async def suggest_artifact_name(
        conversation_id: str, filepath: str, content: str = None
    ) -> str:
        """
        Suggest a name for an artifact based on its type and filepath.

        Args:
            conversation_id: The conversation ID
            filepath: The filepath of the artifact

        Returns:
            A suggested name for the artifact
        """
        # Check if OpenAI is available and API key is set
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI not available, returning default name")
            return DEFAULT_ARTIFACT_NAME

        openai_api_key = os.environ.get("OPENAI_API_KEY")
        if not openai_api_key:
            logger.warning("OpenAI API key not found in environment variables")
            return DEFAULT_ARTIFACT_NAME

        try:
            if not content:
                # Get the file content to analyze
                env = await get_env({"conversation_id": conversation_id})
                content_bytes, _ = await FilesService.get_file_from_env(filepath, env)
                file_content = content_bytes.decode("utf-8", errors="ignore")
            else:
                file_content = content

            # Truncate content if it's too long to avoid token limits
            max_content_length = 1000  # Conservative limit
            if len(file_content) > max_content_length:
                file_content = file_content[:max_content_length] + "..."

            # Create a prompt for name suggestion
            prompt = f"""
Based on the following file content, suggest a concise, descriptive name for this creation.

File Path: {filepath}

File Content:
{file_content}

Instructions:
- Create a name that reflects the main topic, purpose, or content of the file
- Make it descriptive but concise
- Avoid generic names like "Document" or "File"
- Don't add the file extension to the name
- Only first letter of the name should be capitalized

Suggested name:"""

            # Call OpenAI API
            client = openai.AsyncOpenAI(api_key=openai_api_key)
            response = await client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that suggests descriptive names for files and documents. Always respond with just the suggested name, nothing else.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=50,
                temperature=0.3,
            )

            suggested_name = response.choices[0].message.content.strip()

            # Clean up the suggested name
            suggested_name = suggested_name.replace('"', "").replace("'", "").strip()

            # If the response is empty or too long, return a default
            if not suggested_name:
                return DEFAULT_ARTIFACT_NAME

            return suggested_name

        except Exception as e:
            logger.error(f"Error suggesting artifact name: {e}")
            return DEFAULT_ARTIFACT_NAME

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
        type: str,
        filepath: str,
        conversation_id: str,
        artifact_id: str = None,
        conversation_messages: list[ConversationMessage] = None,
    ):

        env: BaseEnv = await get_env(
            {"conversation_id": conversation_id}, force_new=conversation_id is None
        )

        if type == "markdown":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_markdown(
                filepath, env, artifact_id, conversation_messages
            ):
                yield file_bytes, relative_path
        elif type == "iframe":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_iframe(
                filepath, env, artifact_id, conversation_messages
            ):
                yield file_bytes, relative_path
        elif type == "pxml":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_pxml(
                filepath, env, artifact_id, conversation_messages
            ):
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
        filepath: str,
        env: BaseEnv,
        artifact_id: str = None,
        conversation_messages: list[ConversationMessage] = None,
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
                content_bytes, _ = await ArtifactsService.get_file_for_artifact(
                    current_file, env, conversation_messages
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
                                        await ArtifactsService.get_file_for_artifact(
                                            relative_path, env, conversation_messages
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
        filepath: str,
        env: BaseEnv,
        artifact_id: str = None,
        conversation_messages: list[ConversationMessage] = None,
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
                content_bytes, mime_type = await ArtifactsService.get_file_for_artifact(
                    current_file, env, conversation_messages
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

                logger.info(f"Getting file {file_path}")
                content_bytes, mime_type = await ArtifactsService.get_file_for_artifact(
                    file_path, env, conversation_messages
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

    @staticmethod
    async def get_files_for_pxml(
        filepath: str,
        env: BaseEnv,
        artifact_id: str = None,
        conversation_messages: list[ConversationMessage] = None,
    ):
        """
        Get all relevant files for PXML files:
        1. Parse the PXML file to extract CSV file references
        2. Get the CSV file content using PXMLService
        3. Yield the CSV file content along with its filepath
        """
        try:
            # Get the PXML file content
            filepath = await FilesService.validate_and_correct_file_path(env, filepath)
            pxml_content_bytes, _ = await ArtifactsService.get_file_for_artifact(
                filepath, env, conversation_messages
            )
            pxml_content = pxml_content_bytes.decode("utf-8")

            pxml_content = await PXMLService.process_xml_content_for_csv_file_path(
                pxml_content, env
            )

            # Get CSV files using the PXMLService method
            csv_file_count = 0
            async for (
                csv_content_bytes,
                csv_file_path,
            ) in PXMLService.get_csv_files_for_pxml(pxml_content, env):
                logger.info(f"Uploading PXML CSV file path: {csv_file_path}")
                # Yield the CSV file content with its filepath
                csv_file_count += 1
                yield csv_content_bytes, csv_file_path

            if csv_file_count == 0:
                raise ValueError(f"CSV file path not found {filepath}")

            # Also yield the PXML file itself
            yield pxml_content.encode("utf-8"), filepath

        except Exception as e:
            logger.error(f"Error getting files for PXML {filepath}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
