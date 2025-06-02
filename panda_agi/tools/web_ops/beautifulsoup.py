"""
Webpage Tool

This module provides functionality to visit and extract content from webpages.
"""

from typing import Any, Dict

import requests
from bs4 import BeautifulSoup
from markdownify import MarkdownConverter


# Create shorthand method for conversion
def md(soup, **options):
    return MarkdownConverter(**options).convert_soup(soup)


def beautiful_soup_navigation(url: str) -> Dict[str, Any]:
    """
    Visit a webpage and extract its content.

    Args:
        url: The URL of the webpage to visit

    Returns:
        Dict containing the webpage content and metadata
    """
    try:
        # Send HTTP request to the URL
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()  # Raise an exception for HTTP errors

        # Parse HTML content
        soup = BeautifulSoup(response.text, "html.parser")

        content = md(soup)

        # Create the result dictionary
        result = {
            "url": url,
            "content": content,
            "status_code": response.status_code,
        }

        return result
    except Exception as e:
        return {
            "url": url,
            "title": "Error",
            "meta_description": "Error",
            "content": f"{e}",
            "status_code": 500,
        }
