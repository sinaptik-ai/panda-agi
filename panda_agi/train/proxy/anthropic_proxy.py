"""Anthropic Client Proxy Module

This module provides a proxy for Anthropic API calls that intercepts and collects
request and response data for analysis and debugging.

Usage:
    from pandaagi_trace.proxy.anthropic_proxy import AnthropicProxy
    
    # As a context manager
    with AnthropicProxy():
        # Use Anthropic client normally
        from anthropic import Anthropic
        client = Anthropic(api_key="your-api-key")
        response = client.messages.create(...)
        
    # Or manually
    proxy = AnthropicProxy()
    proxy.apply_patches()
    
    # Remove patches when done
    proxy.remove_patches()
"""

import time
from typing import Dict, Any, List, Optional
from .base_proxy import BaseProxy
from ..conversation import Conversation, LLMUsage, ConversationMessage


class AnthropicProxy(BaseProxy):
    """
    A proxy class that collects Anthropic API request and response data.
    
    This class patches the Anthropic main library functions to intercept and collect data
    from all API calls, including streaming responses.
    """
    def __init__(self, model_name: Optional[str] = None, tags: Optional[List[str]] = None, debug: bool=False):
        """Initialize the AnthropicProxy.
        
        Args:
            model_name: The default model name to use if not specified in the request.
            tags: Optional tags to use for requests if not specified.
            debug: Whether to print debug information.
        """
        super().__init__(model_name=model_name, tags=tags, debug=debug)
        
        # Initialize original methods to None
        self.original_messages_create = None
        self.original_messages_stream = None
        self.original_async_messages_create = None
        self.original_async_messages_stream = None
        
    def _apply_patches_impl(self):
        """Apply all patches to the Anthropic module."""
        try:
            # Create a temporary client to access the methods
            from anthropic.resources.messages.messages import Messages, AsyncMessages
            
            # Save original methods
            self.original_messages_create = Messages.create
            self.original_messages_stream = Messages.stream
            self.original_async_messages_create = AsyncMessages.create
            self.original_async_messages_stream = AsyncMessages.stream
            
            # Store self reference for patched methods
            proxy_instance = self
            
            # Define patched methods that can access the proxy instance
            def patched_messages_create(*args, **kwargs):
                return proxy_instance.patched_messages_create(*args, **kwargs)
                
            def patched_messages_stream(*args, **kwargs):
                return proxy_instance.patched_messages_stream(*args, **kwargs)
                
            async def patched_async_messages_create(*args, **kwargs):
                return await proxy_instance.patched_async_messages_create(*args, **kwargs)
                
            async def patched_async_messages_stream(*args, **kwargs):
                return await proxy_instance.patched_async_messages_stream(*args, **kwargs)
            
            # Apply patches
            Messages.create = patched_messages_create
            Messages.stream = patched_messages_stream
            AsyncMessages.create = patched_async_messages_create
            AsyncMessages.stream = patched_async_messages_stream
            
            self.logger.debug("Applied patches for Anthropic SDK.")
        except Exception as e:
            self.logger.error(f"Error applying patches: {e}")
            # Re-raise the exception
            raise
    
    def _remove_patches_impl(self):
        """Remove all patches from the Anthropic module."""
        try:
            # Import the classes again to access them
            from anthropic.resources.messages.messages import Messages, AsyncMessages
            
            # Restore original methods if they exist
            if self.original_messages_create:
                Messages.create = self.original_messages_create
                self.original_messages_create = None
                
            if self.original_messages_stream:
                Messages.stream = self.original_messages_stream
                self.original_messages_stream = None
                
            if self.original_async_messages_create:
                AsyncMessages.create = self.original_async_messages_create
                self.original_async_messages_create = None
                
            if self.original_async_messages_stream:
                AsyncMessages.stream = self.original_async_messages_stream
                self.original_async_messages_stream = None
                
            self.logger.debug("Removed patches from Anthropic SDK.")
        except Exception as e:
            self.logger.error(f"Error removing patches: {e}")
            # Re-raise the exception
            raise
        
        # Helper methods for extracting data from requests and responses
        
        # Collected data
        self.collected_data = []
    
    def _is_streaming_request(self, kwargs: Dict[str, Any]) -> bool:
        """Check if this is a streaming request."""
        return kwargs.get("stream", False)
        
    def _extract_messages(self, kwargs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract messages from kwargs."""
        return kwargs.get("messages", [])
        
    def _extract_input_text(self, messages: List[Dict[str, Any]]) -> str:
        """Extract input text from the last user message."""
        input_text = ""
        for msg in reversed(messages):
            if msg.get("role") == "user" and "content" in msg:
                if isinstance(msg["content"], str):
                    input_text = msg["content"]
                elif isinstance(msg["content"], list):
                    # Handle content list (multimodal messages)
                    for content_item in msg["content"]:
                        if isinstance(content_item, dict) and content_item.get("type") == "text":
                            input_text += content_item.get("text", "")
                break
        return input_text
    
    def _extract_output_text(self, response) -> str:
        """Extract output text from response."""
        output_text = ""
        
        # Handle different response formats
        if hasattr(response, "content"):
            content = response.content
            if isinstance(content, list):
                for block in content:
                    if hasattr(block, "text"):
                        output_text += block.text
                    elif isinstance(block, dict) and block.get("type") == "text":
                        output_text += block.get("text", "")
            elif isinstance(content, str):
                output_text = content
        
        return output_text
    
    def _record(self, data: Dict[str, Any]):
        """Convert collected data to Conversation and append to collected_data."""
        request = data.get("request", {})
        response = data.get("response", {})
        messages = request.get("kwargs", {}).get("messages", [])

        input_text = self._extract_input_text(messages)
    
        # Extract output text from response
        output_text = ""
        if "content" in response:
            output_text = response.get("content", "")
        elif response.get("streaming", False):
            # For streaming responses, get the accumulated delta text
            output_text = response.get("streaming_delta", "")

        # Convert messages to ConversationMessage objects
        messages = [ConversationMessage(role=message["role"], content=message["content"]) for message in messages]
        # Check if messages are empty and add a message using input_text
        if messages:
            messages.append(ConversationMessage(role="assistant", content=output_text))
        else:
            messages = [ConversationMessage(role="user", content=input_text), ConversationMessage(role="assistant", content=output_text)]
    
        # Extract model name
        model_name = self.model_name or request.get("kwargs", {}).get("model", None)
        
        # Extract usage information
        usage = {}
        if "usage" in response:
            usage = response.get("usage", None)
        
        # Prepare metadata
        metadata = {
            "provider": "anthropic",
            "function": request.get("function", ""),
            "streaming": response.get("streaming", False),
            "duration": response.get("duration", 0),
            "timestamp": response.get("timestamp", time.time()),
        }
        
        # Extract other arguments from kwargs
        other_args = {k: v for k, v in request.get("kwargs", {}).items() if k != "messages"}
        metadata.update(other_args)
        
        # Add error information if present
        if "error" in response:
            metadata["error"] = response.get("error", "")
            metadata["error_type"] = response.get("error_type", "Unknown")
        
        try:
            # Create the trace object
            # Check if usage is already a dict or if it has a dict() method
            llm_usage = usage if isinstance(usage, dict) else usage.dict() if hasattr(usage, 'dict') else None

            if llm_usage:
                llm_usage = response.get('usage', None)
                if llm_usage:
                    llm_usage = LLMUsage(
                        **llm_usage
                    )
            trace = Conversation(
                messages=messages,
                model_name=model_name,
                tags=self.tags,
                usage=llm_usage,
                metadata=metadata
            )
        except Exception as e:
            self.logger.error(f"Error creating trace: {e}")
            return
        
        # Check if we already have a trace for this request (for streaming responses)
        # to avoid duplicate traces
        for i, existing_trace in enumerate(self.collected_data):
            if (existing_trace.metadata.get("timestamp") == metadata.get("timestamp") and
                existing_trace.input == input_text):
                # Update the existing trace instead of adding a new one
                self.collected_data[i] = trace
                return
                
        # Add the new trace
        self._track(trace)
        self.collected_data.append(trace)

    def _structure_usage(self, usage):
        if usage.input_tokens is None:
            usage.input_tokens = 0
        if usage.output_tokens is None:
            usage.output_tokens = 0

        return {
            "prompt_tokens": usage.input_tokens,
            "completion_tokens": usage.output_tokens,
            "total_tokens": usage.input_tokens + usage.output_tokens
        }

    def patched_messages_create(self, *args, **kwargs):
        """Patched version of Messages.create"""
        # Get the proxy instance
        proxy = self._proxy if hasattr(self, "_proxy") else None
        
        # If we still can't find it, use the first instance
        if proxy is None:
            proxy = self
        
        # Start timing
        start_time = time.time()
        
        # Prepare request data
        request_data = {
            "function": "messages.create",
            "args": args,
            "kwargs": kwargs,
            "timestamp": start_time,
        }
        
        # Call the original method
        try:
            response = proxy.original_messages_create(*args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Prepare response data
            response_data = {
                "streaming": False,
                "duration": duration,
                "timestamp": start_time,
                "content": proxy._extract_output_text(response),
            }
            
            # Add usage information if available
            if hasattr(response, "usage") and response.usage is not None:
                response_data["usage"] = self._structure_usage(response.usage)
            
            # Record the trace data
            collected_item = {
                "request": request_data,
                "response": response_data,
            }
            proxy._record(collected_item)
            
            return response
        except Exception as e:
            # Calculate duration even for errors
            duration = time.time() - start_time
            
            # Prepare error response data
            response_data = {
                "streaming": False,
                "duration": duration,
                "timestamp": start_time,
                "error": str(e),
                "error_type": e.__class__.__name__,
            }
            
            # Record the error trace data
            collected_item = {
                "request": request_data,
                "response": response_data,
            }
            proxy._record(collected_item)
            
            # Re-raise the exception
            raise
    
    def patched_messages_stream(self, *args, **kwargs):
        """Patched version of Messages.stream"""
        # Get the proxy instance
        proxy = self._proxy if hasattr(self, "_proxy") else None
        
        # If we still can't find it, use the first instance
        if proxy is None:
            proxy = self
        
        # Start timing
        start_time = time.time()
        
        # Prepare request data
        request_data = {
            "function": "messages.stream",
            "args": args,
            "kwargs": kwargs,
            "timestamp": start_time,
        }
        
        # Call the original method
        try:
            stream = proxy.original_messages_stream(*args, **kwargs)
            
            # Calculate initial duration
            duration = time.time() - start_time
            
            # Prepare response data
            response_data = {
                "streaming": True,
                "duration": duration,
                "timestamp": start_time,
            }
            
            # Return a wrapped stream
            return AnthropicStreamWrapper(stream, proxy, request_data, response_data)
        except Exception as e:
            # Calculate duration even for errors
            duration = time.time() - start_time
            
            # Prepare error response data
            response_data = {
                "streaming": True,
                "duration": duration,
                "timestamp": start_time,
                "error": str(e),
                "error_type": e.__class__.__name__,
            }
            
            # Record the error trace data
            collected_item = {
                "request": request_data,
                "response": response_data,
            }
            proxy._record(collected_item)
            
            # Re-raise the exception
            raise
    
    async def patched_async_messages_create(self, *args, **kwargs):
        """Patched version of AsyncMessages.create"""
        # Get the proxy instance
        proxy = self._proxy if hasattr(self, "_proxy") else None
        
        # If we still can't find it, use the first instance
        if proxy is None:
            proxy = self
        
        # Start timing
        start_time = time.time()
        
        # Prepare request data
        request_data = {
            "function": "async_messages.create",
            "args": args,
            "kwargs": kwargs,
            "timestamp": start_time,
        }
        
        # Call the original method
        try:
            response = await proxy.original_async_messages_create(*args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Prepare response data
            response_data = {
                "streaming": False,
                "duration": duration,
                "timestamp": start_time,
                "content": proxy._extract_output_text(response),
            }
            
            # Add usage information if available
            if hasattr(response, "usage") and response.usage is not None:
                response_data["usage"] = self._structure_usage(response.usage)
            
            # Record the trace data
            collected_item = {
                "request": request_data,
                "response": response_data,
            }
            proxy._record(collected_item)
            
            return response
        except Exception as e:
            # Calculate duration even for errors
            duration = time.time() - start_time
            
            # Prepare error response data
            response_data = {
                "streaming": False,
                "duration": duration,
                "timestamp": start_time,
                "error": str(e),
                "error_type": e.__class__.__name__,
            }
            
            # Record the error trace data
            collected_item = {
                "request": request_data,
                "response": response_data,
            }
            proxy._record(collected_item)
            
            # Re-raise the exception
            raise
    
    async def patched_async_messages_stream(self, *args, **kwargs):
        """Patched version of AsyncMessages.stream"""
        # Get the proxy instance
        proxy = self._proxy if hasattr(self, "_proxy") else None
        
        # If we still can't find it, use the first instance
        if proxy is None:
            proxy = self
        
        # Start timing
        start_time = time.time()
        
        # Prepare request data
        request_data = {
            "function": "async_messages.stream",
            "args": args,
            "kwargs": kwargs,
            "timestamp": start_time,
        }
        
        # Call the original method - don't await it as it returns an AsyncMessageStreamManager
        try:
            # The original_async_messages_stream returns an AsyncMessageStreamManager
            # which should be used with 'async with', not awaited directly
            stream = proxy.original_async_messages_stream(*args, **kwargs)
            
            # Calculate initial duration
            duration = time.time() - start_time
            
            # Prepare response data
            response_data = {
                "streaming": True,
                "duration": duration,
                "timestamp": start_time,
            }
            
            # Return a wrapped stream
            return AnthropicAsyncStreamWrapper(stream, proxy, request_data, response_data)
        except Exception as e:
            # Calculate duration even for errors
            duration = time.time() - start_time
            
            # Prepare error response data
            response_data = {
                "streaming": True,
                "duration": duration,
                "timestamp": start_time,
                "error": str(e),
                "error_type": e.__class__.__name__,
            }
            
            # Record the error trace data
            collected_item = {
                "request": request_data,
                "response": response_data,
            }
            proxy._record(collected_item)
            
            # Re-raise the exception
            raise



# Wrapper class for synchronous streaming responses
class AnthropicStreamWrapper:
    def __init__(self, original_stream, proxy, request_data, response_data):
        self.original_stream = original_stream
        self.proxy = proxy
        self.request_data = request_data
        self.response_data = response_data
        self.is_finished = False
        self.accumulated_text = ""
        self._message_stream = None
        
    # Support context manager protocol
    def __enter__(self):
        # Get the MessageStream from the MessageStreamManager
        self._message_stream = self.original_stream.__enter__()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        result = self.original_stream.__exit__(exc_type, exc_val, exc_tb)
        # Record the data when exiting the context manager
        if not self.is_finished:
            self.is_finished = True
            # Add the accumulated text to response data
            self.response_data["streaming_delta"] = self.accumulated_text
            # Record the trace data
            collected_item = {
                "request": self.request_data,
                "response": self.response_data,
            }
            self.proxy._record(collected_item)
        return result

    def __iter__(self):
        for event in self._message_stream:
            if event.type == "message_delta" and hasattr(event, "usage"):
                # Cumulative usage metadata is present here
                prompt_tokens = event.usage.input_tokens if event.usage.input_tokens is not None else 0
                completion_tokens = event.usage.output_tokens if event.usage.output_tokens is not None else 0
                total_tokens = prompt_tokens + completion_tokens
                self.response_data["usage"] = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens
                }
            yield event
        
    @property
    def text_stream(self):
        # Create a wrapper for the text_stream
        class TextStreamWrapper:
            def __init__(self, parent):
                self.parent = parent
                
            def __iter__(self):
                # Access the text_stream from the MessageStream object
                if self.parent._message_stream and hasattr(self.parent._message_stream, 'text_stream'):
                    # original_iter = iter(self.parent._message_stream.text_stream)
                    for event in self.parent:
                        try:
                            if event.type == "content_block_delta":
                                self.parent.accumulated_text += event.delta.text
                                yield event.delta.text
                        except Exception as e:
                            print(f"Error in text_stream iterator: {e}")
                            raise
                else:
                    # Fallback for compatibility
                    yield ""

        
        return TextStreamWrapper(self)
    
    # Forward any attribute access to the original stream
    def __getattr__(self, name):
        return getattr(self.original_stream, name)

# Wrapper class for asynchronous streaming responses
class AnthropicAsyncStreamWrapper:
    def __init__(self, original_stream, proxy, request_data, response_data):
        self.original_stream = original_stream
        self.proxy = proxy
        self.request_data = request_data
        self.response_data = response_data
        self.is_finished = False
        self.accumulated_text = ""
        self._message_stream = None

    async def __aiter__(self):
        async for event in self._message_stream.__aiter__():
            if event.type == "message_delta" and hasattr(event, "usage"):
                # Cumulative usage metadata is present here
                prompt_tokens = event.usage.input_tokens if event.usage.input_tokens is not None else 0
                completion_tokens = event.usage.output_tokens if event.usage.output_tokens is not None else 0
                total_tokens = prompt_tokens + completion_tokens
                self.response_data["usage"] = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens
                }
            yield event
    
    @property
    def text_stream(self):
        # Create a wrapper for the async text_stream
        class AsyncTextStreamWrapper:
            def __init__(self, parent):
                self.parent = parent
            
            def __aiter__(self):
                return self
            
            async def __anext__(self):
                try:
                    # Get the original text_stream
                    if not hasattr(self, "_original_aiter"):
                        self._original_aiter = self.parent.__aiter__()
                    
                    # Get the next chunk and continue iterating until we find content or stop
                    
                    event = await self._original_aiter.__anext__()
                    
                    if event.type == "content_block_delta":
                        # Found text content, add it to accumulated text and return
                        self.parent.accumulated_text += event.delta.text
                        return event.delta.text

                    # If we've reached the maximum iterations without finding content
                    return ""
                except StopAsyncIteration:
                    # Record the data when the iterator is exhausted
                    if not self.parent.is_finished:
                        self.parent.is_finished = True
                        
                        # Add the accumulated text to response data
                        self.parent.response_data["streaming_delta"] = self.parent.accumulated_text
                        
                        # Record the trace data
                        collected_item = {
                            "request": self.parent.request_data,
                            "response": self.parent.response_data,
                        }
                        self.parent.proxy._record(collected_item)
                    
                    # Re-raise StopAsyncIteration to signal the end of the stream
                    raise
        
        return AsyncTextStreamWrapper(self)
    
    # Forward any attribute access to the original stream
    def __getattr__(self, name):
        return getattr(self.original_stream, name)
    
    # Support async context manager protocol
    async def __aenter__(self):
        self._message_stream = await self.original_stream.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return await self.original_stream.__aexit__(exc_type, exc_val, exc_tb)
