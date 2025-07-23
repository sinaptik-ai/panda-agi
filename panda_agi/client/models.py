import inspect
import json
import logging
import os
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Literal, Optional, Union

import requests
from pydantic import BaseModel, Field

from panda_agi.train import TrainingModel

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


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

    # Skill Events
    USE_SKILL = "use_skill"
    USE_SKILL_RESULT = "use_skill_result"

    # Custom Tool Events
    USE_CUSTOM_TOOL = "use_custom_tool"
    USE_CUSTOM_TOOL_RESULT = "use_custom_tool_result"

    # Creative & Generation Events
    IMAGE_GENERATION = "image_generation"


# Message types that indicate completion/blocking operations
COMPLETION_MESSAGE_TYPES = [
    EventType.USER_QUESTION.value,
    EventType.COMPLETED_TASK.value,
    EventType.ERROR.value,
]


class Message(BaseModel):
    """Message model for agent-user communication."""

    role: Literal["user", "assistant", "system"]
    content: Optional[str] = None


class ToolsConfig(BaseModel):
    use_internet: bool = True
    use_filesystem: bool = True
    use_shell: bool = True
    use_image_generation: bool = True


class ToolParameterInfo(BaseModel):
    """Parameter information for a tool sent to backend"""

    name: str = Field(description="Parameter name")
    type: str = Field(description="Parameter type")
    description: str = Field(description="Parameter description")
    required: bool = Field(default=True, description="Whether parameter is required")
    default: Optional[Any] = Field(default=None, description="Default value if any")


class ToolInfo(BaseModel):
    """Tool information sent to backend"""

    name: str = Field(description="Tool name")
    description: str = Field(description="Tool description")
    parameters: List[ToolParameterInfo] = Field(description="Tool parameters")
    returns: str = Field(description="Return value description")
    examples: List[str] = Field(default=[], description="Usage examples")


class AgentRequestModel(BaseModel):
    """Agent request message structure"""

    conversation_id: Optional[str] = Field(
        default=None,
        description="Unique identifier for the conversation",
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="System prompt for the agent",
    )
    messages: Union[Message, List[Message]] = Field(
        default=None,
        description="Input messages for the agent, can be a single message or a list of messages",
    )
    environment_state: Optional[Dict] = Field(
        default=None,
        description="State of the environment",
    )
    model: str = Field(
        default="annie-pro",
        description="The model to use for processing the request",
    )
    tools_config: ToolsConfig = Field(
        default=ToolsConfig(),
        description="Configuration for the tools the agent can use",
    )
    tools: Optional[List[ToolInfo]] = Field(
        default=None,
        description="List of tools that the agent can use",
    )

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
    success: bool = Field(description="Whether the navigation was successful")
    url: Optional[str] = Field(default=None, description="URL that was navigated")
    content: Optional[str] = Field(default=None, description="Extracted page content")
    status_code: Optional[int] = Field(default=None, description="HTTP status code")


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
    append: bool = Field(default=False, description="Whether content was appended")


class FileReplaceEvent(BaseStreamEvent):
    """Event when agent replaces content in existing files"""

    type: str = "file_replace"
    file: str = Field(description="File path")
    old_str: str = Field(description="Content being replaced")
    new_str: str = Field(description="New content")


class FileFindEvent(BaseStreamEvent):
    """Event when agent searches for files or content within files"""

    type: str = "file_find"
    file: Optional[str] = Field(default=None, description="Directory searched")
    regex: Optional[str] = Field(default=None, description="Search pattern")
    path: Optional[str] = Field(default=None, description="Path to the file")
    glob_pattern: Optional[str] = Field(default=None, description="Search pattern")


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
    wait_seconds: Optional[float] = Field(
        default=3, description="Number of seconds to wait for output"
    )


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


class UseSkillEvent(BaseStreamEvent):
    """Event when agent uses a custom skill"""

    type: str = "use_skill"
    skill_name: str = Field(description="Name of the skill being used")
    parameters: Dict[str, Any] = Field(description="Parameters passed to the skill")


class UseSkillResultEvent(BaseStreamEvent):
    """Event when agent uses a custom skill"""

    type: str = "use_skill_result"
    skill_name: str = Field(description="Name of the skill being used")
    parameters: Dict[str, Any] = Field(description="Parameters passed to the skill")
    result: Optional[Dict[str, Any]] = Field(
        default=None, description="Result from skill execution"
    )


# Creative & Generation Events
class ImageGenerationEvent(BaseStreamEvent):
    """Event when agent generates images or visual content"""

    type: str = "image_generation"
    saved_files: List[str] = Field(description="List of saved images")
    images: List[str] = Field(description="List of images")


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
            EventType.USE_SKILL: UseSkillEvent,
            EventType.USE_SKILL_RESULT: UseSkillResultEvent,
            EventType.IMAGE_GENERATION: ImageGenerationEvent,
        }

        if event_type not in event_mapping:
            raise ValueError(f"Unknown event type: {event_type}")

        event_class = event_mapping[event_type]
        return event_class(**data)

    def __call__(self, event_type: EventType, data: Dict[str, Any]) -> BaseStreamEvent:
        """Allow the factory to be called as EventFactory()(EventType, data)"""
        return self.create(event_type, data)


class Knowledge(BaseModel):
    """Knowledge object"""

    content: str = Field(description="The knowledge content as a string")
    always_use: bool = Field(
        default=False,
        description="Whether to always use this knowledge, even if it's not relevant to the current task",
    )

    def __init__(self, content: str = None, **kwargs):
        """Initialize Knowledge with string content"""
        if content is not None:
            super().__init__(content=content, **kwargs)
        else:
            super().__init__(**kwargs)

    def __str__(self) -> str:
        """Convert Knowledge to string"""
        return self.content


class SkillParameter(BaseModel):
    """Parameter definition for a skill"""

    name: str = Field(description="Parameter name")
    type: str = Field(description="Parameter type")
    description: str = Field(description="Parameter description")
    required: bool = Field(default=True, description="Whether parameter is required")
    default: Optional[Any] = Field(default=None, description="Default value if any")


class Skill(BaseModel):
    """Skill object that wraps a function and its metadata"""

    name: str = Field(description="Skill name")
    description: str = Field(description="Skill description")
    parameters: List[SkillParameter] = Field(description="Skill parameters")
    returns: str = Field(description="Return value description")
    examples: List[str] = Field(default=[], description="Usage examples")
    function: Callable = Field(description="The actual function", exclude=True)

    class Config:
        arbitrary_types_allowed = True

    async def execute(self, **kwargs) -> Any:
        """Execute the skill with given parameters"""
        # parse parameters to the correct type
        for param in self.parameters:
            if param.name not in kwargs:
                # Skip parameters not provided (they might be optional)
                continue

            logger.info(
                f"Converting {param.name} to {param.type}: {kwargs[param.name]}"
            )

            # Skip conversion if value is already the correct type
            param_value = kwargs[param.name]
            if param.type == "str":
                kwargs[param.name] = str(param_value)
            elif param.type == "int":
                kwargs[param.name] = int(param_value)
            elif param.type == "float":
                kwargs[param.name] = float(param_value)
            elif param.type == "bool":
                kwargs[param.name] = bool(param_value)
            elif param.type == "list":
                if isinstance(param_value, str):
                    kwargs[param.name] = json.loads(param_value)
                else:
                    kwargs[param.name] = list(param_value)
            elif param.type == "dict":
                if isinstance(param_value, str):
                    kwargs[param.name] = json.loads(param_value)
                else:
                    kwargs[param.name] = dict(param_value)
            # For other types, leave as is

        return (
            await self.function(**kwargs)
            if inspect.iscoroutinefunction(self.function)
            else self.function(**kwargs)
        )

    def to_string(self) -> str:
        """Convert skill to string for agent"""
        return self.model_dump_json()

    def __str__(self) -> str:
        return f"Skill({self.name})"

    def __repr__(self) -> str:
        return f"Skill(name='{self.name}', parameters={len(self.parameters)})"

    def to_tool_info(self) -> "ToolInfo":
        """Convert skill to ToolInfo for backend communication"""
        return ToolInfo(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameterInfo(
                    name=param.name,
                    type=param.type,
                    description=param.description,
                    required=param.required,
                    default=param.default,
                )
                for param in self.parameters
            ],
            returns=self.returns,
            examples=self.examples,
        )


class CustomToolParameter(BaseModel):
    """Parameter definition for a custom tool"""

    name: str = Field(description="Parameter name")
    type: str = Field(description="Parameter type")
    description: str = Field(description="Parameter description")
    required: bool = Field(default=True, description="Whether parameter is required")
    default: Optional[Any] = Field(default=None, description="Default value if any")


class CustomTool(BaseModel):
    """Custom tool object that wraps a function and its metadata"""

    name: str = Field(description="Custom tool name")
    description: str = Field(description="Custom tool description")
    parameters: List[CustomToolParameter] = Field(description="Custom tool parameters")
    returns: str = Field(description="Return value description")
    examples: List[str] = Field(default=[], description="Usage examples")
    function: Callable = Field(description="The actual function", exclude=True)

    class Config:
        arbitrary_types_allowed = True

    async def execute(self, **kwargs) -> Any:
        """Execute the custom tool with given parameters"""
        # parse parameters to the correct type
        for param in self.parameters:
            if param.name not in kwargs:
                # Skip parameters not provided (they might be optional)
                continue

            logger.info(
                f"Converting {param.name} to {param.type}: {kwargs[param.name]}"
            )

            # Skip conversion if value is already the correct type
            param_value = kwargs[param.name]
            if param.type == "str":
                kwargs[param.name] = str(param_value)
            elif param.type == "int":
                kwargs[param.name] = int(param_value)
            elif param.type == "float":
                kwargs[param.name] = float(param_value)
            elif param.type == "bool":
                kwargs[param.name] = bool(param_value)
            elif param.type == "list":
                if isinstance(param_value, str):
                    kwargs[param.name] = json.loads(param_value)
                else:
                    kwargs[param.name] = list(param_value)
            elif param.type == "dict":
                if isinstance(param_value, str):
                    kwargs[param.name] = json.loads(param_value)
                else:
                    kwargs[param.name] = dict(param_value)
            # For other types, leave as is

        return (
            await self.function(**kwargs)
            if inspect.iscoroutinefunction(self.function)
            else self.function(**kwargs)
        )

    def to_string(self) -> str:
        """Convert custom tool to string for agent"""
        return self.model_dump_json()

    def __str__(self) -> str:
        return f"CustomTool({self.name})"

    def __repr__(self) -> str:
        return f"CustomTool(name='{self.name}', parameters={len(self.parameters)})"

    def to_tool_info(self) -> "ToolInfo":
        """Convert custom tool to ToolInfo for backend communication"""
        return ToolInfo(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameterInfo(
                    name=param.name,
                    type=param.type,
                    description=param.description,
                    required=param.required,
                    default=param.default,
                )
                for param in self.parameters
            ],
            returns=self.returns,
            examples=self.examples,
        )


class AgentResponse:
    """Container for agent responses with all events, chat history, tool calls, and cost information"""

    def __init__(self):
        self.conversation_id = None
        self.events = []
        self._chat_history = []
        self._tool_calls = []
        self._total_tokens = 0
        self._input_tokens = 0
        self._output_tokens = 0
        self._total_cost = 0.0
        self._initial_query = None

    def set_conversation_id(self, conversation_id: str):
        self.conversation_id = conversation_id

    def add_event(self, event):
        """Add an event to the response and process it for chat history, tool calls, and usage"""
        self.events.append(event)

        # Process different event types
        if isinstance(event, UserNotificationEvent):
            # Add assistant messages to chat history
            self._chat_history.append(
                {
                    "role": "assistant",
                    "content": event.text,
                    "timestamp": getattr(event, "timestamp", None),
                    "attachments": event.attachments,
                }
            )

        elif isinstance(event, dict):
            event_type = event.get("type")

            # Handle token events that may contain cost data
            if event_type == "token":
                self._process_token_event(event)

            # Handle tool execution events
            elif event_type == "tool_execution":
                self._process_tool_execution_event(event)

            # Handle tools_executed events (summary of tool execution)
            elif event_type == "tools_executed":
                # This indicates tools were executed, we can extract info if needed
                pass

            # Check for cost data directly in the event
            if "cost" in event or "input_tokens" in event or "output_tokens" in event:
                self._update_usage(event)

        # Extract usage information if available
        if hasattr(event, "usage") and event.usage:
            self._update_usage(event.usage)
        elif isinstance(event, dict) and "usage" in event:
            self._update_usage(event["usage"])

    def _process_token_event(self, event):
        """Process token events to extract cost data and user messages"""
        import re

        raw_token = event.get("raw_token", "")
        content = event.get("content", "")

        # Check for cost data in the raw token (format: '...{"cost": 0.009702, "input_tokens": 4803, "output_tokens": 12}')
        cost_pattern = r'\{"cost":\s*([0-9.]+),\s*"input_tokens":\s*(\d+),\s*"output_tokens":\s*(\d+)\}'
        cost_match = re.search(cost_pattern, raw_token)
        if cost_match:
            try:
                cost_data = {
                    "cost": float(cost_match.group(1)),
                    "input_tokens": int(cost_match.group(2)),
                    "output_tokens": int(cost_match.group(3)),
                }
                self._update_usage(cost_data)
            except (ValueError, IndexError):
                pass

        # Check for user_send_message content to add to chat history
        user_msg_pattern = r"<user_send_message>(.*?)</user_send_message>"
        user_msg_match = re.search(user_msg_pattern, content, re.DOTALL)
        if user_msg_match:
            message_text = user_msg_match.group(1).strip()
            if message_text:  # Only add non-empty messages
                self._chat_history.append(
                    {
                        "role": "assistant",
                        "content": message_text,
                        "timestamp": event.get("timestamp"),
                        "attachments": None,
                    }
                )

        # Check for tool calls in the content (e.g., <write_joke topic="Python"></write_joke>)
        tool_call_pattern = r"<(\w+)([^>]*)></\1>"
        tool_call_matches = re.finditer(tool_call_pattern, content)
        for match in tool_call_matches:
            tool_name = match.group(1)
            attributes_str = match.group(2)

            # Skip system tools like user_send_message and completed_task
            if tool_name in ["user_send_message", "completed_task"]:
                continue

            # Parse attributes
            arguments = {}
            attr_pattern = r'(\w+)="([^"]*?)"'
            for attr_match in re.finditer(attr_pattern, attributes_str):
                attr_name = attr_match.group(1)
                attr_value = attr_match.group(2)
                arguments[attr_name] = attr_value

            # Create a tool call entry
            tool_call_id = f"tool_call_{len(self._tool_calls) + 1}"
            tool_call = {
                "tool_call_id": tool_call_id,
                "function_name": tool_name,
                "xml_tag_name": tool_name,
                "arguments": arguments,
                "status": "completed",  # Assume completed since we're seeing the result
                "start_time": event.get("timestamp"),
                "end_time": event.get("timestamp"),
                "result": None,  # Will be filled when we see the result
                "error": None,
            }

            # Check if this tool call already exists
            existing_call = None
            for call in self._tool_calls:
                if (
                    call["function_name"] == tool_name
                    and call["arguments"] == arguments
                ):
                    existing_call = call
                    break

            if existing_call is None:
                self._tool_calls.append(tool_call)

    def _process_tool_execution_event(self, event):
        """Process tool execution events and track tool calls"""
        tool_call_id = event.get("tool_call_id")
        function_name = event.get("function_name")
        status = event.get("status")

        # Find existing tool call or create new one
        existing_call = None
        for call in self._tool_calls:
            if call.get("tool_call_id") == tool_call_id:
                existing_call = call
                break

        if existing_call is None:
            # Create new tool call entry
            tool_call = {
                "tool_call_id": tool_call_id,
                "function_name": function_name,
                "xml_tag_name": event.get("xml_tag_name"),
                "arguments": event.get("arguments", {}),
                "status": status,
                "start_time": None,
                "end_time": None,
                "result": None,
                "error": None,
            }
            self._tool_calls.append(tool_call)
            existing_call = tool_call

        # Update tool call based on status
        if status == "started":
            existing_call["start_time"] = getattr(event, "timestamp", None)
        elif status == "completed":
            existing_call["end_time"] = getattr(event, "timestamp", None)
            existing_call["result"] = event.get("result")
            existing_call["status"] = "completed"
        elif status == "failed":
            existing_call["end_time"] = getattr(event, "timestamp", None)
            existing_call["error"] = event.get("error")
            existing_call["status"] = "failed"

    def _update_usage(self, usage):
        """Update token usage and cost information from stream data"""
        if isinstance(usage, dict):
            # Handle real cost data from token stream: {'cost': 0.010093999999999999, 'input_tokens': 4931, 'output_tokens': 29}
            if "cost" in usage:
                self._total_cost += usage.get("cost", 0.0)
            if "input_tokens" in usage:
                self._input_tokens += usage.get("input_tokens", 0)
            if "output_tokens" in usage:
                self._output_tokens += usage.get("output_tokens", 0)

        elif hasattr(usage, "prompt_tokens"):
            # Handle LLMUsage object (legacy format)
            self._input_tokens += getattr(usage, "prompt_tokens", 0)
            self._output_tokens += getattr(usage, "completion_tokens", 0)
            self._total_tokens += getattr(usage, "total_tokens", 0)

    def set_initial_query(self, query: str):
        """Set the initial user query"""
        self._initial_query = query
        self._chat_history.append({"role": "user", "content": query, "timestamp": None})

    @property
    def output(self) -> Optional[str]:
        """Get the last output generated by the agent"""

        user_notifications = [
            event for event in self.events if isinstance(event, UserNotificationEvent)
        ]
        if user_notifications:
            return user_notifications[-1].text
        else:
            return None

    @property
    def attachments(self) -> Optional[List[str]]:
        """Get the attachments from the last UserNotificationEvent"""
        user_notifications = [
            event for event in self.events if isinstance(event, UserNotificationEvent)
        ]
        if user_notifications:
            return user_notifications[-1].attachments
        else:
            return None

    @property
    def chat_history(self) -> List[Dict[str, Any]]:
        """Get the complete chat history between user and assistant"""
        return self._chat_history.copy()

    @property
    def tool_calls(self) -> List[Dict[str, Any]]:
        """Get all tool calls made during the conversation"""
        return self._tool_calls.copy()

    @property
    def usage(self) -> Dict[str, int]:
        """Get token usage information"""
        return {
            "input_tokens": self._input_tokens,
            "output_tokens": self._output_tokens,
            "total_tokens": self._total_tokens,
            # Include legacy format for backward compatibility
            "prompt_tokens": self._input_tokens,
            "completion_tokens": self._output_tokens,
        }

    @property
    def cost(self) -> Dict[str, float]:
        """Get actual cost information from token stream"""
        return {"total_cost": round(self._total_cost, 6), "currency": "USD"}

    def __repr__(self) -> str:
        """Debug representation showing comprehensive information"""
        return (
            f"AgentResponse(events={len(self.events)}, "
            f"chat_messages={len(self._chat_history)}, "
            f"tool_calls={len(self._tool_calls)}, "
            f"total_tokens={self._total_tokens}, "
            f"total_cost=${self._total_cost:.6f}, "
            f"output={repr(self.output)})"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert the response to a dictionary with comprehensive information"""
        return {
            "events": [
                event.to_dict() if hasattr(event, "to_dict") else event
                for event in self.events
            ],
            "output": self.output,
            "attachments": self.attachments,
            "chat_history": self.chat_history,
            "tool_calls": self.tool_calls,
            "usage": self.usage,
            "cost": self.cost,
            "initial_query": self._initial_query,
        }

    def _retrieve_conversation_messages(self, conversation_id: str):
        """Send LLM trace data to the backend server.

        Args:
            conversation_id: The ID of the conversation whose messages are to be retrieved

        Returns:
            bool: True if successful, False otherwise
        """
        # Get API key from environment variable
        api_key = os.environ.get("PANDA_AGI_KEY")
        if not api_key:
            logger.warning(
                "Warning: PANDA_AGI_KEY environment variable not set. Cannot send traces to backend."
            )
            return False

        # Get server URL from environment variable or use default
        server_url = os.environ.get("PANDA_AGI_SERVER", "https://agi-api.pandas-ai.com")
        backend_url = f"{server_url}/conversations/{conversation_id}/messages"

        try:
            # Set up headers with API key
            headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

            # Send data to backend
            response = requests.get(
                backend_url,
                headers=headers,
            )

            # Check if request was successful
            if response.status_code == 200 or response.status_code == 201:
                return response.json()
            else:
                logger.error(
                    f"Error retrieving conversation messages from backend: {response.status_code} - {response.text}"
                )
                return False

        except Exception as e:
            logger.error(
                f"Error retrieving conversation messages from backend: {str(e)}"
            )
            return False

    def collect(
        self,
        model: TrainingModel,
        tags: Optional[List[str]] = None,
        meta: Optional[Dict[str, Any]] = None,
    ):
        """
        Collect the conversation data and send it to the backend server for training.

        Args:
            model: The TrainingModel instance to use for collecting the conversation data
            tags (Optional[List[str]]): List of tags to categorize the conversation
        """

        conversation_messages = self._retrieve_conversation_messages(
            self.conversation_id
        )

        if conversation_messages:
            conversation_messages = [
                message.get("content") for message in conversation_messages
            ]

            model.collect(
                conversation_messages=conversation_messages,
                tags=tags or [],
                meta=meta or {},
            )
