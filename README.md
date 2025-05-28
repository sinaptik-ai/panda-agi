# PandaAGI SDK

A Python SDK for building and interacting with General AI Agents.

## Installation

```bash
pip install panda-agi
```

Or with uv:

```bash
uv add panda-agi
```

## Quick Start

```python
import asyncio
from panda_agi import Agent
from panda_agi.envs import LocalEnv

async def main():
    # Create a custom environment for the agent
    agent_env = LocalEnv("./my_agent_workspace")
    
    # Create the agent
    agent = Agent(environment=agent_env)
    
    # Run the agent with a prompt
    async for event in agent.run("Tell me a joke about pandas"):
        print(f"[{event.timestamp}] {event.type}: {event.data}")
    
    # Disconnect when done
    await agent.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

## Features

- Simple, intuitive API for interacting with PandaAGI agents
- Support for local and Docker environments
- Asynchronous event-based communication
- Pydantic models for type safety

## Documentation

For complete documentation, visit our [documentation site](https://docs.pandas-ai.com).

## Development

### Prerequisites

- Python 3.8+
- uv

### Setup

1. Clone the repository
2. Install dependencies:

```bash
uv pip install -e ".[dev]"
```

### Testing

Run tests with pytest:

```bash
uv run pytest
```

## License

MIT License
