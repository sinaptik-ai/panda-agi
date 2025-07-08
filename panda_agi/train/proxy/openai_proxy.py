"""
OpenAI Client Proxy Module V3

This module provides a universal proxy for OpenAI API calls that works with both v0.x and v1.x+ versions
of the OpenAI SDK. It automatically detects the SDK version and applies the appropriate patching strategy.

Usage:
    from openai_proxy_v3 import OpenAIProxy
    
    # Initialize the proxy
    proxy = OpenAIProxy()
    
    # Apply the patches
    proxy.apply_patches()
    
    # Use OpenAI clients normally
    import openai
    
    # Works with both v0.x and v1.x+ APIs
    # v0.x: response = openai.Completion.create(...)
    # v1.x: response = openai.chat.completions.create(...)
    
    # Get collected data
    collected_data = proxy.get_collected_data()
    
    # Remove patches when done
    proxy.remove_patches()
"""

import time
import json
import asyncio
from functools import wraps
from .base_proxy import BaseProxy
from ..utils import is_openai_v0
from ..conversation import Conversation, ConversationMessage, LLMUsage
from typing import List, Optional


class OpenAIProxy(BaseProxy):
    """
    A universal proxy class that collects OpenAI API request and response data.
    
    This class automatically detects the OpenAI SDK version and applies the appropriate
    patching strategy to intercept and collect data from all API calls, including streaming responses.
    """
    def __init__(self, model_name: Optional[str] = None, tags: Optional[List[str]] = None, debug: bool=False):
        """Initialize the proxy with empty collections.
        
        Args:
            model_name: Optional model name to use for requests if not specified
            tags: Optional tags to use for requests if not specified
            debug: Whether to print debug information
        """
        super().__init__(model_name=model_name, tags=tags, debug=debug)
        self.is_v0 = is_openai_v0()
        self.patches_applied = False
        
        # For v0.x
        self.original_completions_create = None
        self.original_chat_completions_create = None
        self.original_completions_acreate = None
        self.original_chat_completions_acreate = None
        
        # For v1.x+
        self.original_sync_send = None
        self.original_async_send = None
        self.original_stream_iter = None

    # Using _redact_headers from BaseProxy
    def _is_streaming_request(self, request_data):
        """Determine if a request is for streaming based on its parameters."""
        # Check body parameters
        if isinstance(request_data, dict):
            if request_data.get('stream', False):
                return True
        
        # For v1.x+, also check URL query parameters
        if not self.is_v0 and 'url' in request_data:
            if '?stream=true' in request_data['url'].lower() or '&stream=true' in request_data['url'].lower():
                return True
        
        return False

    def _add_streaming_content_to_trace(self, trace, chunk):
        last_message = trace.messages[-1]
        if last_message.role == "assistant":
            last_message.content += chunk
        
    # ===== V0.x Specific Methods =====
    def _get_content_from_response(self, response):
        content = ""
        if hasattr(response, "choices") and len(response.choices) > 0:
            choice = response.choices[0]
            if hasattr(choice, "text"):
                content += choice.text
            elif hasattr(choice, "message"):
                content += choice.message.content
            elif hasattr(choice, "delta"):
                content += choice.delta.content
        usage = response.usage if hasattr(response, "usage") else None
        return content, usage

    def _get_content_from_response_from_json(self, response):
        content = ""
        if "choices" in response and len(response["choices"]) > 0:
            choice = response["choices"][0]
            if "text" in choice:
                content += choice["text"]
            elif "message" in choice:
                content += choice["message"].get("content", "")
            elif "delta" in choice:
                content += choice["delta"].get("content", "")

        usage = response["usage"] if "usage" in response else None
        return content, usage

    def _enable_usage_collection(self, kwargs):
        """Enable usage collection for a streaming request."""
        if "stream_options" not in kwargs:
            kwargs["stream_options"] = {"include_usage": True}
        else:
            kwargs["stream_options"]["include_usage"] = True
    
    def _patched_completions_acreate_v0(self, original_method):
        """Return a patched version of the openai.Completion.acreate method for v0.x."""
        @wraps(original_method)
        async def wrapper(*args, **kwargs):
            # Skip if not in the active context for this thread
            if not hasattr(self.thread_local, 'is_active') or not self.thread_local.is_active:
                return await original_method(*args, **kwargs)
                
            # Extract request data
            req_data = {
                "method": "POST",
                "url": "https://api.openai.com/v1/completions",
                "headers": {"Authorization": "[REDACTED]"},
                "body": kwargs
            }
            
            # Check if this is a streaming request
            is_stream = kwargs.get("stream", False)
            req_data["is_stream"] = is_stream
            
            # Time the request
            start_time = time.time()
            
            # Call the original method
            if is_stream:
                self._enable_usage_collection(kwargs)

            response = await original_method(*args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Extract response data
            resp_data = {
                "duration": duration,
            }
            
            # Handle streaming responses
            if is_stream:
                resp_data["streaming"] = True
                resp_data["content"] = ""
                trace = self._process_response(req_data, resp_data, kwargs)

                self.collected_data.append(trace)
                
                # For v0.27.0, we need to wrap the generator in our own generator
                # since we can't modify the __iter__ method of a generator object
                original_response = response
                
                # Create a wrapper generator for async streaming
                async def wrapped_async_generator():
                    async for chunk in original_response:
                        # Store the chunk in our record
                        if hasattr(chunk, "choices") and len(chunk.choices) > 0:
                            if hasattr(chunk.choices[0], "text"):
                                self._add_streaming_content_to_trace(trace, chunk.choices[0].text)
                            elif hasattr(chunk.choices[0], "delta") and hasattr(chunk.choices[0].delta, "content"):
                                content = chunk.choices[0].delta.content
                                if content:
                                    self._add_streaming_content_to_trace(trace, content)

                        yield chunk
                    # track at the end of the stream response
                    if "usage" in chunk and chunk["usage"]:
                        trace.usage = LLMUsage(
                            **chunk["usage"]
                        )
                    self._track(trace)
                
                # Return our wrapped generator instead
                response = wrapped_async_generator()
            else:
                # For non-streaming responses, extract the response data
                resp_data["id"] = getattr(response, "id", None)
                resp_data["object"] = getattr(response, "object", None)
                resp_data["model"] = getattr(response, "model", None)
                resp_data["content"], resp_data["usage"] = self._get_content_from_response(response)
                trace = self._process_response(req_data, resp_data, kwargs)
                self._track(trace)
                self.collected_data.append(trace)
        
            return response
        
        return wrapper
    
    def _patched_completions_create_v0(self, original_method):
        """Return a patched version of the openai.Completion.create method for v0.x."""
        @wraps(original_method)
        def wrapper(*args, **kwargs):
            # Skip if not in the active context for this thread
            if not hasattr(self.thread_local, 'is_active') or not self.thread_local.is_active:
                return original_method(*args, **kwargs)
            # Extract request data
            req_data = {
                "method": "POST",
                "url": "https://api.openai.com/v1/completions",
                "headers": {"Authorization": "[REDACTED]"},
                "body": kwargs
            }
            
            # Check if this is a streaming request
            is_stream = kwargs.get("stream", False)
            req_data["is_stream"] = is_stream
            
            # Time the request
            start_time = time.time()
            
            # Call the original method
            if is_stream:
                self._enable_usage_collection(kwargs)
            response = original_method(*args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Extract response data
            resp_data = {
                "duration": duration,
            }
            
            # Handle streaming responses
            if is_stream:
                resp_data["streaming"] = True
                resp_data["content"] = ""
                trace = self._process_response(req_data, resp_data, kwargs)

                self.collected_data.append(trace)
                
                # For v0.27.0, we need to wrap the generator in our own generator
                # since we can't modify the __iter__ method of a generator object
                original_response = response
                
                # Create a wrapper generator
                def wrapped_generator():
                    for chunk in original_response:
                        # Store the chunk in our record
                        if hasattr(chunk, "choices") and len(chunk.choices) > 0:

                            if hasattr(chunk.choices[0], "text"):
                                self._add_streaming_content_to_trace(trace, chunk.choices[0].text)
                            elif hasattr(chunk.choices[0], "delta") and hasattr(chunk.choices[0].delta, "content"):
                                content = chunk.choices[0].delta.content
                                if content:
                                    self._add_streaming_content_to_trace(trace, content)

                        yield chunk

                    # track at the end of the stream response
                    if "usage" in chunk and chunk["usage"]:
                        trace.usage = LLMUsage(
                         **chunk["usage"]
                        )

                    self._track(trace)

                # Return our wrapped generator instead
                response = wrapped_generator()
            else:
                # For non-streaming responses, extract the response data
                resp_data["id"] = getattr(response, "id", None)
                resp_data["object"] = getattr(response, "object", None)
                resp_data["model"] = getattr(response, "model", None)
                resp_data["content"], resp_data["usage"] = self._get_content_from_response(response)
                trace = self._process_response(req_data, resp_data, kwargs)
                self._track(trace)
                self.collected_data.append(trace)
            
            return response
        
        return wrapper
    
    # ===== V1.x+ Specific Methods =====
    def _process_response(self, request, response, kwargs):
        # Create Conversation object
        input_text = ""
        if 'prompt' in kwargs:
            input_text = kwargs['prompt']
        elif 'body' in request and 'prompt' in request['body']:
            input_text = request['body']['prompt']
        
        # Prepare metadata
        metadata = {
            "provider": "openai",
            "is_v0": self.is_v0,
            "function": request.get("function", ""),
            "streaming": response.get("streaming", False),
            "duration": response.get("duration", 0),
            "timestamp": response.get("timestamp", time.time()),            
        }

        # Extract other arguments from kwargs
        other_args = {k: v for k, v in request.get("kwargs", {}).items() if k != "messages"}
        metadata.update(other_args)

        messages = request["body"].get("messages", [])

        messages = [ConversationMessage(role=message["role"], content=message["content"]) for message in messages]
        # check if messages are empty add message from the input_text
        if messages:
            messages.append(ConversationMessage(role="assistant", content=response.get('content', '')))
        else:
            messages = [ConversationMessage(role="user", content=input_text), ConversationMessage(role="assistant", content=response.get('content', ''))]

        llm_usage = response.get('usage', None)
        if llm_usage:
            llm_usage = LLMUsage(
                **llm_usage
            )
        trace = Conversation(
            messages=messages,
            tags=self.tags,
            model_name=self.model_name,
            usage=llm_usage,
            metadata=metadata
        )
        return trace

    def _patch_client_sync_request(self, original_method):
        @wraps(original_method)
        def wrapper(self_client, *args, **kwargs):
            if args[1].json_data.get("stream", False):
                args[1].json_data["stream_options"] = {"include_usage": True}
            return original_method(self_client, *args, **kwargs)
        
        return wrapper
    
    def _patch_client_async_request(self, original_method):
        @wraps(original_method)
        async def wrapper(self_client, *args, **kwargs):
            if args[1].json_data.get("stream", False):
                args[1].json_data["stream_options"] = {"include_usage": True}
            return await original_method(self_client, *args, **kwargs)
        
        return wrapper

    def _patched_sync_send_v1(self, original_method):
        """Return a patched version of the SyncHttpxClientWrapper.send method for v1.x+."""
        @wraps(original_method)
        def wrapper(self_client, request, *args, **kwargs):
            # Skip if not in the active context for this thread
            if not hasattr(self.thread_local, 'is_active') or not self.thread_local.is_active:
                return original_method(self_client, request, *args, **kwargs)
            # Extract request data
            req_data = {
                "method": request.method,
                "url": str(request.url),
                "headers": self._redact_headers(dict(request.headers)),
                "body": None
            }
            
            # Try to extract and parse request body
            if hasattr(request, "content") and request.content:
                try:
                    req_data["body"] = json.loads(request.content.decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    req_data["body"] = "[Binary content]"
            
            # Check if this is a streaming request
            is_stream = self._is_streaming_request(req_data["body"]) or self._is_streaming_request(req_data["url"])
            req_data["is_stream"] = is_stream
            
            # Time the request
            start_time = time.time()
            
            # Call the original method
            response = original_method(self_client, request, *args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Extract response data
            resp_data = {
                "status": response.status_code,
                "headers": dict(response.headers),
                "duration": duration,
            }
            
            # Handle streaming responses
            if is_stream:
                resp_data["streaming"] = True
                resp_data["content"] = ""

                # Create LLMCallTrace object and save
                trace = self._process_response(req_data, resp_data, kwargs)

                self.collected_data.append(trace)
                
                # Store the original iter_lines method
                original_iter_lines = response.iter_bytes
                
                # Define a wrapper for iter_lines
                def patched_iter_lines(*args, **kwargs):            
                    # Create a buffer to accumulate partial chunks
                    from openai._streaming import SSEDecoder
                    buffer = b""
                    decoder = SSEDecoder()
                    
                    # Create a generator that yields bytes directly
                    for chunk in original_iter_lines(*args, **kwargs):
                        # Always yield the original chunk to maintain the stream
                        yield chunk
                        
                        # Process the chunk with SSEDecoder
                        try:
                            # Accumulate chunks in buffer
                            if isinstance(chunk, bytes):
                                buffer += chunk
                                
                                # Try to extract complete SSE events
                                events = list(decoder.iter_bytes([buffer]))
                                if events:
                                    # We found complete events, clear the buffer
                                    buffer = b""
                                    
                                    # Process each event
                                    for event in events:
                                        if event.data == b"[DONE]":
                                            continue
                                            
                                        try:
                                            # Parse the JSON data
                                            chunk_data = json.loads(event.data)
                                            content, response_usage = self._get_content_from_response_from_json(chunk_data)
                                            self._add_streaming_content_to_trace(trace, content)
                                            trace.usage = LLMUsage(
                                                **response_usage
                                            )
                                        except json.JSONDecodeError:
                                            # Non-JSON data
                                            pass
                        except Exception:
                            # Ignore any errors in processing the chunk
                            pass
                    
                    # track at the end of the stream response
                    self._track(trace)
                
                # Replace the iter_lines method
                response.iter_bytes = patched_iter_lines
            else:
                # For non-streaming responses, extract the response body
                try:
                    response_json = response.json()
                    resp_data["content"], resp_data["usage"] = self._get_content_from_response_from_json(response_json)
                    trace = self._process_response(req_data, resp_data, kwargs)
                    self.collected_data.append(trace)
                    self._track(trace)
                except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
                    try:
                        resp_data["body"] = response.text
                    except (UnicodeDecodeError, AttributeError):
                        resp_data["body"] = "[Binary content]"
            
            return response
        
        return wrapper
    
    def _patched_async_send_v1(self, original_method):
        """Return a patched version of the AsyncHttpxClientWrapper.send method for v1.x+."""
        @wraps(original_method)
        async def wrapper(self_client, request, *args, **kwargs):
            # Skip if not in the active context for this thread
            if not hasattr(self.thread_local, 'is_active') or not self.thread_local.is_active:
                return await original_method(self_client, request, *args, **kwargs)
            # Extract request data
            req_data = {
                "method": request.method,
                "url": str(request.url),
                "headers": self._redact_headers(dict(request.headers)),
                "body": None
            }
            
            # Try to extract and parse request body
            if hasattr(request, "content") and request.content:
                try:
                    req_data["body"] = json.loads(request.content.decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    req_data["body"] = "[Binary content]"
            
            # Check if this is a streaming request
            is_stream = self._is_streaming_request(req_data["body"]) or self._is_streaming_request(req_data["url"])
            req_data["is_stream"] = is_stream
            
            # Time the request
            start_time = time.time()
            
            # Call the original method
            response = await original_method(self_client, request, *args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Extract response data
            resp_data = {
                "status": response.status_code,
                "headers": dict(response.headers),
                "duration": duration,
            }
            
            # Handle streaming responses
            if is_stream:
                resp_data["streaming"] = True
                resp_data["content"] = ""
                trace = self._process_response(req_data, resp_data, kwargs)
                self.collected_data.append(trace)
                
                # Store the original aiter_lines method
                original_aiter_lines = response.aiter_bytes
    
                # Define a wrapper for aiter_lines
                async def patched_aiter_lines(*args, **kwargs):
                    # Create a buffer to accumulate partial chunks
                    from openai._streaming import SSEDecoder
                    buffer = b""
                    decoder = SSEDecoder()
                    
                    # Create an async generator that yields bytes directly
                    async for chunk in original_aiter_lines(*args, **kwargs):
                        # Always yield the original chunk to maintain the stream
                        yield chunk
                        
                        # Process the chunk with SSEDecoder
                        try:
                            # Accumulate chunks in buffer
                            if isinstance(chunk, bytes):
                                buffer += chunk
                                
                                # Try to extract complete SSE events
                                events = list(decoder.iter_bytes([buffer]))
                                if events:
                                    # We found complete events, clear the buffer
                                    buffer = b""
                                    
                                    # Process each event
                                    for event in events:
                                        if event.data == b"[DONE]":
                                            continue                                            
                                        try:
                                            # Parse the JSON data
                                            chunk_data = json.loads(event.data)
                                            content, response_usage = self._get_content_from_response_from_json(chunk_data)
                                            self._add_streaming_content_to_trace(trace, content)
                                            trace.usage = LLMUsage(
                                                **response_usage
                                            )
                                        except json.JSONDecodeError:
                                            # Non-JSON data
                                            pass
                        except Exception as e:
                            # Ignore any errors in processing the chunk
                            pass

                    # track at the end of the stream response
                    self._track(trace)
                
                # Replace the aiter_lines method
                response.aiter_bytes = patched_aiter_lines
            else:
                # For non-streaming responses, extract the response body
                try:
                    # Check if the response object has async methods
                    if hasattr(response, 'json') and asyncio.iscoroutinefunction(response.json):
                        # Async response
                        resp_data["body"] = await response.json()
                    else:
                        # Sync response
                        resp_data["body"] = response.json()

                    resp_data["content"], resp_data["usage"] = self._get_content_from_response_from_json(resp_data["body"])
                except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
                    try:
                        if hasattr(response, 'text') and asyncio.iscoroutinefunction(response.text):
                            # Async response
                            resp_data["body"] = await response.text()
                        else:
                            # Sync response
                            resp_data["body"] = response.text
                    except (UnicodeDecodeError, AttributeError):
                        resp_data["body"] = "[Binary content]"
                
                trace = self._process_response(req_data, resp_data, kwargs)
                self.collected_data.append(trace)
                self._track(trace)
            
            return response
        
        return wrapper
            
    def _apply_patches_impl(self):
        """Implementation of applying patches for OpenAI."""
        if self.is_v0:
            self._apply_patches_v0()
        else:
            self._apply_patches_v1()
        self.logger.info(f"OpenAIProxy configured for {'v0.x' if self.is_v0 else 'v1.x+'} OpenAI SDK")
            
    def _remove_patches_impl(self):
        """Implementation of removing patches for OpenAI."""
        if self.is_v0:
            self._remove_v0_patches()
        else:
            self._remove_v1_patches()
        self.logger.info("Removed patches from OpenAIProxy.")
        
    def _apply_patches_v0(self):
        """Apply patches specific to OpenAI SDK v0.x."""
        import openai

        # Patch Completion.create
        if hasattr(openai, "Completion") and hasattr(openai.Completion, "create"):
            self.original_completions_create = openai.Completion.create
            self.original_completions_acreate = openai.Completion.acreate
            openai.Completion.create = self._patched_completions_create_v0(self.original_completions_create)
            openai.Completion.acreate = self._patched_completions_acreate_v0(self.original_completions_acreate)

        # Patch ChatCompletion.create if available
        if hasattr(openai, "ChatCompletion") and hasattr(openai.ChatCompletion, "create"):
            self.original_chat_completions_create = openai.ChatCompletion.create
            self.original_chat_completions_acreate = openai.ChatCompletion.acreate
            openai.ChatCompletion.create = self._patched_completions_create_v0(self.original_chat_completions_create)
            openai.ChatCompletion.acreate = self._patched_completions_acreate_v0(self.original_chat_completions_acreate)

    def _apply_patches_v1(self):
        """Apply patches specific to OpenAI SDK v1.x+."""
        import openai
        # Find the client module
        try:
            from openai._client import SyncHttpxClientWrapper, AsyncHttpxClientWrapper
        except ImportError:
            try:
                from openai._base_client import SyncHttpxClientWrapper, AsyncAPIClient, SyncAPIClient, AsyncHttpxClientWrapper
            except ImportError:
                self.logger.error("Could not find OpenAI SDK client classes. Patching may not work correctly.")
                return

        # Patch SyncHttpxClientWrapper.send
        if hasattr(SyncHttpxClientWrapper, "send"):
            SyncAPIClient.request = self._patch_client_sync_request(SyncAPIClient.request)
            self.original_sync_send = SyncHttpxClientWrapper.send
            SyncHttpxClientWrapper.send = self._patched_sync_send_v1(self.original_sync_send)

        # Patch AsyncHttpxClientWrapper.send
        if hasattr(AsyncHttpxClientWrapper, "send"):
            AsyncAPIClient.request = self._patch_client_async_request(AsyncAPIClient.request)
            self.original_async_send = AsyncHttpxClientWrapper.send
            AsyncHttpxClientWrapper.send = self._patched_async_send_v1(self.original_async_send)

    def __enter__(self):
        """Apply patches when entering the context."""
        self.apply_patches()
        self.logger.info("Applied patches for OpenAIProxy.")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Remove patches when exiting the context."""
        # Mark this thread as inactive in the context
        self.thread_local.is_active = False
        self.remove_patches()
        return False
        
    def _remove_v0_patches(self):
        """Remove patches specific to OpenAI SDK v0.x."""
        # Import openai only when needed to restore patches
        try:
            import openai
            # Restore Completion.create
            if self.original_completions_create and hasattr(openai, "Completion"):
                openai.Completion.create = self.original_completions_create
                openai.Completion.acreate = self.original_completions_acreate

            # Restore ChatCompletion.create
            if self.original_chat_completions_create and hasattr(openai, "ChatCompletion"):
                openai.ChatCompletion.create = self.original_chat_completions_create
                openai.ChatCompletion.acreate = self.original_chat_completions_acreate
        except ImportError:
            self.logger.error("Could not import openai module to restore patches.")
            return
            
    def _remove_v1_patches(self):
        """Remove patches specific to OpenAI SDK v1.x+."""
        try:
            from openai._client import SyncHttpxClientWrapper, AsyncHttpxClientWrapper
        except ImportError:
            try:
                from openai._base_client import SyncHttpxClientWrapper, AsyncHttpxClientWrapper
            except ImportError:
                self.logger.error("Could not find OpenAI SDK client classes. Patch removal may not work correctly.")
                return

        # Restore SyncHttpxClientWrapper.send
        if self.original_sync_send and hasattr(SyncHttpxClientWrapper, "send"):
            SyncHttpxClientWrapper.send = self.original_sync_send

        # Restore AsyncHttpxClientWrapper.send
        if self.original_async_send and hasattr(AsyncHttpxClientWrapper, "send"):
            AsyncHttpxClientWrapper.send = self.original_async_send
