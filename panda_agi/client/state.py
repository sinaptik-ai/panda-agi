from typing import Dict, List

from panda_agi.client.models import Knowledge, Skill


class AgentState:
    """Agent state (it is accessible by all tools)"""

    def __init__(self):
        # agent state
        self.conversation_id: str = ""
        self.knowledge: List[Knowledge] = []
        self.skills: List[Skill] = []

        # tools
        self.use_internet: bool = True
        self.use_filesystem: bool = True
        self.use_shell: bool = True
        self.use_image_generation: bool = True

        # environment
        self.filesystem: Dict = {}
