"""
Agent service for the PandaAGI SDK API.
"""
import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator, Dict, Optional, Tuple

from panda_agi import Agent, skill
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
    if conversation_id and conversation_id in active_conversations:
        return active_conversations[conversation_id], conversation_id
    
    local_env: E2BEnv = get_env()

    @skill
    async def deploy_python_server(port) -> str:
        """
        Deploys a simple Python HTTP server on the specified port and return new url

        This function:
        - Kills any process currently running on the given port.
        - Starts a new Python HTTP server on that port.

        Args:
            port (int): The port number on which to start the server.

        Returns:
            str: URL of the running server (e.g., http://localhost:8000).
        """
        kill_cmd = f"fuser -k {port}/tcp || true"
        start_cmd = f"nohup python -m http.server {port} > /dev/null 2>&1 &"
        logger.debug(f"Executing deploy skill to start server at port: {port}")
        await local_env.exec_shell(kill_cmd)
        await local_env.exec_shell(start_cmd)
        return await local_env.get_hosted_url(port)

    agent = Agent(model="annie-pro", environment=local_env, skills=[deploy_python_server])
    new_conversation_id = conversation_id or str(uuid.uuid4())
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
        print("Conversation ID*****: ")
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
        yield f"data: {json.dumps(conversation_event)}\n\n"
        await asyncio.sleep(0.01)

        # Stream events
        async for event in agent.run_stream(query):
            # Apply filtering first
            if not should_render_event(event):
                continue

            # Process event with type safety while maintaining frontend structure
            event_dict = process_event_for_frontend(event)

            if event_dict is None:
                # Skip events that couldn't be processed
                continue

            # Format as SSE
            yield f"data: {json.dumps(event_dict)}\n\n"

    except Exception as e:
        # Send error event
        error_data = {
            "data": {
                "type": "error",
                "payload": {"error": str(e)},
                "timestamp": "",
                "id": None,
            },
        }
        yield f"data: {json.dumps(error_data)}\n\n"

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
