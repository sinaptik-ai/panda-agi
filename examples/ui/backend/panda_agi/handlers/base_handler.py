"""
Base Handler for PandaAGI

Provides a base class for all event handlers with common functionality
and a standard interface that can be extended.
"""

from abc import ABC, abstractmethod
from typing import Optional

from ..client.models import BaseStreamEvent


class BaseHandler(ABC):
    """
    Abstract base class for all event handlers in PandaAGI.
    
    This class defines the standard interface that all handlers must implement
    and provides common functionality that can be shared across handlers.
    
    All custom handlers should extend this class and implement the process method.
    """
    
    def __init__(self, name: Optional[str] = None):
        """
        Initialize the base handler.
        
        Args:
            name: Optional name for the handler (useful for debugging)
        """
        self.name = name or self.__class__.__name__
        self._events_processed = 0
        self._errors_encountered = 0
    
    @abstractmethod
    def process(self, event: BaseStreamEvent) -> None:
        """
        Process an event. This is the main method that must be implemented by all handlers.
        
        Args:
            event: The event to process
            
        Note:
            This method should not return anything. If you need to transform events,
            consider implementing a separate transform method.
        """
        pass
    
    def __call__(self, event: BaseStreamEvent) -> Optional[BaseStreamEvent]:
        """
        Make the handler callable, delegating to the process method.
        
        This allows handlers to be used both as handler.process(event)
        and as handler(event) for backward compatibility with callable functions.
        
        Args:
            event: The event to process
            
        Returns:
            The event (for compatibility with callable function interface)
        """
        try:
            self.process(event)
            self._events_processed += 1
            return event
        except Exception as e:
            self._errors_encountered += 1
            self.handle_error(event, e)
            return event
    
    def handle_error(self, event: BaseStreamEvent, error: Exception) -> None:
        """
        Handle errors that occur during event processing.
        
        Override this method to customize error handling behavior.
        
        Args:
            event: The event that caused the error
            error: The exception that occurred
        """
        print(f"⚠️  Error in {self.name} while processing {event.type}: {error}")
    
    def get_stats(self) -> dict:
        """
        Get statistics about the handler's performance.
        
        Returns:
            Dictionary containing handler statistics
        """
        return {
            "name": self.name,
            "events_processed": self._events_processed,
            "errors_encountered": self._errors_encountered,
            "success_rate": self._calculate_success_rate()
        }
    
    def _calculate_success_rate(self) -> float:
        """Calculate the success rate of event processing."""
        if self._events_processed == 0:
            return 0.0
        return (self._events_processed - self._errors_encountered) / self._events_processed * 100
    
    def reset_stats(self) -> None:
        """Reset the handler statistics."""
        self._events_processed = 0
        self._errors_encountered = 0
