"""
Test file for LiteLLM proxy implementation.

This file demonstrates the usage of the LiteLLMProxy class for tracing
both synchronous and asynchronous API calls, with and without streaming.
"""

import os
import asyncio
import dotenv
from panda_agi.traces.observe import observe
from panda_agi.traces.proxy.litellm_proxy import LiteLLMProxy
import litellm

# Load environment variables from .env file if it exists
dotenv.load_dotenv()

# Test synchronous completion (non-streaming)
def test_litellm_sync():
    """Test synchronous LiteLLM completion without streaming."""
    print("\n1. Testing synchronous completion (non-streaming):")
    
    # Create a completion
    response = litellm.completion(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "Tell me a short story about a robot and a butterfly."}
        ],
        max_tokens=1000
    )
    
    # Print the response
    print(response.choices[0].message.content)
    print("\nSync response complete.")

# Test synchronous completion with streaming
def test_litellm_sync_stream():
    """Test synchronous LiteLLM completion with streaming."""
    print("\n2. Testing synchronous completion with streaming:")
    
    # Create a streaming completion
    response = litellm.completion(
        model="claude-3-opus-20240229",
        messages=[
            {"role": "user", "content": "Tell me a short story about a robot and a cat."}
        ],
        max_tokens=1000,
        stream=True
    )
    
    # Process the stream
    full_text = ""
    for chunk in response:
        if hasattr(chunk, "choices") and len(chunk.choices) > 0:
            delta = chunk.choices[0].delta
            if hasattr(delta, "content") and delta.content:
                full_text += delta.content
                print(delta.content, end="", flush=True)
    
    print(f"\n\nSync streaming response complete. Total length: {len(full_text)} characters")

# Test asynchronous completion (non-streaming)
async def test_litellm_async():
    """Test asynchronous LiteLLM completion without streaming."""
    print("\n3. Testing asynchronous completion (non-streaming):")
    
    # Create a completion
    response = await litellm.acompletion(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "Tell me a short story about a robot and a dog."}
        ],
        max_tokens=1000
    )
    
    # Print the response
    print(response.choices[0].message.content)
    print("\nAsync response complete.")

# Test asynchronous completion with streaming
async def test_litellm_async_stream():
    """Test asynchronous LiteLLM completion with streaming."""
    print("\n4. Testing asynchronous completion with streaming:")
    
    # Create a streaming completion
    response = await litellm.acompletion(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "Tell me a short poem about a robot and a butterfly."}
        ],
        max_tokens=1000,
        stream=True
    )
    
    # Process the stream
    full_text = ""
    async for chunk in response:
        if hasattr(chunk, "choices") and len(chunk.choices) > 0:
            delta = chunk.choices[0].delta
            if hasattr(delta, "content") and delta.content:
                full_text += delta.content
                print(delta.content, end="", flush=True)
    
    print(f"\n\nAsync streaming response complete. Total length: {len(full_text)} characters")

# Main function to run all tests with the observe decorator
async def main():
    """Run all LiteLLM proxy tests."""
    print("Running LiteLLM proxy tests...")
    print("Note: You need to set the OPENAI_API_KEY environment variable.")
    
    # Initialize LiteLLMProxy to apply patches
    proxy = LiteLLMProxy(model_name="custom_test")
    proxy.apply_patches()
    
    try:
        # Run synchronous tests
        test_litellm_sync()
        test_litellm_sync_stream()
        
        # Run asynchronous tests
        await test_litellm_async()
        await test_litellm_async_stream()
        
        print("\nAll LiteLLM tests completed.")
        
        # Print summary of collected data
        print("\n--- Tracking Summary ---")
        proxy.print_summary()
    finally:
        # Always remove patches when done
        proxy.remove_patches()

if __name__ == "__main__":
    asyncio.run(main())
