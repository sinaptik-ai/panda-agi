"""
Environment abstraction for file and shell operations.

This module provides environment classes that define where file operations
and shell commands are executed.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional, Union


class BaseEnv(ABC):
    """Abstract base class for environment management."""

    def __init__(self, base_path: Union[str, Path]):
        """
        Initialize the environment with a base path.

        Args:
            base_path: The base directory for this environment
        """
        self.base_path = Path(base_path).resolve()
        self.working_directory = self.base_path

    @property
    def current_directory(self) -> Path:
        """Get the current working directory."""
        return self.working_directory

    def change_directory(self, path: Union[str, Path]) -> Path:
        """
        Change the current working directory.

        Args:
            path: New working directory path (can be relative to base_path)

        Returns:
            The new working directory path
        """
        new_path = self._resolve_path(path)
        # Ensure the new path is within the environment
        if not str(new_path).startswith(str(self.base_path)):
            new_path = self.base_path / path

        if not new_path.exists():
            new_path.mkdir(parents=True, exist_ok=True)

        self.working_directory = new_path
        return self.working_directory

    def _resolve_path(self, path: Union[str, Path]) -> Path:
        """
        Resolve a path relative to the current working directory.

        Args:
            path: Path to resolve

        Returns:
            Resolved absolute path
        """
        path = Path(path)
        if path.is_absolute():
            # Ensure absolute paths are within the environment
            if str(path).startswith(str(self.base_path)):
                return path
            else:
                # Treat as relative to base_path, preserving directory structure
                # Remove leading slash and use relative to base_path
                relative_path = str(path).lstrip("/")
                return self.base_path / relative_path
        else:
            return self.working_directory / path

    @abstractmethod
    async def exec_shell(
        self,
        command: str,
        timeout: Optional[float] = None,
        capture_output: bool = True,
        blocking: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute a shell command in the environment.

        Args:
            command: Shell command to execute
            timeout: Optional timeout in seconds
            capture_output: Whether to capture stdout/stderr
            blocking: Whether to wait for command completion

        Returns:
            Dict containing:
                - status: success/error/timeout
                - stdout: Standard output (if capture_output=True)
                - stderr: Standard error (if capture_output=True)
                - return_code: Process return code (if blocking=True)
                - execution_time: Time taken to execute (if blocking=True)
                - session_id: Session identifier (if blocking=False)
                - pid: Process ID (if blocking=False and available)
        """
        pass

    @abstractmethod
    async def write_file(
        self,
        path: Union[str, Path],
        content: Union[str, bytes],
        mode: str = "w",
        encoding: Optional[str] = "utf-8",
    ) -> Dict[str, Any]:
        """
        Write content to a file.

        Args:
            path: File path (relative to current directory)
            content: Content to write
            mode: File open mode ('w', 'wb', 'a', 'ab')
            encoding: File encoding (for text mode)

        Returns:
            Dict containing:
                - status: success/error
                - path: Absolute path where file was written
                - size: File size in bytes
                - message: Error message if any
        """
        pass

    @abstractmethod
    async def read_file(
        self,
        path: Union[str, Path],
        mode: str = "r",
        encoding: Optional[str] = "utf-8",
        start_line: Optional[int] = None,
        end_line: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Read content from a file.

        Args:
            path: File path (relative to current directory)
            mode: File open mode ('r', 'rb')
            encoding: File encoding (for text mode)

        Returns:
            Dict containing:
                - status: success/error
                - content: File content (str or bytes)
                - size: File size in bytes
                - path: Absolute path of the file
                - message: Error message if any
        """
        pass

    @abstractmethod
    async def delete_file(self, path: Union[str, Path]) -> Dict[str, Any]:
        """
        Delete a file or directory.

        Args:
            path: Path to delete (relative to current directory)

        Returns:
            Dict containing:
                - status: success/error
                - path: Path that was deleted
                - message: Error message if any
        """
        pass

    @abstractmethod
    async def list_files(
        self,
        path: Optional[Union[str, Path]] = None,
        recursive: bool = False,
        include_hidden: bool = False,
    ) -> Dict[str, Any]:
        """
        List files in a directory.

        Args:
            path: Directory path (relative to current directory). If None, uses current directory
            recursive: Whether to list files recursively
            include_hidden: Whether to include hidden files

        Returns:
            Dict containing:
                - status: success/error
                - path: Directory that was listed
                - files: List of file/directory information
                - message: Error message if any
        """
        pass
    
    async def get_hosted_url(self, port) -> str:
        return f"http://localhost:{port}"
