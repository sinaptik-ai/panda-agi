import asyncio
from typing import List

from panda_agi.client.models import Knowledge


class AgentState:
    """Agent state (it is accessible by all tools)"""

    def __init__(self):
        self.initialization_complete = asyncio.Event()
        self.knowledge: List[Knowledge] = []

        # Connection state properties
        self.is_connected = False
        self.is_running = False
        self.connection_id = None
