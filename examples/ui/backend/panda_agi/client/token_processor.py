import json
import logging
import re
from enum import Enum
from typing import Any, AsyncGenerator, Dict, List, Optional

logger = logging.getLogger("TokenProcessor")
logger.setLevel(logging.INFO)


class ToolCallState(Enum):
    """Track the current state of tool call parsing"""

    NONE = "none"
    STARTED = "started"
    FUNCTION_OPEN = "function_open"
    PARAMETER_OPEN = "parameter_open"
    COMPLETED = "completed"


class TokenProcessor:
    """Enhanced processor to handle new tool call format with parameter-level events"""

    def __init__(self, tool_registry=None, collect_mode=False):
        self.collected_tokens: List[str] = []
        self.accumulated_content = ""
        self.tool_call_buffer = ""  # Buffer for detecting tool calls
        self.tool_registry = tool_registry
        self.completed_tools: List[Dict[str, Any]] = []
        self.tool_call_id_counter = 0
        self.collect_mode = collect_mode
        self.immediate_execution_mode = False

        # Enhanced state tracking for new format
        self.current_tool_state = ToolCallState.NONE
        self.current_tool_call: Optional[Dict[str, Any]] = None
        self.current_parameter_name: Optional[str] = None
        self.current_parameter_value = ""
        self.parameter_buffer = ""

        # Patterns for new tool call format
        self.tool_call_start_pattern = r"<tool_call>"
        self.tool_call_end_pattern = r"</tool_call>"
        self.function_start_pattern = r"<function=([^>]+)>"
        self.function_end_pattern = r"</function>"
        self.parameter_start_pattern = r"<parameter=([^>]+)>"
        self.parameter_end_pattern = r"</parameter>"

    def reset(self):
        """Reset the processor state"""
        self.collected_tokens.clear()
        self.accumulated_content = ""
        self.tool_call_buffer = ""
        self.completed_tools.clear()
        self.tool_call_id_counter = 0
        self.current_tool_state = ToolCallState.NONE
        self.current_tool_call = None
        self.current_parameter_name = None
        self.current_parameter_value = ""
        self.parameter_buffer = ""

    async def process_token_stream(
        self, token_stream: AsyncGenerator[str, None]
    ) -> AsyncGenerator[Dict[str, str], None]:
        """
        Process streaming tokens and yield events for the new tool call format
        """
        try:
            async for token in token_stream:
                # Handle conversation_id if present
                if isinstance(token, dict) and "conversation_id" in token:
                    yield {
                        "type": "conversation_id",
                        "conversation_id": token["conversation_id"],
                    }
                    continue

                # Handle error tokens
                if isinstance(token, str) and '{"error_panda_server"' in token:
                    logger.error(f"Raising error: {token}")
                    error_message = json.loads(token)
                    raise Exception(
                        error_message.get(
                            "error_panda_server",
                            "Something went wrong, try again in a few minutes",
                        )
                    )

                # Process string tokens
                if isinstance(token, str):
                    self.collected_tokens.append(token)
                    self.accumulated_content += token
                    self.tool_call_buffer += token

                    # Process tool call events
                    async for tool_event in self._process_new_tool_calls(token):
                        yield tool_event

                    # Yield standard token event if not inside a tool call
                    if self.current_tool_state == ToolCallState.NONE:
                        yield {
                            "type": "token",
                            "raw_token": token,
                            "parsed_data": None,
                            "content": token,
                            "accumulated_content": self.accumulated_content,
                        }

        except Exception as e:
            logger.error(f"Error processing token stream: {e}")
            raise e

    async def _process_new_tool_calls(
        self, new_token: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process the new tool call format and yield events for each stage"""

        # Check for tool call start
        if self.current_tool_state == ToolCallState.NONE:
            if re.search(self.tool_call_start_pattern, self.tool_call_buffer):
                self.current_tool_state = ToolCallState.STARTED
                self.tool_call_id_counter += 1
                tool_call_id = f"tool_call_{self.tool_call_id_counter}"

                self.current_tool_call = {
                    "id": tool_call_id,
                    "function_name": None,
                    "arguments": {},
                    "status": "started",
                }

                yield {
                    "type": "tool_call_start",
                    "tool_call_id": tool_call_id,
                    "status": "started",
                }

                # Clean processed content from buffer
                self.tool_call_buffer = re.sub(
                    self.tool_call_start_pattern, "", self.tool_call_buffer, count=1
                )

        # Check for function declaration
        if (
            self.current_tool_state == ToolCallState.STARTED
            and self.current_tool_call is not None
        ):
            function_match = re.search(
                self.function_start_pattern, self.tool_call_buffer
            )
            if function_match:
                function_name = function_match.group(1)
                self.current_tool_call["function_name"] = function_name
                self.current_tool_state = ToolCallState.FUNCTION_OPEN

                yield {
                    "type": "tool_function_detected",
                    "tool_call_id": self.current_tool_call["id"],
                    "function_name": function_name,
                    "status": "function_detected",
                }

                # Clean processed content from buffer
                self.tool_call_buffer = re.sub(
                    self.function_start_pattern, "", self.tool_call_buffer, count=1
                )

        # Check for parameter start
        if (
            self.current_tool_state == ToolCallState.FUNCTION_OPEN
            and self.current_tool_call is not None
        ):
            param_match = re.search(self.parameter_start_pattern, self.tool_call_buffer)
            if param_match:
                param_name = param_match.group(1)
                self.current_parameter_name = param_name
                self.current_parameter_value = ""
                self.parameter_buffer = ""
                self.current_tool_state = ToolCallState.PARAMETER_OPEN

                yield {
                    "type": "tool_parameter_start",
                    "tool_call_id": self.current_tool_call["id"],
                    "parameter_name": param_name,
                    "status": "parameter_started",
                }

                # Clean processed content from buffer
                self.tool_call_buffer = re.sub(
                    self.parameter_start_pattern, "", self.tool_call_buffer, count=1
                )

        # Handle parameter content and end
        if (
            self.current_tool_state == ToolCallState.PARAMETER_OPEN
            and self.current_tool_call is not None
        ):
            # Check for parameter end
            if re.search(self.parameter_end_pattern, self.tool_call_buffer):
                # Extract parameter value (everything before the closing tag)
                param_end_match = re.search(
                    self.parameter_end_pattern, self.tool_call_buffer
                )
                if param_end_match:
                    param_content = self.tool_call_buffer[
                        : param_end_match.start()
                    ].strip()

                    # Try to parse as JSON for arrays/objects, otherwise keep as string
                    try:
                        if param_content.startswith(("[", "{")):
                            param_value = json.loads(param_content)
                        else:
                            param_value = param_content
                    except json.JSONDecodeError:
                        param_value = param_content

                    self.current_tool_call["arguments"][self.current_parameter_name] = (
                        param_value
                    )

                    yield {
                        "type": "tool_parameter_complete",
                        "tool_call_id": self.current_tool_call["id"],
                        "parameter_name": self.current_parameter_name,
                        "parameter_value": param_value,
                        "status": "parameter_completed",
                    }

                    # Clean processed content from buffer
                    self.tool_call_buffer = self.tool_call_buffer[
                        param_end_match.end() :
                    ]
                    self.current_tool_state = ToolCallState.FUNCTION_OPEN
                    self.current_parameter_name = None
            else:
                # Still accumulating parameter content - yield streaming update
                if new_token and self.current_parameter_name:
                    yield {
                        "type": "tool_parameter_stream",
                        "tool_call_id": self.current_tool_call["id"],
                        "parameter_name": self.current_parameter_name,
                        "partial_value": new_token,
                        "status": "parameter_streaming",
                    }

        # Check for function end
        if (
            self.current_tool_state == ToolCallState.FUNCTION_OPEN
            and self.current_tool_call is not None
        ):
            if re.search(self.function_end_pattern, self.tool_call_buffer):
                yield {
                    "type": "tool_function_complete",
                    "tool_call_id": self.current_tool_call["id"],
                    "function_name": self.current_tool_call["function_name"],
                    "arguments": self.current_tool_call["arguments"],
                    "status": "function_completed",
                }

                # Clean processed content from buffer
                self.tool_call_buffer = re.sub(
                    self.function_end_pattern, "", self.tool_call_buffer, count=1
                )

        # Check for tool call end
        if re.search(self.tool_call_end_pattern, self.tool_call_buffer):
            if self.current_tool_call is not None:
                self.current_tool_call["status"] = "completed"
                self.completed_tools.append(self.current_tool_call.copy())

                yield {
                    "type": "tool_call_complete",
                    "tool_call_id": self.current_tool_call["id"],
                    "function_name": self.current_tool_call["function_name"],
                    "arguments": self.current_tool_call["arguments"],
                    "status": "completed",
                }

                # Reset state for next tool call
                self.current_tool_state = ToolCallState.NONE
                self.current_tool_call = None
                self.current_parameter_name = None
                self.current_parameter_value = ""

            # Clean processed content from buffer regardless
            self.tool_call_buffer = re.sub(
                self.tool_call_end_pattern, "", self.tool_call_buffer, count=1
            )

    def get_collected_tokens(self) -> List[str]:
        """Get all collected tokens"""
        return self.collected_tokens.copy()

    def get_accumulated_content(self) -> str:
        """Get the accumulated content"""
        return self.accumulated_content

    def get_completed_tools(self) -> List[Dict[str, Any]]:
        """Get all completed tool calls"""
        return self.completed_tools.copy()

    def get_token_count(self) -> int:
        """Get the number of tokens collected"""
        return len(self.collected_tokens)

    def has_completed_tools(self) -> bool:
        """Check if any tools have been completed"""
        return len(self.completed_tools) > 0

    def get_current_tool_state(self) -> ToolCallState:
        """Get the current tool call parsing state"""
        return self.current_tool_state

    def get_current_tool_call(self) -> Optional[Dict[str, Any]]:
        """Get the currently processing tool call"""
        return self.current_tool_call.copy() if self.current_tool_call else None

    def create_tool_execution_event(
        self,
        tool_call: Dict[str, Any],
        status: str = "started",
        result: Any = None,
        error: str = None,
    ) -> Dict[str, Any]:
        """Create a tool execution event"""
        event = {
            "type": "tool_execution",
            "tool_call_id": tool_call["id"],
            "function_name": tool_call["function_name"],
            "arguments": tool_call["arguments"],
            "status": status,
        }

        if result is not None:
            event["result"] = result

        if error is not None:
            event["error"] = error

        return event

    def set_immediate_execution_mode(self, immediate_execution_mode: bool):
        """Set whether to execute tools immediately"""
        self.immediate_execution_mode = immediate_execution_mode

    def clear_collected_tools(self):
        """Clear the collected tools list"""
        self.completed_tools.clear()
