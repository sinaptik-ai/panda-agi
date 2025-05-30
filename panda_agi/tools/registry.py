import logging
from typing import Dict, Optional, Type

from .base import ToolHandler

logger = logging.getLogger("AgentClient")


class ToolRegistry:
    """Registry for managing tool handlers"""

    _handlers: Dict[str, Type[ToolHandler]] = {}
    _aliases: Dict[str, str] = {}

    @classmethod
    def register(cls, message_type: str, aliases: Optional[list] = None):
        """Decorator to register a handler for a message type"""

        def decorator(handler_class: Type[ToolHandler]):
            cls._handlers[message_type] = handler_class

            # Register aliases
            if aliases:
                for alias in aliases:
                    cls._aliases[alias] = message_type

            logger.debug(
                f"Registered handler {handler_class.__name__} for type '{message_type}'"
            )
            return handler_class

        return decorator

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
