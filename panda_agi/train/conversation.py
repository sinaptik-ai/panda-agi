from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class ConversationMessage(BaseModel):
    """Pydantic model for OpenAI message format."""
    role: Literal["system", "user", "assistant", "tool"] = Field(
        description="The role of the message author"
    )
    content: Optional[str] = Field(
        description="The content of the message"
    )

class LLMUsage(BaseModel):
    """Pydantic model for OpenAI usage format."""
    prompt_tokens: int = Field(
        description="Number of tokens used for the prompt"
    )
    completion_tokens: int = Field(
        description="Number of tokens used for the completion"
    )
    total_tokens: int = Field(
        description="Total number of tokens used"
    )


class Conversation(BaseModel):
    """Pydantic model to store LLM call trace information."""
    
    # Request information as JSON
    messages: List[ConversationMessage] = Field(
        description="Complete messages from the request"
    )
    tags: List[str] = Field(
        default=[],
        description="Tags associated with the request"
    )
    # Model name
    model_name: Optional[str] = Field(
        default=None,
        description="Name of the language model used for the call"
    )
    # Request information as JSON
    usage: Optional[LLMUsage] = Field(
        default=None,
        description="Complete request LLM usage in JSON format"
    )
    # Metadata with function name
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional metadata, including the function name"
    )
    # Optional timestamp
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when the trace was created"
    )
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
