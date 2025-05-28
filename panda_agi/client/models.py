import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field

# Message types that indicate completion/blocking operations
COMPLETION_MESSAGE_TYPES = ["user_ask_question", "completed_task"]


class MessageType(Enum):
    """Types of messages in the system"""

    REQUEST = "agent_request"
    TOOL_RESULT = "tool_result"
    TOOL_CALL = "tool_call"


class EventSource(Enum):
    """Event sources"""

    CLIENT = "client"
    AGENT = "agent"
    COMPLETION = "completion"


class MessageStatus(Enum):
    """Status of messages"""

    PENDING = "pending"
    SUCCESS = "success"
    ERROR = "error"


class WebSocketMessage(BaseModel):
    """WebSocket message structure"""

    type: str
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    payload: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: Optional[str] = None

    def to_dict(self):
        return self.model_dump()

    def to_json(self):
        return self.model_dump_json()


class EventType(Enum):
    """Types of events"""

    AGENT_CONNECTION_SUCCESS = "agent_connection_success"
    USER_NOTIFICATION = "user_notification"
    USER_QUESTION = "user_question"
    COMPLETED_TASK = "completed_task"
    WEB_SEARCH = "web_search"
    WEB_SEARCH_RESULT = "web_search_result"
    WEB_NAVIGATION = "web_navigation"
    WEB_NAVIGATION_RESULT = "web_navigation_result"
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    FILE_REPLACE = "file_replace"
    FILE_FIND = "file_find"
    FILE_EXPLORE = "file_explore"
    IMAGE_GENERATION = "image_generation"
    SHELL_EXEC = "shell_exec"
    SHELL_VIEW = "shell_view"
    SHELL_WRITE = "shell_write"


class StreamEvent(BaseModel):
    """Agent event structure returned by the run method"""

    type: EventType
    data: Union[Dict[str, Any], List[Dict[str, Any]], str]
    timestamp: str

    @classmethod
    def from_dict(cls, event_dict: Dict[str, Any]) -> "StreamEvent":
        """Create an AgentEvent from a dictionary"""
        return cls(
            type=EventType(event_dict.get("type", "unknown")),
            data=event_dict.get("data", {}),
            timestamp=event_dict.get("timestamp", datetime.now().isoformat()),
        )
