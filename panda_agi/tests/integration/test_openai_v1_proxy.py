#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test file for OpenAI v1.0+ API calls.

This file demonstrates how to use the OpenAIProxy class to capture
and trace API calls made using the OpenAI v1.0+ Python SDK.
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

# Configure the OpenAI client with the API key from the environment
client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
async_client = openai.AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

# -------------------------------
# Completion API Test Functions
# -------------------------------

# Synchronous completion request test
def test_completion_sync():
    """Test synchronous OpenAI completion request."""
    print("\n1. Testing synchronous completion (non-streaming):")
    
    completion = client.completions.create(
        model="gpt-3.5-turbo-instruct",
        prompt="Hello, how are you?",
        max_tokens=50
    )
    
    print(f"Response: {completion.choices[0].text}")
    print("\nSync response complete.")
    return completion

# Synchronous completion with streaming test
def test_completion_sync_stream():
    """Test synchronous streaming OpenAI completion request."""
    print("\n2. Testing synchronous completion with streaming:")
    
    stream = client.completions.create(
        model="gpt-3.5-turbo-instruct",
        prompt="List 5 colors",
        max_tokens=50,
        stream=True
    )
    
    full_text = ""
    for chunk in stream:
        if hasattr(chunk, "choices") and len(chunk.choices) > 0:
            text = chunk.choices[0].text
            if text:
                full_text += text
                print(text, end="", flush=True)
    
    print(f"\n\nSync streaming response complete. Total length: {len(full_text)} characters")
    return stream

# Asynchronous completion request test
async def test_completion_async():
    """Test asynchronous OpenAI completion request."""
    print("\n3. Testing asynchronous completion (non-streaming):")
    
    completion = await async_client.completions.create(
        model="gpt-3.5-turbo-instruct",
        prompt="What's the weather like?",
        max_tokens=50
    )
    
    print(f"Response: {completion.choices[0].text}")
    print("\nAsync response complete.")
    return completion

# Asynchronous completion with streaming test
async def test_completion_async_stream():
    """Test asynchronous streaming OpenAI completion request."""
    print("\n4. Testing asynchronous completion with streaming:")
    
    stream = await async_client.completions.create(
        model="gpt-3.5-turbo-instruct",
        prompt="List 5 planets",
        max_tokens=70,
        stream=True
    )
    
    full_text = ""
    async for chunk in stream:
        if hasattr(chunk, "choices") and len(chunk.choices) > 0:
            text = chunk.choices[0].text
            if text:
                full_text += text
                print(text, end="", flush=True)
    
    print(f"\n\nAsync streaming response complete. Total length: {len(full_text)} characters")
    return stream

# -------------------------------
# ChatCompletion API Test Functions
# -------------------------------

# Synchronous chat completion request test
def test_chat_completion_sync():
    """Test synchronous OpenAI chat completion request."""
    print("\n5. Testing synchronous chat completion (non-streaming):")
    
    chat_completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a short story about a robot."}
        ],
        max_tokens=100
    )
    
    print(f"Response: {chat_completion.choices[0].message.content}")
    print("\nSync chat response complete.")
    return chat_completion

# Synchronous chat completion with streaming test
def test_chat_completion_sync_stream():
    """Test synchronous streaming OpenAI chat completion request."""
    print("\n6. Testing synchronous chat completion with streaming:")
    
    stream = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a short story about a cat."}
        ],
        max_tokens=100,
        stream=True
    )
    
    full_text = ""
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            full_text += content
            print(content, end="", flush=True)
    
    print(f"\n\nSync chat streaming response complete. Total length: {len(full_text)} characters")
    return stream

# Asynchronous chat completion request test
async def test_chat_completion_async():
    """Test asynchronous OpenAI chat completion request."""
    print("\n7. Testing asynchronous chat completion (non-streaming):")
    
    chat_completion = await async_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a short story about a dog."}
        ],
        max_tokens=100
    )
    
    print(f"Response: {chat_completion.choices[0].message.content}")
    print("\nAsync chat response complete.")
    return chat_completion

# Asynchronous chat completion with streaming test
async def test_chat_completion_async_stream():
    """Test asynchronous streaming OpenAI chat completion request."""
    print("\n8. Testing asynchronous chat completion with streaming:")
    
    stream = await async_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a short poem about a butterfly."}
        ],
        max_tokens=100,
        stream=True
    )
    
    full_text = ""
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            full_text += content
            print(content, end="", flush=True)
    
    print(f"\n\nAsync chat streaming response complete. Total length: {len(full_text)} characters")
    return stream

# Run all asynchronous tests
async def run_async_tests():
    """Run all asynchronous tests."""
    await test_completion_async()
    await test_completion_async_stream()
    await test_chat_completion_async()
    await test_chat_completion_async_stream()

# Main function with observe decorator
@observe(model_name="openai_v1", providers=["openai"], debug=True)
async def main():
    """Run all OpenAI proxy tests."""
    print("Running OpenAI v1.0+ proxy tests...")
    print("Note: You need to set the OPENAI_API_KEY environment variable.")
    
    try:
        # Run synchronous tests for Completion API
        test_completion_sync()
        test_completion_sync_stream()
        
        # # Run synchronous tests for ChatCompletion API
        test_chat_completion_sync()
        test_chat_completion_sync_stream()
        
        # # Run asynchronous tests
        await run_async_tests()
        
        print("\nAll OpenAI v1.0+ tests completed.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")
    
    print("\nTests completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())
 