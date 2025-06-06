"""
Demo showing how the Agent.run() method now accepts both:
1. Handler classes with a process() method (recommended)
2. Callable functions (backward compatibility)
"""

import argparse
import asyncio

from panda_agi import Agent, LogsHandler
from panda_agi.client.models import BaseStreamEvent, UserNotificationEvent, WebNavigationEvent, WebSearchEvent
from panda_agi.envs import LocalEnv


async def main():
    """Demonstrate both handler class and callable function approaches"""

    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Demo of different event handler types"
    )
    parser.add_argument("query", help="The query to send to the agent")
    parser.add_argument("--use-callable", action="store_true", 
                       help="Use callable function instead of handler class")
    args = parser.parse_args()

    # Create a custom environment for the agent
    agent_env = LocalEnv("./my_agent_workspace")
    agent = Agent(environment=agent_env)

    if args.use_callable:
        # Method 1: Callable function (backward compatibility)
        print("🔧 Using callable function handler (backward compatibility)")
        print("-" * 60)
        
        def event_handler(event: BaseStreamEvent):
            """Simple callable event handler"""
            if isinstance(event, WebSearchEvent):
                print(f"🔍 Searching: {event.query}")
            elif isinstance(event, WebNavigationEvent):
                print(f"🌐 Navigating: {event.url}")
            elif isinstance(event, UserNotificationEvent):
                print(f"💬 Agent says: {event.text}")
            else:
                print(f"📝 Event: {event.type}")
            return event  # Return the event for continued processing

        response = await agent.run(args.query, event_handler=event_handler)
        
    else:
        # Method 2: Handler class with process() method (recommended)
        print("🏗️  Using handler class with process() method (recommended)")
        print("-" * 60)
        
        # Create handler instance
        handler = LogsHandler(
            compact_mode=False,
            use_colors=True,
            show_timestamps=True,
            show_metadata=True
        )
        
        response = await agent.run(args.query, event_handler=handler)

    print("\n" + "=" * 60)
    print("🎉 Execution completed!")
    print(f"Final output: {response.output}")
    print(f"Total events processed: {len(response.events)}")

    # Manually disconnect when completely done
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main()) 