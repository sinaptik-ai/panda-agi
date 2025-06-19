import argparse
import asyncio

from panda_agi import Agent, Knowledge, skill
from panda_agi.envs import LocalEnv
from panda_agi.handlers import LogsHandler


@skill
def example_skill(query: str) -> str:
    """Example skill"""

    # Do something

    return f"Result of the example skill: {query}"  # The result of the skill is returned to the agent


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
        Knowledge("""
When a user asks you to analyze data, you must follow these steps:
1. Analyze the data
2. Provide a summary of the data
3. Provide a list of insights
4. Provide a list of recommendations
""")
    ]

    skills = [example_skill]

    # Create the agent
    agent = Agent(
        environment=agent_env,
        event_handlers=handlers,
        # knowledge=knowledge,
        # skills=skills,
    )

    # First request - will automatically connect
    # The run method accepts a list of handlers
    response = await agent.run(
        args.query,
        # event_handlers=handlers # Overrides the event_handlers passed to the Agent constructor
    )
    print(response.output)


if __name__ == "__main__":
    asyncio.run(main())
