import fnmatch
import logging
import re
from pathlib import Path
from typing import Any, Dict, Optional

# Import the BaseEnv base class
from panda_agi.envs import BaseEnv

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


async def file_read(
    environment: BaseEnv,
    file: str,
    start_line: Optional[int] = None,
    end_line: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Read file content using the provided environment.

    Args:
        environment: BaseEnv instance to use for operations
        file: Relative or absolute path of the file to read
        start_line: Optional starting line to read from (0-based)
        end_line: Optional ending line number (exclusive)
        sudo: Whether to use sudo privileges (not implemented)

    Returns:
        Dict containing the file content and metadata
    """
    # For line-specific reads, we need to handle it manually
    if start_line is not None or end_line is not None:
        try:
            # First read the entire file
            result = await environment.read_file(file)
            if result["status"] != "success":
                return result

            # Split into lines and get the requested range
            lines = result["content"].splitlines(keepends=True)
            start = start_line if start_line is not None else 1
            end = end_line if end_line is not None else len(lines)

            # Convert from 1-based to 0-based indexing for start
            # end is used as-is since Python slicing is exclusive
            start_idx = max(0, start - 1)
            end_idx = min(len(lines), end)

            content = "".join(lines[start_idx:end_idx])

            # Update the result with the filtered content
            result["content"] = content
            result["line_range"] = {
                "start": start_idx,
                "end": end_idx,
            }
            return result
        except Exception as e:
            return {"status": "error", "message": str(e)}
    else:
        # Read the entire file using the environment
        return await environment.read_file(file)


async def file_write(
    environment: BaseEnv,
    file: str,
    content: str,
    append: bool = False,
) -> Dict[str, Any]:
    """
    Write or append content to a file using the provided environment.

    Args:
        environment: BaseEnv instance to use for operations
        file: Relative or absolute path of the file to write to
        content: Text content to write
        append: Whether to use append mode
        leading_newline: Whether to add a leading newline
        trailing_newline: Whether to add a trailing newline
        sudo: Whether to use sudo privileges (not implemented)

    Returns:
        Dict containing the operation status
    """
    try:
        # Prepare content with optional newlines
        final_content = content

        # Choose mode based on append flag
        mode = "a" if append else "w"

        # Use the environment to write the file
        result = await environment.write_file(file, final_content, mode=mode)

        # Add append mode information to the result
        if result["status"] == "success":
            result["mode"] = "append" if append else "overwrite"

        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def file_str_replace(
    environment: BaseEnv,
    file: str,
    old_str: str,
    new_str: str,
) -> Dict[str, Any]:
    """
    Replace specified string in a file using the provided environment.

    Args:
        environment: BaseEnv instance to use for operations
        file: Relative or absolute path of the file to perform replacement on
        old_str: Original string to be replaced
        new_str: New string to replace with
        sudo: Whether to use sudo privileges (not implemented)

    Returns:
        Dict containing the operation status
    """
    try:
        # Read the file content
        result = await environment.read_file(file)
        if result["status"] != "success":
            return result

        content = result["content"]

        # Check if the string exists
        if old_str not in content:
            return {
                "status": "error",
                "message": f"String not found in file: {old_str}",
                "file": result["path"],
            }

        # Perform the replacement
        new_content = content.replace(old_str, new_str)
        count = content.count(old_str)

        # Write the updated content
        write_result = await environment.write_file(file, new_content)

        # Add replacement information to the result
        if write_result["status"] == "success":
            write_result["replacements"] = count
            # write_result["old_str"] = (
            #     old_str[:50] + "..." if len(old_str) > 50 else old_str
            # )
            # write_result["new_str"] = (
            #     new_str[:50] + "..." if len(new_str) > 50 else new_str
            # )

        return write_result
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def file_find_in_content(
    environment: BaseEnv,
    file: str,
    regex: str,
) -> Dict[str, Any]:
    """
    Search for matching text within file content using the provided environment.

    Args:
        environment: BaseEnv instance to use for operations
        file: Relative or absolute path of the file to search within
        regex: Regular expression pattern to match
        sudo: Whether to use sudo privileges (not implemented)

    Returns:
        Dict containing the search results
    """
    try:
        # Read the file content
        result = await environment.read_file(file)
        if result["status"] != "success":
            return result

        content = result["content"]
        lines = content.split("\n")

        # Compile the regex pattern
        pattern = re.compile(regex)

        # Find matches
        matches = []
        for i, line in enumerate(lines):
            for match in pattern.finditer(line):
                matches.append(
                    {
                        "line_number": i + 1,
                        "start": match.start(),
                        "end": match.end(),
                        "match": match.group(),
                        "line_content": line,
                    }
                )

        return {
            "status": "success",
            "file": result["path"],
            "pattern": regex,
            "matches": matches,
            "match_count": len(matches),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def file_find_by_name(
    environment: BaseEnv, path: str, glob_pattern: str
) -> Dict[str, Any]:
    """
    Find files by name pattern in specified directory using the provided environment.

    Args:
        environment: BaseEnv instance to use for operations
        path: Relative or absolute path of directory to search
        glob_pattern: Filename pattern using glob syntax wildcards

    Returns:
        Dict containing the search results
    """
    try:
        # List files in the directory based on the pattern
        result = await environment.list_files(path, recursive=True)

        if result["status"] != "success":
            return result

        # Filter files based on the glob pattern
        matching_files = []

        for file_info in result["files"]:
            # Check if the file name matches the pattern
            if fnmatch.fnmatch(file_info["name"], glob_pattern):
                matching_files.append(file_info)

        return {
            "status": "success",
            "directory": result["path"],
            "pattern": glob_pattern,
            "matches": matching_files,
            "match_count": len(matching_files),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def file_explore_directory(
    environment: BaseEnv, path: str, max_depth: Optional[int] = 2
) -> Dict[str, Any]:
    """
    Explore a directory structure with limited depth to help the agent understand the filesystem.

    Args:
        environment: BaseEnv instance to use for operations
        path: Path of directory to explore (can be relative to environment's base path)
        max_depth: Maximum depth of directory traversal (default: 2)

    Returns:
        Dict containing the directory structure
    """
    # Common directories to exclude from exploration
    EXCLUDED_DIRS = {
        "__pycache__",
        "node_modules",
        ".git",
        ".svn",
        ".hg",
        ".bzr",
        "venv",
        "env",
        ".venv",
        ".env",
        "virtualenv",
        ".tox",
        ".pytest_cache",
        ".mypy_cache",
        ".coverage",
        "htmlcov",
        "dist",
        "build",
        "egg-info",
        ".egg-info",
        "target",
        "bin",
        "obj",
        ".vs",
        ".vscode",
        ".idea",
        "*.egg-info",
        ".DS_Store",
        "Thumbs.db",
        ".sass-cache",
        ".cache",
    }

    try:
        # Resolve path using environment
        target_path = environment._resolve_path(path)

        # Ensure the directory exists
        if not target_path.exists():
            return {"status": "error", "message": f"Directory not found: {target_path}"}

        if not target_path.is_dir():
            return {
                "status": "error",
                "message": f"Path is not a directory: {target_path}",
            }

        # Function to recursively explore directory with depth limit
        def explore_dir(dir_path: Path, current_depth=0):
            if current_depth > max_depth:
                return "..."

            result = {}
            try:
                # Get directory contents
                items = list(dir_path.iterdir())

                # Sort items: directories first, then files
                dirs = []
                files = []

                for item in items:
                    # Skip excluded directories
                    if item.is_dir() and item.name in EXCLUDED_DIRS:
                        continue

                    if item.is_dir():
                        dirs.append(item)
                    else:
                        files.append(item)

                # Sort alphabetically within each group
                dirs.sort(key=lambda x: x.name)
                files.sort(key=lambda x: x.name)

                # Process directories
                for dir_path in dirs:
                    if current_depth < max_depth:
                        result[dir_path.name + "/"] = explore_dir(
                            dir_path, current_depth + 1
                        )
                    else:
                        result[dir_path.name + "/"] = "..."

                # Process files
                for file_path in files:
                    try:
                        size = file_path.stat().st_size
                        # Format size in human-readable format
                        if size < 1024:
                            size_str = f"{size} B"
                        elif size < 1024 * 1024:
                            size_str = f"{size / 1024:.1f} KB"
                        elif size < 1024 * 1024 * 1024:
                            size_str = f"{size / (1024 * 1024):.1f} MB"
                        else:
                            size_str = f"{size / (1024 * 1024 * 1024):.1f} GB"

                        result[file_path.name] = size_str
                    except Exception:
                        result[file_path.name] = "error"

                return result
            except PermissionError:
                return "<permission denied>"
            except Exception as e:
                return f"<error: {str(e)}>"

        # Start exploration from the target path
        structure = {target_path.name + "/": explore_dir(target_path)}

        return {
            "status": "success",
            "directory": str(target_path),
            "structure": structure,
            "max_depth": max_depth,
            # "excluded_dirs": list(EXCLUDED_DIRS),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
