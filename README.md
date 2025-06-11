# 🐼 PandaAGI SDK - An SDK for AGI (Agentic General Intelligence)

[![Release](https://img.shields.io/pypi/v/panda-agi?label=Release&style=flat-square)](https://pypi.org/project/panda-agi/)
[![Discord](https://dcbadge.vercel.app/api/server/kF7FqH2FwS?style=flat&compact=true)](https://discord.gg/KYKj9F2FRH)
[![Downloads](https://static.pepy.tech/badge/panda-agi)](https://pepy.tech/project/panda-agi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1XEbeTeOgqUKKWsujgkDLKz23FPTPEmjM?usp=sharing)

The PandaAGI SDK provides a simple, intuitive API for building general AI agents in just a few lines of code. It abstracts away the complexity of Agentic Loops and provides a powerful interface for you to build autonomous agents.
Each agent can be configured to run in a custom environment, interacting with the web, your file system, writing code, and running shell commands.

## Installation

```bash
pip install panda-agi
```

Or with uv:

```bash
uv add panda-agi
```

## 🔧 Getting started

First of all, make sure you have a API key. You can get one for free [here](https://agi.pandas-ai.com/).
Make sure to set it as an environment variable:

```bash
export PANDA_AGI_KEY=your_api_key
```

or set it in the .env file:

```bash
PANDA_AGI_KEY=your_api_key
```

Once you have the API key, you can start using the SDK:

```python
import asyncio
from panda_agi import Agent
from panda_agi.envs import LocalEnv

async def main():
    # Create a custom environment for the agent
    agent_env = LocalEnv("./my_agent_workspace")
    
    # Create the agent
    agent = Agent(environment=agent_env)
    
    # Run the agent with a task
    response = agent.run("Tell me a joke about pandas")
    print(response.output)

    # Other possible tasks
    response = agent.run("Make a report of the real estate market in Germany")
    # -> will generate a reporrt in the provided workspace folder

    response = agent.run("Can you analyze our sales and create a dashboard?")
    # -> will generate a dashboard in the provided workspace folder starting from a csv file in the workspace folder

    response = agent.run("Can you create a website for our company?")
    # -> will generate a website in the provided workspace folder

    # Disconnect when done
    await agent.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

In case you want to enable te web search, you will also need a Tavily API key. You can get one for free [here](https://www.tavily.com/). Then set it as an environment variable or set it in the .env file:

```bash
TAVILY_API_KEY=your_api_key
```

## 📱 Running with the UI

In case you don't want to build an app from scratch, we provide a UI that you can use to run your agents.

Running it is as simple as:

```bash
# Run the UI
cd examples/ui
./start.sh
```

This will start a docker container with the UI running. You can access it at `http://localhost:3000` and start using it.

![UI Demo](docs/videos/ui-video.gif)

## 📓 Try it Online

Want to experiment with PandaAGI SDK without any setup? Try our interactive notebook:

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1XEbeTeOgqUKKWsujgkDLKz23FPTPEmjM?usp=sharing)

## 🛠️ Features

- Simple, intuitive API for interacting with PandaAGI agents
- Support for local and Docker environments
- Asynchronous event-based communication
- Pydantic models for type safety

## 📚 Documentation

For complete documentation, visit our [documentation site](https://agi-docs.pandas-ai.com).

## 🛠️ Development

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

## 📝 License

MIT License
