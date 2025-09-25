"""
Conversation routes for the PandaAGI SDK API.
"""

import logging
import aiohttp
import os
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from models.agent import ConversationMessage

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


# Get server URL from environment variable or use default
PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)


async def get_conversation_messages(
    conversation_id: UUID, api_key: str, timestamp: Optional[datetime]
):
    """
    Get conversation messages from the backend server.

    Args:
        conversation_id: ID of the conversation
        api_key: API key information from authentication middleware
        timestamp: Optional timestamp to filter messages

    Returns:
        List[ConversationMessage]: List of conversation messages
    """
    try:

        # Build the backend URL
        backend_url = f"{PANDA_AGI_SERVER_URL}/conversations/{conversation_id}/messages"

        # Prepare headers
        headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

        # Prepare query parameters
        params = {}
        if timestamp:
            params["timestamp"] = timestamp.isoformat()

        # Make request to backend server
        async with aiohttp.ClientSession() as session:
            async with session.get(
                backend_url, headers=headers, params=params
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    # Convert the response to ConversationMessage objects
                    messages = []
                    for msg_data in data:
                        messages.append(ConversationMessage(**msg_data))
                    return messages
                else:
                    error_text = await response.text()
                    logger.error(
                        f"Error fetching conversation messages: {response.status} - {error_text}"
                    )
                    # return empty list if conversation is not found
                    return []

    except aiohttp.ClientError as e:
        logger.error(
            f"Network error fetching conversation messages conversation({conversation_id}): {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail="Network error while fetching conversation messages"
        )
    except Exception as e:
        logger.error(
            f"Unexpected error fetching conversation messages conversation({conversation_id}): {str(e)}"
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching conversation messages",
        )
