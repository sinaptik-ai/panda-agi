import asyncio

from client.agent import Agent
from envs import DockerEnv


async def main():
    """Example usage of the Agent with BaseEnv"""
    # Create a custom environment for the agent
    # agent_env = LocalEnv("./my_agent_workspace")
    agent_env = DockerEnv("./my_agent_workspace")

    # Create the agent - no need to use context manager or connect explicitly
    agent = Agent(environment=agent_env)

    # First request - will automatically connect
    async for event in agent.run(
        "esponi il sito web",
        timeout=None,
    ):
        print(f"[EVENT]: {event}")
        print(f"[EVENT]: {event.keys()}")

    await asyncio.sleep(100)
    # Manually disconnect when completely done
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
