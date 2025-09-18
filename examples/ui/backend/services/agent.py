"""
Agent service for the PandaAGI SDK API.
"""

import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator, List, Optional, Tuple

from panda_agi import Agent
from panda_agi.envs import E2BEnv
from panda_agi.envs.local_env import LocalEnv
from utils.event_processing import should_render_event

from .chat_env import get_env

logger = logging.getLogger("panda_agi_api")

MODEL = "annie-lite"


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
    query: str,
    conversation_id: Optional[str] = None,
    file_names: Optional[List[str]] = None,
    api_key: Optional[str] = None,
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

        # if there is only one file, read it and add the first 5 rows to the query
        if file_names and len(file_names) == 1 and file_names[0].endswith(".csv"):
            try:
                result = await agent.environment.read_file(path=file_names[0])
                if result["status"] == "success":
                    lines = result["content"].splitlines(keepends=True)
                    header = lines[0]
                    content = "".join(lines[1:6])
                    def index_to_excel_column(index):
                        """Convert 0-based index to Excel column name (A, B, ..., Z, AA, AB, ...)"""
                        column = ""
                        index += 1  # Excel columns are 1-based
                        while index > 0:
                            index -= 1  # Adjust for 0-based calculation
                            column = chr(65 + (index % 26)) + column
                            index //= 26
                        return column
                    
                    column_mapping = ""
                    for idx, col in enumerate(header.split(",")):
                        letter = index_to_excel_column(idx)
                        column_mapping += f"{col.strip()} -> Column {letter}\n"
                    query = f"""{query}

CSV File: 
```
<file_path>{file_names[0]}</file_path>
```

First rows of the CSV:
```
{header.strip()}
{content.strip()}
```

Mapping of the columns to the Excel letters:
```
{column_mapping}
```
"""
            except Exception as e:
                logger.error(
                    f"Error reading conversation({conversation_id}) csv file:", e
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

            # Log every tool and its params and content when fully streamed
            try:
                if hasattr(event, "to_dict"):
                    event_dict = event.to_dict()
                    event_type = getattr(event, "type", None)
                    if event_type:
                        event_type_str = (
                            event_type.value
                            if hasattr(event_type, "value")
                            else str(event_type)
                        )
                        logger.info("=== TOOL EVENT STREAMED ===")
                        logger.info(f"Event Type: {event_type_str}")
                        logger.info(f"Event Data: {json.dumps(event_dict, indent=2)}")
                        logger.info(f"Timestamp: {getattr(event, 'timestamp', 'N/A')}")
                        logger.info(f"Event ID: {getattr(event, 'id', 'N/A')}")
                        logger.info("=== END TOOL EVENT ===")
                else:
                    logger.info("=== RAW EVENT STREAMED ===")
                    logger.info(f"Event: {json.dumps(event, indent=2)}")
                    logger.info("=== END RAW EVENT ===")
            except Exception as log_error:
                logger.error(f"Error logging event: {log_error}")

            # Format as SSE
            await asyncio.sleep(0.01)
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
