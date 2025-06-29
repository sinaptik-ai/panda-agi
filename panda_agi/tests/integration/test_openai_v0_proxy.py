#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test file for OpenAI v0 API calls.

This file demonstrates how to use the OpenAIProxy class to capture
and trace API calls made using the OpenAI v0 Python SDK.
"""

import os
import json
import asyncio
import dotenv
import openai
from panda_agi.traces.proxy.openai_proxy import OpenAIProxy
from panda_agi.traces.observe import observe

# Load environment variables
dotenv.load_dotenv()

# Configure the OpenAI API with the API key from the environment
openai.api_key = os.environ.get("OPENAI_API_KEY", "")

# -------------------------------
# Completion API Test Functions
# -------------------------------

def test_sync_request():
    """Test synchronous OpenAI API request with v0.27.0."""
    print("\n--- Making synchronous test request ---")
    
    # Create a completion using v0.27.0 API
    response = openai.Completion.create(
        engine="gpt-3.5-turbo-instruct",
        prompt="Hello, how are you?",
        max_tokens=50
    )
    
    print("\n--- Synchronous response content ---")
    if hasattr(response, "choices") and len(response.choices) > 0:
        print(f"Reply: {response.choices[0].text}")
    return response

def test_sync_streaming():
    """Test synchronous streaming OpenAI API request with v0.27.0."""
    print("\n--- Making synchronous streaming test request ---")
    
    # Create a streaming completion using v0.27.0 API
    response = openai.Completion.create(
        engine="gpt-3.5-turbo-instruct",
        prompt="List 5 colors",
        max_tokens=50,
        stream=True
    )
    
    print("\n--- Synchronous streaming response content ---")
    collected_content = ""
    chunk_count = 0
    
    print("\n--- DEBUG: Streaming response structure ---")
    for chunk in response:
        chunk_count += 1
        print(f"Chunk {chunk_count} type: {type(chunk).__name__}")
        print(f"Chunk {chunk_count} attributes: {dir(chunk)}")
        
        if hasattr(chunk, "choices") and len(chunk.choices) > 0:
            print(f"Chunk {chunk_count} has {len(chunk.choices)} choices")
            choice = chunk.choices[0]
            print(f"Choice attributes: {dir(choice)}")
            
            if hasattr(choice, "text") and choice.text:
                collected_content += choice.text
                print(f"Content: '{choice.text}'")
    
    print("\n\n--- Collected content ---")
    print(collected_content)
    
    return response  # Return the response for further debugging

async def test_async_request():
    """Test asynchronous OpenAI API request with v0.27.0."""
    print("\n--- Making asynchronous test request ---")
    
    try:
        # In v0.27.0, we use acreate for async calls
        response = await openai.Completion.acreate(
            engine="gpt-3.5-turbo-instruct",
            prompt="What's the weather like?",
            max_tokens=50
        )
        
        print("\n--- Asynchronous response content ---")
        if hasattr(response, "choices") and len(response.choices) > 0:
            print(f"Reply: {response.choices[0].text}")
        return response
    except Exception as e:
        import traceback
        print(f"Error in async request: {type(e).__name__}: {e}")
        traceback.print_exc()
    


async def test_async_streaming():
    """Test asynchronous streaming OpenAI API request with v0.27.0."""
    print("\n--- Making asynchronous streaming test request ---")
    
    try:
        # In v0.27.0, acreate with stream=True returns a stream object
        stream = await openai.Completion.acreate(
            engine="gpt-3.5-turbo-instruct",
            prompt="List 5 planets",
            max_tokens=50,
            stream=True
        )
        
        print("\n--- Asynchronous streaming response content ---")
        collected_content = ""
        chunk_count = 0
        
        # Process the chunks from the stream - must use async for with async generator
        async for chunk in stream:
            chunk_count += 1
            print(f"Chunk {chunk_count} type: {type(chunk).__name__}")
            
            if hasattr(chunk, "choices") and len(chunk.choices) > 0:
                choice = chunk.choices[0]
                if hasattr(choice, "text") and choice.text:
                    collected_content += choice.text
                    print(f"Content: '{choice.text}'")

        
        print("\n\n--- Collected content ---")
        print(collected_content)
        
    except Exception as e:
        import traceback
        print(f"Error in async streaming: {type(e).__name__}: {e}")
        traceback.print_exc()

# ChatCompletion API test functions
def test_chat_completion_sync():
    """Test synchronous OpenAI ChatCompletion API request."""
    print("\n--- Testing synchronous ChatCompletion (non-streaming) ---")
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Tell me a short story about a robot."}
    ]
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=100
    )
    
    print("\n--- Synchronous ChatCompletion response ---")
    if hasattr(response, "choices") and len(response.choices) > 0:
        print(f"Response: {response.choices[0].message.content}")
    print("\nSync chat response complete.")
    return response

def test_chat_completion_sync_stream():
    """Test synchronous streaming OpenAI ChatCompletion API request."""
    print("\n--- Testing synchronous ChatCompletion with streaming ---")
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Tell me a short story about a cat."}
    ]
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=100,
        stream=True
    )
    
    print("\n--- Synchronous streaming ChatCompletion response ---")
    full_text = ""
    for chunk in response:
        if hasattr(chunk, "choices") and len(chunk.choices) > 0:
            if hasattr(chunk.choices[0], "delta") and hasattr(chunk.choices[0].delta, "content"):
                content = chunk.choices[0].delta.content
                if content:
                    full_text += content
                    print(content, end="", flush=True)
    
    print(f"\n\nSync chat streaming response complete. Total length: {len(full_text)} characters")
    return response

async def test_chat_completion_async():
    """Test asynchronous OpenAI ChatCompletion API request."""
    print("\n--- Testing asynchronous ChatCompletion (non-streaming) ---")
    
    try:
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a short story about a dog."}
        ]
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=100
        )
        
        print("\n--- Asynchronous ChatCompletion response ---")
        if hasattr(response, "choices") and len(response.choices) > 0:
            print(f"Response: {response.choices[0].message.content}")
        print("\nAsync chat response complete.")
        return response
    except Exception as e:
        import traceback
        print(f"Error in async chat completion: {type(e).__name__}: {e}")
        traceback.print_exc()

async def test_chat_completion_async_stream():
    """Test asynchronous streaming OpenAI ChatCompletion API request."""
    print("\n--- Testing asynchronous ChatCompletion with streaming ---")
    
    try:
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a short poem about a butterfly."}
        ]
        
        stream = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=100,
            stream=True
        )
        
        print("\n--- Asynchronous streaming ChatCompletion response ---")
        full_text = ""
        async for chunk in stream:
            if hasattr(chunk, "choices") and len(chunk.choices) > 0:
                if hasattr(chunk.choices[0], "delta") and hasattr(chunk.choices[0].delta, "content"):
                    content = chunk.choices[0].delta.content
                    if content:
                        full_text += content
                        print(content, end="", flush=True)
        
        print(f"\n\nAsync chat streaming response complete. Total length: {len(full_text)} characters")
    except Exception as e:
        import traceback
        print(f"Error in async chat streaming: {type(e).__name__}: {e}")
        traceback.print_exc()

async def run_async_tests():
    """Run all asynchronous tests."""
    await test_async_request()
    await test_async_streaming()
    await test_chat_completion_async()
    await test_chat_completion_async_stream()


@observe(providers=["openai"])
async def main():
    """Main function to run all tests."""
    print("Running OpenAI v0 proxy tests...")
    print("Note: You need to set the OPENAI_API_KEY environment variable.")
    
    try:
        # Run synchronous tests for Completion API
        test_sync_request()
        test_sync_streaming()
        
        # Run synchronous tests for ChatCompletion API
        test_chat_completion_sync()
        test_chat_completion_sync_stream()
        
        # Run asynchronous tests
        await run_async_tests()
        
        print("\nAll OpenAI v0 tests completed.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")
    
    print("\nTests completed successfully.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
