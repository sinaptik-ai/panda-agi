import asyncio

from panda_agi import Agent
from panda_agi.envs import DockerEnv


async def main():
    """Example usage of the Agent with BaseEnv and Pydantic events"""

    # Create a custom environment for the agent
    # agent_env = LocalEnv("./my_agent_workspace")
    agent_env = DockerEnv("./my_agent_workspace")

    # Create the agent
    agent = Agent(environment=agent_env)

    # First request - will automatically connect
    # The run method now returns a generator of AgentEvent
    async for event in agent.run(
        "cerca informazioni su pandas ai e fai un sito web con le informazioni. cerca di usare tutti i tools disponibili.",
    ):
        print(f"[{event.timestamp}] {event.type}: {event.data}")

    # Manually disconnect when completely done
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
