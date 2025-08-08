"""
Environment abstraction for file and shell operations.

This module provides environment classes that define where file operations
and shell commands are executed.
"""

import logging
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .base_env import BaseEnv, ExecutionResult

# PDF processing import with fallback
try:
    import pypdf

    PDF_AVAILABLE = True
except ImportError:
    try:
        import PyPDF2 as pypdf

        PDF_AVAILABLE = True
    except ImportError:
        PDF_AVAILABLE = False

logger = logging.getLogger("LocalEnv")
logger.setLevel(logging.WARNING)


class LocalEnv(BaseEnv):
    """Local file system environment implementation."""

    def __init__(
        self,
        base_path: Union[str, Path],
        metadata: Optional[Dict[str, Any]] = None,
        ports: Optional[List[int]] = [8080, 2664],
        timeout: Optional[int] = 3600,
    ):
        """
        Initialize the local environment.

        Args:
            base_path: The base directory for this environment
            metadata: Optional metadata dictionary
            ports: List of ports to use for this environment
            timeout: Optional timeout in seconds (max timeout when running commands)
        """
        super().__init__(base_path, metadata, timeout)
        # Create base directory if it doesn't exist
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.ports = ports

    async def _run_command(
        self, command: str, timeout: Optional[int] = None
    ) -> ExecutionResult:
        """
        Execute a command in the local environment.

        Args:
            command: The command to execute
            timeout: Optional timeout in seconds

        Returns:
            ExecutionResult: The result of the command execution
        """
        if timeout is None:
            timeout = self.timeout
        try:
            process = subprocess.Popen(
                command,
                shell=True,
                cwd=str(self.working_directory),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            try:
                stdout, stderr = process.communicate(timeout=timeout)
                exit_code = process.returncode
                success = exit_code == 0

                return ExecutionResult(
                    output=stdout.strip() if stdout else "",
                    error=stderr.strip() if stderr else "",
                    exit_code=exit_code,
                    success=success,
                )
            except subprocess.TimeoutExpired:
                process.kill()
                stdout, stderr = process.communicate()
                return ExecutionResult(
                    output=stdout.strip() if stdout else "",
                    error=stderr.strip() if stderr else "",
                    exit_code=-1,
                    success=False,
                )
        except Exception as e:
            return ExecutionResult(output="", error=str(e), exit_code=-1, success=False)

    async def _initialize_tmux(self):
        """
        Initialize tmux for the local environment.

        For local environments, tmux should already be available on the system.
        This method checks if tmux is available and does minimal setup if needed.
        """
        try:
            # Check if tmux is available
            result = await self._run_command("which tmux", timeout=10)
            if not result.success:
                raise Exception("tmux is not installed on the local system")

            # tmux should be available, no additional setup needed for local env
            logger.info("tmux is available on local system")

        except Exception as e:
            raise Exception(f"Failed to initialize tmux: {e}")

    async def write_file(
        self,
        path: Union[str, Path],
        content: Union[str, bytes],
        mode: str = "w",
        encoding: Optional[str] = "utf-8",
    ) -> Dict[str, Any]:
        """Write content to a file."""
        try:
            target_path = self._resolve_path(path)

            # Create parent directories if they don't exist
            target_path.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(content, bytes):
                # Binary mode
                with open(target_path, "wb") as f:
                    f.write(content)
            else:
                # Text mode
                with open(target_path, mode, encoding=encoding) as f:
                    f.write(content)

            return {
                "status": "success",
                "message": f"File written successfully: {target_path}",
                "path": str(target_path),
                "size": len(content),
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(path),
            }

    async def read_file(
        self, path: Union[str, Path], mode: str = "r", encoding: Optional[str] = "utf-8"
    ) -> Dict[str, Any]:
        """Read content from a file. Supports PDF files by converting them to text."""
        try:
            target_path = self._resolve_path(path)

            if not target_path.exists():
                return {
                    "status": "error",
                    "message": f"File not found: {target_path}",
                    "path": str(target_path),
                }

            # Handle PDF files specially
            if target_path.suffix.lower() == ".pdf":
                if not PDF_AVAILABLE:
                    return {
                        "status": "error",
                        "message": "PDF support not available. Install pypdf or PyPDF2.",
                        "path": str(target_path),
                    }
                return await self._read_pdf_file(target_path)

            # Regular file reading
            if mode.startswith("r") and "b" not in mode:
                # Text mode
                with open(target_path, mode, encoding=encoding) as f:
                    content = f.read()
            else:
                # Binary mode
                with open(target_path, mode) as f:
                    content = f.read()

            return {
                "status": "success",
                "content": content,
                "path": str(target_path),
                "size": len(content),
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(path),
            }

    async def _read_pdf_file(self, file_path: Path) -> Dict[str, Any]:
        """Read and extract text content from a PDF file."""
        try:
            text_content = ""

            with open(file_path, "rb") as file:
                if hasattr(pypdf, "PdfReader"):
                    # pypdf (newer)
                    reader = pypdf.PdfReader(file)
                    for page in reader.pages:
                        text_content += page.extract_text() + "\n"
                else:
                    # PyPDF2 (older)
                    reader = pypdf.PdfFileReader(file)
                    for page_num in range(reader.numPages):
                        page = reader.getPage(page_num)
                        text_content += page.extractText() + "\n"

            return {
                "status": "success",
                "content": text_content.strip(),
                "path": str(file_path),
                "size": len(text_content),
                "type": "pdf",
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to read PDF: {str(e)}",
                "path": str(file_path),
            }

    async def delete_file(self, path: Union[str, Path]) -> Dict[str, Any]:
        """Delete a file or directory."""
        try:
            target_path = self._resolve_path(path)

            if not target_path.exists():
                return {
                    "status": "error",
                    "message": f"Path not found: {target_path}",
                    "path": str(target_path),
                }

            if target_path.is_dir():
                shutil.rmtree(target_path)
                return {
                    "status": "success",
                    "message": f"Directory deleted: {target_path}",
                    "path": str(target_path),
                }
            else:
                target_path.unlink()
                return {
                    "status": "success",
                    "message": f"File deleted: {target_path}",
                    "path": str(target_path),
                }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(path),
            }

    async def path_exists(self, path: Union[str, Path]) -> bool:
        """
        Check if a path exists in the local environment.

        Args:
            path: Path relative to current_directory or absolute within base_path.

        Returns:
            bool: True if the path exists, False otherwise
        """
        try:
            target_path = self._resolve_path(path)
            return target_path.exists()
        except Exception:
            return False

    async def mkdir(
        self, path: Union[str, Path], parents: bool = False, exist_ok: bool = False
    ) -> Dict[str, Any]:
        """
        Create a directory in the local environment.

        Args:
            path: Path relative to current_directory or absolute within base_path.
            parents: If True, create parent directories as needed.
            exist_ok: If False, an error is raised if the directory already exists.

        Returns:
            Dict[str, Any]: Result of the mkdir operation
        """
        try:
            target_path = self._resolve_path(path)
            target_path.mkdir(parents=parents, exist_ok=exist_ok)

            return {
                "status": "success",
                "message": f"Directory created: {target_path}",
                "path": str(target_path),
            }
        except FileExistsError:
            return {
                "status": "error",
                "message": f"Directory already exists: {path}",
                "path": str(path),
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(path),
            }

    async def list_files(
        self,
        path: Optional[Union[str, Path]] = None,
        recursive: bool = False,
        include_hidden: bool = False,
        max_depth: int = None,
    ) -> Dict[str, Any]:
        """List files in a directory."""
        try:
            if path is None:
                target_path = self.working_directory
            else:
                target_path = self._resolve_path(path)

            if not target_path.exists():
                return {
                    "status": "error",
                    "message": f"Directory not found: {target_path}",
                    "path": str(target_path),
                }

            if not target_path.is_dir():
                return {
                    "status": "error",
                    "message": f"Path is not a directory: {target_path}",
                    "path": str(target_path),
                }

            files = []

            if recursive:
                pattern = "**/*"
            else:
                pattern = "*"

            for item in target_path.glob(pattern):
                # Skip hidden files unless explicitly requested
                if not include_hidden and item.name.startswith("."):
                    continue

                try:
                    stat = item.stat()
                    file_info = {
                        "name": item.name,
                        "path": str(item),
                        "relative_path": str(item.relative_to(target_path)),
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size if item.is_file() else 0,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "permissions": oct(stat.st_mode)[-3:],
                    }
                    files.append(file_info)
                except (OSError, PermissionError) as e:
                    # Skip files we can't access
                    files.append(
                        {
                            "name": item.name,
                            "path": str(item),
                            "relative_path": str(item.relative_to(target_path)),
                            "type": "unknown",
                            "error": str(e),
                        }
                    )

            # Sort files by name
            files.sort(key=lambda x: x["name"].lower())

            return {
                "status": "success",
                "path": str(target_path),
                "files": files,
                "total_files": len([f for f in files if f.get("type") == "file"]),
                "total_directories": len(
                    [f for f in files if f.get("type") == "directory"]
                ),
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(target_path if "target_path" in locals() else path),
            }

    def get_available_ports(self) -> List[int]:
        """Get list of available ports."""
        try:
            return self.ports
        except Exception as e:
            logger.warning(f"Error getting available ports: {str(e)}")
            return []

    def is_port_available(self, port: int) -> bool:
        """Check if a port is available."""
        if port in self.ports:
            return False

        # try:
        #     check_cmd = [
        #         "lsof",
        #         "-i",
        #         f":{port}",
        #     ]
        #     check_process = await asyncio.create_subprocess_exec(
        #         *check_cmd,
        #         stdout=asyncio.subprocess.PIPE,
        #         stderr=asyncio.subprocess.PIPE,
        #     )
        #     stdout, _ = await check_process.communicate()

        #     if stdout.decode().strip() == "":
        #         return True
        #     else:
        #         return False
        # except Exception as e:
        #     logger.warning(f"Error checking port availability: {str(e)}")
        #     return False
