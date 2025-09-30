"""
Tmux-based command structuring and session management.
"""

import logging
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, TypedDict, Union

from pydantic import BaseModel

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# TypedDict for command history structure
class CommandHistoryItem(TypedDict):
    """Structure for command history items."""

    command_id: str
    original_command: str
    structured_command: str
    tmux_command: str
    executed_at: datetime
    prefix_marker: str
    suffix_marker: str


class SessionData(TypedDict):
    """Structure for session data stored in active_sessions."""

    created_at: datetime
    working_directory: Optional[str]
    command_history: List[CommandHistoryItem]


# Pydantic models for TmuxExecutor return types
class BaseResponse(BaseModel):
    """Base response model with status."""

    status: str
    message: Optional[str] = None


class SessionRegistration(BaseResponse):
    """Response for session registration."""

    session_id: str
    working_directory: Optional[str] = None


class Command(BaseResponse):
    """Response for command structuring."""

    session_id: Optional[str] = None
    command_id: Optional[str] = None
    tmux_command: Optional[str] = None
    structured_command: Optional[str] = None
    prefix_marker: Optional[str] = None
    suffix_marker: Optional[str] = None


class CommandParseResult(BaseResponse):
    """Response for command output parsing."""

    session_id: Optional[str] = None
    command_id: Optional[str] = None
    command_status: Optional[str] = None
    output: Optional[str] = None
    completed: Optional[bool] = None
    original_command: Optional[str] = None
    exit_code: Optional[str] = None


class CommandCompletion(BaseResponse):
    """Response for command completion check."""

    session_id: Optional[str] = None
    command_id: Optional[str] = None
    completed: Optional[bool] = None
    command_status: Optional[str] = None


class SessionUnregistration(BaseResponse):
    """Response for session unregistration."""

    session_id: str


class SessionInfo(BaseModel):
    """Information about a session."""

    created_at: str
    working_directory: Optional[str] = None
    command_count: int


class SessionList(BaseResponse):
    """Response for listing sessions."""

    sessions: Dict[str, SessionInfo]


class CommandHistoryItem(BaseModel):
    """Command history item."""

    command_id: str
    original_command: str
    executed_at: str


class SessionInfoResponse(BaseResponse):
    """Response for session information."""

    session_id: Optional[str] = None
    created_at: Optional[str] = None
    working_directory: Optional[str] = None
    command_history: Optional[List[CommandHistoryItem]] = None


class CommandInfoResponse(BaseResponse):
    """Response for command information."""

    session_id: Optional[str] = None
    command_id: Optional[str] = None
    original_command: Optional[str] = None
    structured_command: Optional[str] = None
    tmux_command: Optional[str] = None
    executed_at: Optional[str] = None
    prefix_marker: Optional[str] = None
    suffix_marker: Optional[str] = None


class TmuxExecutor:
    """
    Structures commands for tmux execution and manages session state.
    Does not execute commands directly - that's handled by the environment.
    """

    def __init__(self, session_prefix: str = "panda_agi"):
        """
        Initialize the TmuxExecutor.

        Args:
            session_prefix: Prefix for tmux session names
        """
        self.session_prefix = session_prefix
        self.active_sessions: Dict[str, SessionData] = {}

    def generate_session_id(self) -> str:
        """Generate a unique session ID."""
        return f"{self.session_prefix}_{uuid.uuid4().hex[:8]}"

    def create_session_command(
        self, session_id: str, working_directory: Optional[Union[str, Path]] = None
    ) -> str:
        """
        Generate the tmux command to create a new session.

        Args:
            session_id: The session ID to create
            working_directory: Directory to start the session in

        Returns:
            The tmux command string
        """
        cmd_parts = ["tmux", "new-session", "-d", "-s", session_id]

        if working_directory:
            cmd_parts.extend(["-c", str(working_directory)])

        # Explicitly start a shell so commands can execute
        cmd_parts.append("bash")

        return " ".join(cmd_parts)

    def register_session(
        self, session_id: str, working_directory: Optional[Union[str, Path]] = None
    ) -> SessionRegistration:
        """
        Register a session as active.

        Args:
            session_id: The session ID
            working_directory: Working directory of the session

        Returns:
            Session registration result
        """
        self.active_sessions[session_id] = {
            "created_at": datetime.now(),
            "working_directory": str(working_directory) if working_directory else None,
            "command_history": [],
        }

        return SessionRegistration(
            status="success",
            session_id=session_id,
            working_directory=str(working_directory) if working_directory else None,
        )

    def generate_check_session_exists_command(self, session_id: str) -> str:
        """
        Generate tmux command to check if a session exists.

        Args:
            session_id: The tmux session ID

        Returns:
            The tmux check-session command (returns 'no_session' if session does not exist)
        """
        return f"tmux has-session -t {session_id} 2>/dev/null || echo 'no_session'"

    def generate_command_id(self) -> str:
        """Generate a unique command ID."""
        return uuid.uuid4().hex[:8]

    def generate_command(
        self, session_id: str, command: str, command_id: Optional[str] = None
    ) -> Command:
        """
        Structure a command with prefix/suffix markers for tmux execution.

        Args:
            session_id: The tmux session ID
            command: The original command
            command_id: Optional command ID, generates one if not provided

        Returns:
            Dict containing structured command information
        """
        if session_id not in self.active_sessions:
            return Command(
                status="error",
                message=f"Session {session_id} not registered",
            )

        if command_id is None:
            command_id = self.generate_command_id()

        # Generate markers
        prefix_marker = f"__{self.session_prefix}_CMD_START_{command_id}__"
        suffix_marker = f"__{self.session_prefix}_CMD_END_{command_id}__"

        # Structure the command
        prefix_cmd = f"echo '{prefix_marker}'"
        suffix_cmd = f"echo '{suffix_marker}'"

        # Build the full command
        structured_command = f'{prefix_cmd} ; {command} ; exit_code=$? ; {suffix_cmd} ; echo "FINAL_EXIT_CODE:$exit_code"'

        # Build tmux send-keys command
        tmux_command = f"tmux send-keys -t {session_id} '{structured_command}' C-m"

        # Store command info
        command_info = {
            "command_id": command_id,
            "original_command": command,
            "structured_command": structured_command,
            "tmux_command": tmux_command,
            "executed_at": datetime.now(),
            "prefix_marker": prefix_marker,
            "suffix_marker": suffix_marker,
        }

        self.active_sessions[session_id]["command_history"].append(command_info)

        return Command(
            status="success",
            session_id=session_id,
            command_id=command_id,
            tmux_command=tmux_command,
            structured_command=structured_command,
            prefix_marker=prefix_marker,
            suffix_marker=suffix_marker,
        )

    def generate_tmux_install_command(self, sudo: bool = True) -> str:
        """
        Generate tmux command to install tmux.

        Args:
            sudo: Whether to use sudo

        Returns:
            The tmux install command
        """
        cmd_update = "apt-get update"
        cmd_install = "apt-get install -y tmux"
        if sudo:
            cmd_update = "sudo " + cmd_update
            cmd_install = "sudo " + cmd_install
        return cmd_update + " && " + cmd_install

    def generate_tmux_config(self) -> str:
        """
        Generate tmux config.

        Returns:
            The tmux config
        """
        return """# Disable status bar for cleaner output
set -g status off
# Set default shell
set-option -g default-shell /bin/bash
# Increase history limit
set-option -g history-limit 10000
# Don't exit when last pane is closed
set-option -g detach-on-destroy off
"""

    def generate_capture_command(self, session_id: str) -> str:
        """
        Generate tmux command to capture session output.

        Args:
            session_id: The tmux session ID

        Returns:
            The tmux capture command
        """
        return f"tmux capture-pane -t {session_id} -p -S -"

    def generate_send_input_command(
        self, session_id: str, input_text: str, press_enter: bool = True
    ) -> str:
        """
        Generate tmux command to send input to a session.

        Args:
            session_id: The tmux session ID
            input_text: Text to send
            press_enter: Whether to press Enter after the input

        Returns:
            The tmux send-keys command
        """
        # escape single quotes
        input_text = input_text.replace("'", "'\"'\"'")
        cmd_parts = ["tmux", "send-keys", "-t", session_id, f"'{input_text}'"]
        if press_enter:
            cmd_parts.append("Enter")

        return " ".join(cmd_parts)

    def generate_get_exit_code_command(self, session_id: str) -> str:
        """
        Generate tmux command to get the exit code of a session.

        Args:
            session_id: The tmux session ID

        Returns:
            The tmux get-exit-code command
        """
        return f"tmux display-message -t {session_id} -p '#{{pane_exit_code}}'"

    def generate_kill_session_command(self, session_id: str) -> str:
        """
        Generate tmux command to kill a session.

        Args:
            session_id: The tmux session ID or "all" to kill all sessions

        Returns:
            The tmux kill-session command
        """
        if session_id == "all":
            return "tmux kill-server 2>/dev/null || true"
        return f"tmux kill-session -t {session_id} 2>/dev/null || true"

    def parse_command_output(
        self, session_id: str, command_id: str, raw_output: str
    ) -> CommandParseResult:
        """
        Parse command output using markers to extract command-specific results.

        Args:
            session_id: The tmux session ID
            command_id: The command ID
            raw_output: Raw tmux capture output

        Returns:
            Parsed command output
        """
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not registered")

        # Find the command in history
        command_info = None
        for cmd in self.active_sessions[session_id]["command_history"]:
            if cmd["command_id"] == command_id:
                command_info = cmd
                break

        if not command_info:
            raise ValueError(f"Command {command_id} not found in session history")

        prefix_marker = command_info["prefix_marker"]
        suffix_marker = command_info["suffix_marker"]

        # Count occurrences of prefix markers
        prefix_count = raw_output.count(prefix_marker)
        if prefix_count >= 2:
            # remove extra prefix markers
            raw_output = prefix_marker + "\n" + raw_output.split(prefix_marker)[-1]

        # split output into lines
        lines = raw_output.split("\n")

        # Find start and end marker lines
        start_line_idx = -1
        end_line_idx = -1

        for i, line in enumerate(lines):
            if prefix_marker in line:
                start_line_idx = i
            elif suffix_marker in line:
                end_line_idx = i
                break

        if start_line_idx == -1:
            raise ValueError("Command start marker not found")

        if end_line_idx == -1:
            # Command started but not finished - extract from start marker to end
            output_lines = lines[start_line_idx + 1 :]
            # Remove any shell prompts and empty lines from the end
            while output_lines and (
                not output_lines[-1].strip() or output_lines[-1].strip().endswith("$")
            ):
                output_lines.pop()
            command_output = "\n".join(output_lines)
            completed = False
            command_status = "running"
            exit_code = None

        else:
            # Command completed - extract between markers
            output_lines = lines[start_line_idx + 1 : end_line_idx]
            # Clean up any shell prompts or empty lines
            cleaned_lines = []
            for line in output_lines:
                # Skip shell prompts and empty lines
                stripped = line.strip()
                if (
                    stripped
                    and not stripped.endswith("$")
                    and not stripped.startswith("user@")
                ):
                    cleaned_lines.append(line)
            command_output = "\n".join(cleaned_lines)
            completed = True
            command_status = "completed"
            # Extract exit code safely with bounds checking
            if end_line_idx + 1 < len(lines):
                exit_code_line = lines[end_line_idx + 1]
                if "FINAL_EXIT_CODE:" in exit_code_line:
                    match = re.search(r'FINAL_EXIT_CODE:([^"]*)', exit_code_line)
                    exit_code = match.group(1) if match else None
                else:
                    exit_code = None
            else:
                exit_code = None

        return CommandParseResult(
            status="success",
            session_id=session_id,
            command_id=command_id,
            command_status=command_status,
            output=command_output,
            completed=completed,
            original_command=command_info["original_command"],
            exit_code=exit_code,
        )

    def unregister_session(self, session_id: str) -> SessionUnregistration:
        """
        Unregister a session.

        Args:
            session_id: The session ID to unregister

        Returns:
            Unregistration result
        """
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]

        return SessionUnregistration(
            status="success",
            session_id=session_id,
            message="Session unregistered",
        )

    def list_sessions(self) -> SessionList:
        """
        List all registered sessions.

        Returns:
            Dict containing session list
        """
        return SessionList(
            status="success",
            sessions={
                sid: SessionInfo(
                    created_at=info["created_at"].isoformat(),
                    working_directory=info["working_directory"],
                    command_count=len(info["command_history"]),
                )
                for sid, info in self.active_sessions.items()
            },
        )

    def get_session_info(self, session_id: str) -> SessionInfoResponse:
        """
        Get information about a specific session.

        Args:
            session_id: The tmux session ID

        Returns:
            Dict containing session information
        """
        if session_id not in self.active_sessions:
            return SessionInfoResponse(
                status="error",
                message=f"Session {session_id} not registered",
            )

        info = self.active_sessions[session_id]
        return SessionInfoResponse(
            status="success",
            session_id=session_id,
            created_at=info["created_at"].isoformat(),
            working_directory=info["working_directory"],
            command_history=[
                CommandHistoryItem(
                    command_id=cmd["command_id"],
                    original_command=cmd["original_command"],
                    executed_at=cmd["executed_at"].isoformat(),
                )
                for cmd in info["command_history"]
            ],
        )

    def get_command_info(self, session_id: str, command_id: str) -> CommandInfoResponse:
        """
        Get information about a specific command.

        Args:
            session_id: The tmux session ID
            command_id: The command ID

        Returns:
            Dict containing command information
        """
        if session_id not in self.active_sessions:
            return {
                "status": "error",
                "message": f"Session {session_id} not registered",
            }

        # Find the command in history
        for cmd in self.active_sessions[session_id]["command_history"]:
            if cmd["command_id"] == command_id:
                return CommandInfoResponse(
                    status="success",
                    session_id=session_id,
                    command_id=command_id,
                    original_command=cmd["original_command"],
                    structured_command=cmd["structured_command"],
                    tmux_command=cmd["tmux_command"],
                    executed_at=cmd["executed_at"].isoformat(),
                    prefix_marker=cmd["prefix_marker"],
                    suffix_marker=cmd["suffix_marker"],
                )

        return CommandInfoResponse(
            status="error",
            message=f"Command {command_id} not found in session {session_id}",
        )
