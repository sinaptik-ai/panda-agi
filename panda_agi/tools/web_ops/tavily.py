"""
Search Tool

This module provides web search functionality using the Tavily API.
"""

import os
from typing import Any, Dict

from dotenv import load_dotenv
from tavily import TavilyClient

# Load environment variables
load_dotenv()

# Initialize Tavily client
tavily_api_key = os.getenv("TAVILY_API_KEY")
tavily_client = TavilyClient(api_key=tavily_api_key)


def tavily_search_web(query: str, max_results: int = 5) -> Dict[str, Any]:
    """
    Search the web using Tavily API.

    Args:
        query: The search query
        max_results: Maximum number of results to return

    Returns:
        Dict containing search results
    """
    if not tavily_api_key:
        return [
            "I'm sorry, I don't have access to the internet. I dont have Tavily API key"
        ]

    try:
        # Search using Tavily API
        search_result = tavily_client.search(
            query=query,
            max_results=max_results,
        )

        # Format results to include only URL and title
        formatted_results = []
        for result in search_result.get("results", []):
            formatted_results.append(
                {
                    "url": result.get("url", ""),
                    "title": result.get("title", ""),
                    # "content": result.get("content", ""),
                }
            )

        return {"results": formatted_results}
    except Exception as e:
        return {"error": str(e)}
