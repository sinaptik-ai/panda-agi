"""
Agent models for the PandaAGI SDK API.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class AgentQuery(BaseModel):
    """
    Model for agent query requests.
    """

    query: str
    conversation_id: Optional[str] = None
    timeout: Optional[int] = None


class ArtifactResponse(BaseModel):
    """
    Model for artifact responses.
    """

    id: str
    name: str
    filepath: str
    conversation_id: str
    created_at: datetime
    metadata: dict = Field(default_factory=dict)


class ArtifactsListResponse(BaseModel):
    """
    Model for artifacts list response with pagination.
    """

    artifacts: List[ArtifactResponse]
    total: int


class ArtifactNameUpdateRequest(BaseModel):
    """
    Model for updating artifact name.
    """

    name: str = Field(..., min_length=1, description="New name for the artifact")
