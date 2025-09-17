"""
LiteLLM Proxy Module

This module provides a proxy for LiteLLM API calls that intercepts and collects
request and response data for analysis and debugging.
"""

import time
import functools
from typing import Dict, Any, List, Optional
import litellm
from .base_proxy import BaseProxy
from ..conversation import Conversation, LLMUsage, ConversationMessage
from pydantic import BaseModel


class LiteLLMProxy(BaseProxy):
    """A proxy class that collects LiteLLM API request and response data.
    
    This class patches the LiteLLM completion and completion_with_retries functions
    to intercept and collect data from all API calls, including streaming responses.
    """
    
    def __init__(self, model_name: Optional[str] = None, tags: Optional[List[str]] = None,  debug: bool=False):
        """Initialize the LiteLLMProxy.
        
        Args:
            model_name: Optional model name to use for requests if not specified
            tags: Optional tags to use for requests if not specified
            debug: Enable debug output for tracing
        """
        super().__init__(model_name=model_name, tags=tags, debug=debug)
        self.original_completion = None
        self.original_acompletion = None
        self.original_completion_with_retries = None
    
    # Using _redact_headers from BaseProxy
    def _is_streaming_request(self, kwargs: Dict[str, Any]) -> bool:
        """Check if this is a streaming request."""
        return kwargs.get("stream", False)
    
    def _enable_usage_collection(self, kwargs: Dict[str, Any]):
        """Enable usage collection for a streaming request."""
        if "stream_options" not in kwargs:
            kwargs["stream_options"] = {"include_usage": True}
        else:
            kwargs["stream_options"]["include_usage"] = True
        
    def _record(self, data: Dict[str, Any]):
        """Convert collected data to Conversation and append to collected_data."""
        request = data.get("request", {})
        response = data.get("response", {})
        messages = request.get("kwargs", {}).get("messages", [])
        
        # Extract input text from the last user message
        input_text = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                input_text = msg.get("content", "")
                break
        
        # Extract output text from response
        output_text = ""
        if "content" in response:
            output_text = response.get("content", "")
        elif response.get("streaming", False):
            # For streaming responses, get the accumulated delta text
            output_text = response.get("streaming_delta", "")
        
        # Extract usage information
        usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        if "usage" in response:
            usage = response.get("usage", None)
            if isinstance(usage, BaseModel):
                usage = usage.dict()
         
        # Prepare metadata
        metadata = {
            "provider": "litellm",
            "function": request.get("function", ""),
            "streaming": response.get("streaming", False),
            "duration": response.get("duration", 0),
            "timestamp": response.get("timestamp", time.time()),            
        }

        # Extract other arguments from kwargs
        other_args = {k: v for k, v in request.get("kwargs", {}).items() if k != "messages"}
        metadata.update(other_args)

        model_name = self.model_name or request.get("kwargs", {}).get("model", None)
        
        # Add error information if present
        if "error" in response:
            metadata["error"] = response.get("error", "")
            metadata["error_type"] = response.get("error_type", "Unknown")

        messages = [ConversationMessage(role=message["role"], content=message["content"]) for message in messages]
        # check if messages are empty add message from the input_text
        if messages:
            messages.append(ConversationMessage(role="assistant", content=output_text))
        else:
            messages = [ConversationMessage(role="user", content=input_text), ConversationMessage(role="assistant", content=output_text)]


        if usage:
            usage = LLMUsage(**usage)

        # Create the trace object
        trace = Conversation(
            messages=messages,
            tags=self.tags,
            model_name=model_name,
            usage=usage,
            metadata=metadata
        )
        
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
    
    def patched_completion(self, *args, **kwargs):
        """Patched version of litellm.completion."""
        # Start timing
        start_time = time.time()
        
        # Prepare request data
        request_data = {
            "function": "completion",
            "args": args,
            "kwargs": {k: v for k, v in kwargs.items() if k != "api_key"},
            "timestamp": time.time(),
        }
        
        # Check if streaming is enabled
        is_streaming = self._is_streaming_request(kwargs)
        
        # Initialize response data
        response_data = {
            "streaming": is_streaming,
            "timestamp": time.time(),
        }
        
        try:
            # Make the API call
            self._enable_usage_collection(kwargs)

            response = self.original_completion(*args, **kwargs)
            # Calculate duration
            duration = time.time() - start_time
            response_data["duration"] = duration
            
            # Handle streaming response
            if is_streaming:
                # Store streaming data
                response_data["chunks"] = []
                response_data["streaming_text"] = ""
                response_data["streaming_delta"] = ""
                        
                # Create the wrapper and return it instead of the original response
                wrapped_response = StreamingResponseWrapper(
                    original_response=response,
                    proxy=self,
                    request_data=request_data,
                    response_data=response_data
                )
                
                # Update our response to use the wrapped version
                response = wrapped_response
            else:
                # For non-streaming responses, extract content
                if hasattr(response, "choices") and len(response.choices) > 0:
                    response_data["content"] = response.choices[0].message.content
                    response_data["usage"] = response.model_extra.get("usage", {})
            
            # For non-streaming responses, store the collected data immediately
            if not is_streaming:
                collected_item = {
                    "request": request_data,
                    "response": response_data,
                }
                self._record(collected_item)
            
            return response
            
        except Exception as e:
            self.logger.error(f"Exception in patched_completion: {e}")
            # Re-raise the exception
            raise e
    
    async def patched_acompletion(self, *args, **kwargs):
        """Patched version of litellm.acompletion."""
        # Start timing
        start_time = time.time()
        
        # Store request data
        request_data = {
            "function": "acompletion",
            "args": args,
            "kwargs": {k: v for k, v in kwargs.items() if k != "api_key"},
            "timestamp": time.time(),
        }
        
        # Check if streaming is enabled
        is_streaming = self._is_streaming_request(kwargs)
        
        # Initialize response data
        response_data = {
            "streaming": is_streaming,
            "timestamp": time.time(),
        }
        
        try:
            # Call the original function
            self._enable_usage_collection(kwargs)
            response = await self.original_acompletion(*args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            response_data["duration"] = duration
            
            if is_streaming:
                
                # Create the wrapper and return it
                wrapped_response = AsyncStreamingResponseWrapper(
                    original_response=response,
                    proxy=self,
                    request_data=request_data,
                    response_data=response_data
                )
                
                # Return the wrapped response
                return wrapped_response
            else:
                # For non-streaming responses, extract content
                if hasattr(response, "choices") and len(response.choices) > 0:
                    if hasattr(response.choices[0], "message") and hasattr(response.choices[0].message, "content"):
                        response_data["content"] = response.choices[0].message.content
                        response_data["usage"] = response.model_extra.get("usage", {})
                
                # Store the collected data using _record to create Conversation
                collected_item = {
                    "request": request_data,
                    "response": response_data,
                }
                self._record(collected_item)
                
                return response
            
        except Exception as e:
            self.logger.error(f"Exception in patched_acompletion: {e}")
            # Re-raise the exception
            raise
    
    def _apply_patches_impl(self):
        """Apply all patches to the LiteLLM module."""
        # Store original functions
        self.original_completion = litellm.completion
        self.original_acompletion = litellm.acompletion
        
        # Apply patches
        litellm.completion = functools.partial(self.patched_completion)
        litellm.acompletion = self.patched_acompletion
    
    def _remove_patches_impl(self):
        """Remove all patches from the LiteLLM module."""
        # Restore original functions
        if self.original_completion:
            litellm.completion = self.original_completion
        if self.original_acompletion:
            litellm.acompletion = self.original_acompletion


# Create a streaming response wrapper class to ensure we capture all data
class StreamingResponseWrapper:
    def __init__(self, original_response, proxy, request_data, response_data):
        self.original_response = original_response
        self.proxy = proxy
        self.request_data = request_data
        self.response_data = response_data
        self.is_finished = False
    
    def __iter__(self):
        # Get the original iterator
        original_iter = self.original_response.__iter__()
        
        try:
            for chunk in original_iter:
                # Store chunk data
                if hasattr(chunk, "choices") and len(chunk.choices) > 0:
                    delta_text = ""
                    if hasattr(chunk.choices[0], "delta"):
                        delta = chunk.choices[0].delta
                        if hasattr(delta, "content") and delta.content is not None:
                            delta_text = delta.content
                    
                    if delta_text:
                        self.response_data["streaming_delta"] += delta_text
                        
                    # Store chunk for analysis
                    chunk_data = {
                        "delta_text": delta_text,
                        "chunk": chunk
                    }
                    if hasattr(chunk, "model_extra") and chunk.model_extra:
                        self.response_data["usage"] = chunk.model_extra.get("usage", {})
            
                    self.response_data["chunks"].append(chunk_data)
                
                yield chunk
        finally:
            # Record the data when the iterator is exhausted
            if not self.is_finished:
                self.is_finished = True
                collected_item = {
                    "request": self.request_data,
                    "response": self.response_data,
                }
                self.proxy._record(collected_item)
    
    # Forward any attribute access to the original response
    def __getattr__(self, name):
        return getattr(self.original_response, name)

# Create an async streaming wrapper to capture streaming chunks
class AsyncStreamingResponseWrapper:
    def __init__(self, original_response, proxy, request_data, response_data):
        self.original_response = original_response
        self.proxy = proxy
        self.request_data = request_data
        self.response_data = response_data
        self.streaming_delta = ""
        self.chunks = []
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        try:
            # Get the next chunk from the original response
            chunk = await self.original_response.__anext__()
            self.chunks.append(chunk)
            
            # Extract content from the chunk if available
            if hasattr(chunk, "choices") and len(chunk.choices) > 0:
                if hasattr(chunk.choices[0], "delta"):
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        self.streaming_delta += delta.content
                    
                    if hasattr(chunk, "model_extra") and chunk.model_extra:
                        self.response_data["usage"] = chunk.model_extra.get("usage", {})
            
            return chunk
        except StopAsyncIteration:
            # When the stream is exhausted, record the data
            # Add the accumulated content to response data
            self.response_data["content"] = self.streaming_delta
            
            # Record the trace data
            collected_item = {
                "request": self.request_data,
                "response": self.response_data,
            }
            self.proxy._record(collected_item)
            
            # Re-raise StopAsyncIteration to signal the end of the stream
            raise
    
    def __getattr__(self, name):
        return getattr(self.original_response, name)