import logging
import os
from datetime import datetime
from typing import (
    Any,
    AsyncGenerator,
    Callable,
    Dict,
    List,
    Optional,
    Tuple,
    Union,
)

import httpx
from dotenv import load_dotenv

from ..envs import BaseEnv
from ..handlers.base_handler import BaseHandler
from ..tools import ToolRegistry
from ..tools.base import ToolHandler
from ..tools.file_system_ops import file_explore_directory
from .models import (
    AgentRequestModel,
    AgentResponse,
    BaseStreamEvent,
    Message,
    Skill,
    ToolsConfig,
)
from .panda_agi_client import PandaAgiClient, PandaAgiConnectionError
from .state import AgentState
from .token_processor import TokenProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("AgentClient")
logger.setLevel(logging.WARNING)


# Constants
MAX_TOOLS_LENGTH = 10

AVAILABLE_MODELS = [
    "annie-pro",
    "annie-lite",
]


class Agent:
    """Agent class for managing WebSocket connections and tool"""

    def __init__(
        self,
        system_prompt: str = None,
        messages: List[Dict] = None,
        conversation_id: Optional[str] = None,
        model: str | List[str] = None,
        environment: Optional[BaseEnv] = None,
        use_internet: bool = True,
        use_filesystem: bool = True,
        use_shell: bool = True,
        use_image_generation: bool = True,
        tools: Optional[List[Callable]] = None,
        base_url: str = None,
        api_key: str = None,
    ):
        load_dotenv()
        self.api_key = api_key or os.getenv("PANDA_AGI_KEY")
        if not self.api_key:
            raise ValueError(
                "No API key provided. Please set PANDA_AGI_KEY in environment or pass api_key parameter"
            )

        # Validate that conversation_id is a valid UUID; otherwise, raise a ValueError.
        if conversation_id is not None:
            try:
                import uuid

                uuid.UUID(conversation_id)
            except Exception:
                raise ValueError(
                    f"Invalid conversation_id: '{conversation_id}'. Must be a valid UUID."
                )

        self.system_prompt = system_prompt
        self.messages = messages
        self.conversation_id = conversation_id
        self.model = model
        if model not in AVAILABLE_MODELS:
            raise ValueError(
                f"Model {model} is not available. Available models: {AVAILABLE_MODELS}"
            )
        self.environment = environment
        self.base_url = base_url or os.getenv(
            "PANDA_AGI_BASE_URL",
            "https://agi-api.pandas-ai.com",
        )
        # Initialize tools list
        self.tools = []

        self.state = AgentState()
        self.state.tools_config = ToolsConfig(
            use_internet=use_internet,
            use_filesystem=use_filesystem,
            use_shell=use_shell,
            use_image_generation=use_image_generation,
        )

        # self.event_manager = EventManager()

        # Initialize tool registry and create handlers
        self.tool_registry = ToolRegistry()
        self.tool_handlers = self._create_handlers()

        # Initialize callbacks dictionary for tool execution callbacks
        self.callbacks: Dict[str, Dict[str, List[Callable]]] = {}

        # Initialize HTTP client and token processor with tool registry
        self.client = PandaAgiClient(
            base_url=self.base_url,
            api_key=self.api_key,
            conversation_id=self.conversation_id,
            state=self.state,
        )
        self.token_processor = TokenProcessor(
            tool_registry=self.tool_registry, collect_mode=False
        )

        # Process tools if provided
        if tools:
            self._process_tools(tools)
            self._register_custom_tools_with_registry()

        # Initialize event manager
        logger.info(
            f"Agent initialized with environment at: {self.environment.base_path}"
        )

    def _create_handlers(self) -> Dict[str, ToolHandler]:
        """Create handlers using the new unified tool system"""
        # Use new tool registry to create all tools
        handlers = ToolRegistry.create_all_handlers()

        # Set up handlers with agent context
        for handler in handlers.values():
            handler.set_agent(self)
            handler.set_environment(self.environment)
            # handler.set_event_manager(self.event_manager)

        return handlers

    def on(
        self,
        tool_name: str,
        callback: Callable[[Dict[str, Any], Optional[Dict[str, Any]]], None],
        when: str = "end",
    ) -> None:
        """
        Register a callback for a specific tool execution.

        Args:
            tool_name: The name of the tool to listen for (e.g., 'file_write', 'shell_exec_command')
            callback: A callable that receives input_params and output_params as arguments
            when: When to trigger the callback - "start", "end", or "error" (default: "end")

        Example:
            def file_write_callback(input_params: Dict, output_params: Dict) -> None:
                print(f"Writing to {input_params['file']}")

            agent.on('file_write', file_write_callback, when="start")
            agent.on('file_write', file_write_callback, when="end")
            agent.on('file_write', file_write_callback, when="error")
        """
        if when not in ["start", "end", "error"]:
            raise ValueError(
                f"Invalid 'when' parameter: {when}. Must be 'start', 'end', or 'error'"
            )

        if tool_name not in self.callbacks:
            self.callbacks[tool_name] = {"start": [], "end": [], "error": []}

        self.callbacks[tool_name][when].append(callback)
        logger.info(f"Registered callback for tool: {tool_name} at stage: {when}")

    def off(
        self,
        tool_name: str,
        callback: Callable[[Dict[str, Any], Optional[Dict[str, Any]]], None] = None,
        when: str = None,
    ) -> None:
        """
        Remove a callback for a specific tool.

        Args:
            tool_name: The name of the tool to remove callbacks for
            callback: Specific callback to remove. If None, removes all callbacks for the tool
            when: The stage to remove callbacks from. If None, removes from all stages
        """
        if tool_name not in self.callbacks:
            return

        if callback is None:
            if when is None:
                # Remove all callbacks for this tool
                del self.callbacks[tool_name]
                logger.info(f"Removed all callbacks for tool: {tool_name}")
            else:
                # Remove all callbacks for this tool at this stage
                if when in self.callbacks[tool_name]:
                    del self.callbacks[tool_name][when]
                    logger.info(
                        f"Removed all callbacks for tool: {tool_name} at stage: {when}"
                    )
                    # Clean up empty tool entry
                    if not any(self.callbacks[tool_name].values()):
                        del self.callbacks[tool_name]
        else:
            # Remove specific callback
            stages_to_check = [when] if when else ["start", "end", "error"]
            for stage in stages_to_check:
                if (
                    stage in self.callbacks[tool_name]
                    and callback in self.callbacks[tool_name][stage]
                ):
                    self.callbacks[tool_name][stage].remove(callback)
                    logger.info(
                        f"Removed specific callback for tool: {tool_name} at stage: {stage}"
                    )

                    # Clean up empty callback list
                    if not self.callbacks[tool_name][stage]:
                        del self.callbacks[tool_name][stage]
            # Clean up empty tool entry
            if not any(self.callbacks[tool_name].values()):
                del self.callbacks[tool_name]

    def list_callbacks(self) -> Dict[str, Dict[str, int]]:
        """
        List all registered callbacks.

        Returns:
            Dictionary mapping tool names to stages and their callback counts
        """
        return {
            tool_name: {stage: len(callbacks) for stage, callbacks in stages.items()}
            for tool_name, stages in self.callbacks.items()
        }

    def _trigger_callbacks(
        self,
        tool_name: str,
        input_params: Dict[str, Any],
        when: str,
        output_params: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Trigger all registered callbacks for a specific tool.

        Args:
            tool_name: The name of the tool being executed
            input_params: The input parameters passed to the tool
            when: The stage of the tool execution (start, end, error)
            output_params: The output parameters from the tool (None for "start" stage)
        """
        if tool_name not in self.callbacks:
            return

        for callback in self.callbacks[tool_name].get(when, []):
            try:
                logger.info(f"Triggering callback for tool {tool_name} at stage {when}")
                callback(input_params, output_params)
            except Exception as e:
                logger.error(
                    f"Error in callback for tool {tool_name} at stage {when}: {e}"
                )
                # Continue with other callbacks even if one fails

    def add_tool(self, tool_function: Callable):
        """Add tool to the agent (supports both skills and custom tools)"""
        if len(self.tools) >= MAX_TOOLS_LENGTH:
            raise ValueError(
                f"Tools length is greater than {MAX_TOOLS_LENGTH}. Reduce the number of tools."
            )

        # Check if it's a skill or custom tool
        if hasattr(tool_function, "_skill"):
            self.tools.append(self._process_single_skill(tool_function))
        elif hasattr(tool_function, "_custom_tool"):
            self.tools.append(self._process_single_custom_tool(tool_function))
        else:
            raise ValueError(
                f"Function '{tool_function.__name__}' is not decorated with @skill or @tool. "
                "Please ensure all functions are properly decorated."
            )

    async def run_stream(
        self,
        query: str,
        execute_tools_at_end: bool = True,
        execute_tools_immediately: bool = True,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send a request and stream tool execution events

        Args:
            query: The query to send to the agent
            execute_tools_at_end: Whether to execute tools at the end of the stream
            execute_tools_immediately: Whether to execute tools immediately when detected during streaming

        Yields:
            Dict with format: {"event_type": "tool_start"|"tool_end", "timestamp": "...", "data": {...}}
        """

        environment_state = await self.get_current_file_system()

        input_message = Message(role="user", content=query)
        current_request = AgentRequestModel(
            conversation_id=self.conversation_id,
            system_prompt=self.system_prompt,
            environment_state=environment_state,
            messages=[input_message],
            model=self.model,
            tools_config=self.state.tools_config,
            tools=[tool.to_tool_info() for tool in self.tools] if self.tools else None,
        )

        # Initialize storage for immediate tool execution results
        immediate_tool_results = []

        try:
            # Agentic loop - continue until a breaking tool is executed
            breaking_tool_executed = False
            loop_iteration = 0

            while not breaking_tool_executed:
                loop_iteration += 1
                logger.info(f"Starting agentic loop iteration {loop_iteration}")

                # Reset token processor for new request
                self.token_processor.reset()

                # Set execution modes based on parameters
                if execute_tools_immediately:
                    # Enable both collection and immediate execution
                    self.token_processor.set_execution_modes(
                        collect_mode=True, immediate_execution_mode=True
                    )
                elif execute_tools_at_end:
                    # Enable only collection for end-of-stream execution
                    self.token_processor.set_execution_modes(
                        collect_mode=True, immediate_execution_mode=False
                    )
                else:
                    # Legacy immediate execution mode (no collection)
                    self.token_processor.set_execution_modes(
                        collect_mode=False, immediate_execution_mode=False
                    )

                # Send streaming request and process tokens
                token_stream = self.client.send_streaming_request(current_request)

                # Process tokens through the token processor
                async for processed_event in self.token_processor.process_token_stream(
                    token_stream
                ):
                    if processed_event.get("type") == "conversation_id":
                        logger.debug(
                            f"Received conversation_id: {processed_event.get('conversation_id')}"
                        )
                        self.conversation_id = processed_event.get("conversation_id")
                    elif processed_event.get("type") == "tool_detected":
                        tool_status = processed_event.get(
                            "status", "end"
                        )  # Default to "end" for backward compatibility

                        if tool_status == "start":
                            # Handle tool start event - just yield the start event and trigger callbacks
                            start_timestamp = datetime.utcnow().isoformat() + "Z"
                            function_name = processed_event.get("function_name")
                            arguments = processed_event.get("arguments", {})

                            # Yield tool start event
                            yield {
                                "event_type": "tool_start",
                                "timestamp": start_timestamp,
                                "data": {
                                    "tool_name": function_name,
                                    "input_params": arguments,
                                },
                            }

                            # Trigger start callbacks
                            self._trigger_callbacks(function_name, arguments, "start")

                        elif tool_status == "end":
                            # Handle tool end event - execute the tool if immediate execution is enabled
                            if execute_tools_immediately:
                                logger.info(
                                    "Executing tool immediately: "
                                    + processed_event.get("function_name")
                                )
                                # Execute the tool and yield tool events (but skip the start event since it was already emitted)
                                async for tool_event in self._handle_tool_execution(
                                    processed_event, skip_start_event=True
                                ):
                                    logger.debug(
                                        "Yielding tool event: " + str(tool_event)
                                    )
                                    yield tool_event

                                    # Store the result if it's a completion or error event
                                    if tool_event.get("event_type") == "tool_end":
                                        logger.debug(
                                            "Storing tool result: " + str(tool_event)
                                        )
                                        immediate_tool_results.append(
                                            {
                                                "tool_call_id": processed_event.get(
                                                    "tool_call_id"
                                                ),
                                                "function_name": processed_event.get(
                                                    "function_name"
                                                ),
                                                "status": "completed",
                                                "result": tool_event["data"].get(
                                                    "output_params"
                                                ),
                                            }
                                        )
                                    elif tool_event.get("event_type") == "error":
                                        immediate_tool_results.append(
                                            {
                                                "tool_call_id": processed_event.get(
                                                    "tool_call_id"
                                                ),
                                                "function_name": processed_event.get(
                                                    "function_name"
                                                ),
                                                "status": "failed",
                                                "error": tool_event["data"].get(
                                                    "error"
                                                ),
                                            }
                                        )
                            elif not execute_tools_at_end:
                                # Original immediate execution mode (legacy) - handle complete tools without start/end status
                                async for tool_event in self._handle_tool_execution(
                                    processed_event
                                ):
                                    yield tool_event
                    # Skip other event types - only yield tool events

                # After the stream ends, handle tool execution based on mode
                if execute_tools_immediately:
                    # Use the immediately executed tool results
                    if immediate_tool_results:
                        logger.debug(
                            f"Stream ended. Used {len(immediate_tool_results)} immediately executed tool results..."
                        )

                        # Check for breaking tools in the immediate results
                        breaking_tool_executed = self._check_breaking_tools_in_results(
                            immediate_tool_results
                        )

                        # If no breaking tool was executed, continue the agentic loop
                        if not breaking_tool_executed:
                            # Send tool results back to endpoint and get the response for next iteration
                            current_request = await self._send_tool_results_to_endpoint_and_get_next_request(
                                immediate_tool_results
                            )
                            # Clear the immediate results for the next iteration
                            immediate_tool_results = []
                        else:
                            logger.debug("Breaking tool executed, exiting loop...")
                            # Breaking tool executed, exit loop
                            break
                    else:
                        # No tools executed, exit the loop
                        breaking_tool_executed = True

                elif execute_tools_at_end:
                    # Execute all collected tools at the end
                    collected_tools = self.token_processor.get_collected_tools()
                    if collected_tools:
                        logger.debug(
                            f"Stream ended. Executing {len(collected_tools)} collected tools..."
                        )

                        # Execute all collected tools and yield their events
                        async for (
                            tool_event
                        ) in self._execute_collected_tools_and_yield_events():
                            yield tool_event

                        # Check for breaking tools and get results
                        (
                            tool_results,
                            breaking_tool_executed,
                        ) = await self._execute_collected_tools_with_breaking_check()

                        # Clear collected tools
                        self.token_processor.clear_collected_tools()

                        # If no breaking tool was executed, continue the agentic loop
                        if not breaking_tool_executed and tool_results:
                            # Send tool results back to endpoint and get the response for next iteration
                            current_request = await self._send_tool_results_to_endpoint_and_get_next_request(
                                tool_results
                            )
                        else:
                            # Either breaking tool executed or no tools to execute
                            breaking_tool_executed = True
                    else:
                        # No tools collected, exit the loop
                        breaking_tool_executed = True
                else:
                    # Neither execute_tools_at_end nor execute_tools_immediately
                    # This is the legacy immediate mode - tools were already executed in the stream
                    breaking_tool_executed = True

        # if All connection attempts failed (httpx.ConnectError)
        except httpx.ConnectError as e:
            logger.error(f"All connection attempts failed: {e}")
            raise PandaAgiConnectionError("PandaAGI Server connection error")

        except Exception as e:
            logger.error(f"Error in run_stream: {e}")
            raise e

    async def _handle_tool_execution(
        self, tool_event: Dict[str, Any], skip_start_event: bool = False
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Handle tool execution and yield tool start/end events"""
        try:
            function_name = tool_event["function_name"]
            arguments = tool_event["arguments"]
            tool_call_id = tool_event["tool_call_id"]

            # Only emit start event if not already emitted
            if not skip_start_event:
                # Generate timestamp for tool start
                start_timestamp = datetime.utcnow().isoformat() + "Z"

                # Yield tool start event
                yield {
                    "event_type": "tool_start",
                    "timestamp": start_timestamp,
                    "data": {
                        "tool_name": function_name,
                        "input_params": arguments,
                    },
                }

                # Trigger callbacks before tool execution
                self._trigger_callbacks(function_name, arguments, "start")

            # Get the appropriate handler
            handler = self.tool_handlers.get(function_name)
            if not handler:
                error_msg = f"No handler found for function: {function_name}"
                logger.error(error_msg)
                # Yield error event
                error_timestamp = datetime.utcnow().isoformat() + "Z"
                yield {
                    "event_type": "error",
                    "timestamp": error_timestamp,
                    "data": {
                        "tool_name": function_name,
                        "input_params": arguments,
                        "error": error_msg,
                    },
                }
                return

            # Execute the tool
            result = await handler.execute(arguments)

            # Generate timestamp for tool end
            end_timestamp = datetime.now().isoformat()

            # Yield tool end event or error event
            if result.success:
                yield {
                    "event_type": "tool_end",
                    "timestamp": end_timestamp,
                    "data": {
                        "tool_name": function_name,
                        "input_params": arguments,
                        "output_params": result.data,
                    },
                }
                # Trigger callbacks after tool execution
                self._trigger_callbacks(function_name, arguments, "end", result.data)
            else:
                yield {
                    "event_type": "error",
                    "timestamp": end_timestamp,
                    "data": {
                        "tool_name": function_name,
                        "input_params": arguments,
                        "error": result.error,
                    },
                }
                # Trigger callbacks on error
                self._trigger_callbacks(
                    function_name, arguments, "error", {"error": result.error}
                )

        except Exception as e:
            logger.error(f"Error executing tool {tool_event.get('function_name')}: {e}")
            # Yield error event
            error_timestamp = datetime.utcnow().isoformat() + "Z"
            yield {
                "event_type": "error",
                "timestamp": error_timestamp,
                "data": {
                    "tool_name": tool_event.get("function_name", "unknown"),
                    "input_params": tool_event.get("arguments", {}),
                    "error": str(e),
                },
            }

    async def _execute_collected_tools_and_yield_events(
        self,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute all collected tools and yield their start/end events"""
        collected_tools = self.token_processor.get_collected_tools()

        if not collected_tools:
            return

        logger.info(f"Executing {len(collected_tools)} collected tools")

        for tool_call in collected_tools:
            try:
                function_name = tool_call["function_name"]
                arguments = tool_call["arguments"]
                xml_tag_name = tool_call.get("xml_tag_name")

                # Check if this tool is breaking
                is_breaking = False
                if xml_tag_name:
                    xml_tool_def = self.tool_registry.get_xml_tool_definition(
                        xml_tag_name
                    )
                    if xml_tool_def:
                        is_breaking = xml_tool_def.is_breaking

                # Generate timestamp for tool start
                start_timestamp = datetime.utcnow().isoformat() + "Z"

                # Yield tool start event
                yield {
                    "event_type": "tool_start",
                    "timestamp": start_timestamp,
                    "data": {
                        "tool_name": function_name,
                        "input_params": arguments,
                    },
                }

                # Trigger callbacks before tool execution
                self._trigger_callbacks(function_name, arguments, "start")

                # Get the appropriate handler
                handler = self.tool_handlers.get(function_name)
                if not handler:
                    error_msg = f"No handler found for function: {function_name}"
                    logger.error(error_msg)

                    # Yield error event
                    error_timestamp = datetime.utcnow().isoformat() + "Z"
                    yield {
                        "event_type": "error",
                        "timestamp": error_timestamp,
                        "data": {
                            "tool_name": function_name,
                            "input_params": arguments,
                            "error": error_msg,
                        },
                    }

                    # If this was a breaking tool, stop execution even if it failed
                    if is_breaking:
                        logger.info(
                            f"Breaking tool {function_name} encountered. Stopping execution."
                        )
                        break

                    continue

                # Execute the tool
                result = await handler.execute(arguments)

                # Generate timestamp for tool end
                end_timestamp = datetime.now().isoformat() + "Z"

                if result.success:
                    yield {
                        "event_type": "tool_end",
                        "timestamp": end_timestamp,
                        "data": {
                            "tool_name": function_name,
                            "input_params": arguments,
                            "output_params": result.data,
                        },
                    }
                    logger.info(f"Tool {function_name} executed successfully")
                    # Trigger callbacks after tool execution
                    self._trigger_callbacks(
                        function_name, arguments, "end", result.data
                    )
                else:
                    yield {
                        "event_type": "error",
                        "timestamp": end_timestamp,
                        "data": {
                            "tool_name": function_name,
                            "input_params": arguments,
                            "error": result.error,
                        },
                    }
                    logger.error(f"Tool {function_name} failed: {result.error}")
                    # Trigger callbacks on error
                    self._trigger_callbacks(
                        function_name, arguments, "error", result.error
                    )

                # If this was a breaking tool, stop execution after executing it
                if is_breaking:
                    logger.info(
                        f"Breaking tool {function_name} executed. Stopping execution."
                    )
                    break

            except Exception as e:
                logger.error(
                    f"Error executing tool {tool_call.get('function_name')}: {e}"
                )

                # Yield error event
                error_timestamp = datetime.utcnow().isoformat() + "Z"
                yield {
                    "event_type": "error",
                    "timestamp": error_timestamp,
                    "data": {
                        "tool_name": tool_call.get("function_name", "unknown"),
                        "input_params": tool_call.get("arguments", {}),
                        "error": str(e),
                    },
                }

                # Check if this was a breaking tool even if it failed
                xml_tag_name = tool_call.get("xml_tag_name")
                if xml_tag_name:
                    xml_tool_def = self.tool_registry.get_xml_tool_definition(
                        xml_tag_name
                    )
                    if xml_tool_def and xml_tool_def.is_breaking:
                        logger.info(
                            f"Breaking tool {tool_call.get('function_name')} encountered (failed). Stopping execution."
                        )
                        break

    def _check_breaking_tools_in_results(
        self, tool_results: List[Dict[str, Any]]
    ) -> bool:
        """
        Check if any of the tool results correspond to breaking tools.

        Args:
            tool_results: List of tool execution results

        Returns:
            True if any breaking tool was found, False otherwise
        """
        # Check if any of the tool results correspond to breaking tools
        list_breaking_tools = self.tool_registry.list_breaking_tools()
        tool_names = [tool_call.get("function_name") for tool_call in tool_results]

        return any(tool_name in list_breaking_tools for tool_name in tool_names)

    async def _execute_collected_tools_with_breaking_check(
        self,
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """Execute all collected tools and return their results along with breaking tool status."""
        tool_results = await self._execute_collected_tools()

        # Check if any breaking tool was executed by examining the collected tools
        collected_tools = self.token_processor.get_collected_tools()
        breaking_tool_executed = False

        for tool_call in collected_tools:
            xml_tag_name = tool_call.get("xml_tag_name")
            if xml_tag_name:
                xml_tool_def = self.tool_registry.get_xml_tool_definition(xml_tag_name)
                if xml_tool_def and xml_tool_def.is_breaking:
                    breaking_tool_executed = True
                    break

        return tool_results, breaking_tool_executed

    async def _execute_collected_tools(self) -> List[Dict[str, Any]]:
        """Execute all collected tools and return their results. Stop execution when a breaking tool is encountered."""
        collected_tools = self.token_processor.get_collected_tools()
        tool_results = []

        if not collected_tools:
            return tool_results

        logger.info(f"Executing {len(collected_tools)} collected tools")

        for tool_call in collected_tools:
            logger.info(f"tool_call: {tool_call}")
            try:
                function_name = tool_call["function_name"]
                arguments = tool_call["arguments"]
                tool_call_id = tool_call["id"]
                xml_tag_name = tool_call.get("xml_tag_name")

                # Check if this tool is breaking
                is_breaking = False
                if xml_tag_name:
                    xml_tool_def = self.tool_registry.get_xml_tool_definition(
                        xml_tag_name
                    )
                    if xml_tool_def:
                        is_breaking = xml_tool_def.is_breaking

                # Trigger callbacks before tool execution
                logger.info(
                    f"Triggering callbacks for tool {function_name} with arguments {arguments}"
                )
                self._trigger_callbacks(function_name, arguments, "start")

                # Get the appropriate handler
                handler = self.tool_handlers.get(function_name)
                if not handler:
                    error_msg = f"No handler found for function: {function_name}"
                    logger.error(error_msg)
                    tool_results.append(
                        {
                            "tool_call_id": tool_call_id,
                            "function_name": function_name,
                            "status": "failed",
                            "error": error_msg,
                        }
                    )

                    # If this was a breaking tool, stop execution even if it failed
                    if is_breaking:
                        logger.info(
                            f"Breaking tool {function_name} encountered. Stopping execution."
                        )
                        break

                    continue

                # Execute the tool
                result = await handler.execute(arguments)

                if result.success:
                    tool_results.append(
                        {
                            "tool_call_id": tool_call_id,
                            "function_name": function_name,
                            "status": "completed",
                            "result": result.data,
                        }
                    )
                    logger.info(f"Tool {function_name} executed successfully")
                    # Trigger callbacks after tool execution
                    self._trigger_callbacks(
                        function_name, arguments, "end", result.data
                    )
                else:
                    tool_results.append(
                        {
                            "tool_call_id": tool_call_id,
                            "function_name": function_name,
                            "status": "failed",
                            "error": result.error,
                        }
                    )
                    logger.error(f"Tool {function_name} failed: {result.error}")
                    # Trigger callbacks on error
                    self._trigger_callbacks(
                        function_name, arguments, "error", result.error
                    )

                # If this was a breaking tool, stop execution after executing it
                if is_breaking:
                    logger.info(
                        f"Breaking tool {function_name} executed. Stopping execution."
                    )
                    break

            except Exception as e:
                logger.error(
                    f"Error executing tool {tool_call.get('function_name')}: {e}"
                )
                tool_results.append(
                    {
                        "tool_call_id": tool_call.get("id", "unknown"),
                        "function_name": tool_call.get("function_name", "unknown"),
                        "status": "failed",
                        "error": str(e),
                    }
                )

                # Check if this was a breaking tool even if it failed
                xml_tag_name = tool_call.get("xml_tag_name")
                if xml_tag_name:
                    xml_tool_def = self.tool_registry.get_xml_tool_definition(
                        xml_tag_name
                    )
                    if xml_tool_def and xml_tool_def.is_breaking:
                        logger.info(
                            f"Breaking tool {tool_call.get('function_name')} encountered (failed). Stopping execution."
                        )
                        break

        return tool_results

    async def _send_tool_results_to_endpoint(
        self, tool_results: List[Dict[str, Any]]
    ) -> None:
        """Send tool execution results back to the endpoint as a new interaction"""
        if not tool_results:
            return

        # Format tool results as a message
        tool_summary = []
        for result in tool_results:
            function_name = result["function_name"]
            status = result["status"]

            if status == "completed":
                result_data = result.get("result", "Success")
                if isinstance(result_data, dict):
                    result_data = str(result_data)
                tool_summary.append(
                    f"<tool_result name={function_name}>\n{result_data}\n</tool_result>"
                )
            else:
                tool_summary.append(
                    f"<tool_result name={function_name}>\n{result.get('error', 'Failed')}\n</tool_result>"
                )

        # Create a summary message as the new query
        tool_message = Message(
            role="user",
            content="\n".join(tool_summary),
        )

        # Create a new request with the tool results as a query
        tool_results_request = AgentRequestModel(
            conversation_id=self.conversation_id,
            # system_prompt=self.system_prompt,
            messages=[tool_message],
            model=self.model,
            tools_config=self.state.tools_config,
            # tools=self.tools,
        )

        try:
            # Send the tool results as a new streaming interaction using the existing endpoint
            logger.info(
                f"Sending tool results as new query for conversation {self.conversation_id}"
            )

            # Use the existing streaming endpoint that we know works
            token_stream = self.client.send_streaming_request(tool_results_request)

            # Process the response stream but don't yield events (this is just sending results)
            response_tokens = []
            async for token in token_stream:
                response_tokens.append(token)

            logger.info(
                f"Tool results sent successfully as new interaction (received {len(response_tokens)} response tokens)"
            )

        except Exception as e:
            logger.error(f"Failed to send tool results to endpoint: {e}")

    async def _send_tool_results_to_endpoint_and_get_next_request(
        self, tool_results: List[Dict[str, Any]]
    ) -> "AgentRequestModel":
        """Send tool execution results back to the endpoint and return the next request for the agentic loop"""
        if not tool_results:
            # If no tool results, return a simple continuation request
            return AgentRequestModel(
                conversation_id=self.conversation_id,
                system_prompt=self.system_prompt,
                messages=[Message(role="user", content="Continue processing.")],
                model=self.model,
                tools_config=self.state.tools_config,
                tools=(
                    [tool.to_tool_info() for tool in self.tools] if self.tools else None
                ),
            )

        # Format tool results as a message
        tool_summary = []
        for result in tool_results:
            function_name = result["function_name"]
            status = result["status"]

            if status == "completed":
                result_data = result.get("result", "Success")
                if isinstance(result_data, dict):
                    result_data = str(result_data)
                tool_summary.append(
                    f"<tool_result name={function_name}>\n{result_data}\n</tool_result>"
                )
            else:
                tool_summary.append(
                    f"<tool_result name={function_name}>\n{result.get('error', 'Failed')}\n</tool_result>"
                )

        # Create a summary message as the new query
        tool_message = Message(
            role="user",
            content="\n".join(tool_summary),
        )

        # Create and return the next request for the agentic loop
        next_request = AgentRequestModel(
            conversation_id=self.conversation_id,
            system_prompt=self.system_prompt,
            messages=[tool_message],
            model=self.model,
            tools_config=self.state.tools_config,
            tools=[tool.to_tool_info() for tool in self.tools] if self.tools else None,
        )

        logger.debug(
            f"Prepared next request for agentic loop with {len(tool_results)} tool results"
        )

        return next_request

    async def change_working_directory(self, path: str):
        """
        Change the working directory in the current environment.

        Args:
            path: New working directory path
        """
        await self.environment.change_directory(path)
        logger.info(
            f"Changed working directory to: {self.environment.current_directory}"
        )

    def get_working_directory(self) -> str:
        """
        Get the current working directory.

        Returns:
            Current working directory path
        """
        return str(self.environment.current_directory)

    async def get_current_file_system(self, max_depth: int = 2) -> Dict[str, Any]:
        """
        Get the current file system structure with depth 2.

        Returns:
            Dictionary representing the file system structure
        """
        file_system_info = await file_explore_directory(
            self.environment, path="/", max_depth=max_depth
        )

        available_ports = self.environment.get_available_ports()
        file_system_info["available_ports_for_deployments"] = available_ports
        return file_system_info

    async def run(
        self,
        query: str,
        event_handlers: List[
            Union[Callable[[BaseStreamEvent], Optional[BaseStreamEvent]], BaseHandler]
        ] = None,
        execute_tools_immediately: bool = True,
    ) -> AgentResponse:
        """
        Run the agent and return a response with all collected events and final output.

        This method consumes all events and returns an AgentResponse object which contains
        all events and the final response from the agent, typically from a UserNotificationEvent.

        Args:
            query: The query to send to the agent
            event_handlers: Optional list of handlers - each handler can be:
                          - A callable function: (event) -> Optional[event]
                          - A BaseHandler subclass with a process(event) method
                          Handlers will be executed in the order they are provided in the list.
            execute_tools_immediately: Whether to execute tools immediately when detected during streaming

        Returns:
            An AgentResponse object containing all events and the final output
        """
        response = AgentResponse()
        response.set_initial_query(query)

        # Run and collect all events
        async for event in self.run_stream(
            query, execute_tools_immediately=execute_tools_immediately
        ):
            # Process the event with the appropriate handlers if they exist
            if event_handlers:
                processed_event = self._process_event_with_handlers(
                    event, event_handlers
                )

                # Skip events that couldn't be processed
                if processed_event is None:
                    continue

                # Add the processed event to the response
                response.add_event(processed_event)
            else:
                # No handlers, add event directly
                response.add_event(event)

        response.set_conversation_id(self.conversation_id)
        return response

    def _process_event_with_handlers(
        self, event: BaseStreamEvent, event_handlers: List[Union[Callable, BaseHandler]]
    ) -> Optional[BaseStreamEvent]:
        """
        Process an event with the provided handlers.

        Supports both callable functions and handler classes with a process method.
        Processes multiple handlers in sequence.

        Args:
            event: The event to process
            event_handlers: List of handlers to use

        Returns:
            Processed event or None if processing failed
        """
        if event_handlers is None:
            return event

        current_event = event

        # Process through each handler in order
        for handler in event_handlers:
            if handler is None:
                continue

            try:
                # Check if it's a handler class with a process method
                if hasattr(handler, "process") and callable(
                    getattr(handler, "process")
                ):
                    # Call the process method (handler classes typically don't return events)
                    handler.process(current_event)
                    # Keep the current event for the next handler
                # Check if it's a callable (backward compatibility)
                elif callable(handler):
                    processed = handler(current_event)
                    # Update current_event if the callable returned something
                    if processed is not None:
                        current_event = processed
                else:
                    logger.warning(
                        f"Handler is neither callable nor has a process method: {type(handler)}"
                    )
                    continue

            except Exception as e:
                logger.error(
                    f"Error processing event with handler {getattr(handler, 'name', type(handler).__name__)}: {e}"
                )
                # Continue processing with other handlers even if one fails
                continue
        return current_event

    def _process_single_skill(self, skill_function: Callable):
        """
        Process a single skill function and extract its Skill object.
        """
        if not hasattr(skill_function, "_skill"):
            raise ValueError(
                f"Function '{skill_function.__name__}' is not decorated with @skill. "
                "Please ensure all functions in the skills list are decorated with @skill."
            )

        skill_obj = skill_function._skill
        if not isinstance(skill_obj, Skill):
            raise ValueError(
                f"Invalid skill object found for function '{skill_function.__name__}'. "
                "Expected Skill instance."
            )

        return skill_obj

    def _process_single_custom_tool(self, tool_function: Callable):
        """
        Process a single custom tool function and extract its CustomTool object.
        """
        if not hasattr(tool_function, "_custom_tool"):
            raise ValueError(
                f"Function '{tool_function.__name__}' is not decorated with @tool. "
                "Please ensure all functions in the tools list are decorated with @tool."
            )

        tool_obj = tool_function._custom_tool
        if not hasattr(tool_obj, "name"):  # Basic validation for custom tool
            raise ValueError(
                f"Invalid custom tool object found for function '{tool_function.__name__}'. "
                "Expected CustomTool instance."
            )

        return tool_obj

    def _process_tools(self, tool_functions: List[Callable]):
        """
        Process a list of decorated functions and extract their tool objects.

        Args:
            tool_functions: List of functions decorated with @skill or @tool

        Raises:
            ValueError: If a function is not decorated properly
        """
        if len(tool_functions) > MAX_TOOLS_LENGTH:
            raise ValueError(
                f"Tools length is greater than {MAX_TOOLS_LENGTH}. Reduce the number of tools."
            )

        for func in tool_functions:
            self.add_tool(func)

        logger.info(
            f"Processed {len(tool_functions)} tools: {[t.name for t in self.tools]}"
        )

    def _register_custom_tools_with_registry(self):
        """Register custom tools with the ToolRegistry for XML execution"""
        from ..tools.custom_tools_ops import CustomToolRegistry

        # Get all custom tools from the registry
        custom_tools = CustomToolRegistry.get_all_tools()
        logger.info(f"Found {len(custom_tools)} custom tools to register")

        for tool_obj in custom_tools:
            # Create parameter lists
            required_params = [p.name for p in tool_obj.parameters if p.required]
            optional_params = [p.name for p in tool_obj.parameters if not p.required]

            # Create attribute mappings for parameter extraction
            attribute_mappings = {
                param.name: param.name for param in tool_obj.parameters
            }

            # Register XML tool definition
            self.tool_registry.register_xml_tool(
                xml_tag=tool_obj.name,
                function_name=tool_obj.name,
                required_params=required_params,
                optional_params=optional_params,
                attribute_mappings=attribute_mappings,
                is_breaking=False,
            )

            # Create a handler class for this specific tool
            from ..tools.base import ToolHandler, ToolResult

            class CustomToolHandler(ToolHandler):
                def __init__(self, tool_name):
                    super().__init__()
                    self.tool_name = tool_name

                def validate_input(self, params):
                    tool = CustomToolRegistry.get_tool(self.tool_name)
                    if not tool:
                        return f"Custom tool '{self.tool_name}' not found"

                    required_params = [p.name for p in tool.parameters if p.required]
                    missing = [
                        param for param in required_params if param not in params
                    ]
                    if missing:
                        return f"Missing required parameters for '{self.tool_name}': {', '.join(missing)}"
                    return None

                async def execute(self, params):
                    from ..tools.custom_tools_ops import execute_custom_tool

                    try:
                        result = await execute_custom_tool(self.tool_name, params)
                        return ToolResult(
                            success=True,
                            data={"tool_name": self.tool_name, "result": result},
                            error=None,
                        )
                    except Exception as e:
                        return ToolResult(
                            success=False,
                            data={"tool_name": self.tool_name},
                            error=f"Error executing custom tool '{self.tool_name}': {str(e)}",
                        )

            # Create a proper handler class for this tool
            def create_handler_class(tool_name):
                class SpecificCustomToolHandler(CustomToolHandler):
                    def __init__(self):
                        super().__init__(tool_name)

                return SpecificCustomToolHandler

            # Register the handler class
            handler_class = create_handler_class(tool_obj.name)
            self.tool_registry._handlers[tool_obj.name] = handler_class

            # Create handler instance and add to tool_handlers
            handler_instance = handler_class()
            handler_instance.set_agent(self)
            handler_instance.set_environment(self.environment)
            # handler_instance.set_event_manager(self.event_manager)
            self.tool_handlers[tool_obj.name] = handler_instance

            logger.info(
                f"Registered custom tool '{tool_obj.name}' with XML tag and handler"
            )

        logger.info(f"Registered {len(custom_tools)} custom tools with ToolRegistry")
