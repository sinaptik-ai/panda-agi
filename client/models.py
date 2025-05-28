import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

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


@dataclass
class WebSocketMessage:
    """WebSocket message structure"""

    type: str
    id: str = None
    payload: Optional[Dict[str, Any]] = None
    timestamp: str = None
    status: Optional[str] = None

    def __post_init__(self):
        if self.id is None:
            self.id = uuid.uuid4().hex[:8]
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

    def to_dict(self):
        return asdict(self)

    def to_json(self):
        return json.dumps(self.to_dict())
