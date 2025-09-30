"""
HTML utilities for generating error pages and other HTML content.
"""

from typing import Optional
from fastapi import Response


def should_return_html(accept_header: Optional[str]) -> bool:
    """
    Check if the request should return HTML based on the Accept header.

    Args:
        accept_header: The Accept header from the request

    Returns:
        bool: True if HTML should be returned, False otherwise
    """
    if not accept_header:
        return False

    return "text/html" in accept_header.lower()


def create_html_redirect_response(error_page_url: str) -> Response:
    """
    Create a redirect response for HTML clients.

    Args:
        error_page_url: The URL to redirect to

    Returns:
        Response: A 302 redirect response
    """
    return Response(
        status_code=302,
        headers={"Location": error_page_url},
    )
