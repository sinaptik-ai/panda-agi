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


@ToolRegistry.register("execute_script")
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

        # Generate a unique ID for this execution
        import uuid

        execution_id = f"script_{uuid.uuid4().hex[:8]}"

        # Create parameters for shell execution
        shell_params = {
            "id": execution_id,
            "exec_dir": exec_dir,
            "command": command,
            "blocking": True,  # Execute scripts synchronously by default
        }

        await self.add_event(EventType.SHELL_EXEC, shell_params)

        result = await shell_exec_command(
            environment=self.environment,
            id=execution_id,
            exec_dir=exec_dir,
            command=command,
            blocking=True,
        )

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("deploy_server")
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

            return ToolResult(
                success=True,
                data={
                    "status": "success",
                    "deployment_id": deployment_id,
                    "message": f"Server deployed successfully on port {port}",
                    "url": f"http://localhost:{port}",
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
        command = f"python3 -m http.server {port} --directory {source_path}"

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
                    "command": "npm install",
                },
            )

            install_result = await shell_exec_command(
                environment=self.environment,
                id=f"{deployment_id}_install",
                exec_dir=source_path,
                command="npm install",
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
