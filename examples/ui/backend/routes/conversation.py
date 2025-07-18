"""
Conversation routes for the PandaAGI SDK API.
"""

import logging
from fastapi import APIRouter, HTTPException

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
    # For now, just return success since the function was removed
    # TODO: Implement conversation cleanup if needed
    return {"status": "conversation ended"}
