"""
Test file for Anthropic proxy implementation.

This file demonstrates the usage of the AnthropicProxy class for tracing
both synchronous and asynchronous API calls, with and without streaming.
"""

import os
import asyncio
import dotenv
from panda_agi.traces.observe import observe
from anthropic import Anthropic

# Load environment variables from .env file if it exists
dotenv.load_dotenv()

# Initialize the client
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

# Test synchronous message creation (non-streaming)
def test_anthropic_sync():
    """Test synchronous Anthropic message creation without streaming."""
    print("\n1. Testing synchronous message creation (non-streaming):")

    # Create a message
    response = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": "Tell me a short story about a robot and a butterfly."}
        ]
    )
    
    # Print the response
    print(response.content[0].text)
    print("\nSync response complete.")

# Test synchronous message creation with streaming
def test_anthropic_sync_stream():
    """Test synchronous Anthropic message creation with streaming."""
    print("\n2. Testing synchronous message creation with streaming:")
    
    from anthropic import Anthropic
    
    # Initialize the client
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    
    # Create a streaming message
    with client.messages.stream(
        model="claude-3-opus-20240229",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": "Tell me a short story about a robot and a cat."}
        ]
    ) as stream:
        # Process the stream
        full_text = ""
        for text in stream.text_stream:
            full_text += text
            print(text, end="", flush=True)
    
    print(f"\n\nSync streaming response complete. Total length: {len(full_text)} characters")

# Test asynchronous message creation (non-streaming)
async def test_anthropic_async():
    """Test asynchronous Anthropic message creation without streaming."""
    print("\n3. Testing asynchronous message creation (non-streaming):")
    
    from anthropic import AsyncAnthropic
    
    # Initialize the client
    client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    
    # Create a message
    response = await client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": "Tell me a short story about a robot and a dog."}
        ]
    )
    
    # Print the response
    print(response.content[0].text)
    print("\nAsync response complete.")

# Test asynchronous message creation with streaming
async def test_anthropic_async_stream():
    """Test asynchronous Anthropic message creation with streaming."""
    print("\n4. Testing asynchronous message creation with streaming:")
    
    from anthropic import AsyncAnthropic
    
    # Initialize the client
    client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    
    # Create a streaming message
    async with await client.messages.stream(
        model="claude-3-opus-20240229",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": "Tell me a short poem about a robot and a butterfly."}
        ]
    ) as stream:
        # Process the stream
        full_text = ""
        async for text in stream.text_stream:
            full_text += text
            print(text, end="", flush=True)
    
    print(f"\n\nAsync streaming response complete. Total length: {len(full_text)} characters")

def test_parallel():
    print("sleeping in thread...")
    import time
    time.sleep(5)
    test_anthropic_sync()
    print("thread finished")


# Main function to run all tests with the observe decorator
@observe(providers=["anthropic"], model_name="anthropic")
async def main():
    """Run all Anthropic proxy tests."""
    print("Running Anthropic proxy tests...")
    print("Note: You need to set the ANTHROPIC_API_KEY environment variable.")
    
    # Run synchronous tests
    test_anthropic_sync()
    test_anthropic_sync_stream()
    
    # # Run asynchronous tests
    await test_anthropic_async()
    await test_anthropic_async_stream()
    
    print("\nAll Anthropic tests completed.")

if __name__ == "__main__":
    import threading
    # Start test_parallel in a separate thread
    thread = threading.Thread(target=test_parallel)
    thread.daemon = True  # Make thread a daemon so it exits when the main program exits
    thread.start()
    asyncio.run(main())
