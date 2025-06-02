import argparse
import asyncio

from panda_agi import Agent
from panda_agi.envs import LocalEnv


def truncate(d, max_length=100):
    if isinstance(d, str):
        if len(d) > max_length:
            return d[:max_length] + "..."
        return d
    elif isinstance(d, list):
        truncated = []
        for item in d:
            if isinstance(item, str) and len(item) > max_length:
                truncated.append(item[:max_length] + "...")
            else:
                truncated.append(item)
        return truncated
    elif isinstance(d, dict):
        truncated = {}
        for key, value in d.items():
            if isinstance(value, str) and len(value) > max_length:
                truncated[key] = value[:max_length] + "..."
            else:
                truncated[key] = value
        return truncated
    else:
        # For any other type, return as-is
        return d


async def main():
    """Example usage of the Agent with BaseEnv and Pydantic events"""

    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Run the Panda AGI agent with a custom query"
    )
    parser.add_argument("query", help="The query to send to the agent")
    args = parser.parse_args()

    # Create a custom environment for the agent
    agent_env = LocalEnv("./my_agent_workspace")
    # agent_env = DockerEnv("./my_agent_workspace")

    # Create the agent
    agent = Agent(environment=agent_env)

    # First request - will automatically connect
    # The run method now returns a generator of AgentEvent
    async for event in agent.run(
        args.query,
    ):
        print(f"[RECEIVED] {event.type}")

    # Manually disconnect when completely done
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
