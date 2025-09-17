"""
Environment abstraction for file and shell operations.

This module provides environment classes that define where file operations
and shell commands are executed.
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel

from .tmux_executor import TmuxExecutor

logger = logging.getLogger("BaseEnv")
logger.setLevel(logging.INFO)


class ExecutionResult(BaseModel):
    success: bool
    output: str
    error: str
    exit_code: int
    session_id: Optional[str] = None
    command_id: Optional[str] = None


class ShellOutput(BaseModel):
    status: Literal["success", "error", "running"]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    def to_tool_result(self):
        """Convert to ToolResult format to avoid circular imports"""
        from ..tools.models import ToolResult

        return ToolResult(
            success=self.status == "success",
            data=self.result,
            error=self.error,
        )


class BaseEnv(ABC):
    """Abstract base class for environment management."""

    def __init__(
        self,
        base_path: Union[str, Path],
        metadata: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = 3600,
    ):
        """
        Initialize the environment with a base path.

        Args:
            base_path: The base directory for this environment
            timeout: Optional timeout in seconds (max timeout when running commands)
        """
        self.base_path = Path(base_path).resolve()
        # Remove leading dot if present
        working_dir = str(base_path)
        if working_dir.startswith("./"):
            working_dir = working_dir[1:]
        elif working_dir == ".":
            working_dir = ""
        self.working_directory = working_dir
        self.metadata = metadata
        self.timeout = timeout

        # Initialize TmuxExecutor for session and command management
        self.tmux_executor: TmuxExecutor = TmuxExecutor(session_prefix="panda_agi")

        # Defer tmux initialization - will be checked when first needed
        self._tmux_initialized: bool = False

    @property
    def current_directory(self) -> Path:
        """Get the current working directory."""
        return self.working_directory

    async def change_directory(self, path: Union[str, Path]) -> Path:
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

        self.base_path = new_path
        return self.base_path

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
            return self.base_path / path

    @abstractmethod
    async def _run_command(self, command: str, timeout: int = 30) -> ExecutionResult:
        """
        Execute a raw command directly in the environment.
        This method should be implemented by each environment type.

        Args:
            command: Command to execute
            timeout: Command timeout in seconds

        Returns:
            ExecutionResult with command output and status
        """
        pass

    @abstractmethod
    async def _initialize_tmux(self):
        """
        Initialize tmux in the environment.
        This method should be implemented by each environment type.
        """
        pass

    async def is_tmux_available(self) -> bool:
        """
        Check if tmux is available in the environment.
        """
        result = await self._run_command("tmux -V")
        return result.success

    async def _ensure_tmux_initialized(self):
        """
        Ensure tmux is initialized, initializing it if necessary.
        """
        if not self._tmux_initialized:
            if await self.is_tmux_available():
                self._tmux_initialized = True
            else:
                await self._initialize_tmux()
                self._tmux_initialized = True

    async def _session_exists(self, session_name: str) -> bool:
        """
        Check if a tmux session exists.
        """
        result = await self._run_command(
            f"tmux has-session -t {session_name} 2>/dev/null"
        )
        return result.success

    async def exec_shell(
        self,
        command: str,
        exec_dir: Optional[str] = None,
        session_id: Optional[str] = None,
        timeout: Optional[float] = None,
        blocking: bool = True,
    ) -> ShellOutput:
        """
        Runs a shell command inside a tmux session using TmuxExecutor.

        Args:
            command: Shell command to execute
            timeout: Optional timeout for command execution
            capture_output: Whether to capture stdout/stderr output
            blocking: If True, wait for completion; if False, run in background

        Returns:
            Dict with execution results. For non-blocking commands, includes session_id.
        """
        await self._ensure_tmux_initialized()

        if session_id is None:
            session_id = self.tmux_executor.generate_session_id()

        if exec_dir is None:
            exec_dir = self.working_directory

        try:
            create_cmd = self.tmux_executor.create_session_command(session_id, exec_dir)
            create_result = await self._run_command(create_cmd)
            if create_result.exit_code != 0:
                return create_result

            self.tmux_executor.register_session(session_id, self.working_directory)
            logger.info(f"session {session_id} registered")
            logger.info(f"active sessions: {self.tmux_executor.active_sessions.keys()}")

            struct_result = self.tmux_executor.generate_command(session_id, command)
            send_result = await self._run_command(
                struct_result.tmux_command, timeout=timeout
            )
            if send_result.exit_code != 0:
                await self.kill_background_process(session_id)
                return ShellOutput(
                    status="error",
                    result={
                        "shell_session_id": session_id,
                        "return_code": send_result.exit_code,
                    },
                    error=send_result.error,
                )

            command_timeout = (
                timeout or self.timeout
            )  # max timeout is the timeout of the sandbox
            start_wait = time.perf_counter()
            final_output = ""
            command_id = struct_result.command_id

            if blocking:
                # Poll for command completion with shorter intervals
                while (time.perf_counter() - start_wait) < command_timeout:
                    # Check if session still exists
                    if not await self._session_exists(session_id):
                        logger.error(
                            f"session {session_id} ended before command completion"
                        )
                        break

                    # Capture session output
                    capture_cmd = self.tmux_executor.generate_capture_command(
                        session_id
                    )
                    capture_result = await self._run_command(capture_cmd, timeout=10)
                    current_output = capture_result.output or ""

                    # Check completion using TmuxExecutor
                    parse_result = self.tmux_executor.parse_command_output(
                        session_id, command_id, current_output
                    )

                    if parse_result.status == "success" and parse_result.completed:
                        final_output = current_output
                        break

                    else:
                        logger.debug(
                            f"command {command_id} not completed: {parse_result}"
                        )

                    await asyncio.sleep(0.5)  # check every 0.5 seconds

            if final_output:
                parse_result = self.tmux_executor.parse_command_output(
                    session_id, command_id, final_output
                )
                clean_output = (
                    parse_result.output if parse_result.status == "success" else ""
                )
            else:
                capture_cmd = self.tmux_executor.generate_capture_command(session_id)
                capture_result = await self._run_command(capture_cmd, timeout=10)

                parse_result = self.tmux_executor.parse_command_output(
                    session_id, command_id, capture_result.output or ""
                )
                logger.info(f"parse result: {parse_result}")
                clean_output = (
                    parse_result.output if parse_result.status == "success" else ""
                )

            if blocking:
                logger.info(
                    f"cleaning up session {session_id} after command completion"
                )
                await self.kill_background_process(session_id)

            if parse_result.exit_code == "0":
                status = "success"
                return ShellOutput(
                    status=status,
                    result={
                        "shell_session_id": session_id,
                        "return_code": parse_result.exit_code,
                        "output": clean_output,
                    },
                )
            elif parse_result.exit_code is None:
                status = "running"
                return ShellOutput(
                    status=status,
                    result={
                        "shell_session_id": session_id,
                        "status": "Script is running",
                        "output": clean_output,
                    },
                )
            else:
                status = "error"
                return ShellOutput(
                    status=status,
                    result={
                        "shell_session_id": session_id,
                        "status": "Script failed",
                    },
                    error=clean_output,
                )

        except Exception as e:
            logger.error(f"Internal error while running command: {e}")
            try:
                await self.kill_background_process(session_id)
            except Exception as e:
                logger.error(f"Failed to clean up session: {e}")

            return ShellOutput(
                status="error",
                result={
                    "shell_session_id": session_id,
                    "status": "Script failed",
                },
                error=f"Internal error while running command. Shell executor failed. Error: {str(e)}",
            )

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
        max_depth: int = 5,
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

    async def kill_background_process(self, session_id: str) -> Dict[str, Any]:
        """
        Kill a background tmux session by session ID using TmuxExecutor.

        Args:
            session_id: Session ID of the background process to kill

        Returns:
            Dict with kill operation status
        """
        if session_id not in self.tmux_executor.active_sessions.keys():
            return {
                "status": "error",
                "message": f"Session {session_id} not found in active sessions",
            }

        try:
            # Kill the tmux session
            kill_cmd = self.tmux_executor.generate_kill_session_command(session_id)
            kill_result = await self._run_command(kill_cmd)

            # Clean up from our tracking regardless of kill command result
            if session_id in self.tmux_executor.active_sessions:
                del self.tmux_executor.active_sessions[session_id]

            # Unregister from TmuxExecutor
            _ = self.tmux_executor.unregister_session(session_id)

            if kill_result.success:
                return {
                    "status": "success",
                    "message": f"Successfully killed session {session_id}",
                    "session_id": session_id,
                }
            else:
                # Session might already be dead, but we cleaned up tracking
                return {
                    "status": "success",
                    "message": f"Session {session_id} terminated (may have already been dead)",
                    "session_id": session_id,
                }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Error killing session {session_id}: {str(e)}",
                "session_id": session_id,
            }

    async def get_process_output(
        self, session_id: str, wait_seconds: int = 5, kill_process: bool = False
    ) -> ShellOutput:
        """
        Get the status and output of a background tmux session using TmuxExecutor.

        Args:
            session_id: Session ID of the background process

        Returns:
            Dict with process status and accumulated output
        """
        if session_id not in self.tmux_executor.active_sessions.keys():
            return None

        try:
            process_info = self.tmux_executor.active_sessions[session_id]

            # Check if session still exists
            if not await self._session_exists(session_id):
                # Session no longer exists, clean up
                self.tmux_executor.unregister_session(session_id)
                return None

            # Wait for the process to finish
            await asyncio.sleep(wait_seconds)

            # Capture current output using TmuxExecutor
            capture_cmd = self.tmux_executor.generate_capture_command(session_id)
            capture_result = await self._run_command(capture_cmd)
            if not capture_result.success:
                raise ValueError(
                    f"Failed to capture output for session {session_id}: {capture_result.error}"
                )

            process_output = self.tmux_executor.parse_command_output(
                session_id,
                process_info["command_history"][0]["command_id"],
                capture_result.output or "",
            )

            if kill_process:
                await self.kill_background_process(session_id)

            return ShellOutput(
                status="success",
                result={
                    "session_id": session_id,
                    "output": process_output.output,
                    "exit_code": process_output.exit_code,
                    "completed": process_output.completed,
                },
            )

        except Exception as e:
            return ShellOutput(
                status="error",
                error=f"Failed to get status for background process {session_id}: {str(e)}",
            )

    async def write_to_process(
        self, session_id: str, input_text: str, press_enter: bool = True
    ) -> ShellOutput:
        """
        Write input to a non-blocking tmux session using TmuxExecutor.
        """
        if session_id not in self.tmux_executor.active_sessions.keys():
            return ShellOutput(
                status="error",
                error=f"Session {session_id} not found in active sessions",
            )

        try:
            # Check if session still exists
            if not await self._session_exists(session_id):
                # Session no longer exists, clean up
                self.tmux_executor.unregister_session(session_id)
                return ShellOutput(
                    status="error",
                    error=f"Session {session_id} no longer exists",
                )

            # Prepare input text
            if press_enter and not input_text.endswith("\n"):
                input_text += "\n"

            # Send input to the tmux session
            send_cmd = f"tmux send-keys -t {session_id} '{input_text}'"
            if not press_enter:
                # Don't send Enter key if press_enter is False
                send_cmd = f"tmux send-keys -t {session_id} -l '{input_text}'"

            send_result = await self._run_command(send_cmd)

            if send_result.success:
                return ShellOutput(
                    status="success",
                    result={
                        "session_id": session_id,
                        "message": f"Input sent to session {session_id}",
                    },
                )
            else:
                return ShellOutput(
                    status="error",
                    error=f"Failed to send input to session {session_id}: {send_result.error}",
                )

        except Exception as e:
            return ShellOutput(
                status="error",
                error=f"Error writing to process {session_id}: {str(e)}",
            )

    async def cleanup_all_sessions(self) -> Dict[str, Any]:
        """
        Kill all tmux sessions using tmux kill-server.

        Returns:
            Dict with cleanup results
        """
        try:
            # Kill all tmux sessions at once
            logger.info("Killing all tmux sessions")
            kill_all_cmd = self.tmux_executor.generate_kill_session_command("all")
            _ = await self._run_command(kill_all_cmd)

            # Clear our tracking
            num_tracked = len(self.tmux_executor.active_sessions)
            self.tmux_executor.active_sessions.clear()

            return {
                "status": "success",
                "message": f"All tmux sessions terminated. Cleared {num_tracked} tracked sessions.",
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error during tmux cleanup: {str(e)}",
            }

    async def list_background_processes(self) -> Dict[str, Any]:
        """
        List all active background tmux sessions using TmuxExecutor.

        Returns:
            Dict with list of active background processes
        """
        active_processes = []

        for session_id, process_info in list(
            self.tmux_executor.active_sessions.items()
        ):
            # Check if session still exists
            if await self._session_exists(session_id):
                active_processes.append(
                    {
                        "session_id": session_id,
                        "command": process_info["command"],
                        "running_time": time.perf_counter()
                        - process_info["start_time"],
                        "working_directory": process_info["working_directory"],
                    }
                )
            else:
                # Session no longer exists, clean up
                del self.tmux_executor.active_sessions[session_id]
                self.tmux_executor.unregister_session(session_id)

        return {
            "status": "success",
            "active_processes": active_processes,
            "total_active": len(active_processes),
        }

    @abstractmethod
    async def mkdir(
        self, path: Union[str, Path], parents: bool = False, exist_ok: bool = False
    ) -> Dict[str, Any]:
        pass

    def get_hosted_url(self, port) -> str:
        return f"http://localhost:{port}"

    @abstractmethod
    def path_exists(self, path: Union[str, Path]) -> bool:
        pass

    @abstractmethod
    def get_available_ports(self) -> List[int]:
        pass

    @abstractmethod
    def is_port_available(self, port: int) -> bool:
        pass
