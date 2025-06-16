from typing import Any, Dict

import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify as md


async def beautiful_soup_navigation(url: str) -> Dict[str, Any]:
    """
    Visit a webpage and extract its content using httpx for better error handling.
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        content = md(str(soup))

        return {
            "success": True,
            "url": url,
            "content": content,
            "status_code": response.status_code,
        }

    except httpx.TimeoutException:
        return {
            "success": False,
            "url": url,
            "content": "Request timed out",
            "status_code": 408,
        }
    except httpx.ConnectError:
        return {
            "success": False,
            "url": url,
            "content": "Failed to connect to the website",
            "status_code": 503,
        }
    except Exception as e:
        return {
            "success": False,
            "url": url,
            "content": f"Error: {str(e)}",
            "status_code": 500,
        }
