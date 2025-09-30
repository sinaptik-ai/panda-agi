"""
Agent models for the PandaAGI SDK API.
"""

from typing import Dict
from typing import Any, Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4


class AgentQuery(BaseModel):
    """
    Model for agent query requests.
    """

    query: str
    conversation_id: Optional[str] = None
    file_names: Optional[List[str]] = None
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
    is_public: bool
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


class ArtifactFileUpdateRequest(BaseModel):
    """
    Model for updating file content within an artifact.
    """

    file_path: str = Field(
        ..., description="Path to the file to update within the artifact"
    )
    content: str = Field(..., description="New content for the file")


class ConversationMessage(BaseModel):
    """Model representing a message in a conversation."""

    id: UUID = Field(default_factory=uuid4)
    conversation_id: UUID
    content: Dict[str, Any]
    role: str  # can be "user", "assistant", "tool", "system"
    created_at: datetime = Field(default_factory=datetime.now)
    message_index: int
    tokens_used: int = 0
