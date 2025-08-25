"""
Utility functions for the PandaAGI SDK API.
"""

from .exceptions import RestrictedAccessError, FileNotFoundError
from .html_utils import generate_error_page_html, should_return_html

__all__ = [
    "RestrictedAccessError",
    "FileNotFoundError",
    "generate_error_page_html",
    "should_return_html",
]
