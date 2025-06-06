import argparse
import asyncio

from panda_agi import Agent
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

    # Create the agent
    agent = Agent(environment=agent_env)

    # Create event handlers (optional)
    # Always pass handlers as a list
    handlers = [
        LogsHandler(compact_mode=True, use_colors=True, show_timestamps=True)
    ]
    
    # First request - will automatically connect
    # The run method accepts a list of handlers
    response = await agent.run(
        args.query,
        event_handlers=handlers
    )
    print(response.output)

    # Manually disconnect when completely done
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
