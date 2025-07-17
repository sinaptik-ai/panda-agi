"""
Conversation routes for the PandaAGI SDK API.
"""
import logging
from fastapi import APIRouter, HTTPException

from services.agent import end_agent_conversation

logger = logging.getLogger("panda_agi_api")

router = APIRouter(prefix="/conversation", tags=["conversation"])


@router.delete("/{conversation_id}")
async def end_conversation(conversation_id: str):
    """
    End a conversation and clean up resources.
    
    Args:
        conversation_id: ID of the conversation to end
        
    Returns:
        dict: Status message
    """
    success = await end_agent_conversation(conversation_id)
    if success:
        return {"status": "conversation ended"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")
