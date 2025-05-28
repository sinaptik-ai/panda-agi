from typing import Any, Dict, Optional

from ..client.models import EventType
from ..envs import BaseEnv
from ..tools.navigation.beautifulsoup import beautiful_soup_navigation
from ..tools.search.tavily import tavily_search_web
from .base import HandlerResult, ToolHandler
from .registry import HandlerRegistry


@HandlerRegistry.register("web_search")
class WebSearchHandler(ToolHandler):
    """Handler for web search messages"""

    def __init__(
        self, web_search_type: str = "tavily", environment: Optional[BaseEnv] = None
    ):
        super().__init__(environment)
        self.web_search_type = web_search_type

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        if "query" not in tool_call:
            return "Missing required parameter: query"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        await self.add_event(EventType.WEB_SEARCH, tool_call)
        result = tavily_search_web(**tool_call)
        await self.add_event(EventType.WEB_SEARCH_RESULT, result)

        # Check if the result indicates success
        if isinstance(result, dict) and "error" in result:
            return HandlerResult(
                success=False, error=result.get("error", "Unknown error in web search")
            )

        return HandlerResult(
            success=True,
            data=result if isinstance(result, dict) else {"results": result},
        )


@HandlerRegistry.register("web_visit_page")
class WebNavigation(ToolHandler):
    """Handler for web navigation messages"""

    def __init__(
        self,
        web_navigation_type: str = "beautifulsoup",
        environment: Optional[BaseEnv] = None,
    ):
        super().__init__(environment)
        self.web_navigation_type = web_navigation_type

    def validate_input(self, tool_call: Dict[str, Any]) -> Optional[str]:
        if "url" not in tool_call:
            return "Missing required parameter: url"
        return None

    async def execute(self, tool_call: Dict[str, Any]) -> HandlerResult:
        await self.add_event(EventType.WEB_NAVIGATION, tool_call)

        result = beautiful_soup_navigation(**tool_call)

        await self.add_event(EventType.WEB_NAVIGATION_RESULT, result)

        # Check if the result indicates success
        if isinstance(result, dict) and "error" in result:
            return HandlerResult(
                success=False,
                error=result.get("error", "Unknown error in web navigation"),
            )

        return HandlerResult(
            success=True,
            data=result if isinstance(result, dict) else {"content": result},
        )
