import asyncio
import json
import logging
import os

# Import the agent and environment from the parent directory
import sys
import uuid
from pathlib import Path
from typing import AsyncGenerator, Dict, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from panda_agi import Agent, skill
from panda_agi.client.models import (
    BaseStreamEvent,
    EventType,
)
from panda_agi.envs import LocalEnv

# Configure logging with more explicit settings
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),  # Ensure output goes to stdout
        logging.FileHandler("api.log"),  # Also log to file
    ],
)

logger = logging.getLogger("panda_agi_api")
logger.setLevel(logging.DEBUG)

# Get workspace path from environment variable with fallback
WORKSPACE_PATH = os.getenv(
    "WORKSPACE_PATH", os.path.join(os.path.dirname(__file__), "workspace")
)

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


def should_render_event(event: Union[BaseStreamEvent, str]) -> bool:
    """Check if event should be rendered - same logic as CLI"""
    # Handle both BaseStreamEvent objects and string event types
    if isinstance(event, BaseStreamEvent):
        event_type = (
            event.type.value if hasattr(event.type, "value") else str(event.type)
        )
    else:
        event_type = event

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


def truncate_long_content(data, max_length: int = 5000):
    """
    Recursively truncate long string values in a dictionary or list.

    Args:
        data: The data structure to truncate (dict, list, or any other type)
        max_length: Maximum length for string values before truncation

    Returns:
        The data structure with truncated string values
    """
    if isinstance(data, dict):
        return {
            key: truncate_long_content(value, max_length) for key, value in data.items()
        }
    elif isinstance(data, list):
        return [truncate_long_content(item, max_length) for item in data]
    elif isinstance(data, str) and len(data) > max_length:
        return data[:max_length] + "\n\n... [Content truncated]"
    else:
        return data


def process_event_for_frontend(event) -> Optional[Dict]:
    """Process an event for frontend consumption with type safety"""
    try:
        if isinstance(event, BaseStreamEvent):
            event_type = (
                event.type.value if hasattr(event.type, "value") else str(event.type)
            )

            # Get the event data
            event_data = event.to_dict()

            # Apply truncation to all string fields
            event_data = truncate_long_content(event_data)

            return {
                "data": {
                    "type": event_type,
                    "payload": event_data,
                    "timestamp": event.timestamp,
                    "id": getattr(event, "id", None),
                },
            }
        else:
            # Handle legacy events with truncation
            event_type = (
                event.type.value if hasattr(event.type, "value") else str(event.type)
            )

            event_data = event.data
            # Apply truncation to all string fields
            event_data = truncate_long_content(event_data)

            return {
                "data": {
                    "type": event_type,
                    "payload": event_data,
                    "timestamp": getattr(event, "timestamp", ""),
                    "id": getattr(event, "id", None),
                },
            }
    except Exception as e:
        print(f"Error processing event: {e}")
        return None


@skill
async def deploy_python_server(port):
    """
    Deploys a simple Python HTTP server on the specified port.

    This function:
    - Kills any process currently running on the given port.
    - Starts a new Python HTTP server on that port.

    Args:
        port (int): The port number on which to start the server.

    Returns:
        str: URL of the running server (e.g., http://localhost:8000).
    """
    kill_cmd = f'PID=$(lsof -ti tcp:{port}) && if [ -n "$PID" ]; then kill -9 $PID; fi'
    start_cmd = f"nohup python -m http.server {port} > /dev/null 2>&1 &"
    logger.debug(f"Executing deploy skill to start server at port: {port}")
    await local_env.exec_shell(kill_cmd)
    return await local_env.exec_shell(start_cmd)

def get_or_create_agent(conversation_id: Optional[str] = None) -> tuple[Agent, str]:
    """Get existing agent or create new one for conversation"""
    if conversation_id and conversation_id in active_conversations:
        return active_conversations[conversation_id], conversation_id

    agent = Agent(environment=local_env, skills=[deploy_python_server])
    new_conversation_id = conversation_id or str(uuid.uuid4())
    active_conversations[new_conversation_id] = agent

    return agent, new_conversation_id


async def event_stream(
    query: str, conversation_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
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
            raise HTTPException(
                status_code=500, detail=f"Error ending conversation: {str(e)}"
            )
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")


@app.post("/files/upload")
async def upload_files(
    file: UploadFile = File(...), conversation_id: Optional[str] = Form(None)
):
    """Upload a file to the workspace"""
    try:
        # Ensure workspace directory exists
        workspace_path = Path(WORKSPACE_PATH)
        workspace_path.mkdir(parents=True, exist_ok=True)

        # Sanitize filename to prevent directory traversal
        safe_filename = (
            file.filename.replace("..", "").replace("/", "_").replace("\\", "_")
        )
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
            "event_type": "file_upload",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/{conversation_id}/files/download")
async def download_file(
    file_path: str = Query(..., description="Path to the file to download"),
):
    """Download a file from the workspace"""
    try:
        logger.debug(f"Download request for file_path: '{file_path}'")
        logger.debug(f"Current working directory: {os.getcwd()}")
        logger.debug(f"WORKSPACE_PATH: {WORKSPACE_PATH}")

        # Resolve the file path relative to workspace
        workspace_path = Path(WORKSPACE_PATH)
        logger.debug(f"Resolved workspace_path: {workspace_path.resolve()}")

        resolved_path = workspace_path / file_path
        logger.debug(f"Resolved file path: {resolved_path.resolve()}")
        logger.debug(f"File exists: {resolved_path.exists()}")
        logger.debug(
            f"Is file: {resolved_path.is_file() if resolved_path.exists() else 'N/A'}"
        )

        # Security check: ensure the resolved path is within workspace
        try:
            resolved_path.resolve().relative_to(workspace_path.resolve())
            logger.debug("Security check passed")
        except ValueError:
            logger.debug("Security check failed")
            raise HTTPException(
                status_code=403, detail="Access denied: path outside workspace"
            )

        # Check if file exists
        if not resolved_path.exists():
            logger.debug("File not found, raising 404")
            raise HTTPException(status_code=404, detail="File not found")

        if not resolved_path.is_file():
            logger.debug("Path is not a file, raising 400")
            raise HTTPException(status_code=400, detail="Path is not a file")

        logger.debug("File found, proceeding with download logic")

        # Check if it's a markdown file
        if resolved_path.suffix.lower() in [".md", ".markdown"]:
            logger.debug(f"Attempting to convert markdown file: {resolved_path}")
            try:
                from io import BytesIO

                import markdown
                import weasyprint

                logger.debug("Successfully imported markdown and weasyprint")

                # Read markdown content
                with open(resolved_path, "r", encoding="utf-8") as f:
                    md_content = f.read()

                logger.debug(f"Read markdown content, length: {len(md_content)}")

                # Convert markdown to HTML
                html = markdown.markdown(
                    md_content, extensions=["tables", "fenced_code", "toc"]
                )

                logger.debug("Successfully converted markdown to HTML")

                # Add basic CSS styling for better PDF appearance
                html_with_style = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>{resolved_path.stem}</title>
                    <style>
                        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 40px; color: #333; }}
                        h1, h2, h3, h4, h5, h6 {{ color: #2c3e50; margin-top: 24px; margin-bottom: 16px; }}
                        h1 {{ border-bottom: 2px solid #eaecef; padding-bottom: 8px; }}
                        h2 {{ border-bottom: 1px solid #eaecef; padding-bottom: 4px; }}
                        code {{ background-color: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: 'SFMono-Regular', Consolas, monospace; }}
                        pre {{ background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }}
                        blockquote {{ border-left: 4px solid #dfe2e5; padding-left: 16px; margin-left: 0; color: #6a737d; }}
                        table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
                        th, td {{ border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }}
                        th {{ background-color: #f6f8fa; font-weight: 600; }}
                        a {{ color: #0366d6; text-decoration: none; }}
                        a:hover {{ text-decoration: underline; }}
                    </style>
                </head>
                <body>
                    {html}
                </body>
                </html>
                """

                logger.debug("Created HTML with styling")

                # Convert HTML to PDF
                try:
                    # Create HTML document from string and convert to PDF bytes
                    html_doc = weasyprint.HTML(string=html_with_style)
                    pdf_bytes = html_doc.write_pdf()

                    # Write to buffer
                    pdf_buffer = BytesIO()
                    pdf_buffer.write(pdf_bytes)
                    pdf_buffer.seek(0)
                except Exception as pdf_error:
                    logger.debug(
                        f"PDF conversion error details: {type(pdf_error).__name__}: {pdf_error}"
                    )
                    raise pdf_error

                logger.debug("Successfully converted HTML to PDF")

                # Create a temporary PDF file
                import tempfile

                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=".pdf"
                ) as temp_pdf:
                    temp_pdf.write(pdf_buffer.getvalue())
                    temp_pdf_path = temp_pdf.name

                logger.debug(f"Created temporary PDF file: {temp_pdf_path}")

                # Return PDF file for download
                pdf_filename = f"{resolved_path.stem}.pdf"
                logger.debug(f"Returning PDF download: {pdf_filename}")
                return FileResponse(
                    path=temp_pdf_path,
                    filename=pdf_filename,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f"attachment; filename={pdf_filename}"
                    },
                )

            except ImportError as ie:
                # If markdown/weasyprint not available, fall back to regular download
                logger.debug(f"Import error during PDF conversion: {ie}")
                pass
            except Exception as e:
                # If conversion fails, fall back to regular download
                logger.debug(f"PDF conversion failed with error: {e}")
                pass

        logger.debug(f"Serving regular file download: {resolved_path.name}")
        # Return file for regular download with proper headers
        return FileResponse(
            path=resolved_path,
            filename=resolved_path.name,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={resolved_path.name}"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.debug(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")


@app.get("/{conversation_id}/files/{file_path:path}")
async def read_file(file_path: str):
    """Read a file from the workspace and serve it directly"""
    try:
        # Resolve the file path relative to workspace
        workspace_path = Path(WORKSPACE_PATH)
        resolved_path = workspace_path / file_path

        # Security check: ensure the resolved path is within workspace
        try:
            resolved_path.resolve().relative_to(workspace_path.resolve())
        except ValueError:
            raise HTTPException(
                status_code=403, detail="Access denied: path outside workspace"
            )

        # Check if file exists
        if not resolved_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        if not resolved_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")

        # Determine MIME type based on file extension
        import mimetypes

        mime_type, _ = mimetypes.guess_type(str(resolved_path))
        if mime_type is None:
            mime_type = "application/octet-stream"

        # Return file directly with proper content-type
        return FileResponse(
            path=resolved_path, media_type=mime_type, filename=resolved_path.name
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.get("/files/test-download")
async def test_download_file(
    file_path: str = Query(..., description="Path to the file to download"),
):
    """Test download endpoint"""
    try:
        print(f"TEST DEBUG: Download request for file_path: '{file_path}'")
        print(f"TEST DEBUG: WORKSPACE_PATH: {WORKSPACE_PATH}")

        # Resolve the file path relative to workspace
        workspace_path = Path(WORKSPACE_PATH)
        print(f"TEST DEBUG: Resolved workspace_path: {workspace_path.resolve()}")

        resolved_path = workspace_path / file_path
        print(f"TEST DEBUG: Resolved file path: {resolved_path.resolve()}")
        print(f"TEST DEBUG: File exists: {resolved_path.exists()}")

        if not resolved_path.exists():
            return {"error": "File not found", "path": str(resolved_path.resolve())}

        return FileResponse(
            path=resolved_path,
            filename=resolved_path.name,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={resolved_path.name}"
            },
        )

    except Exception as e:
        print(f"TEST DEBUG: Error: {e}")
        return {"error": str(e)}


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
            "GET /files/{file_path:path}": "Read a file from the workspace",
            "GET /files/download": "Download a file from the workspace",
            "GET /files/test-download": "Test download endpoint",
            "GET /health": "Health check",
            "GET /": "This endpoint",
        },
    }


@app.get("/debug-workspace")
async def debug_workspace():
    """Debug workspace path"""
    import os

    return {
        "workspace_path": WORKSPACE_PATH,
        "workspace_resolved": str(Path(WORKSPACE_PATH).resolve()),
        "current_working_directory": os.getcwd(),
        "file_exists": Path(WORKSPACE_PATH).exists(),
    }


if __name__ == "__main__":
    import uvicorn

    # Allow reload to be controlled by environment variable
    # Defaults to True for development, can be set to False in production
    reload_enabled = os.getenv("FASTAPI_RELOAD", "false").lower() in (
        "true",
        "1",
        "yes",
    )

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=reload_enabled)