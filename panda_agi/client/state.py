from typing import Dict

from panda_agi.client.models import ToolsConfig


class AgentState:
    """Agent state (it is accessible by all tools)"""

    def __init__(self):
        # agent state
        self.conversation_id: str = ""

        # tools
        self.tools_config: ToolsConfig = ToolsConfig()

        # environment
        self.filesystem: Dict = {}
