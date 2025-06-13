from pathlib import Path
from typing import Any, Dict, Optional, Union
from e2b_code_interpreter import Sandbox
from .base_env import BaseEnv


class E2BEnv(BaseEnv):
    """Environment backed by an E2B sandbox via `e2b-code-interpreter` SDK."""

    def __init__(self, base_path: Union[str, Path]):
        super().__init__(base_path)
        sbx =  Sandbox(timeout=3600)
        # Ensure base directory exists within sandbox
        sbx.files.make_dir(str(base_path))
        self.sandbox = sbx
        self.working_directory = self.base_path

    def change_directory(self, path: Union[str, Path]) -> Path:
        """
        Change the current working directory in the sandbox.

        Args:
            path: New working directory path (can be relative to base_path)

        Returns:
            The new working directory Path object (local abstraction),
            representing the directory in the sandbox.
        """
        # Resolve relative to current working_directory or absolute within base_path
        new_path = self._resolve_path(path)

        # Ensure it stays within base_path
        if not str(new_path).startswith(str(self.base_path)):
            new_path = self.base_path / Path(path)

        # In sandbox: ensure directory exists
        # E2B SDK: create directory (and parents) if needed
        # Use string path inside sandbox
        self.sandbox.files.make_dir(str(new_path))

        # Update local working_directory abstraction
        self.working_directory = new_path
        return self.working_directory

    async def exec_shell(
        self,
        command: str,
        timeout: Optional[float] = None,
        capture_output: bool = True,
        blocking: bool = True,
    ) -> Dict[str, Any]:
        """
        Runs a shell command inside the sandbox.
        """
        result = self.sandbox.commands.run(command, timeout=timeout, stream=False)
        return {
            "status": "success" if result.return_code == 0 else "error",
            "stdout": result.stdout or "",
            "stderr": result.stderr or "",
            "return_code": result.return_code,
            "execution_time": result.execution_time,
            **(
                {"session_id": result.session_id, "pid": result.pid}
                if not blocking
                else {}
            ),
        }

    async def write_file(
        self,
        path: Union[str, Path],
        content: Union[str, bytes],
        mode: str = "w",
        encoding: Optional[str] = "utf-8",
    ) -> Dict[str, Any]:
        """
        Writes a file into the sandbox filesystem.
        """
        resolved = self._resolve_path(path)
        self.sandbox.files.write(str(resolved), content)
        return {"status": "success", "path": str(resolved)}

    async def read_file(
        self,
        path: Union[str, Path],
        mode: str = "r",
        encoding: Optional[str] = "utf-8",
        start_line: Optional[int] = None,
        end_line: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Reads a file from the sandbox, optionally slicing lines.
        """
        resolved = self._resolve_path(path)
        data = self.sandbox.files.read(str(resolved))
        content = data if isinstance(data, bytes) else data
        if mode == "r" and isinstance(content, str):
            lines = content.splitlines(keepends=True)
            content = "".join(lines[start_line:end_line])
        size = len(content) if isinstance(content, (bytes, str)) else 0
        return {
            "status": "success",
            "path": str(resolved),
            "size": size,
            "content": content,
        }

    async def delete_file(self, path: Union[str, Path]) -> Dict[str, Any]:
        """
        Removes a file or directory in the sandbox.
        """
        resolved = self._resolve_path(path)
        self.sandbox.files.remove(str(resolved))
        return {"status": "success", "path": str(resolved)}

    async def list_files(
        self,
        path: Optional[Union[str, Path]] = None,
        recursive: bool = False,
        include_hidden: bool = False,
    ) -> Dict[str, Any]:
        """
        Lists directory contents inside the sandbox.
        """
        resolved = self._resolve_path(path or self.current_directory)
        depth = 5 if recursive else 1 # set depth to 5 if recursive

        entries = self.sandbox.files.list(
            str(resolved), depth=depth
        )
    
        files = [
            entry.path
            for entry in entries
            if include_hidden or not Path(entry.path).name.startswith(".")
        ]
        return {"status": "success", "path": str(resolved), "files": files}

    async def path_exists(self, path: Union[str, Path]) -> Dict[str, Any]:
        """
        Check if a path exists in the sandbox environment.

        Args:
            path: Path relative to current_directory or absolute within base_path.

        Returns:
            Dict with:
              - status: "exists" or "not_found" or "error"
              - path: resolved absolute path
              - details: e.g. stat info if exists, or error message
        """
        resolved = self._resolve_path(path)
        str_path = str(resolved)
        try:
            info = self.sandbox.files.exists(str_path)
            # info likely has attributes like size, is_dir, etc.
            return {
                "status": "exists",
                "path": str_path,
                "details": {
                    "size": getattr(info, "size", None),
                    "is_dir": getattr(info, "is_dir", None),
                },
            }
        except Exception as e:
            msg = str(e)
            # You may want to detect specific "not found" errors if SDK provides a specific exception type.
            # For simplicity, treat any exception as "not found" unless you inspect the exception type/message.
            if "not found" in msg.lower() or "404" in msg:
                return {"status": "not_found", "path": str_path}
            else:
                return {"status": "error", "path": str_path, "details": msg}
