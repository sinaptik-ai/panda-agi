import asyncio
import logging
import subprocess
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .base_env import ExecutionResult
from .local_env import LocalEnv

logger = logging.getLogger("DockerEnv")
logger.setLevel(logging.WARNING)


class DockerEnv(LocalEnv):
    """
    A sandboxed environment that runs every command inside a Docker container.

    All file-reads/writes happen on the host under `base_path`, which is
    mounted into the container at /workspace.

    Uses a persistent container for tmux-based shell execution and throwaway
    containers for simple commands.
    """

    def __init__(
        self,
        base_path: Union[str, Path],
        image: str = "python:3.9-slim",
        metadata: Optional[Dict[str, Any]] = None,
        ports: Optional[List[int]] = [8080, 2664],
        timeout: Optional[int] = 3600,
    ):
        """
        Args:
            base_path: host directory to mount as /workspace inside the container
            image: Docker image to use for sandboxing
            metadata: optional metadata
            ports: list of ports to expose from container to host (host:container mapping)
            timeout: default command timeout
        """
        super().__init__(base_path, metadata, timeout)
        self.image = image
        self.container_workdir = Path("/workspace")
        self.ports = ports or []

        # Persistent container for tmux sessions
        self.persistent_container_id: Optional[str] = None
        self.persistent_container_name = f"panda_agi_docker_{uuid.uuid4().hex[:8]}"

        # ensure host base exists
        self.base_path.mkdir(parents=True, exist_ok=True)
        # Pull the image in advance
        self._ensure_image()

    def _ensure_image(self) -> None:
        """Pull the Docker image once at init time."""
        try:
            subprocess.run(
                ["docker", "pull", self.image],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            logger.info(f"Pulled docker image {self.image}")
        except subprocess.CalledProcessError as e:
            logger.warning(f"Could not pull {self.image}: {e}")

    async def _create_persistent_container(self):
        """
        Create and start a persistent Docker container for tmux sessions.
        """
        # First, try to remove any existing container with the same name
        try:
            await asyncio.create_subprocess_exec(
                "docker",
                "rm",
                "-f",
                self.persistent_container_name,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
        except Exception:
            pass  # Container might not exist, which is fine

        # Create the container with a long-running command to keep it alive
        docker_cmd = [
            "docker",
            "run",
            "-d",  # Run in detached mode
            "--name",
            self.persistent_container_name,
            "-v",
            f"{self.base_path.resolve()}:{self.container_workdir}",
            "-w",
            str(self.container_workdir),
        ]

        # Add port mappings if specified
        for port in self.ports:
            docker_cmd.extend(["-p", f"{port}:{port}"])

        docker_cmd.extend(
            [
                self.image,
                "tail",
                "-f",
                "/dev/null",  # Keep container running
            ]
        )
        try:
            proc = await asyncio.create_subprocess_exec(
                *docker_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise Exception(f"Docker run failed: {stderr.decode()}")
            self.persistent_container_id = stdout.decode().strip()
            logger.info(
                f"Created and started persistent container {self.persistent_container_id}"
            )
        except Exception as e:
            raise Exception(f"Failed to create persistent container: {e}")

    async def _run_persistent_command(
        self, command: str, timeout: Optional[int] = None
    ) -> ExecutionResult:
        """
        Run `command` inside the persistent Docker container.

        We mount host `base_path` into /workspace, chdir there, then
        run `bash -lc "command"`.
        """
        if timeout is None:
            timeout = self.timeout

        if not self.persistent_container_id:
            await self._create_persistent_container()

        docker_cmd = [
            "docker",
            "exec",
            self.persistent_container_name,
            # wrap in bash -lc so that tmux/shell functions work
            "bash",
            "-lc",
            command.replace('"', '\\"'),
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *docker_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                stdout, stderr = await proc.communicate()
                return ExecutionResult(
                    output=stdout.decode().strip(),
                    error=stderr.decode().strip(),
                    exit_code=-1,
                    success=False,
                )

            exit_code = proc.returncode
            return ExecutionResult(
                output=stdout.decode().strip(),
                error=stderr.decode().strip(),
                exit_code=exit_code,
                success=(exit_code == 0),
            )
        except Exception as e:
            return ExecutionResult(
                output="",
                error=str(e),
                exit_code=-1,
                success=False,
            )

    async def _initialize_tmux(self):
        """
        Initialize tmux in a persistent Docker container.

        Creates a persistent container with tmux installed for session management.
        """
        try:
            # Create persistent container if it doesn't exist
            if not self.persistent_container_id:
                await self._create_persistent_container()

            # Check if tmux is available in the persistent container
            result = await self._run_persistent_command("which tmux", timeout=10)
            if not result.success:
                # Install tmux if not available
                logger.info("Installing tmux in persistent container")
                install_cmd = "apt-get update && apt-get install -y tmux"
                result = await self._run_persistent_command(install_cmd, timeout=120)
                if not result.success:
                    raise Exception(
                        f"Failed to install tmux in container: {result.error}"
                    )

            logger.info("tmux is available in persistent container")

            # Write tmux config
            tmux_config = self.tmux_executor.generate_tmux_config()
            await self.write_file("/tmp/.tmux.conf", tmux_config)

        except Exception as e:
            raise Exception(f"Failed to initialize tmux: {e}")

    async def _run_command(
        self, command: str, timeout: Optional[int] = None
    ) -> ExecutionResult:
        """
        Override _run_command to use persistent container for tmux operations.

        For tmux-related commands, use the persistent container.
        For other commands, use throwaway containers.
        """
        # Check if this is a tmux-related command
        if self._is_tmux_command(command):
            # Ensure persistent container is running
            await self._ensure_persistent_container_running()
            return await self._run_persistent_command(command, timeout)
        else:
            # Use throwaway container for non-tmux commands
            return await self._run_throwaway_command(command, timeout)

    def _is_tmux_command(self, command: str) -> bool:
        """
        Check if a command is tmux-related and needs the persistent container.
        """
        tmux_keywords = [
            "tmux",
            "has-session",
            "new-session",
            "send-keys",
            "capture-pane",
            "kill-session",
            "list-sessions",
        ]
        return any(keyword in command for keyword in tmux_keywords)

    async def _ensure_persistent_container_running(self):
        """
        Ensure the persistent container is created and running.
        """
        if not self.persistent_container_id:
            await self._create_persistent_container()
            return

        # Check if container is running
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker",
                "inspect",
                "-f",
                "{{.State.Running}}",
                self.persistent_container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                # Container doesn't exist, recreate it
                logger.info(
                    f"Container {self.persistent_container_name} doesn't exist, recreating"
                )
                await self._create_persistent_container()
                return

            is_running = stdout.decode().strip() == "true"

            if not is_running:
                # Start the existing container
                start_proc = await asyncio.create_subprocess_exec(
                    "docker",
                    "start",
                    self.persistent_container_name,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                await start_proc.communicate()
                if start_proc.returncode == 0:
                    logger.info(
                        f"Started persistent container {self.persistent_container_name}"
                    )
                else:
                    # Failed to start, recreate
                    logger.info("Failed to start container, recreating")
                    await self._create_persistent_container()
        except Exception as e:
            logger.warning(f"Error checking persistent container: {e}")
            # Recreate container if there's an issue
            await self._create_persistent_container()

    async def _run_throwaway_command(
        self, command: str, timeout: Optional[int] = None
    ) -> ExecutionResult:
        """
        Run command in a throwaway container (original behavior).
        """
        if timeout is None:
            timeout = self.timeout

        docker_cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{self.base_path.resolve()}:{self.container_workdir}",
            "-w",
            str(self.container_workdir),
            self.image,
            # wrap in bash -lc so that tmux/shell functions work
            "bash",
            "-lc",
            command.replace('"', '\\"'),
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *docker_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                stdout, stderr = await proc.communicate()
                return ExecutionResult(
                    output=stdout.decode().strip(),
                    error=stderr.decode().strip(),
                    exit_code=-1,
                    success=False,
                )

            exit_code = proc.returncode
            return ExecutionResult(
                output=stdout.decode().strip(),
                error=stderr.decode().strip(),
                exit_code=exit_code,
                success=(exit_code == 0),
            )
        except Exception as e:
            return ExecutionResult(
                output="",
                error=str(e),
                exit_code=-1,
                success=False,
            )

    async def kill(self) -> Dict[str, Any]:
        """
        Forcefully kill and remove the persistent Docker container and image.

        This method immediately stops and removes the persistent container,
        terminating all running processes and tmux sessions within it,
        then removes the Docker image to free up disk space.

        Returns:
            Dict containing status information about the kill operation.
        """
        result = {
            "status": "success",
            "message": "No persistent container to kill",
            "container_id": None,
            "container_name": None,
            "image_removed": False,
        }

        if self.persistent_container_id:
            try:
                # Force kill the container (SIGKILL)
                kill_proc = await asyncio.create_subprocess_exec(
                    "docker",
                    "kill",
                    self.persistent_container_name,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await kill_proc.communicate()

                # Remove the container
                rm_proc = await asyncio.create_subprocess_exec(
                    "docker",
                    "rm",
                    self.persistent_container_name,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await rm_proc.communicate()

                # Remove the Docker image
                image_removed = False
                try:
                    rmi_proc = await asyncio.create_subprocess_exec(
                        "docker",
                        "rmi",
                        "-f",  # Force removal
                        self.image,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    rmi_stdout, rmi_stderr = await rmi_proc.communicate()
                    image_removed = rmi_proc.returncode == 0

                    if image_removed:
                        logger.info(f"Removed Docker image {self.image}")
                    else:
                        logger.warning(
                            f"Failed to remove Docker image {self.image}: {rmi_stderr.decode()}"
                        )

                except Exception as img_e:
                    logger.warning(f"Error removing Docker image {self.image}: {img_e}")

                result.update(
                    {
                        "message": "Successfully killed persistent container and removed image"
                        if image_removed
                        else "Successfully killed persistent container (image removal failed)",
                        "container_id": self.persistent_container_id,
                        "container_name": self.persistent_container_name,
                        "image_removed": image_removed,
                    }
                )

                logger.info(
                    f"Killed persistent container {self.persistent_container_name} (ID: {self.persistent_container_id})"
                )

                # Reset container tracking
                self.persistent_container_id = None

            except Exception as e:
                result.update(
                    {
                        "status": "error",
                        "message": f"Error killing persistent container: {e}",
                        "container_id": self.persistent_container_id,
                        "container_name": self.persistent_container_name,
                        "image_removed": False,
                    }
                )
                logger.error(f"Error killing persistent container: {e}")

        return result

    def get_exposed_ports(self) -> List[int]:
        """
        Get the list of currently exposed ports.

        Returns:
            List of port numbers that are exposed from container to host.
        """
        return self.ports.copy()

    def add_port(self, port: int) -> bool:
        """
        Add a port to the list of ports to expose.

        Note: This only affects new containers. If a persistent container
        is already running, you'll need to kill it and recreate it for
        the new port mapping to take effect.

        Args:
            port: Port number to expose (same port on host and container)

        Returns:
            True if port was added, False if it was already in the list.
        """
        if port not in self.ports:
            self.ports.append(port)
            logger.info(
                f"Added port {port} to expose list (will take effect on next container creation)"
            )
            return True
        return False

    def remove_port(self, port: int) -> bool:
        """
        Remove a port from the list of ports to expose.

        Note: This only affects new containers. If a persistent container
        is already running, you'll need to kill it and recreate it for
        the port mapping change to take effect.

        Args:
            port: Port number to remove from expose list

        Returns:
            True if port was removed, False if it wasn't in the list.
        """
        if port in self.ports:
            self.ports.remove(port)
            logger.info(
                f"Removed port {port} from expose list (will take effect on next container creation)"
            )
            return True
        return False

    async def cleanup_all_sessions(self) -> Dict[str, Any]:
        """
        Override cleanup to also stop the persistent container.
        """
        # First cleanup tmux sessions
        result = await super().cleanup_all_sessions()

        # Then stop and remove the persistent container
        if self.persistent_container_id:
            try:
                # Stop the container
                await asyncio.create_subprocess_exec(
                    "docker",
                    "stop",
                    self.persistent_container_name,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                # Remove the container
                await asyncio.create_subprocess_exec(
                    "docker",
                    "rm",
                    self.persistent_container_name,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                logger.info(
                    f"Cleaned up persistent container {self.persistent_container_name}"
                )
                self.persistent_container_id = None
            except Exception as e:
                logger.warning(f"Error cleaning up persistent container: {e}")

        return result

    def get_available_ports(self) -> List[int]:
        """Get list of available ports."""
        try:
            return self.ports
        except Exception as e:
            logger.warning(f"Error getting available ports: {str(e)}")
            return []
