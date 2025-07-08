from ..utils import send_traces
from typing import Union, List, Optional
from ..conversation import Conversation
from ..utils.logger import ProxyLogger
import asyncio
import threading


class BaseProxy:
    """
    Base class for all proxy implementations.
    
    This class provides common functionality that all proxies will inherit,
    including data collection, recording, and summary printing.
    """
    def __init__(self, model_name: Optional[str] = None, tags: Optional[List[str]] = None, debug: bool=False):
        """Initialize the BaseProxy with empty collected data.
        
        Args:
            model_name: Optional model name to use for requests if not specified
            tags: Optional tags to use for requests if not specified
            debug: Whether to print debug information
        """
        self.collected_data = []
        self.patches_applied = False
        self.model_name = model_name
        self.tags = tags or []
        # Thread-local storage to track which threads are within the context
        self.thread_local = threading.local()
        self.thread_local.is_active = False
        # Initialize logger
        self.debug = debug
        self.logger = ProxyLogger(self.__class__.__name__, debug)
        self.logger.info(f"Initialized {self.__class__.__name__}")
    
    def _track(self, trace: Union[Conversation, List[Conversation]]):
        if not hasattr(self.thread_local, 'is_active') or not self.thread_local.is_active:
            return
    
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(send_traces(trace))
        except RuntimeError:
            # No running loop (e.g. in sync script) – fallback
            asyncio.run(send_traces(trace))

    def _redact_headers(self, headers):
        """Remove sensitive information from headers."""
        if not headers:
            return {}
        
        # Create a copy to avoid modifying the original
        sanitized = dict(headers)
        
        # Remove sensitive headers
        sensitive_keys = ['authorization', 'api-key', 'openai-api-key', 'anthropic-api-key', 'x-api-key']
        for key in list(sanitized.keys()):
            if key.lower() in sensitive_keys:
                sanitized[key] = "[REDACTED]"
        
        return sanitized
    
    def apply_patches(self):
        """Apply all patches to intercept API calls."""
        if self.patches_applied:
            self.logger.info("Patches already applied.")
            return
        
        self._apply_patches_impl()
        self.thread_local.is_active = True
        self.patches_applied = True
        self.logger.info(f"Applied patches for {self.__class__.__name__}.")
    
    def _apply_patches_impl(self):
        """Implementation of applying patches. To be overridden by subclasses."""
        raise NotImplementedError("Subclasses must implement _apply_patches_impl")
    
    def remove_patches(self):
        """Remove all patches and restore original functionality."""
        if not self.patches_applied:
            self.logger.info("No patches to remove.")
            return
        
        self._remove_patches_impl()
        self.thread_local.is_active = False
        self.patches_applied = False
        self.logger.info(f"Removed patches from {self.__class__.__name__}.")
    
    def _remove_patches_impl(self):
        """Implementation of removing patches. To be overridden by subclasses."""
        raise NotImplementedError("Subclasses must implement _remove_patches_impl")
    
    def clear_collected_data(self):
        """Clear all collected request and response data."""
        self.collected_data = []
        self.logger.info("Cleared all collected data.")
    
    def get_collected_data(self):
        """Get all collected request and response data."""
        return self.collected_data
    
    def __enter__(self):
        """Apply patches when entering the context."""
        self.apply_patches()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Remove patches when exiting the context."""
        self.remove_patches()
        return False
    
    def print_summary(self):
        """Print a summary of the collected data."""
        if not self.collected_data:
            self.logger.info("No data collected.")
            return
        
        self.logger.info("\n" + "=" * 80)
        self.logger.info(f"{self.__class__.__name__} API Calls Summary ({len(self.collected_data)} calls)")
        self.logger.info("=" * 80)
        
        self._print_summary_impl()
        
        self.logger.info("=" * 80)
    
    def _print_summary_impl(self):
        """Implementation of printing summary. To be overridden by subclasses."""
        for i, data in enumerate(self.collected_data, 1):
            self.logger.info(f"[{i}] {data}")
