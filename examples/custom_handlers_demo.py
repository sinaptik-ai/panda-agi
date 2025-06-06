"""
Demo showing how to create custom handlers by extending BaseHandler.

This example demonstrates various ways to extend the base handler classes
to create specialized event processing functionality.
"""

import argparse
import asyncio
from datetime import datetime

from panda_agi import Agent, BaseHandler, FilterHandler, CompositeHandler
from panda_agi.client.models import (
    BaseStreamEvent, 
    UserNotificationEvent, 
    WebSearchEvent, 
    FileWriteEvent,
    ErrorEvent
)
from panda_agi.envs import LocalEnv


class SimpleHandler(BaseHandler):
    """Simple custom handler that just logs events with timestamps."""
    
    def process(self, event: BaseStreamEvent) -> None:
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] 📝 {self.name}: Processing {event.type}")


class WebEventsHandler(FilterHandler):
    """Handler that only processes web-related events."""
    
    def should_process(self, event: BaseStreamEvent) -> bool:
        return event.type.startswith('web_')
    
    def process_filtered_event(self, event: BaseStreamEvent) -> None:
        if isinstance(event, WebSearchEvent):
            print(f"🔍 WebHandler: Searching for '{event.query}'")
        else:
            print(f"🌐 WebHandler: Web event {event.type}")


class FileEventsHandler(FilterHandler):
    """Handler that only processes file-related events."""
    
    def should_process(self, event: BaseStreamEvent) -> bool:
        return event.type.startswith('file_')
    
    def process_filtered_event(self, event: BaseStreamEvent) -> None:
        if isinstance(event, FileWriteEvent):
            print(f"📝 FileHandler: Writing to {event.file}")
        else:
            print(f"📁 FileHandler: File event {event.type}")


class StatsHandler(BaseHandler):
    """Handler that collects and displays statistics about events."""
    
    def __init__(self, name: str = "StatsHandler"):
        super().__init__(name)
        self.event_counts = {}
    
    def process(self, event: BaseStreamEvent) -> None:
        event_type = event.type
        self.event_counts[event_type] = self.event_counts.get(event_type, 0) + 1
    
    def print_stats(self):
        print(f"\n📊 {self.name} Statistics:")
        for event_type, count in self.event_counts.items():
            print(f"  • {event_type}: {count}")
        
        base_stats = self.get_stats()
        print(f"  • Total processed: {base_stats['events_processed']}")
        print(f"  • Success rate: {base_stats['success_rate']:.1f}%")


class AlertHandler(BaseHandler):
    """Handler that creates alerts for specific conditions."""
    
    def process(self, event: BaseStreamEvent) -> None:
        if isinstance(event, ErrorEvent):
            print(f"🚨 ALERT: Error detected - {event.error}")
        elif isinstance(event, UserNotificationEvent) and "error" in event.text.lower():
            print(f"⚠️  WARNING: Possible issue - {event.text}")
    
    def handle_error(self, event: BaseStreamEvent, error: Exception) -> None:
        print(f"🔥 CRITICAL: Handler error while processing {event.type}: {error}")


async def main():
    """Demonstrate custom handlers extending BaseHandler"""
    
    parser = argparse.ArgumentParser(description="Demo of custom handlers")
    parser.add_argument("query", help="Query to send to the agent")
    parser.add_argument("--handler-type", choices=["simple", "filtered", "composite", "stats"], 
                       default="composite", help="Type of handler to demonstrate")
    args = parser.parse_args()
    
    # Create agent
    agent_env = LocalEnv("./my_agent_workspace")
    agent = Agent(environment=agent_env)
    
    print(f"🚀 Custom Handler Demo - {args.handler_type.title()} Handler")
    print("=" * 60)
    
    if args.handler_type == "simple":
        # Simple custom handler
        handler = SimpleHandler("MySimpleHandler")
        
    elif args.handler_type == "filtered":
        # Filtered handler - only web events
        handler = WebEventsHandler("WebOnlyHandler")
        
    elif args.handler_type == "stats":
        # Statistics collecting handler
        handler = StatsHandler("EventStatsHandler")
        
    else:  # composite
        # Composite handler - multiple handlers working together
        handlers = [
            SimpleHandler("Logger"),
            WebEventsHandler("WebFilter"),
            FileEventsHandler("FileFilter"), 
            AlertHandler("AlertSystem"),
            StatsHandler("Statistics")
        ]
        handler = CompositeHandler(handlers, "CompositeEventProcessor")
    
    print(f"Using handler: {handler.name}")
    print(f"Handler type: {type(handler).__name__}")
    print()
    
    # Run the agent with our custom handler
    response = await agent.run(args.query, event_handler=handler)
    
    print("\n" + "=" * 60)
    print("🎉 Demo completed!")
    
    # Show handler statistics
    stats = handler.get_stats()
    print(f"\n📈 Handler Performance:")
    print(f"  • Events processed: {stats['events_processed']}")
    print(f"  • Errors encountered: {stats['errors_encountered']}")
    print(f"  • Success rate: {stats['success_rate']:.1f}%")
    
    # Special handling for specific handler types
    if isinstance(handler, StatsHandler):
        handler.print_stats()
    elif isinstance(handler, CompositeHandler):
        print(f"\n📊 Composite Handler Details:")
        for i, sub_handler in enumerate(handler.handlers):
            sub_stats = sub_handler.get_stats()
            print(f"  {i+1}. {sub_stats['name']}: {sub_stats['events_processed']} events")
            
            # Print stats for StatsHandler if it's in the composite
            if isinstance(sub_handler, StatsHandler):
                sub_handler.print_stats()
    
    print(f"\n✅ Final output: {response.output}")
    
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main()) 