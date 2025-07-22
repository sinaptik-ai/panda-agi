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


@ToolRegistry.register(
    "file_read",
    xml_tag="file_read",
    required_params=["file"],
    optional_params=["start_line", "end_line"],
    attribute_mappings={
        "file": "file",
        "start_line": "start_line",
        "end_line": "end_line",
    },
)
class FileReadHandler(ToolHandler):
    """Handler for file read operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_READ, params)
        params["start_line"] = int(params.get("start_line", 1))
        params["end_line"] = int(params.get("end_line", 1))
        result = await file_read(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_write",
    xml_tag="file_write",
    required_params=["file", "content"],
    optional_params=["append"],
    content_param="content",
    attribute_mappings={"file": "file", "append": "append"},
)
class FileWriteHandler(ToolHandler):
    """Handler for file write operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        if "content" not in params:
            return "Missing required parameter: content"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_WRITE, params)
        result = await file_write(self.environment, **params)
        await self.add_event(EventType.FILE_WRITE, params)

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_replace",
    xml_tag="file_replace",
    required_params=["file", "find_str", "replace_str"],
    attribute_mappings={
        "file": "file",
        "find_str": "find_str",
        "replace_str": "replace_str",
    },
)
class FileReplaceHandler(ToolHandler):
    """Handler for file string replacement operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["file", "find_str", "replace_str"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_REPLACE, params)
        # Map the XML parameter names to the function parameter names
        mapped_params = {
            "file": params["file"],
            "old_str": params["find_str"],
            "new_str": params["replace_str"],
        }
        result = await file_str_replace(self.environment, **mapped_params)
        await self.add_event(EventType.FILE_REPLACE, params)

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_find_in_content",
    xml_tag="file_find_in_content",
    required_params=["file", "regex"],
    attribute_mappings={
        "file": "file",
        "regex": "regex",
    },
)
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


@ToolRegistry.register(
    "file_search_by_name",
    xml_tag="file_search_by_name",
    required_params=["path", "glob_pattern"],
    attribute_mappings={
        "path": "path",
        "glob_pattern": "glob_pattern",
    },
)
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


@ToolRegistry.register(
    "explore_directory",
    xml_tag="explore_directory",
    required_params=["path"],
    optional_params=["max_depth"],
    attribute_mappings={"path": "path", "max_depth": "max_depth"},
)
class ExploreDirectoryHandler(ToolHandler):
    """Handler for exploring directory structure"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_EXPLORE, params)
        try:
            max_depth = params.get("max_depth", 2)
            params["max_depth"] = int(max_depth) if max_depth not in (None, "") else 2
        except (ValueError, TypeError):
            params["max_depth"] = 2

        result = await file_explore_directory(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )
