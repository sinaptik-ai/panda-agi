from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class LLMCallTrace(BaseModel):
    """Pydantic model to store LLM call trace information."""
    
    # Request information as JSON
    messages: List[Dict[str, Any]] = Field(
        description="Complete messages from the request"
    )
    input: str = Field(
        description="Input text from the last message in the conversation"
    )
    output: str = Field(
        description="Output text from the response content"
    )
    # Model name
    model_name: Optional[str] = Field(
        description="Name of the language model used for the call"
    )
    # Request information as JSON
    usage: Optional[Dict[str, Any]] = Field(
        description="Complete request llm usage in JSON format"
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
