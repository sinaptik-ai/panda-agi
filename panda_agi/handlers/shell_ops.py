from typing import Any, Dict, Optional

from ..client.models import EventType
from ..tools.file_system.shell_ops import (
    shell_exec_command,
    shell_view_output,
    shell_write_to_process,
)
from .base import HandlerResult, ToolHandler
from .registry import HandlerRegistry


@HandlerRegistry.register("shell_exec_command")
class ShellExecCommandHandler(ToolHandler):
    """Handler for shell command execution"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        required_params = ["id", "exec_dir", "command"]
        missing = [param for param in required_params if param not in tool_call]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        # Handle blocking parameter - convert string to boolean if needed
        blocking = tool_call.get("blocking", True)
        if isinstance(blocking, str):
            blocking = blocking.lower() == "true"

        await self.add_event(EventType.SHELL_EXEC, tool_call)

        result = await shell_exec_command(
            environment=self.environment,
            id=tool_call["id"],
            exec_dir=tool_call["exec_dir"],
            command=tool_call["command"],
            blocking=blocking,
        )

        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@HandlerRegistry.register("shell_view_output")
class ShellViewOutputHandler(ToolHandler):
    """Handler for viewing shell command output"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        if "id" not in tool_call:
            return "Missing required parameter: id"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        # Handle optional parameters
        kill_process = tool_call.get("kill_process", False)
        if isinstance(kill_process, str):
            kill_process = kill_process.lower() == "true"

        wait_seconds = tool_call.get("wait_seconds")
        if wait_seconds is not None and isinstance(wait_seconds, str):
            wait_seconds = float(wait_seconds)

        await self.add_event(EventType.SHELL_VIEW, tool_call)

        result = await shell_view_output(
            environment=self.environment,
            id=tool_call["id"],
            kill_process=kill_process,
            wait_seconds=wait_seconds,
        )

        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@HandlerRegistry.register("shell_write_to_process")
class ShellWriteToProcessHandler(ToolHandler):
    """Handler for writing to shell processes"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        required_params = ["id", "input"]
        missing = [param for param in required_params if param not in tool_call]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        # Handle press_enter parameter
        press_enter = tool_call.get("press_enter", True)
        if isinstance(press_enter, str):
            press_enter = press_enter.lower() == "true"

        await self.add_event(EventType.SHELL_WRITE, tool_call)

        result = await shell_write_to_process(
            environment=self.environment,
            id=tool_call["id"],
            input=tool_call["input"],
            press_enter=press_enter,
        )

        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )
