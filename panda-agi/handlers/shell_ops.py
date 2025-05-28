import logging
from typing import Any, Dict, Optional

from envs import BaseEnv
from tools.file_system.shell_ops import (
    shell_exec_command,
    shell_view_output,
    shell_write_to_process,
)

from client.models import MessageType, WebSocketMessage

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class ShellOpsHandler(ToolHandler):
    """Handler for shell operations with environment support"""

    def __init__(self, shell_ops_type: str, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.shell_ops_type = shell_ops_type

    async def handle(self, msg_id: str, tool_call: Dict[str, Any]) -> None:
        logger.info(f"Received shell operation message: {tool_call}")
        logger.info(f"Type: {type(tool_call)}")
        if not self.environment:
            logger.error("No environment set for shell operations")
            return

        # Execute shell operations with environment
        try:
            if self.shell_ops_type == "shell_exec_command":
                # Handle blocking parameter - convert string to boolean if needed
                blocking = tool_call.get("blocking", True)
                if isinstance(blocking, str):
                    blocking = blocking.lower() == "true"

                result = await shell_exec_command(
                    environment=self.environment,
                    id=tool_call["id"],
                    exec_dir=tool_call["exec_dir"],
                    command=tool_call["command"],
                    blocking=blocking,
                )

            elif self.shell_ops_type == "shell_view_output":
                # Handle optional parameters
                kill_process = tool_call.get("kill_process", False)
                if isinstance(kill_process, str):
                    kill_process = kill_process.lower() == "true"

                wait_seconds = tool_call.get("wait_seconds")
                if wait_seconds is not None and isinstance(wait_seconds, str):
                    wait_seconds = float(wait_seconds)

                result = await shell_view_output(
                    environment=self.environment,
                    id=tool_call["id"],
                    kill_process=kill_process,
                    wait_seconds=wait_seconds,
                )

            elif self.shell_ops_type == "shell_write_to_process":
                # Handle press_enter parameter
                press_enter = tool_call.get("press_enter", True)
                if isinstance(press_enter, str):
                    press_enter = press_enter.lower() == "true"

                result = await shell_write_to_process(
                    environment=self.environment,
                    id=tool_call["id"],
                    input=tool_call["input"],
                    press_enter=press_enter,
                )

            else:
                result = {
                    "status": "error",
                    "message": f"Unknown shell operation: {self.shell_ops_type}",
                }

        except Exception as e:
            logger.error(f"Error in shell operation: {e}", exc_info=True)
            result = {"status": "error", "message": str(e)}

        if self.agent and self.agent.is_connected:
            response_message = WebSocketMessage(
                id=msg_id,
                type=MessageType.TOOL_RESULT.value,
                payload=result,
            )

            try:
                await self.agent.send_message(response_message)
                logger.info(f"Sent response for shell op: {result}")
            except Exception as e:
                logger.error(f"Failed to send shell op response: {e}")
