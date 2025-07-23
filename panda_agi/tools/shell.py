import uuid
from typing import Any, Dict, Optional

from panda_agi.envs.local_env import LocalEnv

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .file_system_ops.shell_ops import (
    shell_exec_command,
    shell_view_output,
    shell_write_to_process,
)
from .registry import ToolRegistry
import logging

logger = logging.getLogger("ShellTools")


@ToolRegistry.register(
    "shell_exec_command",
    xml_tag="shell_exec_command",
    required_params=["command"],
    optional_params=["id", "exec_dir", "blocking"],
    content_param=None,  # Don't use content as command when attributes are present
    attribute_mappings={
        "command": "command",
        "id": "id",
        "exec_dir": "exec_dir",
        "blocking": "blocking",
    },
)
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


@ToolRegistry.register(
    "shell_view_output",
    xml_tag="shell_view_output",
    required_params=["id"],
    optional_params=["kill_process", "wait_seconds"],
    attribute_mappings={
        "id": "id",
        "kill_process": "kill_process",
        "wait_seconds": "wait_seconds",
    },
)
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


@ToolRegistry.register(
    "shell_write_to_process",
    xml_tag="shell_write_to_process",
    required_params=["id", "input"],
    optional_params=["press_enter"],
    content_param="input",
    attribute_mappings={
        "id": "id",
        "press_enter": "press_enter",
    },
)
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


@ToolRegistry.register(
    "execute_script",
    xml_tag="execute_script",
    required_params=["language", "code"],
    content_param="code",
    attribute_mappings={
        "language": "language",
    },
)
class ExecuteScriptHandler(ToolHandler):
    """Handler for executing code directly without writing to a file"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["language", "code"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"

        # Validate supported languages
        supported_languages = ["python", "bash", "javascript", "powershell"]
        language = params.get("language")
        if language not in supported_languages:
            return f"Unsupported language: {language}. Supported languages: {', '.join(supported_languages)}"

        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # Language command mapping
        language_commands = {
            "python": "python3 -c",
            "bash": "bash -c",
            "javascript": "node -e",
            "powershell": "powershell -Command",
        }

        language = params["language"]
        code = params["code"]

        # Construct the command
        base_command = language_commands[language]
        # Escape quotes in the code for shell execution
        escaped_code = code.replace('"', '\\"')
        command = f'{base_command} "{escaped_code}"'

        # Get execution directory, default to current directory
        exec_dir = params.get("exec_dir", ".")
        execution_id = f"script_{uuid.uuid4().hex[:8]}"

        logger.info(f"Executing script: {execution_id}")
        result = await shell_exec_command(
            environment=self.environment,
            id=execution_id,
            exec_dir=exec_dir,
            command=command,
            blocking=True,
        )

        tool_result = ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("stderr"),
        )

        return tool_result


@ToolRegistry.register(
    "deploy_server",
    xml_tag="deploy_server",
    required_params=["port", "app_type", "source_path"],
    optional_params=["start_command", "build_command", "env_vars"],
    attribute_mappings={
        "port": "port",
        "app_type": "app_type",
        "source_path": "source_path",
        "start_command": "start_command",
        "build_command": "build_command",
        "env_vars": "env_vars",
    },
)
class DeployServerHandler(ToolHandler):
    """Handler for deploying website or server applications"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["port", "app_type", "source_path"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"

        # Validate app types
        supported_app_types = ["static", "nodejs"]
        app_type = params.get("app_type")
        if app_type not in supported_app_types:
            return f"Unsupported app type: {app_type}. Supported types: {', '.join(supported_app_types)}"

        # Validate port
        try:
            port = int(params["port"])
            if port < 1 or port > 65535:
                return "Port must be between 1 and 65535"
        except ValueError:
            return "Port must be a valid integer"

        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        app_type = params["app_type"]
        source_path = params["source_path"]
        port = params["port"]

        # Generate a unique ID for this deployment
        import uuid

        deployment_id = f"deploy_{uuid.uuid4().hex[:8]}"

        try:
            if app_type == "static":
                await self._deploy_static_site(deployment_id, source_path, port)
            elif app_type == "nodejs":
                await self._deploy_nodejs_app(deployment_id, source_path, port, params)

            hosted_url = await self.environment.get_hosted_url(port)

            return ToolResult(
                success=True,
                data={
                    "status": "success",
                    "deployment_id": deployment_id,
                    "message": f"Server deployed successfully on port {port}",
                    "url": hosted_url,
                    "app_type": app_type,
                    "source_path": source_path,
                },
            )
        except Exception as e:
            return ToolResult(
                success=False,
                data={"status": "error", "deployment_id": deployment_id},
                error=str(e),
            )

    async def _deploy_static_site(
        self, deployment_id: str, source_path: str, port: str
    ):
        """Deploy a static website using Python's built-in HTTP server"""
        # Use Python's built-in HTTP server for static files
        # TODO: This is a temporary solution to deploy a static site to make it work on Windows and E2B.
        # TODO: We need to use a more robust solution for deploying a static site
        if isinstance(self.environment, LocalEnv):
            command = f"python3 -m http.server {port} --directory {source_path}"
        else:
            command = f"nohup python3 -m http.server {port} --directory {source_path} > /dev/null 2>&1 &"

        shell_params = {
            "id": deployment_id,
            "exec_dir": ".",
            "command": command,
            "blocking": False,  # Run in background
        }

        await self.add_event(EventType.SHELL_EXEC, shell_params)

        result = await shell_exec_command(
            environment=self.environment,
            id=deployment_id,
            exec_dir=".",
            command=command,
            blocking=False,
        )

        if result.get("status") != "success":
            raise Exception(
                f"Failed to start static server: {result.get('message', 'Unknown error')}"
            )

    async def _deploy_nodejs_app(
        self, deployment_id: str, source_path: str, port: str, params: Dict[str, Any]
    ):
        """Deploy a Node.js application"""
        # Check if package.json exists
        package_json_check = f"test -f {source_path}/package.json"
        check_result = await shell_exec_command(
            environment=self.environment,
            id=f"{deployment_id}_check",
            exec_dir=".",
            command=package_json_check,
            blocking=True,
        )

        if check_result.get("status") != "success":
            raise Exception(f"No package.json found in {source_path}")

        # Install dependencies if node_modules doesn't exist
        node_modules_check = f"test -d {source_path}/node_modules"
        modules_result = await shell_exec_command(
            environment=self.environment,
            id=f"{deployment_id}_modules_check",
            exec_dir=".",
            command=node_modules_check,
            blocking=True,
        )

        if modules_result.get("status") != "success":
            # Install dependencies
            install_command = f"cd {source_path} && npm install"
            await self.add_event(
                EventType.SHELL_EXEC,
                {
                    "id": f"{deployment_id}_install",
                    "exec_dir": source_path,
                    "command": f"{install_command}",
                },
            )

            install_result = await shell_exec_command(
                environment=self.environment,
                id=f"{deployment_id}_install",
                exec_dir=source_path,
                command=f"{install_command}",
                blocking=True,
            )

            if install_result.get("status") != "success":
                raise Exception(
                    f"Failed to install dependencies: {install_result.get('message', 'Unknown error')}"
                )

        # Run build command if specified
        build_command = params.get("build_command")
        if build_command:
            await self.add_event(
                EventType.SHELL_EXEC,
                {
                    "id": f"{deployment_id}_build",
                    "exec_dir": source_path,
                    "command": build_command,
                },
            )

            build_result = await shell_exec_command(
                environment=self.environment,
                id=f"{deployment_id}_build",
                exec_dir=source_path,
                command=build_command,
                blocking=True,
            )

            if build_result.get("status") != "success":
                raise Exception(
                    f"Build failed: {build_result.get('message', 'Unknown error')}"
                )

        # Determine start command
        start_command = params.get("start_command")
        if not start_command:
            # Try conventional defaults
            start_command = "npm start"

        # Set environment variables
        env_vars = params.get("env_vars", {})
        env_prefix = ""
        if env_vars:
            env_list = [f"{key}={value}" for key, value in env_vars.items()]
            env_prefix = " ".join(env_list) + " "

        # Add PORT environment variable
        env_prefix += f"PORT={port} "

        # Start the application
        full_command = f"{env_prefix}{start_command}"

        shell_params = {
            "id": deployment_id,
            "exec_dir": source_path,
            "command": full_command,
            "blocking": False,  # Run in background
        }

        await self.add_event(EventType.SHELL_EXEC, shell_params)

        result = await shell_exec_command(
            environment=self.environment,
            id=deployment_id,
            exec_dir=source_path,
            command=full_command,
            blocking=False,
        )

        if result.get("status") != "success":
            raise Exception(
                f"Failed to start Node.js application: {result.get('message', 'Unknown error')}"
            )
