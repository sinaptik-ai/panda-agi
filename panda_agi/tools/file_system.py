from typing import Any, Dict, Optional

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .file_system_ops.file_ops import (
    file_explore_directory,
    file_find_by_name,
    file_find_in_content,
    file_read,
    file_str_replace,
    file_write,
)
from .registry import ToolRegistry


@ToolRegistry.register("file_read")
class FileReadHandler(ToolHandler):
    """Handler for file read operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_READ, params)
        result = await file_read(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("file_write")
class FileWriteHandler(ToolHandler):
    """Handler for file write operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        if "content" not in params:
            return "Missing required parameter: content"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        result = await file_write(self.environment, **params)
        await self.add_event(EventType.FILE_WRITE, params)

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("file_replace")
class FileReplaceHandler(ToolHandler):
    """Handler for file string replacement operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["file", "old_str", "new_str"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        result = await file_str_replace(self.environment, **params)
        await self.add_event(EventType.FILE_REPLACE, params)

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("file_find_in_content")
class FileFindInContentHandler(ToolHandler):
    """Handler for finding content in files"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        if "regex" not in params:
            return "Missing required parameter: regex"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_FIND, params)
        result = await file_find_in_content(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("file_search_by_name")
class FileSearchByNameHandler(ToolHandler):
    """Handler for searching files by name"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "path" not in params:
            return "Missing required parameter: path"
        if "glob_pattern" not in params:
            return "Missing required parameter: glob_pattern"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_FIND, params)
        result = await file_find_by_name(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register("explore_directory")
class ExploreDirectoryHandler(ToolHandler):
    """Handler for exploring directory structure"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_EXPLORE, params)
        result = await file_explore_directory(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )
