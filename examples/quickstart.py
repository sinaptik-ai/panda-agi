import argparse
import asyncio

from panda_agi import Agent
from panda_agi.client.models import UserNotificationEvent, WebNavigationEvent, WebSearchEvent
from panda_agi.envs import LocalEnv

async def main():
    """Example usage of the Agent with BaseEnv and Pydantic events"""

    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Run the PandaAGI agent with a custom query"
    )
    parser.add_argument("query", help="The query to send to the agent")
    args = parser.parse_args()

    # Create a custom environment for the agent
    agent_env = LocalEnv("./my_agent_workspace")
    # agent_env = DockerEnv("./my_agent_workspace")

    # Create a custom event handler (optional)
    def event_handler(event: AgentEvent):
        if isinstance(event, WebSearchEvent):
            print("Searching on the web with query:", event.query)
        elif isinstance(event, WebNavigationEvent):
            print("Navigating to:", event.url)
        elif isinstance(event, UserNotificationEvent):
            print(event.message)
        else:
            print("Doing something else:", event)

    # Create the agent
    agent = Agent(environment=agent_env, event_handler=event_handler)

    # First request - will automatically connect
    # The run method now returns a generator of AgentEvent
    response = agent.run(args.query)
    print(response.output)

    # Manually disconnect when completely done
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
