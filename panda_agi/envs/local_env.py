"""
Environment abstraction for file and shell operations.

This module provides environment classes that define where file operations
and shell commands are executed.
"""

import asyncio
import fcntl
import logging
import os
import shutil
import subprocess
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Union

from .base_env import BaseEnv

# PDF processing import with fallback
try:
    import pypdf

    PDF_AVAILABLE = True
except ImportError:
    try:
        import PyPDF2 as pypdf

        PDF_AVAILABLE = True
    except ImportError:
        PDF_AVAILABLE = False

logger = logging.getLogger("LocalEnv")
logger.setLevel(logging.WARNING)

# Store active non-blocking processes
_active_processes: Dict[str, subprocess.Popen] = {}


def _read_non_blocking(pipe) -> str:
    """Read from a pipe without blocking."""
    if not pipe:
        return ""

    try:
        # Make pipe non-blocking
        fd = pipe.fileno()
        fl = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)

        # Try to read available data
        return pipe.read() or ""
    except BlockingIOError:
        # No data available to read right now
        return ""
    except Exception:
        # Handle any other errors (like closed pipe)
        return ""


class LocalEnv(BaseEnv):
    """Local file system environment implementation."""

    def __init__(self, base_path: Union[str, Path]):
        """
        Initialize the local environment.

        Args:
            base_path: The base directory for this environment
        """
        super().__init__(base_path)
        # Create base directory if it doesn't exist
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def exec_shell(
        self,
        command: str,
        timeout: Optional[float] = None,
        capture_output: bool = True,
        blocking: bool = True,
    ) -> Dict[str, Any]:
        """Execute a shell command in the environment."""
        if blocking:
            return await self._exec_shell_blocking(command, timeout, capture_output)
        else:
            return await self._exec_shell_non_blocking(command, capture_output)

    async def _exec_shell_blocking(
        self, command: str, timeout: Optional[float] = None, capture_output: bool = True
    ) -> Dict[str, Any]:
        """Execute a shell command in blocking mode with stuck detection."""
        try:
            start_time = datetime.now()

            # Execute command in the current working directory
            process = subprocess.Popen(
                command,
                shell=True,
                cwd=str(self.working_directory),
                stdout=subprocess.PIPE if capture_output else None,
                stderr=subprocess.PIPE if capture_output else None,
                text=True,
            )

            if not capture_output:
                # If not capturing output, just wait for completion
                return_code = process.wait(timeout=timeout)
                end_time = datetime.now()
                execution_time = (end_time - start_time).total_seconds()

                return {
                    "status": "success" if return_code == 0 else "error",
                    "stdout": "",
                    "stderr": "",
                    "return_code": return_code,
                    "execution_time": execution_time,
                    "working_directory": str(self.working_directory),
                    "command": command,
                }

            # For captured output, implement stuck detection
            stdout_content = ""
            stderr_content = ""
            last_output = ""
            first_check = True
            stuck_checks = 0
            max_stuck_checks = 3  # Allow 3 consecutive stuck checks before giving up

            while process.poll() is None:
                # Wait 5 seconds for first check, then 10 seconds for subsequent checks
                wait_time = 5.0 if first_check else 10.0

                try:
                    await asyncio.sleep(wait_time)
                except:
                    # Fallback to regular sleep if asyncio is not available
                    import time

                    time.sleep(wait_time)

                # Read current output
                current_stdout = _read_non_blocking(process.stdout)
                current_stderr = _read_non_blocking(process.stderr)

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
                        end_time = datetime.now()
                        execution_time = (end_time - start_time).total_seconds()

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
                    elapsed = (datetime.now() - start_time).total_seconds()
                    if elapsed >= timeout:
                        process.terminate()
                        return {
                            "status": "timeout",
                            "message": f"Command timed out after {timeout} seconds",
                            "command": command,
                            "working_directory": str(self.working_directory),
                            "stdout": stdout_content,
                            "stderr": stderr_content,
                        }

            # Process completed, read any remaining output
            try:
                remaining_stdout, remaining_stderr = process.communicate(timeout=1)
                if remaining_stdout:
                    stdout_content += remaining_stdout
                if remaining_stderr:
                    stderr_content += remaining_stderr
            except subprocess.TimeoutExpired:
                pass

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()

            # Check return code to determine status
            status = "success" if process.returncode == 0 else "error"

            return {
                "status": status,
                "stdout": stdout_content,
                "stderr": stderr_content,
                "return_code": process.returncode,
                "execution_time": execution_time,
                "working_directory": str(self.working_directory),
                "command": command,
            }

        except subprocess.TimeoutExpired:
            return {
                "status": "timeout",
                "message": f"Command timed out after {timeout} seconds",
                "command": command,
                "working_directory": str(self.working_directory),
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
        """Execute a shell command in non-blocking mode."""
        try:
            session_id = str(uuid.uuid4())

            # Start the process
            if capture_output:
                process = subprocess.Popen(
                    command,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    stdin=subprocess.PIPE,
                    text=True,
                    cwd=str(self.working_directory),
                )
            else:
                process = subprocess.Popen(
                    command,
                    shell=True,
                    stdin=subprocess.PIPE,
                    text=True,
                    cwd=str(self.working_directory),
                )

            # Store the process for later access
            _active_processes[session_id] = process

            return {
                "status": "success",
                "message": "Process started in non-blocking mode",
                "session_id": session_id,
                "pid": process.pid,
                "command": command,
                "working_directory": str(self.working_directory),
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "command": command,
                "working_directory": str(self.working_directory),
            }

    def get_process_status(self, session_id: str) -> Dict[str, Any]:
        """Get the status of a non-blocking process."""
        if session_id not in _active_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        process = _active_processes[session_id]

        # Check if process is still running
        return_code = process.poll()
        is_running = return_code is None

        result = {
            "status": "success",
            "session_id": session_id,
            "running": is_running,
            "pid": process.pid,
        }

        if not is_running:
            result["return_code"] = return_code

        return result

    async def get_process_output(self, session_id: str) -> Dict[str, Any]:
        """Get the output of a non-blocking process."""
        if session_id not in _active_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        process = _active_processes[session_id]

        try:
            # Get output without blocking
            stdout = _read_non_blocking(process.stdout)
            stderr = _read_non_blocking(process.stderr)

            return {
                "status": "success",
                "session_id": session_id,
                "stdout": stdout,
                "stderr": stderr,
                "running": process.poll() is None,
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
        """Write input to a non-blocking process."""
        if session_id not in _active_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        process = _active_processes[session_id]

        if process.poll() is not None:
            return {"status": "error", "message": "Process is no longer running"}

        try:
            if process.stdin:
                text_to_write = input_text
                if press_enter:
                    text_to_write += "\n"

                process.stdin.write(text_to_write)
                process.stdin.flush()

                return {
                    "status": "success",
                    "message": "Input written to process",
                    "session_id": session_id,
                }
            else:
                return {
                    "status": "error",
                    "message": "Process stdin not available",
                    "session_id": session_id,
                }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "session_id": session_id,
            }

    def terminate_process(self, session_id: str) -> Dict[str, Any]:
        """Terminate a non-blocking process."""
        if session_id not in _active_processes:
            return {"status": "error", "message": f"Session {session_id} not found"}

        process = _active_processes[session_id]

        try:
            if process.poll() is None:
                process.terminate()
                # Give it a moment to terminate gracefully
                try:
                    process.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()

            # Remove from active processes
            del _active_processes[session_id]

            return {
                "status": "success",
                "message": "Process terminated",
                "session_id": session_id,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "session_id": session_id,
            }

    async def write_file(
        self,
        path: Union[str, Path],
        content: Union[str, bytes],
        mode: str = "w",
        encoding: Optional[str] = "utf-8",
    ) -> Dict[str, Any]:
        """Write content to a file."""
        try:
            file_path = self._resolve_path(path)

            # Create parent directories if they don't exist
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # Write content
            if "b" in mode:
                if "a" in mode:
                    # Append binary mode
                    with open(file_path, mode) as f:
                        f.write(content)
                else:
                    file_path.write_bytes(content)
            else:
                if "a" in mode:
                    # Append text mode
                    with open(file_path, mode, encoding=encoding) as f:
                        f.write(content)
                else:
                    file_path.write_text(content, encoding=encoding)

            return {
                "status": "success",
                "path": str(file_path),
                "size": file_path.stat().st_size,
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(self._resolve_path(path)),
            }

    async def read_file(
        self, path: Union[str, Path], mode: str = "r", encoding: Optional[str] = "utf-8"
    ) -> Dict[str, Any]:
        """Read content from a file. Supports PDF files by converting them to text."""
        try:
            file_path = self._resolve_path(path)

            if not file_path.exists():
                return {
                    "status": "error",
                    "message": f"File not found: {file_path}",
                    "path": str(file_path),
                }

            # Check if it's a PDF file
            if file_path.suffix.lower() == ".pdf":
                return await self._read_pdf_file(file_path)

            # Read content for non-PDF files
            if "b" in mode:
                content = file_path.read_bytes()
            else:
                content = file_path.read_text(encoding=encoding)

            logger.debug(f"Read content from {file_path}: {content}")

            return {
                "status": "success",
                "content": content,
                "size": file_path.stat().st_size,
                "path": str(file_path),
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(self._resolve_path(path)),
            }

    async def _read_pdf_file(self, file_path: Path) -> Dict[str, Any]:
        """Read and extract text content from a PDF file."""
        try:
            if not PDF_AVAILABLE:
                return {
                    "status": "error",
                    "message": "PDF reading not available. Please install pypdf or PyPDF2: pip install pypdf",
                    "path": str(file_path),
                }

            text_content = ""

            with open(file_path, "rb") as file:
                # Handle different PDF library APIs
                if hasattr(pypdf, "PdfReader"):
                    # pypdf (newer) API
                    pdf_reader = pypdf.PdfReader(file)
                    for page in pdf_reader.pages:
                        text_content += page.extract_text() + "\n"
                elif hasattr(pypdf, "PdfFileReader"):
                    # PyPDF2 (older) API
                    pdf_reader = pypdf.PdfFileReader(file)
                    for page_num in range(pdf_reader.numPages):
                        page = pdf_reader.getPage(page_num)
                        text_content += page.extractText() + "\n"
                else:
                    return {
                        "status": "error",
                        "message": "Unsupported PDF library version",
                        "path": str(file_path),
                    }

            logger.debug(
                f"Extracted text from PDF {file_path}: {len(text_content)} characters"
            )

            return {
                "status": "success",
                "content": text_content.strip(),
                "size": file_path.stat().st_size,
                "path": str(file_path),
                "file_type": "pdf",
                "extracted_text_length": len(text_content.strip()),
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Error reading PDF file: {str(e)}",
                "path": str(file_path),
            }

    async def delete_file(self, path: Union[str, Path]) -> Dict[str, Any]:
        """Delete a file or directory."""
        try:
            file_path = self._resolve_path(path)

            if not file_path.exists():
                return {
                    "status": "error",
                    "message": f"Path not found: {file_path}",
                    "path": str(file_path),
                }

            if file_path.is_file():
                file_path.unlink()
            elif file_path.is_dir():
                shutil.rmtree(file_path)

            return {
                "status": "success",
                "path": str(file_path),
                "message": f"Successfully deleted {file_path}",
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "path": str(self._resolve_path(path)),
            }

    async def path_exists(self, path: Union[str, Path]) -> bool:
        """
        Check if a path exists in the local environment.

        Args:
            path: Path relative to current_directory or absolute within base_path.

        Returns:
            bool: True if the path exists, False otherwise
        """
        try:
            resolved_path = self._resolve_path(path)
            return resolved_path.exists()
        except (OSError, ValueError, TypeError) as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error in path_exists: {e}\n{error_trace}")
            return False

    async def mkdir(self, path: Union[str, Path], parents: bool = False, exist_ok: bool = False) -> Dict[str, Any]:
        """
        Create a directory in the local environment.

        Args:
            path: Path relative to current_directory or absolute within base_path.
            parents: If True, create parent directories as needed.
            exist_ok: If False, an error is raised if the directory already exists.

        Returns:
            Dict[str, Any]: Result of the mkdir operation
        """
        try:
            print("Creating directory: ", path)
            resolved_path = self._resolve_path(path)
            print("Resolved path: ", resolved_path)
            resolved_path.mkdir(parents=parents, exist_ok=exist_ok)
            return {"status": "success", "path": str(resolved_path)}
        except FileExistsError:
            if exist_ok:
                return {"status": "success", "path": str(resolved_path), "message": "Directory already exists"}
            return {"status": "error", "message": f"Directory already exists: {resolved_path}", "path": str(resolved_path)}
        except Exception as e:
            return {"status": "error", "message": f"Failed to create directory: {str(e)}", "path": str(resolved_path)}
            
    async def list_files(
        self,
        path: Optional[Union[str, Path]] = None,
        recursive: bool = False,
        include_hidden: bool = False,
    ) -> Dict[str, Any]:
        """List files in a directory."""
        try:
            if path is None:
                target_path = self.working_directory
            else:
                target_path = self._resolve_path(path)

            if not target_path.exists():
                return {
                    "status": "error",
                    "message": f"Directory not found: {target_path}",
                    "path": str(target_path),
                }

            if not target_path.is_dir():
                return {
                    "status": "error",
                    "message": f"Path is not a directory: {target_path}",
                    "path": str(target_path),
                }

            files = []

            if recursive:
                pattern = "**/*"
            else:
                pattern = "*"

            for item in target_path.glob(pattern):
                # Skip hidden files unless explicitly requested
                if not include_hidden and item.name.startswith("."):
                    continue

                try:
                    stat = item.stat()
                    file_info = {
                        "name": item.name,
                        "path": str(item),
                        "relative_path": str(item.relative_to(target_path)),
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size if item.is_file() else 0,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "permissions": oct(stat.st_mode)[-3:],
                    }
                    files.append(file_info)
                except (OSError, PermissionError) as e:
                    # Skip files we can't access
                    files.append(
                        {
                            "name": item.name,
                            "path": str(item),
                            "relative_path": str(item.relative_to(target_path)),
                            "type": "unknown",
                            "error": str(e),
                        }
                    )

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
                "path": str(target_path if "target_path" in locals() else path),
            }
