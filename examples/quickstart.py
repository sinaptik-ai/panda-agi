import argparse
import asyncio

from panda_agi import Agent, Knowledge
from panda_agi.envs import LocalEnv
from panda_agi.handlers import LogsHandler


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

    # Create event handlers (optional)
    handlers = [LogsHandler(compact_mode=True, use_colors=True, show_timestamps=True)]

    knowledge = [
        Knowledge("Add here your custom knowledge instructions"),
    ]

    # Create the agent
    agent = Agent(environment=agent_env, event_handlers=handlers, knowledge=knowledge)

    # First request - will automatically connect
    # The run method accepts a list of handlers
    response = await agent.run(
        args.query,
        # event_handlers=handlers # Overrides the event_handlers passed to the Agent constructor
    )
    print(response.output)


if __name__ == "__main__":
    asyncio.run(main())
