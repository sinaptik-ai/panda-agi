"""
Shell Operations Tools

This module provides shell operation tools that work with BaseEnv environments.
The complexity of managing different environment types is now handled by the
environment classes themselves.
"""

import asyncio
import time
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel

from panda_agi.envs import BaseEnv
from panda_agi.tools import ToolResult

# Dictionary to store shell sessions
_shell_sessions: Dict[str, Dict[str, Any]] = {}


def _limit_output(output: str, limit: int = 10) -> str:
    """
    Limit the output to the first and last 10 rows.
    """
    return "\n".join(
        output.split("\n")[:limit] + [" ... "] + output.split("\n")[-limit:]
    )


class ShellOutput(BaseModel):
    status: Literal["success", "error"]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    def to_tool_result(self) -> ToolResult:
        return ToolResult(
            success=self.status == "success",
            data=self.result,
            error=self.error,
        )


async def shell_exec_command(
    environment: BaseEnv, id: str, exec_dir: str, command: str, blocking: bool = True
) -> ShellOutput:
    """
    Execute a command in a shell session.

    Args:
        environment: BaseEnv instance to use for operations
        id: Unique identifier of the target shell session
        exec_dir: Working directory for command execution
        command: Shell command to execute
        blocking: Whether to wait for command completion

    Returns:
        Dict containing the execution status
    """
    # Store original working directory
    original_dir = environment.current_directory
    directory_changed = False

    try:
        # Change to exec_dir if specified
        if exec_dir:
            await environment.change_directory(exec_dir)
            directory_changed = True

        # Execute the command using the environment's exec_shell method
        result = await environment.exec_shell(
            session_id=id,
            command=command,
            capture_output=True,
            blocking=blocking,
        )

        print("Execution result: ", result)

        if result.get("stdout"):
            result["stdout"] = _limit_output(result["stdout"])

        if result.get("stderr"):
            result["stderr"] = _limit_output(result["stderr"])

        return ShellOutput(
            status="success",
            result=result,
        )

    except Exception as e:
        return ShellOutput(
            status="error", result={"shell_session_id": id}, error=str(e)
        )
    finally:
        # Restore original working directory, but only for blocking commands
        # or if the command failed. For non-blocking commands that succeeded,
        # avoid directory restoration to prevent hanging on busy E2B sandboxes
        if directory_changed and blocking:
            try:
                await environment.change_directory(original_dir)
            except Exception as e:
                # Log the error but don't fail the entire operation
                # This prevents hanging on directory restoration issues
                print(
                    f"Warning: Failed to restore original directory {original_dir}: {e}"
                )


async def shell_view_output(
    environment: BaseEnv,
    id: str,
    kill_process: bool = False,
    wait_seconds: Optional[float] = None,
) -> ShellOutput:
    """
    View the output of a shell session.

    Args:
        environment: BaseEnv instance (for consistency)
        id: Unique identifier of the target shell session
        kill_process: Whether to kill the process
        wait_seconds: Number of seconds to wait before viewing output

    Returns:
        Dict containing the shell session output
    """
    if id not in _shell_sessions:
        return ShellOutput(
            status="error", result=None, error=f"Shell session {id} not found"
        )

    session = _shell_sessions[id]

    # Wait if specified
    if wait_seconds:
        await asyncio.sleep(wait_seconds)

    # Get the last session_id from non-blocking execution
    last_session_id = session.get("last_session_id")
    if not last_session_id:
        return ShellOutput(
            status="error",
            result={
                "message": f"No active non-blocking process in shell session {id}",
                "shell_session_id": id,
            },
            error=f"No active non-blocking process in shell session {id}",
        )

    try:
        # Get process output using environment-specific method
        if hasattr(environment, "get_process_output"):
            result = await environment.get_process_output(last_session_id)
        else:
            return ShellOutput(
                status="error",
                error="Environment does not support process output viewing",
            )

        # Handle kill_process request
        if kill_process and hasattr(environment, "terminate_process"):
            terminate_result = environment.terminate_process(last_session_id)
            if terminate_result.get("status") == "success":
                result["process_terminated"] = True
                session["last_session_id"] = None
            else:
                result["terminate_warning"] = terminate_result.get(
                    "message", "Failed to terminate process"
                )

        result["shell_session_id"] = id
        return ShellOutput(
            status="success",
            result=result,
        )

    except Exception as e:
        return ShellOutput(
            status="error",
            result={
                "shell_session_id": id,
            },
            error=str(e),
        )


async def shell_write_to_process(
    environment: BaseEnv, id: str, input: str, press_enter: bool = True
) -> ShellOutput:
    """
    Write input to a running process.

    Args:
        environment: BaseEnv instance (for consistency)
        id: Unique identifier of the target shell session
        input: Input string to write
        press_enter: Whether to press Enter after writing

    Returns:
        Dict containing the operation status
    """
    if id not in _shell_sessions:
        return ShellOutput(
            status="error",
            error=f"Shell session {id} not found",
        )

    session = _shell_sessions[id]

    # Get the last session_id from non-blocking execution
    last_session_id = session.get("last_session_id")
    if not last_session_id:
        return ShellOutput(
            status="error",
            result={"shell_session_id": id},
            error=f"No active non-blocking process in shell session {id}",
        )

    try:
        # Write to process using environment-specific method
        if hasattr(environment, "write_to_process"):
            result = environment.write_to_process(last_session_id, input, press_enter)
        else:
            return ShellOutput(
                status="error",
                result={"shell_session_id": id},
                error="Environment does not support writing to processes",
            )

        result["shell_session_id"] = id
        return ShellOutput(status="success", result=result)

    except Exception as e:
        return ShellOutput(
            status="error", result={"shell_session_id": id}, error=str(e)
        )


async def shell_exec_background(
    environment: BaseEnv, command: str, id: str
) -> ShellOutput:
    """
    Execute a command in the background (non-blocking).

    Args:
        environment: BaseEnv instance to use for operations
        command: Shell command to execute
        id: Unique identifier for the background process

    Returns:
        Dict containing the execution status
    """
    return await shell_exec_command(
        environment=environment,
        id=id,
        exec_dir="",  # Use current directory
        command=command,
        blocking=False,
    )


async def shell_get_session_output(id: str) -> ShellOutput:
    """
    Get the output from a shell session.

    Args:
        id: Shell session identifier

    Returns:
        Dict containing the session output
    """
    if id not in _shell_sessions:
        return ShellOutput(
            status="error",
            error=f"Shell session {id} not found",
        )

    session = _shell_sessions[id]
    environment = session["environment"]

    return ShellOutput(
        status="success",
        result={
            "shell_session_id": id,
            "working_directory": str(environment.current_directory),
            "last_command": session.get("last_command"),
            "created_at": session.get("created_at"),
            "last_updated": session.get("last_updated"),
            "has_active_process": session.get("last_session_id") is not None,
        },
    )


async def shell_clear_session_output(id: str) -> ShellOutput:
    """
    Clear the output from a shell session.

    Args:
        id: Shell session identifier

    Returns:
        Dict containing the operation status
    """
    if id not in _shell_sessions:
        return ShellOutput(
            status="error",
            error=f"Shell session {id} not found",
        )

    session = _shell_sessions[id]

    # Clear the last session ID (this effectively "clears" the tracked process)
    session["last_session_id"] = None
    session["last_updated"] = time.time()

    return ShellOutput(
        status="success",
        result={
            "shell_session_id": id,
            "message": "Session output cleared",
        },
    )


async def shell_terminate_session(id: str) -> ShellOutput:
    """
    Terminate a shell session and clean up resources.

    Args:
        id: Shell session identifier

    Returns:
        Dict containing the operation status
    """
    if id not in _shell_sessions:
        return ShellOutput(
            status="error",
            error=f"Shell session {id} not found",
        )

    session = _shell_sessions[id]
    environment = session["environment"]

    # Terminate any active process
    last_session_id = session.get("last_session_id")
    if last_session_id and hasattr(environment, "terminate_process"):
        try:
            environment.terminate_process(last_session_id)
        except Exception:
            # Log but don't fail the session termination
            pass

    # Remove the session
    del _shell_sessions[id]

    return ShellOutput(
        status="success",
        result={
            "shell_session_id": id,
            "message": "Shell session terminated",
        },
    )


async def shell_list_sessions() -> ShellOutput:
    """
    List all active shell sessions.

    Returns:
        Dict containing information about active sessions
    """
    sessions_info = []

    for session_id, session in _shell_sessions.items():
        environment = session["environment"]

        sessions_info.append(
            {
                "id": session_id,
                "working_directory": str(environment.current_directory),
                "environment_type": type(environment).__name__,
                "created_at": session.get("created_at"),
                "last_updated": session.get("last_updated"),
                "last_command": session.get("last_command"),
                "has_active_process": session.get("last_session_id") is not None,
            }
        )

    return ShellOutput(
        status="success",
        result={
            "sessions": sessions_info,
            "total_sessions": len(sessions_info),
        },
    )


async def shell_change_directory(
    environment: BaseEnv, path: str, id: Optional[str] = None
) -> ShellOutput:
    """
    Change the working directory for shell operations.

    Args:
        environment: BaseEnv instance to use for operations
        path: New working directory path
        id: Optional session identifier to update

    Returns:
        Dict containing the operation status
    """
    try:
        # Change directory in the environment
        new_path = await environment.change_directory(path)

        # Update session if specified
        if id and id in _shell_sessions:
            _shell_sessions[id]["last_updated"] = time.time()

        return ShellOutput(
            status="success",
            result={
                "working_directory": str(new_path),
                "shell_session_id": id if id else None,
            },
        )
    except Exception as e:
        return ShellOutput(
            status="error",
            result={
                "path": path,
                "shell_session_id": id if id else None,
            },
            error=str(e),
        )
