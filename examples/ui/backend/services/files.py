import mimetypes
from pathlib import Path

from panda_agi.envs.base_env import BaseEnv
from utils.exceptions import FileNotFoundError, RestrictedAccessError


class FilesService:

    @staticmethod
    async def validate_and_correct_file_path(
        local_env: BaseEnv, file_path: str, workspace_path: str | None = None
    ):
        """
        Read the content of a file.
        """
        path_exists = await local_env.path_exists(file_path)
        if path_exists:
            return file_path
        else:
            if not workspace_path:
                return None

            files = await local_env.list_files(recursive=True)

            if files["status"] == "success":
                exist_file_path = None
                count_of_files = 0
                for file in files["files"]:
                    if file["name"] == file_path and file["type"] == "file":
                        exist_file_path = file
                        count_of_files += 1

                if exist_file_path and count_of_files == 1:
                    return exist_file_path["relative_path"]

            return None

    @staticmethod
    async def get_file_from_env(file_path: str, env: BaseEnv) -> str:
        try:
            resolved = env._resolve_path(file_path)
            # Optional: ensure it's within base_path
            base = Path(env.base_path).resolve()
            try:
                resolved.resolve().relative_to(base)
            except Exception:
                raise RestrictedAccessError(
                    status_code=403, detail="Access denied: outside workspace"
                )

            # Check existence via sandbox API
            file_path: str | None = await FilesService.validate_and_correct_file_path(
                env, file_path, str(base)
            )
            if not file_path:
                raise FileNotFoundError(status_code=404, detail="File not found")

            # Read file as binary to preserve any type
            read_res = await env.read_file(file_path, mode="rb")
            if read_res.get("status") != "success":
                detail = read_res.get("message", "Unknown error")
                raise Exception(status_code=500, detail=f"Error reading file: {detail}")

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
        except Exception as e:
            raise
