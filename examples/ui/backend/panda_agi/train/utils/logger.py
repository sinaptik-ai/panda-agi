"""
Logging utility for pandaagi_train.

This module provides standardized logging functionality for the proxy classes.
"""

class ProxyLogger:
    """A simple logger for proxy classes that respects debug settings."""
    
    def __init__(self, name, debug=False):
        """Initialize the logger with a name and debug setting.
        
        Args:
            name: The name of the component using this logger
            debug: Whether to print debug messages
        """
        self.name = name
        self.debug_enabled = debug
    
    def info(self, message):
        """Log an info message (always shown)."""
        print(f"[{self.name}] {message}")
    
    def debug(self, message):
        """Log a debug message (only shown if debug=True)."""
        if self.debug_enabled:
            print(f"[{self.name} DEBUG] {message}")
    
    def warning(self, message):
        """Log a warning message (always shown)."""
        print(f"[{self.name} WARNING] {message}")
    
    def error(self, message):
        """Log an error message (always shown)."""
        print(f"[{self.name} ERROR] {message}")
