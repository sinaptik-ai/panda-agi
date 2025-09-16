import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

try:
    from e2b import AsyncSandbox
    from e2b.sandbox.filesystem.filesystem import FileType
    from e2b.sandbox_sync.sandbox_api import SandboxQuery
except ImportError:
    AsyncSandbox = None

import logging

from .base_env import BaseEnv, ExecutionResult

logger = logging.getLogger("E2BEnv")
logger.setLevel(logging.INFO)


class E2BEnv(BaseEnv):
    """Environment backed by an E2B sandbox via `e2b-code-interpreter` SDK with tmux support."""

    def __init__(
        self,
        template: str,
        base_path: Union[str, Path],
        metadata: Optional[Dict[str, Any]] = None,
        timeout: int = 3600,
        ports: Optional[List[int]] = [8080, 2664],
        sandbox: Optional["AsyncSandbox"] = None,
    ):
        if AsyncSandbox is None:
            raise ImportError(
                "e2b_code_interpreter is not installed. "
                "Please install it with `pip install panda-agi[e2b]`"
            )
        super().__init__(base_path, metadata, timeout)

        self.working_directory = self.base_path
        self.sandbox = sandbox  # Will be None if not provided
        self.template = template
        self.ports = ports
        self._metadata = metadata  # Store for deferred connection

    async def create(self):
        if self.template is None:
            raise ValueError("E2B template is required")
        await self._connect(self.template, self.timeout, self._metadata)
        await self._ensure_tmux_initialized()

    async def _ensure_sandbox_connected(self):
        """Ensure sandbox is connected, connecting if necessary."""
        if self.sandbox is None:
            self.sandbox = await self._connect(
                self.template, self.timeout, self._metadata
            )

    async def _initialize_tmux(self):
        """Initialize tmux in the E2B sandbox environment."""
        try:
            install_command = self.tmux_executor.generate_tmux_install_command()
            install_result = await self._run_command(install_command, timeout=120)
            if not install_result.success:
                raise Exception("Failed to install tmux")

            tmux_config = self.tmux_executor.generate_tmux_config()
            try:
                await self.sandbox.files.write("/tmp/.tmux.conf", tmux_config)
            except Exception as e:
                raise Exception(f"Failed to write tmux config: {e}")

        except Exception as e:
            raise Exception(f"Failed to initialize tmux: {e}")

    async def _run_command(self, command: str, timeout: int = 30) -> ExecutionResult:
        """Execute a raw command directly in the sandbox."""
        await self._ensure_sandbox_connected()
        try:
            result = await self.sandbox.commands.run(command, timeout=timeout)
            return ExecutionResult(
                output=result.stdout or "",
                error=result.stderr or "",
                exit_code=result.exit_code,
                success=result.exit_code == 0,
            )
        except Exception as e:
            return ExecutionResult(output="", error=str(e), exit_code=-1, success=False)

    async def _connect(
        self,
        template: str,
        timeout: int = 3600,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        if AsyncSandbox is None:
            raise ImportError(
                "e2b_code_interpreter is not installed. "
                "Please install it with `pip install panda-agi[e2b]`"
            )
        sbx = await AsyncSandbox.create(template, metadata=metadata, timeout=timeout)
        # Ensure base directory exists within sandbox
        await sbx.files.make_dir(str(self.base_path))
        return sbx

    @staticmethod
    async def get_active_sandbox(
        metadata: Optional[Dict[str, Any]] = None, timeout: int = 3600
    ):
        if AsyncSandbox is None:
            raise ImportError(
                "e2b_code_interpreter is not installed. "
                "Please install it with `pip install panda-agi[e2b]`"
            )
        if metadata and "conversation_id" in metadata:
            query = SandboxQuery(metadata=metadata)
            matches = await AsyncSandbox.list(query=query)
            if not matches:
                raise Exception("Session destroyed, please restart the conversation")
            sbx_info = matches[0]
            sbx = await AsyncSandbox.connect(sbx_info.sandbox_id)
            await sbx.set_timeout(timeout)
            return sbx

        return None

    async def change_directory(self, path: Union[str, Path]) -> Path:
        """
        Change the current working directory in the sandbox.

        Args:
            path: New working directory path (can be relative to base_path)

        Returns:
            The new working directory Path object (local abstraction),
            representing the directory in the sandbox.
        """
        logger.info(f"changing directory to {path}")
        # Resolve relative to current working_directory or absolute within base_path
        new_path = self._resolve_path(path)

        # Ensure it stays within base_path
        if not str(new_path).startswith(str(self.base_path)):
            new_path = self.base_path / Path(path)

        # In sandbox: ensure directory exists
        # E2B SDK: create directory (and parents) if needed
        # Use string path inside sandbox
        await self.sandbox.files.make_dir(str(new_path))

        # Update local working_directory abstraction
        self.working_directory = new_path
        return self.working_directory

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
        resolved_path = self._resolve_path(path)
        entry = await self.sandbox.files.write(str(resolved_path), content)

        # Replace base path prefix with "/" if it exists
        if entry.path.startswith(str(self.base_path)):
            entry.path = "/" + entry.path[len(str(self.base_path)) :].lstrip("/")

        return {"status": "success", "path": entry.path, "file": entry.name}

    async def read_file(
        self,
        path: Union[str, Path],
        mode: str = "r",
        encoding: Optional[str] = "utf-8",
    ) -> Dict[str, Any]:
        """
        Reads a file from the sandbox, optionally slicing lines.
        """
        resolved_path = self._resolve_path(path)
        format = "bytes" if "rb" in mode else "text"
        try:
            content = await self.sandbox.files.read(str(resolved_path), format=format)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to read file {str(resolved_path)}: {str(e)}",
                "path": str(resolved_path),
            }

        if format == "bytes" and isinstance(content, bytearray):
            content = bytes(content)

        size = len(content) if isinstance(content, (bytes, str)) else 0
        return {
            "status": "success",
            "path": str(resolved_path),
            "size": size,
            "content": content,
        }

    async def delete_file(self, path: Union[str, Path]) -> Dict[str, Any]:
        """
        Removes a file or directory in the sandbox.
        """
        resolved_path = self._resolve_path(path)
        await self.sandbox.files.remove(str(resolved_path))
        return {"status": "success", "path": str(resolved_path)}

    async def list_files(
        self,
        path: Optional[Union[str, Path]] = None,
        recursive: bool = False,
        include_hidden: bool = False,
        max_depth: int = 5,
    ) -> Dict[str, Any]:
        """
        Lists directory contents inside the sandbox.
        """
        try:
            resolved_path = self._resolve_path(path or self.current_directory)
            str_path = str(resolved_path)

            # Check if path exists
            try:
                await self.sandbox.files.exists(str_path)
            except Exception:
                return {
                    "status": "error",
                    "message": f"Directory not found: {str_path}",
                    "path": str_path,
                }

            # Check if it's a directory by trying to list it
            try:
                depth = max_depth if recursive else 1  # set depth to 5 if recursive
                entries = await self.sandbox.files.list(str_path, depth=depth)
            except Exception:
                # If listing fails, it might not be a directory
                return {
                    "status": "error",
                    "message": f"Path is not a directory: {str_path}",
                    "path": str_path,
                }

            files = []
            base_path = Path(str_path)

            for entry in entries:
                # Skip the directory itself
                if entry.path == str_path:
                    continue

                # Skip hidden files unless explicitly requested
                if not include_hidden and Path(entry.path).name.startswith("."):
                    continue

                # Get relative path from the base directory
                try:
                    rel_path = Path(entry.path).relative_to(base_path)
                except ValueError:
                    # If we can't get relative path, use the full path
                    rel_path = Path(entry.path)

                # Create file info dict similar to LocalEnv
                file_info = {
                    "name": Path(entry.path).name,
                    "path": entry.path,
                    "relative_path": str(rel_path),
                    "type": "directory" if entry.type == FileType.DIR else "file",
                }
                files.append(file_info)

            return {
                "status": "success",
                "path": str_path,
                "files": files,
                "total_files": len(files),
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Error listing files: {str(e)}",
                "path": (
                    str(resolved_path) if "resolved_path" in locals() else str(path)
                ),
            }

    async def path_exists(self, path: Union[str, Path]) -> bool:
        """
        Check if a path exists in the sandbox environment.

        Args:
            path: Path relative to current_directory or absolute within base_path.

        Returns:
            bool: True if the path exists, False otherwise
        """
        resolved_path = self._resolve_path(path)
        str_path = str(resolved_path)
        try:
            file_exists = await self.sandbox.files.exists(str_path)
            logger.info(f"Path exists: {file_exists}")
            return file_exists
        except Exception:
            return False

    async def mkdir(
        self, path: Union[str, Path], parents: bool = False, exist_ok: bool = False
    ) -> Dict[str, Any]:
        """
        Create a directory in the sandbox environment.

        Args:
            path: Path relative to current_directory or absolute within base_path.
            parents: If True, create parent directories as needed.
            exist_ok: If False, an error is raised if the directory already exists.

        Returns:
            Dict[str, Any]: Result of the mkdir operation
        """
        resolved = self._resolve_path(path)
        str_path = str(resolved)

        try:
            # Check if directory already exists
            if exist_ok:
                try:
                    if await self.sandbox.files.exists(str_path):
                        return {
                            "status": "success",
                            "path": str_path,
                            "message": "Directory already exists",
                        }
                except Exception:
                    # If checking existence fails, proceed with creation attempt
                    pass

            # Create parent directories if needed
            if parents:
                # Get all parent paths that need to be created
                parts = Path(str_path).parts
                current_path = "/"

                for i, part in enumerate(parts):
                    if i == 0 and part == "/":  # Skip root
                        continue

                    current_path = os.path.join(current_path, part)

                    # Skip creating the final directory (will be created below)
                    if i == len(parts) - 1:
                        continue

                    try:
                        # Try to create each parent directory, ignore if exists
                        try:
                            if not await self.sandbox.files.exists(current_path):
                                await self.sandbox.files.make_dir(current_path)
                        except Exception:
                            await self.sandbox.files.make_dir(current_path)
                    except Exception:
                        # Continue if parent creation fails, the final mkdir will fail appropriately
                        pass

            # Create the actual directory
            await self.sandbox.files.make_dir(str_path)
            return {"status": "success", "path": str_path}
        except Exception as e:
            if exist_ok:
                # Check if directory exists after failed creation attempt
                try:
                    if await self.sandbox.files.exists(str_path):
                        return {
                            "status": "success",
                            "path": str_path,
                            "message": "Directory already exists",
                        }
                except Exception:
                    pass

            return {
                "status": "error",
                "message": f"Failed to create directory: {str_path}. Error: {str(e)}",
            }

    def get_hosted_url(self, port) -> str:
        return self.sandbox.get_host(port)

    def kill(self):
        """
        Destructor: schedule sandbox.close() if possible.
        """
        self.sandbox.kill()

    async def is_port_available(self, port: int) -> bool:
        return port not in self.ports

    def get_available_ports(self) -> List[int]:
        return self.ports
