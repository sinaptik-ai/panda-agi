import asyncio
from typing import Any, Dict

import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify as md
import cloudscraper


async def visit_page(url: str):
    """
    Run cloudscraper synchronously inside a thread for async compatibility.
    """

    def _get():
        scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False}
        )
        return scraper.get(url, timeout=30)

    return await asyncio.to_thread(_get)


async def beautiful_soup_navigation(url: str) -> Dict[str, Any]:
    """
    Visit a webpage and extract its content using httpx for better error handling.
    """
    try:
        response = await visit_page(url)
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
    except Exception:
        return {
            "success": False,
            "url": url,
            "content": "The webpage cannot be read",
            "status_code": 500,
        }
