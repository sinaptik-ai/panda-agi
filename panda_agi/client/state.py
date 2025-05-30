import asyncio


class AgentState:
    """Agent state (it is accessible by all tools)"""

    def __init__(self):
        self.initialization_complete = asyncio.Event()

        # Connection state properties
        self.is_connected = False
        self.is_running = False
        self.connection_id = None
