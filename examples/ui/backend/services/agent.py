"""
Agent service for the PandaAGI SDK API.
"""
import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator, Dict, Optional, Tuple

from panda_agi import Agent, tool
from panda_agi.envs import E2BEnv
from .chat_env import get_env

from utils.event_processing import process_event_for_frontend, should_render_event

logger = logging.getLogger("panda_agi_api")

# Store active conversations - in production, this would be in a database
active_conversations: Dict[str, Agent] = {}


def get_or_create_agent(conversation_id: Optional[str] = None) -> Tuple[Agent, str]:
    """
    Get existing agent or create new one for conversation.
    
    Args:
        conversation_id: Optional ID of the conversation
        
    Returns:
        Tuple[Agent, str]: The agent and conversation ID
    """
    # if conversation_id and conversation_id in active_conversations:
    #     return active_conversations[conversation_id], conversation_id
    new_conversation_id = conversation_id or str(uuid.uuid4())
    local_env: E2BEnv = get_env({"conversation_id": new_conversation_id} if conversation_id else None)
    agent = Agent(model="annie-pro", environment=local_env, base_url="http://localhost:8000")
    active_conversations[new_conversation_id] = agent
    return agent, new_conversation_id


async def event_stream(
    query: str, conversation_id: Optional[str] = None
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
        agent, actual_conversation_id = get_or_create_agent(conversation_id)

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

            # Process event with type safety while maintaining frontend structure
            # event_dict = process_event_for_frontend(event)

            if event is None:
                # Skip events that couldn't be processed
                continue

            # Format as SSE
            yield f"<event>{json.dumps(event)}</event>"

        print("DONE!!!")

    except Exception as e:
        import traceback
        traceback.print_exc()
        # Send error event
        error_data = {
            "data": {
                "type": "error",
                "payload": {"error": str(e)},
                "timestamp": "",
                "id": None,
            },
        }
        yield f"<event>{json.dumps(error_data)}</event>"

        # Clean up failed conversation
        if actual_conversation_id and actual_conversation_id in active_conversations:
            try:
                await active_conversations[actual_conversation_id].disconnect()
                del active_conversations[actual_conversation_id]
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up failed conversation: {cleanup_error}")


async def end_agent_conversation(conversation_id: str) -> bool:
    """
    End a conversation and clean up resources.
    
    Args:
        conversation_id: ID of the conversation to end
        
    Returns:
        bool: True if conversation was ended successfully, False otherwise
    """
    if conversation_id in active_conversations:
        try:
            await active_conversations[conversation_id].disconnect()
            del active_conversations[conversation_id]
            return True
        except Exception as e:
            logger.error(f"Error ending conversation: {e}")
            return False
    return False
