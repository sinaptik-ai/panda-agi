import logging
import mimetypes
import os
from pathlib import Path

from panda_agi.utils.file_replace import file_replace
from models.agent import ConversationMessage
from panda_agi.envs.base_env import BaseEnv
from utils.exceptions import FileNotFoundError, RestrictedAccessError

from .conversation_message_parser import ConversationMessageParser

logger = logging.getLogger(__name__)


class FilesService:
    @staticmethod
    def relative_from_base(base_path: str, file_path: str) -> str:
        base_path = os.path.normpath(base_path)
        file_path = os.path.normpath(file_path)

        parts = file_path.split(os.sep)

        # Try shrinking from the end until we find a match
        for i in range(len(parts), 0, -1):
            candidate = os.sep.join(parts[:i])
            if base_path.endswith(candidate):
                return os.sep.join(parts[i:])

        return file_path

    @staticmethod
    async def validate_and_correct_file_path(
        env: BaseEnv, file_path: str, workspace_path: str | None = None
    ):
        """
        Read the content of a file.
        """

        file_path = os.path.normpath(file_path)
        # Check if the file exists in the environment
        path_exists = await env.path_exists(file_path)
        if path_exists:
            return file_path
        else:
            if not workspace_path:
                return None

            # List all files in the environment
            files = await env.list_files(recursive=True)

            # Check if the file exists in the environment
            if files["status"] == "success":
                exist_file_path = None
                count_of_files = 0
                for file in files["files"]:
                    if file["name"] == file_path and file["type"] == "file":
                        exist_file_path = file
                        count_of_files += 1

                if exist_file_path and count_of_files == 1:
                    return exist_file_path["relative_path"]

            # Checks for the file path overlap with the workspace path
            relative_path = FilesService.relative_from_base(workspace_path, file_path)
            if await env.path_exists(relative_path):
                return relative_path

            return None

    @staticmethod
    async def get_file_from_env(file_path: str, env: BaseEnv) -> tuple[bytes, str]:
        try:
            resolved = env._resolve_path(file_path)
            # Optional: ensure it's within base_path
            base = Path(env.base_path).resolve()
            try:
                resolved.resolve().relative_to(base)
            except Exception:
                raise RestrictedAccessError("Access denied: outside workspace")

            # Check existence via sandbox API
            file_path: str | None = await FilesService.validate_and_correct_file_path(
                env, file_path, str(base)
            )
            if not file_path:
                raise FileNotFoundError(f"File not found {file_path}")

            # Read file as binary to preserve any type
            read_res = await env.read_file(file_path, mode="rb")
            if read_res.get("status") != "success":
                detail = read_res.get("message", "Unknown error")
                raise FileNotFoundError(f"Error reading file: {detail}")

            content = read_res.get("content", b"")
            # content may be bytes or str; ensure bytes for binary
            if isinstance(content, str):
                content_bytes = content.encode("utf-8")
            else:
                content_bytes = content

            # Determine MIME type by extension
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = "application/octet-stream"

            return content_bytes, mime_type
        except Exception:
            raise

    @staticmethod
    async def get_file_from_conversation_messages(
        conversation_messages: list[ConversationMessage], file_path: str
    ) -> tuple[bytes, str]:
        tool_calls = []
        for message in conversation_messages:
            # Process the content of the message
            # the message contains the tool call or the user message
            # Get tool calls from the message
            tool_calls.extend(
                ConversationMessageParser().extract_tool_calls_from_message(
                    message.content["content"]
                )
            )

        file_write_content = None
        logger.debug("Total tool calls: ", len(tool_calls))

        for tool_call in tool_calls:
            #  handle file write
            if (
                tool_call["function_name"] == "file_write"
                and tool_call["arguments"]["file_name"] == file_path
            ):
                content = tool_call["arguments"]["content"]
                file_write_content = content
                logger.debug("File write content: ", file_write_content[0:500])

            #  handle file replace
            elif (
                tool_call["function_name"] == "file_replace"
                and tool_call["arguments"]["file_name"] == file_path
            ):
                old_str = tool_call["arguments"].get("find_str", None)
                new_str = tool_call["arguments"].get("replace_str", None)

                if old_str and new_str:
                    file_write_content = file_replace(
                        file_write_content, old_str, new_str
                    )
                    logger.debug(
                        f"File replace content:  Old: {old_str}  New: {new_str}"
                    )

        if file_write_content:
            # Convert content to bytes if it's a string
            if isinstance(file_write_content, str):
                file_bytes = file_write_content.encode("utf-8")
            else:
                file_bytes = file_write_content

            # Determine MIME type by file extension
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = "application/octet-stream"

            return file_bytes, mime_type
        else:
            return None, None
