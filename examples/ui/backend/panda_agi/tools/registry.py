import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Type

from .base import ToolHandler

logger = logging.getLogger("ToolRegistry")
logger.setLevel(logging.WARNING)


@dataclass
class XMLToolDefinition:
    """Definition for an XML tool including patterns and parameter mapping"""

    xml_tag: str
    function_name: str
    required_params: List[str]
    optional_params: List[str]
    content_param: Optional[str] = None  # Which parameter gets the XML content
    attribute_mappings: Dict[str, str] = None  # XML attr -> param name mapping
    is_breaking: bool = False  # Whether this tool breaks the execution loop

    def __post_init__(self):
        if self.attribute_mappings is None:
            self.attribute_mappings = {}


class ToolRegistry:
    """Registry for managing tool handlers with XML support"""

    _handlers: Dict[str, Type[ToolHandler]] = {}
    _aliases: Dict[str, str] = {}
    _xml_tools: Dict[str, XMLToolDefinition] = {}  # xml_tag -> definition

    @classmethod
    def register(
        cls,
        message_type: str,
        aliases: Optional[list] = None,
        xml_tag: Optional[str] = None,
        required_params: Optional[List[str]] = None,
        optional_params: Optional[List[str]] = None,
        content_param: Optional[str] = None,
        attribute_mappings: Optional[Dict[str, str]] = None,
        is_breaking: bool = False,
    ):
        """Decorator to register a handler for a message type with optional XML tool definition"""

        def decorator(handler_class: Type[ToolHandler]):
            cls._handlers[message_type] = handler_class

            # Register aliases
            if aliases:
                for alias in aliases:
                    cls._aliases[alias] = message_type

            # Register XML tool if xml_tag is provided
            if xml_tag:
                cls.register_xml_tool(
                    xml_tag=xml_tag,
                    function_name=message_type,
                    required_params=required_params,
                    optional_params=optional_params,
                    content_param=content_param,
                    attribute_mappings=attribute_mappings,
                    is_breaking=is_breaking,
                )

            logger.debug(
                f"Registered handler {handler_class.__name__} for type '{message_type}'"
            )
            if xml_tag:
                logger.debug(
                    f"Registered XML tool '{xml_tag}' for function '{message_type}'"
                )

            return handler_class

        return decorator

    @classmethod
    def register_xml_tool(
        cls,
        xml_tag: str,
        function_name: str,
        required_params: List[str] = None,
        optional_params: List[str] = None,
        content_param: str = None,
        attribute_mappings: Dict[str, str] = None,
        is_breaking: bool = False,
    ):
        """Register an XML tool definition"""
        definition = XMLToolDefinition(
            xml_tag=xml_tag,
            function_name=function_name,
            required_params=required_params or [],
            optional_params=optional_params or [],
            content_param=content_param,
            attribute_mappings=attribute_mappings or {},
            is_breaking=is_breaking,
        )
        cls._xml_tools[xml_tag] = definition
        logger.debug(f"Registered XML tool: {xml_tag} -> {function_name}")

    @classmethod
    def get_xml_tool_definition(cls, xml_tag: str) -> Optional[XMLToolDefinition]:
        """Get XML tool definition by tag name"""
        return cls._xml_tools.get(xml_tag)

    @classmethod
    def get_all_xml_patterns(cls) -> List[str]:
        """Get all XML regex patterns for detection"""
        patterns = []
        for xml_tag in cls._xml_tools.keys():
            # Create regex pattern for this XML tag
            pattern = f"<{xml_tag}[^>]*>.*?</{xml_tag}>"
            patterns.append(pattern)
        return patterns

    @classmethod
    def get_xml_function_mapping(cls) -> Dict[str, str]:
        """Get mapping from XML tag to function name"""
        return {
            xml_tag: definition.function_name
            for xml_tag, definition in cls._xml_tools.items()
        }

    @classmethod
    def set_tool_breaking_status(cls, xml_tag: str, is_breaking: bool) -> bool:
        """
        Set the breaking status of an existing XML tool.

        Args:
            xml_tag: The XML tag name of the tool
            is_breaking: Whether the tool should be breaking

        Returns:
            True if the tool was found and updated, False otherwise
        """
        if xml_tag not in cls._xml_tools:
            logger.warning(f"XML tool '{xml_tag}' not found")
            return False

        cls._xml_tools[xml_tag].is_breaking = is_breaking
        logger.info(f"Set tool '{xml_tag}' breaking status to: {is_breaking}")
        return True

    @classmethod
    def list_breaking_tools(cls) -> List[str]:
        """
        List all tools that are marked as breaking.

        Returns:
            List of XML tag names for breaking tools
        """
        return [
            xml_tag
            for xml_tag, definition in cls._xml_tools.items()
            if definition.is_breaking
        ]

    @classmethod
    def list_non_breaking_tools(cls) -> List[str]:
        """
        List all tools that are NOT marked as breaking.

        Returns:
            List of XML tag names for non-breaking tools
        """
        return [
            xml_tag
            for xml_tag, definition in cls._xml_tools.items()
            if not definition.is_breaking
        ]

    @classmethod
    def get_handler_class(cls, message_type: str) -> Optional[Type[ToolHandler]]:
        """Get handler class for a message type"""
        # Check aliases first
        actual_type = cls._aliases.get(message_type, message_type)
        return cls._handlers.get(actual_type)

    @classmethod
    def create_handler(cls, message_type: str, **kwargs) -> Optional[ToolHandler]:
        """Create a handler instance for a message type"""
        handler_class = cls.get_handler_class(message_type)
        if not handler_class:
            logger.warning(f"No handler registered for message type: {message_type}")
            return None

        try:
            return handler_class(**kwargs)
        except Exception as e:
            logger.error(f"Failed to create handler for {message_type}: {e}")
            return None

    @classmethod
    def create_all_handlers(cls) -> Dict[str, ToolHandler]:
        """Create all registered handlers"""
        handlers = {}

        # Create handlers for all registered types
        for message_type in cls._handlers:
            handler = cls.create_handler(message_type)
            if handler:
                handlers[message_type] = handler

        # Create handlers for all aliases
        for alias, actual_type in cls._aliases.items():
            if actual_type in handlers:
                handlers[alias] = handlers[actual_type]

        return handlers

    @classmethod
    def list_handlers(cls) -> Dict[str, str]:
        """List all registered handlers"""
        return {
            msg_type: handler_class.__name__
            for msg_type, handler_class in cls._handlers.items()
        }

    @classmethod
    def list_xml_tools(cls) -> Dict[str, str]:
        """List all registered XML tools"""
        return {
            xml_tag: definition.function_name
            for xml_tag, definition in cls._xml_tools.items()
        }
