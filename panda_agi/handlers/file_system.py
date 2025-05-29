from typing import Any, Dict, Optional

from ..client.models import EventType
from ..tools.file_system.file_ops import (
    file_explore_directory,
    file_find_by_name,
    file_find_in_content,
    file_read,
    file_str_replace,
    file_write,
)
from .base import HandlerResult, ToolHandler
from .registry import HandlerRegistry


@HandlerRegistry.register("file_read")
class FileReadHandler(ToolHandler):
    """Handler for file read operations"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        if "file" not in tool_call:
            return "Missing required parameter: file"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        await self.add_event(EventType.FILE_READ, tool_call)
        result = await file_read(self.environment, **tool_call)
        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@HandlerRegistry.register("file_write")
class FileWriteHandler(ToolHandler):
    """Handler for file write operations"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        if "file" not in tool_call:
            return "Missing required parameter: file"
        if "content" not in tool_call:
            return "Missing required parameter: content"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        result = await file_write(self.environment, **tool_call)
        await self.add_event(EventType.FILE_WRITE, tool_call)

        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@HandlerRegistry.register("file_replace")
class FileReplaceHandler(ToolHandler):
    """Handler for file string replacement operations"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        required_params = ["path", "old_str", "new_str"]
        missing = [param for param in required_params if param not in tool_call]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        result = await file_str_replace(self.environment, **tool_call)
        await self.add_event(EventType.FILE_REPLACE, tool_call)

        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@HandlerRegistry.register("file_find_in_content")
class FileFindInContentHandler(ToolHandler):
    """Handler for finding content in files"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        if "file" not in tool_call:
            return "Missing required parameter: file"
        if "regex" not in tool_call:
            return "Missing required parameter: regex"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        await self.add_event(EventType.FILE_FIND, tool_call)
        result = await file_find_in_content(self.environment, **tool_call)
        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@HandlerRegistry.register("file_search_by_name")
class FileSearchByNameHandler(ToolHandler):
    """Handler for searching files by name"""

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        if "path" not in tool_call:
            return "Missing required parameter: path"
        if "glob_pattern" not in tool_call:
            return "Missing required parameter: glob_pattern"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        await self.add_event(EventType.FILE_FIND, tool_call)
        result = await file_find_by_name(self.environment, **tool_call)
        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@HandlerRegistry.register("explore_directory")
class ExploreDirectoryHandler(ToolHandler):
    """Handler for exploring directory structure"""

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        await self.add_event(EventType.FILE_EXPLORE, tool_call)
        result = await file_explore_directory(self.environment, **tool_call)
        return HandlerResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )
