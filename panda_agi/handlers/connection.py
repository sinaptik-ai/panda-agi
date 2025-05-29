import asyncio
import sys
from typing import Any, Dict, List, Optional

from ..client.models import EventType
from ..envs import BaseEnv
from .base import HandlerResult, ToolHandler
from .registry import HandlerRegistry


@HandlerRegistry.register("connection_success")
class ConnectionSuccessHandler(ToolHandler):
    """Handler for connection success messages"""

    def __init__(self, environment: Optional[BaseEnv] = None):
        super().__init__(environment)
        self.initialization_complete: asyncio.Event = asyncio.Event()

    async def _check_command_version(
        self, command: List[str], name: str
    ) -> Dict[str, Any]:
        """Check if a command is available and get its version"""
        try:
            process = await asyncio.create_subprocess_exec(
                *command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=5.0
                )

                if process.returncode == 0:
                    return {"installed": True, "version": stdout.decode().strip()}
                else:
                    return {
                        "installed": False,
                        "error": f"Command failed with return code {process.returncode}",
                    }

            except asyncio.TimeoutError:
                try:
                    process.kill()
                    await process.wait()
                except:
                    pass
                return {"installed": False, "error": "Command timed out"}

        except FileNotFoundError:
            return {"installed": False, "error": f"{name} command not found"}
        except Exception as e:
            return {"installed": False, "error": str(e)}

    def _get_python_info(self) -> Dict[str, Any]:
        """Get Python information synchronously"""
        try:
            return {
                "installed": True,
                "version": sys.version,
                "executable": sys.executable,
            }
        except Exception as e:
            return {"installed": False, "error": str(e)}

    async def _get_system_info(self) -> Dict[str, Any]:
        """Get system information including installed software"""
        # Define tools to check with their commands
        tools_to_check = [
            (["node", "--version"], "node"),
            (["npm", "--version"], "npm"),
            (["git", "--version"], "git"),
            (["docker", "--version"], "docker"),
            (["pip", "--version"], "pip"),
        ]

        # Run all checks concurrently
        tasks = [
            self._check_command_version(command, name)
            for command, name in tools_to_check
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Build system info dictionary
        system_info = {}

        # Add Python info (synchronous, always available)
        system_info["python"] = self._get_python_info()

        # Add results from concurrent checks
        for i, (command, name) in enumerate(tools_to_check):
            result = results[i]
            if isinstance(result, Exception):
                system_info[name] = {"installed": False, "error": str(result)}
            else:
                system_info[name] = result

        return system_info

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        self.logger.info(f"Received connection success message: {tool_call}")

        # Get system information
        system_info = await self._get_system_info()
        self.logger.info(f"System info collected: {system_info}")

        # Check if we should return the file system
        if tool_call.get("request_file_system", False):
            try:
                # Get the current file system structure
                if self.agent:
                    file_system = await self.agent.current_file_system
                    self.logger.info("SENDING FILE SYSTEM STRUCTURE")

                    # Set the event to indicate initialization is complete
                    self.initialization_complete.set()

                    await self.add_event(
                        EventType.AGENT_CONNECTION_SUCCESS,
                        {
                            "file_system": file_system,
                            "system_info": system_info,
                        },
                    )

                    return HandlerResult(
                        success=True,
                        data={
                            "message": "Connection established successfully",
                            "file_system": file_system,
                            "system_info": system_info,
                        },
                    )
            except Exception as e:
                self.logger.error(f"Error handling connection success: {e}")
                return HandlerResult(
                    success=False, error=f"Error retrieving file system: {str(e)}"
                )

        # Set the event to indicate initialization is complete
        self.initialization_complete.set()

        return HandlerResult(
            success=True,
            data={
                "message": "Connection established successfully",
                "system_info": system_info,
            },
        )
