"""
Interact with environment and return relevant files
"""

import re
from typing import List

from .chat_env import get_env
from .files import FilesService
from panda_agi.envs.base_env import BaseEnv


class ArtifactsService:

    @staticmethod
    async def get_files_for_artifact(type: str, filepath: str, conversation_id: str):

        env: BaseEnv = await get_env(
            {"conversation_id": conversation_id}, force_new=conversation_id is None
        )

        if type == "markdown":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_markdown(filepath, env):
                yield file_bytes, relative_path
        else:
            return

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
    async def get_files_for_markdown(filepath: str, env: BaseEnv):

        content_bytes, _ = await FilesService.get_file_from_env(filepath, env)

        markdown_text = content_bytes.decode("utf-8")
        yield content_bytes, filepath
        relative_paths = ArtifactsService.extract_relative_paths_from_markdown(
            markdown_text
        )

        for relative_path in relative_paths:
            content_bytes, _ = await FilesService.get_file_from_env(relative_path, env)
            yield content_bytes, relative_path
