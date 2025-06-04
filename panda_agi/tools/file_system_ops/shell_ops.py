"""
Shell Operations Tools

This module provides shell operation tools that work with BaseEnv environments.
The complexity of managing different environment types is now handled by the
environment classes themselves.
"""

import asyncio
import time
from typing import Any, Dict, Optional

from panda_agi.envs import BaseEnv

# Dictionary to store shell sessions
_shell_sessions: Dict[str, Dict[str, Any]] = {}


def _limit_output(output: str, limit: int = 10) -> str:
    """
    Limit the output to the first and last 10 rows.
    """
    return "\n".join(
        output.split("\n")[:limit] + [" ... "] + output.split("\n")[-limit:]
    )


async def shell_exec_command(
    environment: BaseEnv, id: str, exec_dir: str, command: str, blocking: bool = True
) -> Dict[str, Any]:
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

    try:
        # Change to exec_dir if specified
        if exec_dir:
            environment.change_directory(exec_dir)

        # Create or update session info
        if id not in _shell_sessions:
            _shell_sessions[id] = {
                "environment": environment,
                "created_at": time.time(),
                "last_command": None,
                "last_session_id": None,
            }

        session = _shell_sessions[id]

        # Execute the command using the environment's exec_shell method
        result = await environment.exec_shell(
            command=command, capture_output=True, blocking=blocking
        )

        if result.get("stdout"):
            result["stdout"] = _limit_output(result["stdout"])

        if result.get("stderr"):
            result["stderr"] = _limit_output(result["stderr"])

        # Update session info
        session["last_command"] = command
        session["last_updated"] = time.time()

        # Store session_id for non-blocking commands
        if not blocking and "session_id" in result:
            session["last_session_id"] = result["session_id"]

        # Add session info to result
        result["shell_session_id"] = id

        return result

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "command": command,
            "shell_session_id": id,
        }
    finally:
        # Restore original working directory
        if exec_dir:
            environment.change_directory(original_dir)


async def shell_view_output(
    environment: BaseEnv,
    id: str,
    kill_process: bool = False,
    wait_seconds: Optional[float] = None,
) -> Dict[str, Any]:
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
        return {"status": "error", "message": f"Shell session {id} not found"}

    session = _shell_sessions[id]

    # Wait if specified
    if wait_seconds:
        await asyncio.sleep(wait_seconds)

    # Get the last session_id from non-blocking execution
    last_session_id = session.get("last_session_id")
    if not last_session_id:
        return {
            "status": "error",
            "message": f"No active non-blocking process in shell session {id}",
            "shell_session_id": id,
        }

    try:
        # Get process output using environment-specific method
        if hasattr(environment, "get_process_output"):
            result = await environment.get_process_output(last_session_id)
        else:
            return {
                "status": "error",
                "message": "Environment does not support process output viewing",
                "shell_session_id": id,
            }

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
        return result

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "shell_session_id": id,
        }


async def shell_write_to_process(
    environment: BaseEnv, id: str, input: str, press_enter: bool = True
) -> Dict[str, Any]:
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
        return {"status": "error", "message": f"Shell session {id} not found"}

    session = _shell_sessions[id]

    # Get the last session_id from non-blocking execution
    last_session_id = session.get("last_session_id")
    if not last_session_id:
        return {
            "status": "error",
            "message": f"No active non-blocking process in shell session {id}",
            "shell_session_id": id,
        }

    try:
        # Write to process using environment-specific method
        if hasattr(environment, "write_to_process"):
            result = environment.write_to_process(last_session_id, input, press_enter)
        else:
            return {
                "status": "error",
                "message": "Environment does not support writing to processes",
                "shell_session_id": id,
            }

        result["shell_session_id"] = id
        return result

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "shell_session_id": id,
        }


async def shell_exec_background(
    environment: BaseEnv, command: str, id: str
) -> Dict[str, Any]:
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


async def shell_get_session_output(id: str) -> Dict[str, Any]:
    """
    Get the output from a shell session.

    Args:
        id: Shell session identifier

    Returns:
        Dict containing the session output
    """
    if id not in _shell_sessions:
        return {"status": "error", "message": f"Shell session {id} not found"}

    session = _shell_sessions[id]
    environment = session["environment"]

    return {
        "status": "success",
        "shell_session_id": id,
        "working_directory": str(environment.current_directory),
        "last_command": session.get("last_command"),
        "created_at": session.get("created_at"),
        "last_updated": session.get("last_updated"),
        "has_active_process": session.get("last_session_id") is not None,
    }


async def shell_clear_session_output(id: str) -> Dict[str, Any]:
    """
    Clear the output from a shell session.

    Args:
        id: Shell session identifier

    Returns:
        Dict containing the operation status
    """
    if id not in _shell_sessions:
        return {"status": "error", "message": f"Shell session {id} not found"}

    session = _shell_sessions[id]

    # Clear the last session ID (this effectively "clears" the tracked process)
    session["last_session_id"] = None
    session["last_updated"] = time.time()

    return {
        "status": "success",
        "shell_session_id": id,
        "message": "Session output cleared",
    }


async def shell_terminate_session(id: str) -> Dict[str, Any]:
    """
    Terminate a shell session and clean up resources.

    Args:
        id: Shell session identifier

    Returns:
        Dict containing the operation status
    """
    if id not in _shell_sessions:
        return {"status": "error", "message": f"Shell session {id} not found"}

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

    return {
        "status": "success",
        "shell_session_id": id,
        "message": "Shell session terminated",
    }


async def shell_list_sessions() -> Dict[str, Any]:
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

    return {
        "status": "success",
        "sessions": sessions_info,
        "total_sessions": len(sessions_info),
    }


async def shell_change_directory(
    environment: BaseEnv, path: str, id: Optional[str] = None
) -> Dict[str, Any]:
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
        new_path = environment.change_directory(path)

        # Update session if specified
        if id and id in _shell_sessions:
            _shell_sessions[id]["last_updated"] = time.time()

        return {
            "status": "success",
            "working_directory": str(new_path),
            "shell_session_id": id if id else None,
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "path": path,
            "shell_session_id": id if id else None,
        }
