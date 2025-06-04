import logging
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, TypeGuard

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)

# Message types that indicate completion/blocking operations
COMPLETION_MESSAGE_TYPES = ["user_ask_question", "completed_task", "error"]


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


class EventType(Enum):
    """Event types for the system"""

    # Connection & Environment Events
    AGENT_CONNECTION_SUCCESS = "agent_connection_success"
    ERROR = "error"

    # Web Research Events
    WEB_SEARCH = "web_search"
    WEB_SEARCH_RESULT = "web_search_result"
    WEB_NAVIGATION = "web_navigation"
    WEB_NAVIGATION_RESULT = "web_navigation_result"

    # File System Events
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    FILE_REPLACE = "file_replace"
    FILE_FIND = "file_find"
    FILE_EXPLORE = "file_explore"

    # Command Execution Events
    SHELL_EXEC = "shell_exec"
    SHELL_VIEW = "shell_view"
    SHELL_WRITE = "shell_write"

    # Communication Events
    USER_NOTIFICATION = "user_notification"
    USER_QUESTION = "user_question"
    COMPLETED_TASK = "completed_task"

    # Creative & Generation Events
    IMAGE_GENERATION = "image_generation"


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


# Base class for all stream events
class BaseStreamEvent(BaseModel):
    """Base class for all stream events"""

    type: EventType
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")

    def to_json(self) -> str:
        return self.model_dump_json()


# Connection & Environment Events
class AgentConnectionSuccessEvent(BaseStreamEvent):
    """Event fired when agent successfully connects and initializes workspace"""

    type: str = "agent_connection_success"
    directory: str = Field(description="Agent workspace directory")
    file_structure: Dict[str, Any] = Field(description="File system structure")
    system_info: Dict[str, Any] = Field(description="System information")


class ErrorEvent(BaseStreamEvent):
    """Event fired when agent fails to connect or initialize"""

    type: str = "error"
    error: str = Field(description="Error message")


# Web Research Events
class WebSearchEvent(BaseStreamEvent):
    """Event indicating agent is performing a web search"""

    type: str = "web_search"
    query: str = Field(description="Search query")
    max_results: int = Field(description="Maximum number of results")


class SearchResultItem(BaseModel):
    """Individual search result item"""

    url: str
    title: str


class WebSearchResultEvent(BaseStreamEvent):
    """Event containing results from a web search"""

    type: str = "web_search_result"
    results: List[SearchResultItem] = Field(description="Search results")


class WebNavigationEvent(BaseStreamEvent):
    """Event when agent navigates to a specific webpage"""

    type: str = "web_navigation"
    url: str = Field(description="URL being navigated to")


class WebNavigationResultEvent(BaseStreamEvent):
    """Event containing content extracted from a webpage"""

    type: str = "web_navigation_result"
    url: str = Field(description="URL that was navigated")
    content: str = Field(description="Extracted page content")
    status_code: int = Field(description="HTTP status code")


# File System Events
class FileReadEvent(BaseStreamEvent):
    """Event when agent reads file contents"""

    type: str = "file_read"
    file: str = Field(description="File path")


class FileWriteEvent(BaseStreamEvent):
    """Event when agent creates or writes to files"""

    type: str = "file_write"
    file: str = Field(description="File path")
    content: str = Field(description="File content")
    append: bool = Field(description="Whether content was appended")


class FileReplaceEvent(BaseStreamEvent):
    """Event when agent replaces content in existing files"""

    type: str = "file_replace"
    file: str = Field(description="File path")
    old_str: str = Field(description="Content being replaced")
    new_str: str = Field(description="New content")


class FileFindEvent(BaseStreamEvent):
    """Event when agent searches for files or content within files"""

    type: str = "file_find"
    file: Optional[str] = Field(description="Directory searched")
    regex: Optional[str] = Field(description="Search pattern")
    path: Optional[str] = Field(description="Path to the file")
    glob_pattern: Optional[str] = Field(description="Search pattern")


class FileExploreEvent(BaseStreamEvent):
    """Event when agent explores directory structure"""

    type: str = "file_explore"
    path: str = Field(description="Directory explored")
    max_depth: int = Field(description="Maximum depth to explore")


# Command Execution Events
class ShellExecEvent(BaseStreamEvent):
    """Event when agent executes shell commands"""

    type: str = "shell_exec"
    id: str = Field(description="Execution ID")
    exec_dir: str = Field(description="Execution directory")
    command: str = Field(description="Shell command")
    blocking: bool = Field(description="Whether execution is blocking")


class ShellViewEvent(BaseStreamEvent):
    """Event when agent views output from shell commands"""

    type: str = "shell_view"
    id: str = Field(description="Execution ID")
    kill_process: bool = Field(description="Whether to kill the process")
    wait_seconds: float = Field(description="Number of seconds to wait for output")


class ShellWriteEvent(BaseStreamEvent):
    """Event when agent writes to shell or creates shell scripts"""

    type: str = "shell_write"
    id: str = Field(description="Execution ID")
    input: str = Field(description="Input to write")
    press_enter: bool = Field(description="Whether to press enter")


# Communication Events
class UserNotificationEvent(BaseStreamEvent):
    """Event for progress updates and notifications from agent"""

    type: str = "user_notification"
    text: str = Field(description="Notification message")
    attachments: Optional[List[str]] = Field(default=None, description="Attached files")


class UserQuestionEvent(BaseStreamEvent):
    """Event when agent needs clarification or input from user"""

    type: str = "user_question"
    text: str = Field(description="Question from agent")
    attachments: Optional[List[str]] = Field(default=None, description="Attached files")


class CompletedTaskEvent(BaseStreamEvent):
    """Event indicating agent has finished the requested task"""

    type: str = "completed_task"
    success: Optional[bool] = Field(
        default=None, description="Whether task was successful"
    )


# Creative & Generation Events
class ImageGenerationEvent(BaseStreamEvent):
    """Event when agent generates images or visual content"""

    type: str = "image_generation"
    saved_files: List[str] = Field(description="List of saved images")
    images: List[str] = Field(description="List of images")


# TypeGuard functions for type safety
def is_agent_connection_success_event(
    event: BaseStreamEvent,
) -> TypeGuard[AgentConnectionSuccessEvent]:
    return isinstance(event, AgentConnectionSuccessEvent)


def is_agent_connection_error_event(
    event: BaseStreamEvent,
) -> TypeGuard[ErrorEvent]:
    return isinstance(event, ErrorEvent)


def is_web_search_event(event: BaseStreamEvent) -> TypeGuard[WebSearchEvent]:
    return isinstance(event, WebSearchEvent)


def is_web_search_result_event(
    event: BaseStreamEvent,
) -> TypeGuard[WebSearchResultEvent]:
    return isinstance(event, WebSearchResultEvent)


def is_web_navigation_event(event: BaseStreamEvent) -> TypeGuard[WebNavigationEvent]:
    return isinstance(event, WebNavigationEvent)


def is_web_navigation_result_event(
    event: BaseStreamEvent,
) -> TypeGuard[WebNavigationResultEvent]:
    return isinstance(event, WebNavigationResultEvent)


def is_file_read_event(event: BaseStreamEvent) -> TypeGuard[FileReadEvent]:
    return isinstance(event, FileReadEvent)


def is_file_write_event(event: BaseStreamEvent) -> TypeGuard[FileWriteEvent]:
    return isinstance(event, FileWriteEvent)


def is_file_replace_event(event: BaseStreamEvent) -> TypeGuard[FileReplaceEvent]:
    return isinstance(event, FileReplaceEvent)


def is_file_find_event(event: BaseStreamEvent) -> TypeGuard[FileFindEvent]:
    return isinstance(event, FileFindEvent)


def is_file_explore_event(event: BaseStreamEvent) -> TypeGuard[FileExploreEvent]:
    return isinstance(event, FileExploreEvent)


def is_shell_exec_event(event: BaseStreamEvent) -> TypeGuard[ShellExecEvent]:
    return isinstance(event, ShellExecEvent)


def is_shell_view_event(event: BaseStreamEvent) -> TypeGuard[ShellViewEvent]:
    return isinstance(event, ShellViewEvent)


def is_shell_write_event(event: BaseStreamEvent) -> TypeGuard[ShellWriteEvent]:
    return isinstance(event, ShellWriteEvent)


def is_user_notification_event(
    event: BaseStreamEvent,
) -> TypeGuard[UserNotificationEvent]:
    return isinstance(event, UserNotificationEvent)


def is_user_question_event(event: BaseStreamEvent) -> TypeGuard[UserQuestionEvent]:
    return isinstance(event, UserQuestionEvent)


def is_completed_task_event(event: BaseStreamEvent) -> TypeGuard[CompletedTaskEvent]:
    return isinstance(event, CompletedTaskEvent)


def is_image_generation_event(
    event: BaseStreamEvent,
) -> TypeGuard[ImageGenerationEvent]:
    return isinstance(event, ImageGenerationEvent)


class EventFactory:
    """Factory class for creating stream events based on EventType and data"""

    @staticmethod
    def create(event_type: EventType, data: Dict[str, Any]) -> BaseStreamEvent:
        """Create an event instance based on EventType and data dictionary"""

        logger.info(f"Creating event: {event_type} with data: {data}")

        event_mapping = {
            EventType.AGENT_CONNECTION_SUCCESS: AgentConnectionSuccessEvent,
            EventType.ERROR: ErrorEvent,
            EventType.WEB_SEARCH: WebSearchEvent,
            EventType.WEB_SEARCH_RESULT: WebSearchResultEvent,
            EventType.WEB_NAVIGATION: WebNavigationEvent,
            EventType.WEB_NAVIGATION_RESULT: WebNavigationResultEvent,
            EventType.FILE_READ: FileReadEvent,
            EventType.FILE_WRITE: FileWriteEvent,
            EventType.FILE_REPLACE: FileReplaceEvent,
            EventType.FILE_FIND: FileFindEvent,
            EventType.FILE_EXPLORE: FileExploreEvent,
            EventType.SHELL_EXEC: ShellExecEvent,
            EventType.SHELL_VIEW: ShellViewEvent,
            EventType.SHELL_WRITE: ShellWriteEvent,
            EventType.USER_NOTIFICATION: UserNotificationEvent,
            EventType.USER_QUESTION: UserQuestionEvent,
            EventType.COMPLETED_TASK: CompletedTaskEvent,
            EventType.IMAGE_GENERATION: ImageGenerationEvent,
        }

        if event_type not in event_mapping:
            raise ValueError(f"Unknown event type: {event_type}")

        event_class = event_mapping[event_type]
        return event_class(**data)

    def __call__(self, event_type: EventType, data: Dict[str, Any]) -> BaseStreamEvent:
        """Allow the factory to be called as EventFactory()(EventType, data)"""
        return self.create(event_type, data)


class AgentResponse:
    """Container for agent responses with all events and a final output"""
    
    def __init__(self):
        self.events = []
        
    def add_event(self, event):
        """Add an event to the response"""
        self.events.append(event)
    
    @property
    def output(self) -> Optional[str]:
        """Get the last output generated by the agent"""

        user_notifications = [event for event in self.events if isinstance(event, UserNotificationEvent)]
        if user_notifications:
            return user_notifications[-1].text
        else:
            return None

    def __repr__(self) -> str:
        """Debug representation showing event count"""
        return f"AgentResponse(events={len(self.events)}, output={repr(self.output)})"

    def to_dict(self) -> Dict[str, Any]:
        """Convert the response to a dictionary"""
        return {
            "events": [event.to_dict() for event in self.events],
            "output": self.output,
        }