import logging
import re
from typing import Any, Dict, Optional

from pxml.xml_parser import XMLParser

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

logger = logging.getLogger(__name__)

# Global error message for file validation failures
FILE_VALIDATION_ERROR_MSG = "File saved successfully but content validation failed: {e}. Correct the file content."
STOP_FILE_CORRECTION_MSG = "You have exceeded the maximum number of file correction attempts. Abort the correction process."
MAX_FILE_CORRECTION_ATTEMPTS = 3


def _pascal_to_snake_case(pascal_str: str) -> str:
    """Convert PascalCase string to snake_case."""
    # Insert underscore before uppercase letters that follow lowercase letters or digits
    snake_str = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', pascal_str)
    return snake_str.lower()


def _fix_llm_xml_mistakes(content: str) -> str:
    """
    Fix common XML formatting mistakes made by LLMs when generating PXML content.
    
    This function handles two common issues:
    1. Incomplete XML declaration (<?pxml instead of <?pxml version="1.0" encoding="UTF-8"?>)
    2. PascalCase tag names that should be snake_case
    
    Note: This is a temporary workaround for LLM mistakes and could be removed in the future
    when models become more consistent with XML formatting.
    
    Args:
        content (str): The XML content to fix
        
    Returns:
        str: The corrected XML content
    """
    # Fix incomplete XML declaration
    content = re.sub(r'<\?pxml\s*(?!\s*version)', '<?pxml version="1.0" encoding="UTF-8"?>', content)
    
    # Replace <?xml with <?pxml for PXML files
    content = re.sub(r'<\?xml', '<?pxml', content)
    
    # Remove closing </pxml> tags (they shouldn't exist)
    content = re.sub(r'</pxml>', '', content)
    
    # Remove stray ?> that might appear for no reason (but preserve valid XML declarations)
    # First mark valid XML declarations
    content = re.sub(r'(<\?pxml[^>]*)\?>', r'\1__VALID_CLOSE__', content)
    # Remove all other ?>
    content = re.sub(r'\?>', '', content)
    # Restore valid XML declarations
    content = re.sub(r'__VALID_CLOSE__', '?>', content)
    
    # Convert PascalCase to snake_case for XML tags
    # Find all XML tags (both opening and closing)
    def replace_tag(match):
        tag_content = match.group(1)
        if '/' in tag_content:
            # Closing tag
            tag_name = tag_content.replace('/', '')
            return f'</{_pascal_to_snake_case(tag_name)}>'
        else:
            # Opening tag (may have attributes)
            parts = tag_content.split(' ', 1)
            tag_name = parts[0]
            attributes = f' {parts[1]}' if len(parts) > 1 else ''
            return f'<{_pascal_to_snake_case(tag_name)}{attributes}>'
    
    # Match opening and closing tags, but exclude <?xml and similar processing instructions
    # Use a more specific pattern that only matches actual XML tag names (alphanumeric + underscore)
    content = re.sub(r'<([/]?[a-zA-Z_][a-zA-Z0-9_]*(?:\s+[^>]*)?)>', replace_tag, content)
    
    print(f"Fixed LLM XML mistakes. Resulting content: {content}")
    return content


@ToolRegistry.register(
    "file_read",
    xml_tag="file_read",
    required_params=["file_name"],
    optional_params=["start_line", "end_line"],
    attribute_mappings={
        "file_name": "file_name",
        "start_line": "start_line",
        "end_line": "end_line",
    },
)
class FileReadHandler(ToolHandler):
    """Handler for file read operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file_name" not in params:
            return "Missing required parameter: file_name"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_READ, params)
        params["start_line"] = int(params.get("start_line", 1))
        params["end_line"] = int(params.get("end_line", 1))

        file = params.get("file_name", None)
        # check if extension is csv set end_line
        if file and file.endswith(".csv"):
            params["end_line"] = min(params["end_line"], 20)

        # Map the XML parameter names to the function parameter names
        params["file"] = params["file_name"]
        del params["file_name"]

        result = await file_read(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_write",
    xml_tag="file_write",
    required_params=["file_name", "content"],
    optional_params=["append"],
    content_param="content",
    attribute_mappings={"file_name": "file_name", "append": "append"},
)
class FileWriteHandler(ToolHandler):
    """Handler for file write operations"""

    VALID_FILE_EXTENSIONS = [".pxml", ".csv", ".md"]

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file_name" not in params:
            return "Missing required parameter: file_name"
        if "content" not in params:
            return "Missing required parameter: content"

        # Validate file extension
        file_extension = "." + params.get("file_name", "").split(".")[-1]
        if file_extension not in self.VALID_FILE_EXTENSIONS:
            return f"Invalid file extension: {file_extension}. Valid extensions: {', '.join(self.VALID_FILE_EXTENSIONS)}"

        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        params["append"] = params.get("append", "false") == "true"  # Convert to boolean
        
        # Apply LLM XML mistake fixes for PXML files
        file_extension = "." + params.get("file_name", "").split(".")[-1]
        if file_extension == ".pxml":
            params["content"] = _fix_llm_xml_mistakes(params["content"])
        
        params["file"] = params["file_name"]
        del params["file_name"]
        result = await file_write(self.environment, **params)

        message = ""

        if result.get("status") == "success":
            file_extension = "." + params.get("file", "").split(".")[-1]

            if file_extension == ".pxml":
                try:
                    xml_parser = XMLParser()
                    # Validation if parsing is successful
                    xml_parser.parse(params["content"])
                except Exception as e:
                    logger.error(
                        f"Exception: {e} | Invalid PXML content provided for file write: {params['content']}"
                    )
                    if (
                        self.get_file_error_count(params["file"])
                        >= MAX_FILE_CORRECTION_ATTEMPTS
                    ):
                        return ToolResult(
                            success=False,
                            data=None,
                            error=STOP_FILE_CORRECTION_MSG,
                        )
                    self.increment_file_error_count(params["file"])
                    return ToolResult(
                        success=False,
                        data=None,
                        error=FILE_VALIDATION_ERROR_MSG.format(e=e),
                    )

            mode = result.get("mode", "overwrite")
            if mode == "append":
                message = "Successfully appended content to file."
            else:
                message = "Successfully created and wrote content to new file."

        file_write_result = {
            "message": message,
            "path": result["path"],
        }

        return ToolResult(
            success=result.get("status") == "success",
            data=file_write_result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_replace",
    xml_tag="file_replace",
    required_params=["file_name", "find_str", "replace_str"],
    attribute_mappings={
        "file_name": "file_name",
        "find_str": "find_str",
        "replace_str": "replace_str",
    },
)
class FileReplaceHandler(ToolHandler):
    """Handler for file string replacement operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["file_name", "find_str", "replace_str"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_REPLACE, params)
        # Map the XML parameter names to the function parameter names
        mapped_params = {
            "file": params["file_name"],
            "old_str": params["find_str"],
            "new_str": params["replace_str"],
        }
        result = await file_str_replace(self.environment, **mapped_params)
        if result.get("status") == "success":
            file_content = await file_read(self.environment, file=params["file_name"])
            file_extension = "." + params.get("file_name", "").split(".")[-1]
            if file_extension == ".pxml":
                try:
                    xml_parser = XMLParser()
                    xml_parser.parse(file_content["content"])
                except Exception as e:
                    logger.error(
                        f"""Exception: {e} | Invalid PXML content provided for file replace: {file_content["content"]}"""
                    )
                    if (
                        self.get_file_error_count(params["file_name"])
                        >= MAX_FILE_CORRECTION_ATTEMPTS
                    ):
                        return ToolResult(
                            success=False,
                            data=None,
                            error=STOP_FILE_CORRECTION_MSG,
                        )
                    self.increment_file_error_count(params["file_name"])
                    return ToolResult(
                        success=False,
                        data=None,
                        error=FILE_VALIDATION_ERROR_MSG.format(e=e),
                    )

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
