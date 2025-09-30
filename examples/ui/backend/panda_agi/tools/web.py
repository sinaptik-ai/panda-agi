import asyncio
from typing import Any, Dict, Optional

from ..tools.web_ops.beautifulsoup import beautiful_soup_navigation
from ..tools.web_ops.tavily import tavily_search_web
from .base import ToolHandler, ToolResult
from .registry import ToolRegistry


@ToolRegistry.register(
    "web_search",
    xml_tag="web_search",
    required_params=["query"],
    optional_params=["max_results"],
    content_param="query",
    attribute_mappings={"query": "query", "max_results": "max_results"},
)
class WebSearchHandler(ToolHandler):
    """Handler for web search messages"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "query" not in params:
            return "Missing required parameter: query"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        try:
            results = tavily_search_web(**params)
        except Exception as e:
            # await self.add_event(
            #     EventType.ERROR,
            #     {"error": "Error in web search, please check if TAVILY_API_KEY is set"},
            # )
            return ToolResult(
                success=False,
                error=f"Error in web search: {str(e)}. Do not visit any websites. Complete the task.",
            )

        filtered_results = [
            result
            for result in results.get("results", [])
            if not result.get("url", "").lower().endswith(".pdf")
        ]

        results["results"] = filtered_results

        # await self.add_event(EventType.WEB_SEARCH_RESULT, results)

        # Check if the result indicates success
        if "error" in results:
            # await self.add_event(EventType.ERROR, results)
            return ToolResult(
                success=False, error=results.get("error", "Unknown error in web search")
            )

        return ToolResult(
            success=True,
            data=results,
        )


@ToolRegistry.register(
    "web_visit_page",
    xml_tag="web_visit_page",
    required_params=["urls"],
    content_param="urls",
    attribute_mappings={"urls": "urls"},
)
class WebNavigationHandler(ToolHandler):
    """Handler for web navigation messages"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "urls" not in params:
            return "Missing required parameter: urls"
        return None

    try:

        async def execute(self, params: Dict[str, Any]) -> ToolResult:
            # parallelize the navigation
            tasks = [beautiful_soup_navigation(url=url) for url in params["urls"]]
            results = await asyncio.gather(*tasks)

            all_success = True

            for result in results:
                success = result.pop("success", True)
                all_success = all_success and success

            return ToolResult(
                success=all_success,
                data=results,
                error="Some pages could not be visited" if not all_success else None,
            )

    except Exception as e:
        import traceback

        print(traceback.format_exc())
        raise e
