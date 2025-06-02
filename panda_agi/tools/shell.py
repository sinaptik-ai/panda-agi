from typing import Any, Dict, Optional

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .file_system_ops.shell_ops import (
    shell_exec_command,
    shell_view_output,
    shell_write_to_process,
)
from .registry import ToolRegistry


@ToolRegistry.register("shell_exec_command")
class ShellExecCommandHandler(ToolHandler):
    """Handler for shell command execution"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["id", "exec_dir", "command"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # Handle blocking parameter - convert string to boolean if needed
        blocking = params.get("blocking", True)
        if isinstance(blocking, str):
            blocking = blocking.lower() == "true"

        await self.add_event(EventType.SHELL_EXEC, params)

        result = await shell_exec_command(
            environment=self.environment,
            id=params["id"],
            exec_dir=params["exec_dir"],
            command=params["command"],
            blocking=blocking,
        )

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("shell_view_output")
class ShellViewOutputHandler(ToolHandler):
    """Handler for viewing shell command output"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "id" not in params:
            return "Missing required parameter: id"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # Handle optional parameters
        kill_process = params.get("kill_process", False)
        if isinstance(kill_process, str):
            kill_process = kill_process.lower() == "true"

        wait_seconds = params.get("wait_seconds")
        if wait_seconds is not None and isinstance(wait_seconds, str):
            wait_seconds = float(wait_seconds)

        await self.add_event(EventType.SHELL_VIEW, params)

        result = await shell_view_output(
            environment=self.environment,
            id=params["id"],
            kill_process=kill_process,
            wait_seconds=wait_seconds,
        )

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("shell_write_to_process")
class ShellWriteToProcessHandler(ToolHandler):
    """Handler for writing to shell processes"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["id", "input"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # Handle press_enter parameter
        press_enter = params.get("press_enter", True)
        if isinstance(press_enter, str):
            press_enter = press_enter.lower() == "true"

        await self.add_event(EventType.SHELL_WRITE, params)

        result = await shell_write_to_process(
            environment=self.environment,
            id=params["id"],
            input=params["input"],
            press_enter=press_enter,
        )

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )
