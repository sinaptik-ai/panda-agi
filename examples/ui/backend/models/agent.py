"""
Agent models for the PandaAGI SDK API.
"""
from typing import Optional
from pydantic import BaseModel


class AgentQuery(BaseModel):
    """
    Model for agent query requests.
    """
    query: str
    conversation_id: Optional[str] = None
    timeout: Optional[int] = None
