"""
Agent service for the PandaAGI SDK API.
"""

import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator, Optional, Tuple

from utils.event_processing import should_render_event

from panda_agi import Agent
from panda_agi.envs import E2BEnv
from panda_agi.envs.local_env import LocalEnv

from .chat_env import get_env

logger = logging.getLogger("panda_agi_api")

MODEL = "annie-pro"


async def get_or_create_agent(
    conversation_id: Optional[str] = None, api_key: str | None = None
) -> Tuple[Agent, str]:
    """
    Get existing agent or create new one for conversation.

    Args:
        conversation_id: Optional ID of the conversation

    Returns:
        Tuple[Agent, str]: The agent and conversation ID
    """
    new_conversation_id = conversation_id or str(uuid.uuid4())

    local_env: E2BEnv | LocalEnv = await get_env(
        {"conversation_id": new_conversation_id}, force_new=conversation_id is None
    )

    # Create agent with conditional API key
    agent_kwargs = {
        "model": MODEL,
        "environment": local_env,
        "conversation_id": new_conversation_id,
    }

    # Only include api_key if it's not None
    if api_key is not None:
        agent_kwargs["api_key"] = api_key

    agent = Agent(**agent_kwargs)

    return agent, new_conversation_id


async def event_stream(
    query: str, conversation_id: Optional[str] = None, api_key: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Stream agent events as Server-Sent Events.

    Args:
        query: The query to run
        conversation_id: Optional ID of the conversation

    Returns:
        AsyncGenerator[str, None]: Stream of SSE events
    """
    agent = None
    actual_conversation_id = None

    try:
        # Get or create agent for this conversation
        agent, actual_conversation_id = await get_or_create_agent(
            conversation_id, api_key
        )

        # Send conversation ID as first event
        conversation_event = {
            "data": {
                "type": "conversation_started",
                "payload": {"conversation_id": actual_conversation_id},
                "timestamp": "",
                "id": None,
            }
        }
        yield f"<event>{json.dumps(conversation_event)}</event>"
        await asyncio.sleep(0.01)

        # Stream events
        async for event in agent.run_stream(query):
            # Apply filtering first
            if not should_render_event(event):
                continue

            if event is None:
                # Skip events that couldn't be processed
                continue

            # Format as SSE
            yield f"<event>{json.dumps(event)}</event>"

    except Exception as e:
        import traceback

        traceback.print_exc()
        # Send error event
        error_data = {
            "data": {
                "event_type": "exception",
                "data": {
                    "error": str(e),
                },
            },
        }
        yield f"<event>{json.dumps(error_data)}</event>"
