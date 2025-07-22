import argparse
import asyncio

from panda_agi import Agent, Knowledge, tool
from panda_agi.envs import LocalEnv
from panda_agi.handlers import LogsHandler


@tool
def write_joke(topic: str) -> str:
    """Write a joke about the given topic

    Args:
        topic: The topic of the joke

    Returns:
        A joke about the given topic
    """

    # Do something

    return f"You know what's the best about being a {topic}? Because I get to {topic} all day!"


def print_event(input_params, output_params):
    """Prints the event data"""
    print(f"Event: {input_params}")
    print(f"Output: {output_params}")


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

    tools = [write_joke]

    # Create the agent
    agent = Agent(
        system_prompt="Be helpful, honest, and concise.",
        base_url="http://localhost:8000",
        model="annie-pro",
        environment=agent_env,
        api_key="pk_f9858cf569b619bb2a3bfe26ad47426a561d09e94bc11ad0ebb21f03f10c4906",
        tools=tools,
    )

    agent.on("user_send_message", print_event, when="end")

    # First request - will automatically connect
    # The run method accepts a list of handlers
    try:
        async for events in agent.run_stream(
            args.query,
            # event_handlers=handlers # Overrides the event_handlers passed to the Agent constructor
        ):
            print(events)
    except Exception as e:
        print("RECEIVED ERROR")
        print(e)


if __name__ == "__main__":
    asyncio.run(main())
