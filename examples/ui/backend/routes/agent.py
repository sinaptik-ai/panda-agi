"""
Agent routes for the PandaAGI SDK API.
"""
import logging
from fastapi import APIRouter, HTTPException

from models.agent import AgentQuery
from services.agent import event_stream, end_agent_conversation
from fastapi.responses import StreamingResponse

logger = logging.getLogger("panda_agi_api")

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/run")
async def run_agent(query_data: AgentQuery):
    """
    Run an agent with the given query and stream events.
    
    Args:
        query_data: The query data
        
    Returns:
        StreamingResponse: Stream of SSE events
    """
    try:
        logger.debug(f"Running agent with query: {query_data.query}")
        logger.debug(f"Conversation ID: {query_data.conversation_id}")
        return StreamingResponse(
            event_stream(query_data.query, query_data.conversation_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))
