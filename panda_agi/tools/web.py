from typing import Any, Dict, Optional

from ..client.models import EventType
from ..tools.web_ops.beautifulsoup import beautiful_soup_navigation
from ..tools.web_ops.tavily import tavily_search_web
from .base import ToolHandler, ToolResult
from .registry import ToolRegistry


@ToolRegistry.register("web_search")
class WebSearchHandler(ToolHandler):
    """Handler for web search messages"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "query" not in params:
            return "Missing required parameter: query"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.WEB_SEARCH, params)
        results = tavily_search_web(**params)
        await self.add_event(EventType.WEB_SEARCH_RESULT, results)

        # Check if the result indicates success
        if "error" in results:
            await self.add_event(EventType.ERROR, results)
            return ToolResult(
                success=False, error=results.get("error", "Unknown error in web search")
            )

        return ToolResult(
            success=True,
            data=results,
        )


@ToolRegistry.register("web_visit_page")
class WebNavigationHandler(ToolHandler):
    """Handler for web navigation messages"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "url" not in params:
            return "Missing required parameter: url"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.WEB_NAVIGATION, params)
        result = beautiful_soup_navigation(**params)
        await self.add_event(EventType.WEB_NAVIGATION_RESULT, result)

        # Check if the result indicates success
        if isinstance(result, dict) and "error" in result:
            return ToolResult(
                success=False,
                error=result.get("error", "Unknown error in web navigation"),
            )

        return ToolResult(
            success=True,
            data=result if isinstance(result, dict) else {"content": result},
        )
