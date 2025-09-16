import logging
import re
import shlex
import uuid
from typing import Any, Dict, Optional

from .base import ToolHandler, ToolResult
from .file_system_ops.shell_ops import (
    ShellOutput,
)
from .registry import ToolRegistry

logger = logging.getLogger("ShellTools")
logger.setLevel(logging.INFO)


@ToolRegistry.register(
    "shell_exec_command",
    xml_tag="shell_exec_command",
    required_params=["command"],
    optional_params=["id", "exec_dir", "blocking"],
    content_param=None,
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

        result: ShellOutput = await self.environment.exec_shell(
            command=params["command"],
            exec_dir=params["exec_dir"],
            session_id=params["id"],
            blocking=blocking,
        )

        return result.to_tool_result()


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

        result: ShellOutput = await self.environment.get_process_output(
            session_id=params["id"],
            wait_seconds=wait_seconds,
            kill_process=kill_process,
        )

        return result.to_tool_result()


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

        result: ShellOutput = await self.environment.write_to_process(
            session_id=params["id"],
            input_text=params["input"],
            press_enter=press_enter,
        )

        return result.to_tool_result()


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
        supported_languages = ["python"]
        language = params.get("language")
        if language not in supported_languages:
            return f"Unsupported language: {language}. Supported languages: {', '.join(supported_languages)}"

        # Validate libraries used in code
        allowed_libraries = [
            # analysis
            "pandas",
            "numpy",
            "sklearn",
            "scipy",
            "statsmodels",
            # utils and python standard libraries
            "datetime",
            "os",
            "sys",
            "json",
            "csv",
            "io",
            "time",
            "random",
            "math",
        ]

        # Search for import statements (import <lib_name> or from <lib_name> import <any>)
        import_statements = re.findall(
            r"(?:from (\w+)(?:\.\w+)* import|import (\w+))", params["code"]
        )

        import_statements = list(
            set([lib for group in import_statements for lib in group if lib])
        )

        # Custom errors for disallowed libraries
        graph_libraries = [
            "matplotlib",
            "seaborn",
            "plotly",
        ]

        if any(lib in import_statements for lib in graph_libraries):
            return f"Disallowed library used: {', '.join(graph_libraries)}. Use pxml language to create visualizations."

        # Check if any disallowed libraries are used
        for lib in import_statements:
            if lib not in allowed_libraries:
                return f"Disallowed library used: {lib}. Allowed libraries: {', '.join(allowed_libraries)}"

        return None

    def _should_use_temp_file(self, code: str) -> bool:
        """Determine if code should use temporary file approach for reliability"""
        return (
            "\n" in code.strip()  # Multi-line code
            or len(code) > 100  # Long code
            or code.count('"') + code.count("'") > 3  # Complex quoting
            or "${" in code  # Shell variable expansion
            or "`" in code  # Backticks
            or ("(" in code and ")" in code)
            and ")" in code  # Function calls that might confuse shell
        )

    async def _execute_with_temp_file(self, language: str, code: str) -> ToolResult:
        """Execute code using temporary file approach (most reliable)"""

        # File extensions for different languages
        extensions = {
            "python": ".py",
            "bash": ".sh",
            "javascript": ".js",
            "powershell": ".ps1",
        }

        # Commands for different languages
        commands = {
            "python": "python",
            "bash": "bash",
            "javascript": "node",
            "powershell": "powershell -File",
        }

        execution_id = f"{uuid.uuid4().hex[:8]}"
        temp_filename = f"temp_script_{execution_id}{extensions[language]}"

        try:
            # Write code to temporary file
            write_result = await self.environment.write_file(
                path=temp_filename, content=code, mode="w"
            )
            if write_result.get("status") != "success":
                return ToolResult(
                    success=False,
                    error=f"Failed to write temporary file: {write_result.get('message', 'Unknown error')}",
                )

            # Execute the file
            command = f"{commands[language]} {temp_filename}"
            logger.info(f"Executing script from file: {command}")

            result: ShellOutput = await self.environment.exec_shell(
                command=command,
                session_id=execution_id,
                blocking=True,
                exec_dir=self.environment.working_directory,
            )

            return result.to_tool_result()

        finally:
            # Clean up temporary file
            try:
                await self.environment.delete_file(temp_filename)
            except Exception as e:
                logger.warning(
                    f"Failed to clean up temporary file {temp_filename}: {e}"
                )

    async def _execute_with_stdin(self, language: str, code: str) -> ToolResult:
        """Execute code using stdin approach (for simple scripts)"""

        commands = {
            "python": "python3",
            "bash": "bash",
            "javascript": "node",
            "powershell": "powershell",  # PowerShell doesn't work well with stdin for scripts
        }

        execution_id = f"script_{uuid.uuid4().hex[:8]}"

        if language == "powershell":
            # PowerShell needs special handling
            escaped_code = code.replace('"', '""').replace("'", "''")
            command = f'powershell -Command "{escaped_code}"'
        else:
            # Use printf to avoid issues with echo and special characters
            # printf is more reliable than echo for complex strings
            escaped_code = code.replace("\\", "\\\\").replace("%", "%%")
            command = f"printf '%s' '{escaped_code}' | {commands[language]}"

        logger.info(f"Executing script via stdin: {command}")

        result: ShellOutput = await self.environment.exec_shell(
            command=command,
            session_id=execution_id,
            blocking=True,
        )

        return result.to_tool_result()

    async def _execute_with_command_flag(self, language: str, code: str) -> ToolResult:
        """Execute code using -c flag (for very simple one-liners)"""

        execution_id = f"script_{uuid.uuid4().hex[:8]}"

        if language == "python":
            # Use shlex.quote for safe escaping
            command = f"python3 -c {shlex.quote(code)}"
        elif language == "bash":
            # Use shlex.quote for safe escaping
            command = f"bash -c {shlex.quote(code)}"
        elif language == "javascript":
            # Node.js uses -e flag
            command = f"node -e {shlex.quote(code)}"
        elif language == "powershell":
            escaped_code = code.replace('"', '""').replace("'", "''")
            command = f'powershell -Command "{escaped_code}"'

        logger.info(f"Executing script with command flag: {command}")

        result: ShellOutput = await self.environment.exec_shell(
            command=command,
            session_id=execution_id,
            blocking=True,
        )

        return result.to_tool_result()

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        language = params["language"]
        code = params["code"].strip()

        # Strategy selection based on code complexity
        if self._should_use_temp_file(code):
            # Use temporary file for complex code (most reliable)
            logger.info("Using temporary file approach for complex script")
            return await self._execute_with_temp_file(language, code)
        elif len(code) < 50 and "\n" not in code:
            # Use command flag for very simple one-liners
            logger.info("Using command flag approach for simple script")
            return await self._execute_with_command_flag(language, code)
        else:
            # Use stdin for medium complexity
            logger.info("Using stdin approach for medium complexity script")
            return await self._execute_with_stdin(language, code)


@ToolRegistry.register(
    "deploy_server",
    xml_tag="deploy_server",
    required_params=["port", "app_type", "source_path"],
    attribute_mappings={
        "port": "port",
        "app_type": "app_type",
        "source_path": "source_path",
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
                logger.info(f"Deploying static site: {source_path}")
                await self._deploy_static_site(deployment_id, source_path, port)
            elif app_type == "nodejs":
                logger.info(f"Deploying Node.js app: {source_path}")
                await self._deploy_nodejs_app(deployment_id, source_path, port, params)

            hosted_url = self.environment.get_hosted_url(port)

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

        command = f"python3 -m http.server {port} --directory {source_path}"

        result: ShellOutput = await self.environment.exec_shell(
            command=command,
            session_id=deployment_id,
            blocking=False,
        )

        if result.status == "error":
            raise Exception(
                f"Failed to start static server: {result.error or 'Unknown error'}"
            )

    async def _deploy_nodejs_app(
        self, deployment_id: str, source_path: str, port: str, params: Dict[str, Any]
    ):
        """Deploy a Node.js application"""
        # Check if package.json exists
        package_json_check = f"test -f {source_path}/package.json"
        logger.info(f"Checking for package.json: {package_json_check}")
        check_result: ShellOutput = await self.environment.exec_shell(
            command=package_json_check,
            session_id=f"{deployment_id}_check",
            blocking=True,
        )
        logger.info(f"Check result: {check_result}")

        if check_result.status != "success":
            raise Exception(f"No package.json found in {source_path}")

        # Install dependencies if node_modules doesn't exist
        node_modules_check = f"test -d {source_path}/node_modules"
        logger.info(f"Checking for node_modules: {node_modules_check}")
        modules_result: ShellOutput = await self.environment.exec_shell(
            command=node_modules_check,
            session_id=f"{deployment_id}_modules_check",
            blocking=True,
        )
        logger.info(f"Modules result: {modules_result}")

        if modules_result.status != "success":
            # Install dependencies
            install_command = f"cd {source_path} && npm install"
            logger.info(f"Installing dependencies: {install_command}")
            install_result: ShellOutput = await self.environment.exec_shell(
                command=install_command,
                exec_dir=source_path,
                session_id=f"{deployment_id}_install",
                blocking=True,
            )
            logger.info(f"Install result: {install_result}")

            if install_result.status != "success":
                raise Exception(
                    f"Failed to install dependencies: {install_result.error or 'Unknown error'}"
                )

        start_command = "npm start"

        # Add PORT environment variable
        env_prefix = f"PORT={port} "

        # Start the application
        full_command = f"{env_prefix}{start_command}"
        logger.info(f"Starting application: {full_command}")
        result: ShellOutput = await self.environment.exec_shell(
            command=full_command,
            exec_dir=source_path,
            session_id=deployment_id,
            blocking=False,
        )
        logger.info(f"Start result: {result}")

        if result.status == "error":
            raise Exception(
                f"Failed to start Node.js application: {result.error or 'Unknown error'}"
            )
