"""
Docker-based environment for file and shell operations.

This module provides a Docker environment implementation that runs
operations inside a Docker container while maintaining compatibility
with the BaseEnv interface.
"""

import asyncio
import logging
import os
import socket
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .base_env import BaseEnv

logger = logging.getLogger("DockerEnv")
logger.setLevel(logging.WARNING)

# Store active non-blocking processes for Docker
_docker_processes: Dict[str, Dict[str, Any]] = {}


class DockerEnv(BaseEnv):
    """Docker container environment implementation."""

    # Common development ports to expose by default
    DEFAULT_PORTS = {
        # 3000: 3000,  # React, Node.js dev servers
        # 3001: 3001,  # Alternative React dev server
        # 4200: 4200,  # Angular CLI dev server
        # 5173: 5173,  # Vite dev server
        # 5432: 5432,  # PostgreSQL
        # 6379: 6379,  # Redis
        # 8000: 8000,  # Django, Python HTTP servers
        # 8080: 8080,  # Alternative HTTP, Tomcat, Jenkins
        # 8081: 8081,  # Alternative HTTP
        # 9000: 9000,  # Various services
        # 3306: 3306,  # MySQL
        # 27017: 27017,  # MongoDB
        2664: 2664,  # PandaAGI Default Port
    }

    def __init__(
        self,
        base_path: Union[str, Path],
        image: str = "python:3.9-slim",
        container_name: Optional[str] = None,
        volumes: Optional[Dict[str, str]] = None,
        env_vars: Optional[Dict[str, str]] = None,
        network: Optional[str] = None,
        ports: Optional[Dict[int, int]] = None,
        working_dir: str = "/workspace",
        auto_start: bool = True,
        auto_remove: bool = True,
        expose_common_ports: bool = True,
        additional_ports: Optional[Dict[int, int]] = None,
    ):
        """
        Initialize the Docker environment.

        Args:
            base_path: The base directory to mount in the container
            image: Docker image to use
            container_name: Optional name for the container (generated if not provided)
            volumes: Additional volumes to mount (host_path: container_path)
            env_vars: Environment variables to set in the container
            network: Docker network to connect to
            ports: Ports to expose (host_port: container_port) - overrides default behavior
            working_dir: Working directory inside the container
            auto_start: Whether to automatically start the container
            auto_remove: Whether to automatically remove the container on stop
            expose_common_ports: Whether to automatically expose common development ports
            additional_ports: Additional ports to expose beyond the common ones

        Raises:
            RuntimeError: If Docker daemon is not running, Docker is not installed,
                         or any of the specified ports are already in use
        """
        super().__init__(base_path)

        # Check if Docker daemon is running before proceeding
        self._check_docker_daemon()

        # Docker configuration
        self.image = image
        self.container_name = container_name or f"env_docker_{str(uuid.uuid4())[:8]}"
        self.volumes = volumes or {}
        self.env_vars = env_vars or {}
        self.network = network
        self.auto_start = auto_start
        self.auto_remove = auto_remove

        # Configure ports
        if ports is not None:
            # If ports are explicitly provided, use them as-is
            self.ports = ports.copy()
        else:
            # Start with empty dict and add ports based on configuration
            self.ports = {}

            if expose_common_ports:
                self.ports.update(self.DEFAULT_PORTS)
                logger.info(
                    f"Exposing common development ports: {list(self.DEFAULT_PORTS.keys())}"
                )

            if additional_ports:
                self.ports.update(additional_ports)
                logger.info(f"Adding additional ports: {list(additional_ports.keys())}")

        # Container working directory
        self.container_working_dir = working_dir

        # Add the base path as the primary volume
        self.volumes[str(self.base_path.absolute())] = working_dir

        # Container state
        self.container_id = None
        self.is_running = False
        self._initialization_done = False

        # Validate ports
        self._validate_ports()

    def _check_docker_daemon(self) -> None:
        """
        Check if Docker daemon is running and accessible.

        Raises:
            RuntimeError: If Docker is not installed or daemon is not running
        """
        try:
            # First check if docker command is available
            result = subprocess.run(
                ["docker", "--version"], capture_output=True, text=True, timeout=5
            )
            if result.returncode != 0:
                raise RuntimeError("Docker is not installed or not in PATH")

            # Check if Docker daemon is running by trying to connect
            result = subprocess.run(
                ["docker", "info"], capture_output=True, text=True, timeout=10
            )
            if result.returncode != 0:
                error_msg = result.stderr.strip()
                if "Cannot connect to the Docker daemon" in error_msg:
                    raise RuntimeError(
                        "Docker daemon is not running. Please start Docker Desktop or the Docker daemon.\n"
                        f"Error: {error_msg}"
                    )
                else:
                    raise RuntimeError(f"Docker daemon check failed: {error_msg}")

            logger.info("Docker daemon is running and accessible")

        except subprocess.TimeoutExpired:
            raise RuntimeError(
                "Docker command timed out - Docker may not be responding"
            )
        except FileNotFoundError:
            raise RuntimeError("Docker is not installed or not in PATH")
        except Exception as e:
            raise RuntimeError(f"Failed to check Docker daemon status: {str(e)}")

    def _check_port_availability(self, port: int) -> bool:
        """
        Check if a port is available on the host machine.

        Args:
            port: Port number to check

        Returns:
            True if port is available, False if it's in use
        """
        try:
            # Try to bind to the port to check if it's available
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.bind(("localhost", port))
                return True
        except OSError:
            return False

    def _validate_ports(self) -> None:
        """
        Validate that all configured ports are available.

        Raises:
            RuntimeError: If any port is already in use
        """
        if not self.ports:
            return

        unavailable_ports = []
        for host_port in self.ports.keys():
            if not self._check_port_availability(host_port):
                unavailable_ports.append(host_port)

        if unavailable_ports:
            raise RuntimeError(
                f"The following ports are already in use and cannot be bound: {unavailable_ports}. "
                f"Please free these ports or use different port mappings."
            )

    def get_exposed_ports(self) -> Dict[int, int]:
        """
        Get the currently configured port mappings.

        Returns:
            Dict mapping host ports to container ports
        """
        return self.ports.copy()

    def add_port_mapping(self, host_port: int, container_port: int) -> None:
        """
        Add a new port mapping. Container must be restarted for changes to take effect.

        Args:
            host_port: Port on the host machine
            container_port: Port inside the container

        Raises:
            RuntimeError: If the host port is already in use
        """
        # Check if the port is available before adding it
        if not self._check_port_availability(host_port):
            raise RuntimeError(
                f"Port {host_port} is already in use and cannot be bound. "
                f"Please free this port or use a different port mapping."
            )

        self.ports[host_port] = container_port
        logger.info(f"Added port mapping: {host_port} -> {container_port}")

        if self.is_running:
            logger.warning(
                "Container is running. Restart required for port changes to take effect."
            )

    def remove_port_mapping(self, host_port: int) -> bool:
        """
        Remove a port mapping. Container must be restarted for changes to take effect.

        Args:
            host_port: Host port to remove

        Returns:
            True if port was removed, False if it wasn't found
        """
        if host_port in self.ports:
            del self.ports[host_port]
            logger.info(f"Removed port mapping for host port: {host_port}")

            if self.is_running:
                logger.warning(
                    "Container is running. Restart required for port changes to take effect."
                )
            return True
        return False

    async def __aenter__(self):
        """Async context manager entry."""
        logger.info("DOCKER ENV STARTED")
        if self.auto_start:
            await self.start_container()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.auto_remove:
            await self.stop_container(remove=True)

    async def start_container(self) -> Dict[str, Any]:
        """
        Start the Docker container.

        Returns:
            Dict containing status, container_id, message, and exposed_ports
        """
        if self.is_running:
            return {
                "status": "success",
                "container_id": self.container_id,
                "message": f"Container {self.container_name} is already running",
                "exposed_ports": list(self.ports.keys()),
            }

        logger.info(f"Starting container {self.container_name} with image {self.image}")
        if self.ports:
            logger.info(f"Exposing ports: {dict(self.ports)}")

        # Ensure the base path exists on the host
        self.base_path.mkdir(parents=True, exist_ok=True)

        try:
            # Check if a container with this name already exists and remove it
            await self._cleanup_existing_container()

            # Build the docker run command
            cmd = self._build_docker_run_command()

            logger.debug(f"Docker command: {' '.join(cmd)}")

            # Run the docker command
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode().strip()
                logger.error(f"Failed to start container: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to start container: {error_msg}",
                }

            # Store the container ID
            self.container_id = stdout.decode().strip()
            self.is_running = True

            logger.info(f"Container started successfully with ID: {self.container_id}")

            # Initialize the container with basic tools
            if not self._initialization_done:
                await self._initialize_container()
                self._initialization_done = True

            return {
                "status": "success",
                "container_id": self.container_id,
                "message": f"Container {self.container_name} started successfully",
                "exposed_ports": list(self.ports.keys()),
                "port_mappings": dict(self.ports),
            }
        except Exception as e:
            logger.error(f"Error starting container: {str(e)}")
            return {"status": "error", "message": f"Error starting container: {str(e)}"}

    def _build_docker_run_command(self) -> List[str]:
        """Build the docker run command with all options."""
        cmd = ["docker", "run", "-d", "--name", self.container_name]

        # Add volumes
        for host_path, container_path in self.volumes.items():
            cmd.extend(["-v", f"{host_path}:{container_path}"])

        # Add environment variables
        for key, value in self.env_vars.items():
            cmd.extend(["-e", f"{key}={value}"])

        # Add network if specified
        if self.network:
            cmd.extend(["--network", self.network])

        # Add ports if specified
        for host_port, container_port in self.ports.items():
            cmd.extend(["-p", f"{host_port}:{container_port}"])

        # Set the working directory
        cmd.extend(["-w", self.container_working_dir])

        # Add the image and command to keep container running
        cmd.extend([self.image, "tail", "-f", "/dev/null"])

        return cmd

    async def stop_container(self, remove: bool = None) -> Dict[str, Any]:
        """
        Stop and optionally remove the Docker container.

        Args:
            remove: Whether to remove the container after stopping (uses auto_remove if None)

        Returns:
            Dict containing status and message
        """
        if remove is None:
            remove = self.auto_remove

        if not self.is_running:
            return {
                "status": "success",
                "message": f"Container {self.container_name} is not running",
            }

        try:
            # Stop the container
            stop_cmd = ["docker", "stop", self.container_name]
            stop_process = await asyncio.create_subprocess_exec(
                *stop_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await stop_process.communicate()

            if stop_process.returncode != 0:
                return {
                    "status": "error",
                    "message": f"Failed to stop container: {stderr.decode().strip()}",
                }

            # Remove the container if requested
            if remove:
                rm_cmd = ["docker", "rm", self.container_name]
                rm_process = await asyncio.create_subprocess_exec(
                    *rm_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await rm_process.communicate()

                if rm_process.returncode != 0:
                    logger.warning(
                        f"Failed to remove container: {stderr.decode().strip()}"
                    )

            self.is_running = False
            self.container_id = None

            return {
                "status": "success",
                "message": f"Container {self.container_name} stopped{' and removed' if remove else ''}",
            }
        except Exception as e:
            return {"status": "error", "message": f"Error stopping container: {str(e)}"}

    async def _initialize_container(self) -> None:
        """Initialize the container with necessary tools and setup."""
        init_commands = [
            # Update package lists and install basic tools
            "apt-get update && apt-get install -y --no-install-recommends "
            "curl wget git zip unzip findutils file && "
            "apt-get clean && rm -rf /var/lib/apt/lists/*",
            # Ensure workspace directory exists
            f"mkdir -p {self.container_working_dir}",
        ]

        for cmd in init_commands:
            try:
                result = await self._execute_in_container(cmd)
                if result["return_code"] != 0:
                    logger.warning(f"Container initialization command failed: {cmd}")
                    logger.warning(f"Error: {result.get('stderr', '')}")
            except Exception as e:
                logger.error(f"Error during container initialization: {str(e)}")

    async def _ensure_container_running(self) -> bool:
        """Ensure the container is running before executing commands."""
        if not self.is_running:
            logger.info("Container not running, attempting to start it")
            result = await self.start_container()
            return result["status"] == "success"
        return True

    def _host_to_container_path(self, host_path: Path) -> str:
        """Convert a host path to a container path."""
        try:
            # Get the relative path from the base path
            rel_path = host_path.relative_to(self.base_path)
            # Join with the container working directory
            return str(Path(self.container_working_dir) / rel_path)
        except ValueError:
            # If the path is not relative to base_path, use it as is within container
            return str(Path(self.container_working_dir) / host_path.name)

    async def _execute_in_container(
        self, command: str, working_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute a command in the container and return the result."""
        if not await self._ensure_container_running():
            return {
                "status": "error",
                "message": "Container is not running",
                "return_code": -1,
                "stdout": "",
                "stderr": "",
            }

        # Build the docker exec command
        exec_cmd = ["docker", "exec"]

        # Set the working directory if specified
        if working_dir:
            exec_cmd.extend(["-w", working_dir])

        exec_cmd.extend([self.container_name, "bash", "-c", command])

        # Execute the command
        process = await asyncio.create_subprocess_exec(
            *exec_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        return {
            "status": "success" if process.returncode == 0 else "error",
            "return_code": process.returncode,
            "stdout": stdout.decode(),
            "stderr": stderr.decode(),
        }

    async def exec_shell(
        self,
        command: str,
        timeout: Optional[float] = None,
        capture_output: bool = True,
        blocking: bool = True,
    ) -> Dict[str, Any]:
        """Execute a shell command in the Docker container."""
        logger.info(f"Executing shell command in docker container: {command}")

        if not await self._ensure_container_running():
            return {
                "status": "error",
                "message": "Container is not running",
                "command": command,
                "working_directory": str(self.working_directory),
            }

        if blocking:
            return await self._exec_shell_blocking(command, timeout, capture_output)
        else:
            return await self._exec_shell_non_blocking(command, capture_output)

    async def _exec_shell_blocking(
        self, command: str, timeout: Optional[float] = None, capture_output: bool = True
    ) -> Dict[str, Any]:
        """Execute a shell command in blocking mode with stuck detection."""
        try:
            start_time = time.time()

            # Convert the working directory to container path
            container_path = self._host_to_container_path(self.working_directory)

            # Build the docker exec command
            exec_cmd = [
                "docker",
                "exec",
                "-w",
                container_path,
                self.container_name,
                "bash",
                "-c",
                command,
            ]

            # Execute the command
            process = await asyncio.create_subprocess_exec(
                *exec_cmd,
                stdout=asyncio.subprocess.PIPE if capture_output else None,
                stderr=asyncio.subprocess.PIPE if capture_output else None,
            )

            if not capture_output:
                # If not capturing output, just wait for completion
                try:
                    await asyncio.wait_for(process.wait(), timeout=timeout)
                    end_time = time.time()
                    execution_time = end_time - start_time

                    return {
                        "status": "success" if process.returncode == 0 else "error",
                        "stdout": "",
                        "stderr": "",
                        "return_code": process.returncode,
                        "execution_time": execution_time,
                        "working_directory": str(self.working_directory),
                        "command": command,
                    }
                except asyncio.TimeoutError:
                    try:
                        process.kill()
                        await process.wait()
                    except:
                        pass
                    return {
                        "status": "timeout",
                        "message": f"Command timed out after {timeout} seconds",
                        "command": command,
                        "working_directory": str(self.working_directory),
                    }

            # For captured output, implement stuck detection
            stdout_content = ""
            stderr_content = ""
            last_output = ""
            first_check = True
            stuck_checks = 0
            max_stuck_checks = 3  # Allow 3 consecutive stuck checks before giving up

            while process.returncode is None:
                # Wait 5 seconds for first check, then 10 seconds for subsequent checks
                wait_time = 5.0 if first_check else 10.0

                try:
                    # Try to read output with timeout
                    stdout_task = (
                        asyncio.create_task(process.stdout.read(8192))
                        if process.stdout
                        else None
                    )
                    stderr_task = (
                        asyncio.create_task(process.stderr.read(8192))
                        if process.stderr
                        else None
                    )

                    # Wait for the specified time or until output is available
                    done, pending = await asyncio.wait(
                        [
                            task
                            for task in [stdout_task, stderr_task]
                            if task is not None
                        ],
                        timeout=wait_time,
                        return_when=asyncio.FIRST_COMPLETED,
                    )

                    # Cancel pending tasks
                    for task in pending:
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass

                    # Read any available output
                    current_stdout = ""
                    current_stderr = ""

                    for task in done:
                        try:
                            data = await task
                            if data:
                                if task == stdout_task:
                                    current_stdout = (
                                        data.decode()
                                        if isinstance(data, bytes)
                                        else str(data)
                                    )
                                elif task == stderr_task:
                                    current_stderr = (
                                        data.decode()
                                        if isinstance(data, bytes)
                                        else str(data)
                                    )
                        except:
                            pass

                    if current_stdout:
                        stdout_content += current_stdout
                    if current_stderr:
                        stderr_content += current_stderr

                    current_output = stdout_content + stderr_content

                    # Check if output has changed
                    if current_output == last_output and not first_check:
                        stuck_checks += 1
                        if stuck_checks >= max_stuck_checks:
                            # Command appears to be stuck
                            end_time = time.time()
                            execution_time = end_time - start_time

                            return {
                                "status": "warning",
                                "stdout": stdout_content,
                                "stderr": stderr_content,
                                "return_code": None,
                                "execution_time": execution_time,
                                "working_directory": str(self.working_directory),
                                "command": command,
                                "warning": "Command appears to be stuck - no output change detected for 30 seconds",
                                "stuck_detection": True,
                                "process_running": True,
                            }
                    else:
                        stuck_checks = 0  # Reset counter if output changed

                    last_output = current_output
                    first_check = False

                    # Check timeout
                    if timeout:
                        elapsed = time.time() - start_time
                        if elapsed >= timeout:
                            try:
                                process.kill()
                                await process.wait()
                            except:
                                pass
                            return {
                                "status": "timeout",
                                "message": f"Command timed out after {timeout} seconds",
                                "command": command,
                                "working_directory": str(self.working_directory),
                                "stdout": stdout_content,
                                "stderr": stderr_content,
                            }

                except Exception:
                    # If we can't read output, just wait a bit and check process status
                    await asyncio.sleep(wait_time)

            # Process completed, read any remaining output
            try:
                if process.stdout:
                    remaining_stdout = await asyncio.wait_for(
                        process.stdout.read(), timeout=1.0
                    )
                    if remaining_stdout:
                        stdout_content += (
                            remaining_stdout.decode()
                            if isinstance(remaining_stdout, bytes)
                            else str(remaining_stdout)
                        )
                if process.stderr:
                    remaining_stderr = await asyncio.wait_for(
                        process.stderr.read(), timeout=1.0
                    )
                    if remaining_stderr:
                        stderr_content += (
                            remaining_stderr.decode()
                            if isinstance(remaining_stderr, bytes)
                            else str(remaining_stderr)
                        )
            except asyncio.TimeoutError:
                pass
            except Exception:
                pass

            end_time = time.time()
            execution_time = end_time - start_time

            return {
                "status": "success" if process.returncode == 0 else "error",
                "stdout": stdout_content,
                "stderr": stderr_content,
                "return_code": process.returncode,
                "execution_time": execution_time,
                "working_directory": str(self.working_directory),
                "command": command,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "command": command,
                "working_directory": str(self.working_directory),
            }

    async def _exec_shell_non_blocking(
        self, command: str, capture_output: bool = True
    ) -> Dict[str, Any]:
        """Execute a shell command in non-blocking mode using detached docker exec."""
        try:
            session_id = str(uuid.uuid4())

            # Convert the working directory to container path
            container_path = self._host_to_container_path(self.working_directory)

            # For non-blocking execution, we use detached mode
            exec_cmd = [
                "docker",
                "exec",
                "-d",  # Detached mode
                "-w",
                container_path,
                self.container_name,
                "bash",
                "-c",
                command,
            ]

            # Execute the command in detached mode
            process = await asyncio.create_subprocess_exec(
                *exec_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                return {
                    "status": "error",
                    "message": f"Failed to start non-blocking process: {stderr.decode().strip()}",
                    "command": command,
                    "working_directory": str(self.working_directory),
                }

            # Store process information for tracking
            _docker_processes[session_id] = {
                "command": command,
                "container_name": self.container_name,
                "working_directory": str(self.working_directory),
                "start_time": time.time(),
            }

            return {
                "status": "success",
                "message": "Process started in non-blocking mode in Docker container",
                "session_id": session_id,
                "command": command,
                "working_directory": str(self.working_directory),
                "container": self.container_name,
                "note": "Non-blocking Docker processes run detached - use shell_view_output to check status",
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "command": command,
                "working_directory": str(self.working_directory),
            }

    def get_process_status(self, session_id: str) -> Dict[str, Any]:
        """Get the status of a non-blocking Docker process."""
        if session_id not in _docker_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        process_info = _docker_processes[session_id]

        # For Docker detached processes, we can't easily check if they're still running
        # This is a limitation of detached mode
        return {
            "status": "success",
            "session_id": session_id,
            "running": True,  # We assume it's running since we can't easily check
            "command": process_info["command"],
            "container": process_info["container_name"],
            "note": "Docker detached processes don't provide real-time status. Use shell_view_output for logs.",
        }

    async def get_process_output(
        self, session_id: str, tail_lines: int = 100
    ) -> Dict[str, Any]:
        """Get the output of a non-blocking Docker process by checking container logs."""
        if session_id not in _docker_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        process_info = _docker_processes[session_id]

        try:
            # Get container logs since the process started
            # This is an approximation since we can't track individual detached processes
            logs_cmd = [
                "docker",
                "logs",
                "--tail",
                str(tail_lines),
                "--since",
                str(int(process_info["start_time"])),
                process_info["container_name"],
            ]

            process = await asyncio.create_subprocess_exec(
                *logs_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            return {
                "status": "success",
                "session_id": session_id,
                "stdout": stdout.decode() if stdout else "",
                "stderr": stderr.decode() if stderr else "",
                "running": True,  # Assume running since we can't easily check
                "note": f"Container logs since process start (last {tail_lines} lines)",
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "session_id": session_id,
            }

    def write_to_process(
        self, session_id: str, input_text: str, press_enter: bool = True
    ) -> Dict[str, Any]:
        """Write input to a Docker process - not supported for detached processes."""
        if session_id not in _docker_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        return {
            "status": "error",
            "message": "Writing to detached Docker processes is not supported. Use blocking execution for interactive commands.",
            "session_id": session_id,
        }

    def terminate_process(self, session_id: str) -> Dict[str, Any]:
        """Terminate a Docker process - limited support for detached processes."""
        if session_id not in _docker_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        # Remove from tracking
        del _docker_processes[session_id]

        return {
            "status": "success",
            "message": "Session removed from tracking. Note: Cannot terminate specific detached Docker processes.",
            "session_id": session_id,
            "warning": "Docker detached processes cannot be individually terminated. Consider restarting the container if needed.",
        }

    async def write_file(
        self,
        path: Union[str, Path],
        content: Union[str, bytes],
        mode: str = "w",
        encoding: Optional[str] = "utf-8",
    ) -> Dict[str, Any]:
        """Write content to a file in the Docker container."""
        file_path = self._resolve_path(path)

        try:
            if not await self._ensure_container_running():
                return {
                    "status": "error",
                    "message": "Container is not running",
                    "path": str(file_path),
                }

            # Create a temporary file with the content
            with tempfile.NamedTemporaryFile(delete=False, mode="wb") as temp_file:
                temp_path = temp_file.name

                # Write content to temp file
                if isinstance(content, str):
                    if "b" in mode:
                        temp_file.write(content.encode(encoding or "utf-8"))
                    else:
                        temp_file.write(content.encode(encoding or "utf-8"))
                else:
                    temp_file.write(content)

            try:
                # Get container path
                container_path = self._host_to_container_path(file_path)

                # Ensure parent directory exists in container
                parent_dir = str(Path(container_path).parent)
                mkdir_result = await self._execute_in_container(
                    f"mkdir -p '{parent_dir}'"
                )

                if mkdir_result["return_code"] != 0:
                    return {
                        "status": "error",
                        "message": f"Failed to create parent directory: {mkdir_result['stderr']}",
                        "path": str(file_path),
                    }

                # Copy file to container
                copy_cmd = [
                    "docker",
                    "cp",
                    temp_path,
                    f"{self.container_name}:{container_path}",
                ]
                copy_process = await asyncio.create_subprocess_exec(
                    *copy_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await copy_process.communicate()

                if copy_process.returncode != 0:
                    return {
                        "status": "error",
                        "message": f"Failed to copy file to container: {stderr.decode().strip()}",
                        "path": str(file_path),
                    }

                # Handle append mode by reading existing content and appending
                if "a" in mode:
                    # Get existing content if file exists
                    existing_result = await self.read_file(
                        path, mode="rb" if "b" in mode else "r", encoding=encoding
                    )
                    if existing_result["status"] == "success":
                        existing_content = existing_result["content"]
                        if isinstance(existing_content, str) and isinstance(
                            content, str
                        ):
                            combined_content = existing_content + content
                        elif isinstance(existing_content, bytes) and isinstance(
                            content, bytes
                        ):
                            combined_content = existing_content + content
                        else:
                            # Handle mixed types
                            if isinstance(existing_content, str):
                                existing_content = existing_content.encode(
                                    encoding or "utf-8"
                                )
                            if isinstance(content, str):
                                content = content.encode(encoding or "utf-8")
                            combined_content = existing_content + content

                        # Write the combined content
                        return await self.write_file(
                            path, combined_content, mode.replace("a", "w"), encoding
                        )

                # Get file size
                stat_result = await self._execute_in_container(
                    f"stat -c %s '{container_path}'"
                )
                size = (
                    int(stat_result["stdout"].strip())
                    if stat_result["return_code"] == 0
                    else 0
                )

                return {
                    "status": "success",
                    "path": str(file_path),
                    "size": size,
                }
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(file_path),
            }

    async def read_file(
        self,
        path: Union[str, Path],
        mode: str = "r",
        encoding: Optional[str] = "utf-8",
        start_line: Optional[int] = None,
        end_line: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Read content from a file in the Docker container."""
        file_path = self._resolve_path(path)

        if not await self._ensure_container_running():
            return {
                "status": "error",
                "message": "Container is not running",
                "path": str(file_path),
            }

        try:
            container_path = self._host_to_container_path(file_path)

            # Check if file exists
            check_result = await self._execute_in_container(
                f"test -f '{container_path}'"
            )
            if check_result["return_code"] != 0:
                return {
                    "status": "error",
                    "message": f"File not found: {file_path}",
                    "path": str(file_path),
                }

            # Create temporary file to copy content
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_path = temp_file.name

            try:
                # Copy file from container
                copy_cmd = [
                    "docker",
                    "cp",
                    f"{self.container_name}:{container_path}",
                    temp_path,
                ]
                copy_process = await asyncio.create_subprocess_exec(
                    *copy_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await copy_process.communicate()

                if copy_process.returncode != 0:
                    return {
                        "status": "error",
                        "message": f"Failed to copy file from container: {stderr.decode().strip()}",
                        "path": str(file_path),
                    }

                # Read content from temp file
                if "b" in mode:
                    with open(temp_path, "rb") as f:
                        content = f.read()
                else:
                    with open(temp_path, "r", encoding=encoding) as f:
                        if start_line is not None or end_line is not None:
                            lines = f.readlines()
                            start_idx = (start_line - 1) if start_line else 0
                            end_idx = end_line if end_line else len(lines)
                            content = "".join(lines[start_idx:end_idx])
                        else:
                            content = f.read()

                size = os.path.getsize(temp_path)

                return {
                    "status": "success",
                    "content": content,
                    "size": size,
                    "path": str(file_path),
                }
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(file_path),
            }

    async def delete_file(self, path: Union[str, Path]) -> Dict[str, Any]:
        """Delete a file or directory in the Docker container."""
        file_path = self._resolve_path(path)

        if not await self._ensure_container_running():
            return {
                "status": "error",
                "message": "Container is not running",
                "path": str(file_path),
            }

        try:
            container_path = self._host_to_container_path(file_path)

            # Check if path exists
            check_result = await self._execute_in_container(
                f"test -e '{container_path}'"
            )
            if check_result["return_code"] != 0:
                return {
                    "status": "error",
                    "message": f"Path not found: {file_path}",
                    "path": str(file_path),
                }

            # Remove the file or directory
            rm_result = await self._execute_in_container(f"rm -rf '{container_path}'")

            if rm_result["return_code"] != 0:
                return {
                    "status": "error",
                    "message": f"Failed to delete: {rm_result['stderr']}",
                    "path": str(file_path),
                }

            return {
                "status": "success",
                "path": str(file_path),
                "message": f"Successfully deleted {file_path}",
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(file_path),
            }

    async def list_files(
        self,
        path: Optional[Union[str, Path]] = None,
        recursive: bool = False,
        include_hidden: bool = False,
    ) -> Dict[str, Any]:
        """List files in a directory in the Docker container."""
        if path is None:
            target_path = self.working_directory
        else:
            target_path = self._resolve_path(path)

        if not await self._ensure_container_running():
            return {
                "status": "error",
                "message": "Container is not running",
                "path": str(target_path),
            }

        try:
            container_path = self._host_to_container_path(target_path)

            # Ensure directory exists
            mkdir_result = await self._execute_in_container(
                f"mkdir -p '{container_path}'"
            )
            if mkdir_result["return_code"] != 0:
                return {
                    "status": "error",
                    "message": f"Failed to create directory: {mkdir_result['stderr']}",
                    "path": str(target_path),
                }

            # Build find command for listing files
            find_cmd = f"find '{container_path}'"

            if not recursive:
                find_cmd += " -maxdepth 1"

            # Handle hidden files
            if not include_hidden:
                find_cmd += " ! -name '.*'"

            # Get detailed information
            find_cmd += " -exec ls -la {} \\; 2>/dev/null | grep -v '^total'"

            list_result = await self._execute_in_container(find_cmd)

            if list_result["return_code"] != 0:
                return {
                    "status": "error",
                    "message": f"Failed to list files: {list_result['stderr']}",
                    "path": str(target_path),
                }

            # Parse the output
            files = []
            lines = list_result["stdout"].strip().split("\n")

            for line in lines:
                if line and not line.startswith("total"):
                    parts = line.split()
                    if len(parts) >= 9:
                        file_info = self._parse_ls_line(line, container_path)
                        if file_info and file_info["name"] not in [".", ".."]:
                            files.append(file_info)

            # Sort files by name
            files.sort(key=lambda x: x["name"].lower())

            return {
                "status": "success",
                "path": str(target_path),
                "files": files,
                "total_files": len([f for f in files if f.get("type") == "file"]),
                "total_directories": len(
                    [f for f in files if f.get("type") == "directory"]
                ),
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(target_path),
            }

    def _parse_ls_line(self, line: str, base_path: str) -> Optional[Dict[str, Any]]:
        """Parse a line from ls -la output."""
        try:
            parts = line.split()
            if len(parts) < 9:
                return None

            permissions = parts[0]
            size = int(parts[4]) if parts[4].isdigit() else 0

            # Handle date/time parsing (parts 5, 6, 7)
            date_str = f"{parts[5]} {parts[6]} {parts[7]}"

            # File name (everything after the date)
            name = " ".join(parts[8:])

            # Determine file type
            if permissions.startswith("d"):
                file_type = "directory"
            elif permissions.startswith("l"):
                file_type = "symlink"
            else:
                file_type = "file"

            return {
                "name": name,
                "path": f"{base_path}/{name}",
                "type": file_type,
                "size": size,
                "permissions": permissions,
                "modified": date_str,
            }
        except Exception:
            return None

    def change_directory(self, path: Union[str, Path]) -> Path:
        """Change the current working directory."""
        new_path = self._resolve_path(path)

        # Ensure the new path is within the environment
        if not str(new_path).startswith(str(self.base_path)):
            new_path = self.base_path / path

        # Create the directory on the host if it doesn't exist
        new_path.mkdir(parents=True, exist_ok=True)

        # Update the working directory
        self.working_directory = new_path
        return self.working_directory

    async def _cleanup_existing_container(self) -> None:
        """Clean up any existing container with the same name."""
        try:
            # Check if container exists
            check_cmd = [
                "docker",
                "ps",
                "-a",
                "--filter",
                f"name={self.container_name}",
                "--format",
                "{{.Names}}",
            ]
            check_process = await asyncio.create_subprocess_exec(
                *check_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await check_process.communicate()

            if stdout.decode().strip() == self.container_name:
                logger.info(
                    f"Found existing container {self.container_name}, cleaning up..."
                )

                # Stop the container (ignore errors if already stopped)
                stop_cmd = ["docker", "stop", self.container_name]
                stop_process = await asyncio.create_subprocess_exec(
                    *stop_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await stop_process.communicate()

                # Remove the container
                rm_cmd = ["docker", "rm", self.container_name]
                rm_process = await asyncio.create_subprocess_exec(
                    *rm_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await rm_process.communicate()

                if rm_process.returncode != 0:
                    logger.warning(
                        f"Failed to remove existing container: {stderr.decode().strip()}"
                    )
                else:
                    logger.info(
                        f"Successfully cleaned up existing container {self.container_name}"
                    )
        except Exception as e:
            logger.warning(f"Error cleaning up existing container: {str(e)}")
