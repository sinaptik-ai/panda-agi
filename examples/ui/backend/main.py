import json
import os
import uuid
from typing import AsyncGenerator, Optional, Dict
from pathlib import Path

# Import the agent and environment from the parent directory
import sys

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from panda_agi import Agent, EventType
from panda_agi.envs import LocalEnv

# Get workspace path from environment variable with fallback
WORKSPACE_PATH = os.getenv("WORKSPACE_PATH", "./workspace")

app = FastAPI(title="PandaAGI SDK API", version="1.0.0")
local_env = LocalEnv(WORKSPACE_PATH)

# Store active conversations - in production, this would be in a database
active_conversations: Dict[str, Agent] = {}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentQuery(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    timeout: Optional[int] = None


def should_render_event(event_type: str) -> bool:
    """Check if event should be rendered - same logic as CLI"""
    # Skip redundant events
    if event_type == EventType.WEB_NAVIGATION.value:
        # Skip WEB_NAVIGATION since WEB_NAVIGATION_RESULT provides the same info + content
        return False

    # Skip task completion events - not needed in UI
    if event_type == EventType.COMPLETED_TASK.value:
        return False

    # Skip agent connection success - not needed in UI
    if event_type == EventType.AGENT_CONNECTION_SUCCESS.value:
        return False
        
    return True


def get_or_create_agent(conversation_id: Optional[str] = None) -> tuple[Agent, str]:
    """Get existing agent or create new one for conversation"""
    if conversation_id and conversation_id in active_conversations:
        return active_conversations[conversation_id], conversation_id
    
    agent = Agent(environment=local_env)
    new_conversation_id = conversation_id or str(uuid.uuid4())
    active_conversations[new_conversation_id] = agent
    
    return agent, new_conversation_id


async def event_stream(query: str, conversation_id: Optional[str] = None) -> AsyncGenerator[str, None]:
    """Stream agent events as Server-Sent Events"""
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
                "id": None
            }
        }
        yield f"data: {json.dumps(conversation_event)}\n\n"
        
        # Stream events
        async for event in agent.run(query):
            # Convert StreamEvent to dictionary format for frontend compatibility
            event_type = (
                event.type.value if hasattr(event.type, "value") else str(event.type)
            )

            # Apply same filtering as CLI
            if not should_render_event(event_type):
                continue

            # Convert to expected format
            event_dict = {
                "data": {
                    "type": event_type,
                    "payload": event.data,
                    "timestamp": event.timestamp,
                    "id": getattr(event, "id", None),
                },
            }

            print(event_dict)
            
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
                print(f"Error cleaning up failed conversation: {cleanup_error}")


@app.post("/agent/run")
async def run_agent(query_data: AgentQuery):
    """Run an agent with the given query and stream events"""
    try:
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
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/conversation/{conversation_id}")
async def end_conversation(conversation_id: str):
    """End a conversation and clean up resources"""
    if conversation_id in active_conversations:
        try:
            await active_conversations[conversation_id].disconnect()
            del active_conversations[conversation_id]
            return {"status": "conversation ended"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error ending conversation: {str(e)}")
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")


@app.post("/files/upload")
async def upload_files(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None)
):
    """Upload a file to the workspace"""
    try:
        # Ensure workspace directory exists
        workspace_path = Path(WORKSPACE_PATH)
        workspace_path.mkdir(parents=True, exist_ok=True)
        
        # Sanitize filename to prevent directory traversal
        safe_filename = file.filename.replace("..", "").replace("/", "_").replace("\\", "_")
        if not safe_filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        # Create the full file path
        file_path = workspace_path / safe_filename
        
        # Handle file name conflicts by adding a counter
        counter = 1
        original_stem = file_path.stem
        original_suffix = file_path.suffix
        
        while file_path.exists():
            file_path = workspace_path / f"{original_stem}_{counter}{original_suffix}"
            counter += 1
        
        # Write the file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        return {
            "status": "success",
            "filename": file_path.name,
            "original_filename": file.filename,
            "size": len(content),
            "path": str(file_path.relative_to(workspace_path)),
            "conversation_id": conversation_id,
            "event_type": "file_upload"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/files/read")
async def read_file(file_path: str):
    """Read a file from the workspace"""
    try:
        # Resolve the file path relative to workspace
        workspace_path = Path(WORKSPACE_PATH)
        resolved_path = workspace_path / file_path
        
        # Security check: ensure the resolved path is within workspace
        try:
            resolved_path.resolve().relative_to(workspace_path.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied: path outside workspace")
        
        # Check if file exists
        if not resolved_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not resolved_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Try to read as text first
        try:
            with open(resolved_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            return {
                "status": "success",
                "content": content,
                "filename": resolved_path.name,
                "path": file_path,
                "size": resolved_path.stat().st_size,
                "encoding": "utf-8"
            }
        except UnicodeDecodeError:
            # If text reading fails, try binary mode and return base64 for binary files
            with open(resolved_path, 'rb') as f:
                content = f.read()
                
            # For common binary files, we might want to handle them differently
            extension = resolved_path.suffix.lower()
            if extension in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp']:
                import base64
                content_b64 = base64.b64encode(content).decode('utf-8')
                return {
                    "status": "success",
                    "content": f"data:image/{extension[1:]};base64,{content_b64}",
                    "filename": resolved_path.name,
                    "path": file_path,
                    "size": len(content),
                    "encoding": "base64",
                    "type": "image"
                }
            else:
                raise HTTPException(status_code=415, detail="Binary file type not supported for preview")
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "PandaAGI SDK API",
        "version": "1.0.0",
        "endpoints": {
            "POST /agent/run": "Run an agent with streaming events",
            "DELETE /conversation/{conversation_id}": "End a conversation",
            "POST /files/upload": "Upload a file to the workspace",
            "GET /files/read": "Read a file from the workspace",
            "GET /health": "Health check",
            "GET /": "This endpoint",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
