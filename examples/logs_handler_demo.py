"""
Demo script showing the new LogsHandler class-based architecture
with the process method as the main entry point.
"""

import asyncio
from datetime import datetime

# Import the LogsHandler and factory function
from panda_agi import LogsHandler, logs_handler
from panda_agi.client.models import (
    UserNotificationEvent,
    WebSearchEvent,
    FileWriteEvent,
    ErrorEvent,
    CompletedTaskEvent,
)


async def demo_logs_handler():
    """Demonstrate different ways to use the LogsHandler"""
    
    print("🚀 LogsHandler Demo - Class-based Event Processing")
    print("=" * 60)
    
    # Method 1: Using the factory function (recommended for simple usage)
    print("\n📦 Method 1: Factory Function")
    print("-" * 30)
    
    handler1 = logs_handler(compact=True, colors=True, timestamps=True)
    print(f"Handler type: {type(handler1)}")
    
    # Create some sample events
    notification_event = UserNotificationEvent(
        text="Hello! I'm processing your request.",
        timestamp=datetime.now().isoformat()
    )
    
    # Process using the handler (callable)
    handler1(notification_event)
    
    # Method 2: Direct class instantiation (recommended for advanced usage)
    print("\n🎛️  Method 2: Direct Class Instantiation")
    print("-" * 40)
    
    handler2 = LogsHandler(
        show_timestamps=True,
        show_metadata=True,
        compact_mode=False,
        use_colors=True
    )
    
    # Create more sample events
    search_event = WebSearchEvent(
        query="Python async programming tutorial",
        max_results=5,
        timestamp=datetime.now().isoformat()
    )
    
    file_event = FileWriteEvent(
        file="./example.py", 
        content="print('Hello World!')",
        append=False,
        timestamp=datetime.now().isoformat()
    )
    
    error_event = ErrorEvent(
        error="Connection timeout after 30 seconds",
        timestamp=datetime.now().isoformat()
    )
    
    success_event = CompletedTaskEvent(
        success=True,
        timestamp=datetime.now().isoformat()
    )
    
    # Process events using the explicit process method (main entry point)
    print("Processing events with handler.process(event)...")
    handler2.process(search_event)
    handler2.process(file_event)
    handler2.process(error_event)
    handler2.process(success_event)
    
    # Method 3: Show both calling styles work
    print("\n🔄 Method 3: Callable vs Process Method")
    print("-" * 40)
    
    handler3 = logs_handler(compact=True, colors=True)
    
    final_event = UserNotificationEvent(
        text="Demo completed successfully!",
        timestamp=datetime.now().isoformat()
    )
    
    print("Using handler(event):")
    handler3(final_event)
    
    print("\nUsing handler.process(event):")
    handler3.process(final_event)
    
    print("\n✅ Demo completed! Both methods produce identical output.")
    print("💡 Use handler.process(event) as the primary interface.")
    print("💡 handler(event) is available for backward compatibility.")


if __name__ == "__main__":
    asyncio.run(demo_logs_handler()) 