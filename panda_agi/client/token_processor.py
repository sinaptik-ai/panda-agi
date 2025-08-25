import json
import logging
import re
from typing import Any, AsyncGenerator, Dict, List, Optional

logger = logging.getLogger("TokenProcessor")
logger.setLevel(logging.INFO)


class TokenProcessor:
    """Simple processor to collect and handle streaming tokens with XML tool detection"""

    def __init__(self, tool_registry=None, collect_mode=False):
        self.collected_tokens: List[str] = []
        self.accumulated_content = ""
        self.xml_buffer = ""  # Buffer for detecting XML tool calls
        self.tool_registry = tool_registry
        self.completed_tools: List[Dict[str, Any]] = []  # Store completed tool calls
        self.tool_call_id_counter = 0
        self.collect_mode = collect_mode  # If True, collect tools for later execution
        self.immediate_execution_mode = (
            False  # If True, collect tools AND yield events for immediate execution
        )
        self.started_tools: Dict[str, Dict[str, Any]] = {}  # Track tools that have started but not completed

    def reset(self):
        """Reset the processor state"""
        self.collected_tokens.clear()
        self.accumulated_content = ""
        self.xml_buffer = ""
        self.completed_tools.clear()
        self.started_tools.clear()
        self.tool_call_id_counter = 0

    async def process_token_stream(
        self, token_stream: AsyncGenerator[str, None]
    ) -> AsyncGenerator[Dict[str, str], None]:
        """
        Process streaming tokens and yield processed events including XML tool detection

        Args:
            token_stream: AsyncGenerator that yields raw tokens

        Yields:
            Dictionary events with token information and tool events
        """
        try:
            async for token in token_stream:
                # Yield conversation_id if it's in the token
                if "conversation_id" in token:
                    yield {
                        "type": "conversation_id",
                        "conversation_id": token["conversation_id"],
                    }
                    continue

                logger.debug(f"Processing token: {token}")
                # Collect the raw token
                self.collected_tokens.append(token)

                if '{"error_panda_server"' in token:
                    logger.error(f"Raising error: {token}")
                    error_message = json.loads(token)
                    raise Exception(
                        error_message.get(
                            "error_panda_server",
                            "Something went wrong, try again in a few minutes",
                        )
                    )

                try:
                    self.accumulated_content += token
                    self.xml_buffer += token

                    # Check for XML tool calls and yield tool events
                    async for tool_event in self._process_xml_tools_and_yield_events(
                        token
                    ):
                        logger.debug(f"Yielding XML tool call: {tool_event}")
                        yield tool_event

                    yield {
                        "type": "token",
                        "raw_token": token,
                        "parsed_data": None,
                        "content": token,
                        "accumulated_content": self.accumulated_content,
                    }

                except Exception as e:
                    logger.error(f"Error processing token: {e}")

        except Exception as e:
            logger.error(f"Error processing token stream: {e}")
            raise e

    async def _process_xml_tools_and_yield_events(
        self, new_content: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process XML tool calls from the buffer and yield tool events or collect them"""
        if not self.tool_registry:
            return

        # First, check for opening tags to emit start events
        async for start_event in self._detect_opening_tags_and_yield_start_events():
            yield start_event

        # Then, look for complete XML tool calls
        xml_chunks = self._extract_xml_chunks(self.xml_buffer)

        for chunk in xml_chunks:
            # Remove processed chunk from buffer
            self.xml_buffer = self.xml_buffer.replace(chunk, "", 1)

            # Parse the XML tool call
            tool_call = self._parse_xml_tool_call(chunk)
            if tool_call:
                # Always store the completed tool call
                self.completed_tools.append(tool_call)

                logger.info(f"Detected XML tool call: {tool_call['function_name']}")

                # Find and remove the corresponding start event from started_tools
                # We need to find the start event that matches this complete tool
                start_tool_id = None
                for position_key, start_tool in self.started_tools.items():
                    if (start_tool["xml_tag_name"] == tool_call.get("xml_tag_name") and 
                        start_tool["function_name"] == tool_call["function_name"]):
                        start_tool_id = start_tool["id"]
                        del self.started_tools[position_key]
                        break

                # Use the start tool ID if we found one, otherwise generate a new ID
                final_tool_call_id = start_tool_id if start_tool_id else tool_call["id"]

                # Yield tool_detected event (this is the "end" event)
                yield {
                    "type": "tool_detected",
                    "function_name": tool_call["function_name"],
                    "arguments": tool_call["arguments"],
                    "tool_call_id": final_tool_call_id,
                    "xml_tag_name": tool_call.get("xml_tag_name"),
                    "raw_xml": tool_call.get("raw_xml"),
                    "status": "end",  # Mark this as the end event
                }

    async def _detect_opening_tags_and_yield_start_events(
        self,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Detect opening XML tags and yield start events for tools"""
        if not self.tool_registry:
            return

        # Get all known XML tag names from the registry
        xml_patterns = self.tool_registry.get_all_xml_patterns()
        if not xml_patterns:
            return

        # Extract tag names from patterns (assuming patterns are like r'<tag_name[^>]*>.*?</tag_name>')
        tag_names = set()
        for pattern in xml_patterns:
            # Extract tag name from pattern - look for the first capturing group or tag name
            tag_match = re.search(r'<([^>\s\[\^]+)', pattern)
            if tag_match:
                tag_names.add(tag_match.group(1))

        # Look for opening tags in the buffer
        for tag_name in tag_names:
            # Pattern to match opening tag (with or without attributes)
            opening_tag_pattern = f'<{tag_name}(?:[^>]*)>'
            matches = list(re.finditer(opening_tag_pattern, self.xml_buffer, re.IGNORECASE))
            
            for match in matches:
                opening_tag = match.group(0)
                match_start = match.start()
                match_end = match.end()
                
                # Create a unique identifier for this specific opening tag position
                position_key = f"{tag_name}_{match_start}_{match_end}"
                
                # Check if we've already emitted a start event for this tag at this position
                if position_key not in self.started_tools:
                    # Get tool definition from registry
                    tool_def = self.tool_registry.get_xml_tool_definition(tag_name)
                    if tool_def:
                        # Generate a proper tool call ID
                        self.tool_call_id_counter += 1
                        tool_call_id = f"tool_call_{self.tool_call_id_counter}"
                        
                        # Extract attributes from opening tag
                        attributes = self._extract_attributes(opening_tag)
                        
                        # Create partial tool call for start event
                        start_tool_call = {
                            "id": tool_call_id,
                            "function_name": tool_def.function_name,
                            "xml_tag_name": tag_name,
                            "arguments": attributes,  # Only attributes available at start
                            "raw_xml": opening_tag,
                            "position_key": position_key,
                        }
                        
                        # Store in started_tools using position_key to avoid duplicate start events
                        self.started_tools[position_key] = start_tool_call
                        
                        logger.info(f"Detected XML tool start: {tool_def.function_name}")
                        
                        # Yield tool start event
                        yield {
                            "type": "tool_detected",
                            "function_name": tool_def.function_name,
                            "arguments": attributes,
                            "tool_call_id": tool_call_id,
                            "xml_tag_name": tag_name,
                            "raw_xml": opening_tag,
                            "status": "start",  # Mark this as the start event
                        }

    async def _process_xml_tools(self, new_content: str):
        """Process XML tool calls from the buffer (legacy method for backward compatibility)"""
        if not self.tool_registry:
            return

        # Look for complete XML tool calls
        xml_chunks = self._extract_xml_chunks(self.xml_buffer)

        for chunk in xml_chunks:
            # Remove processed chunk from buffer
            self.xml_buffer = self.xml_buffer.replace(chunk, "", 1)

            # Parse the XML tool call
            tool_call = self._parse_xml_tool_call(chunk)
            if tool_call:
                # Create tool execution event
                self.completed_tools.append(tool_call)

                # The tool will be executed by the agent when it processes these events
                logger.info(f"Detected XML tool call: {tool_call['function_name']}")

    def _extract_xml_chunks(self, content: str) -> List[str]:
        """Extract complete XML chunks from content using registry patterns"""
        if not self.tool_registry:
            return []

        chunks = []

        # Get XML patterns from registry
        xml_patterns = self.tool_registry.get_all_xml_patterns()

        for pattern in xml_patterns:
            matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)
            chunks.extend(matches)

        return chunks

    def _parse_xml_tool_call(self, xml_chunk: str) -> Optional[Dict[str, Any]]:
        """Parse an XML chunk into a tool call using registry definitions"""
        try:
            # Extract the tag name
            tag_match = re.match(r"<([^>\s]+)", xml_chunk)
            if not tag_match:
                return None

            xml_tag = tag_match.group(1)

            # Get tool definition from registry
            tool_def = self.tool_registry.get_xml_tool_definition(xml_tag)
            if not tool_def:
                logger.warning(f"No XML tool definition found for tag: {xml_tag}")
                return None

            # Create a unique ID for this tool call
            self.tool_call_id_counter += 1
            tool_call_id = f"tool_call_{self.tool_call_id_counter}"

            # Extract attributes and content
            attributes = self._extract_attributes(xml_chunk)
            content = self._extract_tag_content(xml_chunk, xml_tag)

            # Build arguments using tool definition
            arguments = self._build_arguments_from_definition(
                tool_def, attributes, content
            )

            tool_call = {
                "id": tool_call_id,
                "function_name": tool_def.function_name,
                "xml_tag_name": xml_tag,
                "arguments": arguments,
                "raw_xml": xml_chunk,
            }

            logger.debug(f"Parsed XML tool call: {tool_call}")
            return tool_call

        except Exception as e:
            logger.error(f"Error parsing XML tool call: {e}")
            return None

    def _build_arguments_from_definition(
        self, tool_def, attributes: Dict[str, str], content: Optional[str]
    ) -> Dict[str, Any]:
        """Build tool arguments from XML tool definition"""
        arguments = {}

        # Map attributes using attribute mappings
        for xml_attr, param_name in tool_def.attribute_mappings.items():
            if xml_attr in attributes:
                arguments[param_name] = attributes[xml_attr]

        # Handle content parameter
        if content and tool_def.content_param:
            arguments[tool_def.content_param] = content.strip()

        # Special handling for shell_exec: use content as command if no command attribute
        if tool_def.function_name == "shell_exec_command" and content:
            if "command" not in arguments:
                arguments["command"] = content.strip()

        # Add default values for required parameters if missing
        self._add_default_values(tool_def, arguments)

        return arguments

    def _add_default_values(self, tool_def, arguments: Dict[str, Any]):
        """Add default values for missing required parameters"""
        function_name = tool_def.function_name

        # Special handling for shell_exec_command
        if function_name == "shell_exec_command":
            if "id" not in arguments:
                arguments["id"] = f"exec_{self.tool_call_id_counter}"
            if "exec_dir" not in arguments:
                arguments["exec_dir"] = "."

    def _extract_attributes(self, xml_chunk: str) -> Dict[str, str]:
        """Extract attributes from XML opening tag"""
        attributes = {}

        # Find the opening tag
        opening_tag_match = re.match(r"<[^>]*>", xml_chunk)
        if not opening_tag_match:
            return attributes

        opening_tag = opening_tag_match.group(0)

        # Extract attributes using regex
        attr_pattern = r'(\w+)=(["\'])(.*?)\2'
        matches = re.findall(attr_pattern, opening_tag)

        for attr_name, quote, attr_value in matches:
            attributes[attr_name] = attr_value

        return attributes

    def _extract_tag_content(self, xml_chunk: str, tag_name: str) -> Optional[str]:
        """Extract content between opening and closing tags"""
        try:
            # Simple pattern to extract content
            pattern = f"<{tag_name}[^>]*>(.*?)</{tag_name}>"
            match = re.search(pattern, xml_chunk, re.DOTALL)

            if match:
                return match.group(1).strip()

            return None

        except Exception as e:
            logger.error(f"Error extracting tag content: {e}")
            return None

    def _map_xml_tag_to_function(self, xml_tag: str) -> Optional[str]:
        """Map XML tag names to function names using registry"""
        if not self.tool_registry:
            return None

        function_mapping = self.tool_registry.get_xml_function_mapping()
        return function_mapping.get(xml_tag)

    def _extract_content(self, data: Dict) -> str:
        """Extract content from structured token data"""
        # Common patterns for extracting content from streaming responses
        if "choices" in data and isinstance(data["choices"], list) and data["choices"]:
            choice = data["choices"][0]
            if "delta" in choice and "content" in choice["delta"]:
                return choice["delta"]["content"] or ""

        if "content" in data:
            return str(data["content"])

        if "text" in data:
            return str(data["text"])

        return ""

    def get_collected_tokens(self) -> List[str]:
        """Get all collected tokens"""
        return self.collected_tokens.copy()

    def get_accumulated_content(self) -> str:
        """Get the accumulated content"""
        return self.accumulated_content

    def get_completed_tools(self) -> List[Dict[str, Any]]:
        """Get all completed tool calls detected in the stream"""
        return self.completed_tools.copy()

    def get_token_count(self) -> int:
        """Get the number of tokens collected"""
        return len(self.collected_tokens)

    def has_completed_tools(self) -> bool:
        """Check if any tools have been completed"""
        return len(self.completed_tools) > 0

    def create_tool_execution_event(
        self,
        tool_call: Dict[str, Any],
        status: str = "started",
        result: Any = None,
        error: str = None,
    ) -> Dict[str, Any]:
        """Create a tool execution event with the given status and optional result/error"""
        event = {
            "type": "tool_execution",
            "tool_call_id": tool_call["id"],
            "function_name": tool_call["function_name"],
            "xml_tag_name": tool_call.get("xml_tag_name"),
            "arguments": tool_call["arguments"],
            "status": status,  # started, completed, failed
        }

        if result is not None:
            event["result"] = result

        if error is not None:
            event["error"] = error

        return event

    def create_tool_event(
        self,
        tool_call: Dict[str, Any],
        status: str = "start",
        result: Any = None,
        error: str = None,
    ) -> Dict[str, Any]:
        """Create a tool execution event"""
        event = {
            "type": "tool_execution",
            "tool_call_id": tool_call["id"],
            "function_name": tool_call["function_name"],
            "xml_tag_name": tool_call.get("xml_tag_name"),
            "arguments": tool_call["arguments"],
            "status": status,  # start, end, error
        }

        if result is not None:
            event["result"] = result

        if error is not None:
            event["error"] = error

        return event

    def set_collect_mode(self, collect_mode: bool):
        """Set whether to collect tools for end-of-stream execution"""
        self.collect_mode = collect_mode

    def set_immediate_execution_mode(self, immediate_execution_mode: bool):
        """Set whether to execute tools immediately while also collecting them"""
        self.immediate_execution_mode = immediate_execution_mode

    def set_execution_modes(
        self, collect_mode: bool = False, immediate_execution_mode: bool = False
    ):
        """Set both execution modes at once for convenience"""
        self.collect_mode = collect_mode
        self.immediate_execution_mode = immediate_execution_mode

    def get_collected_tools(self) -> List[Dict[str, Any]]:
        """Get all collected tool calls"""
        return self.completed_tools.copy()

    def clear_collected_tools(self):
        """Clear the collected tools list"""
        self.completed_tools.clear()
