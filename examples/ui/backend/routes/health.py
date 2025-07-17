"""
Health check routes for the PandaAGI SDK API.
"""
import os
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Health status
    """
    return {"status": "healthy"}


@router.get("/")
async def root():
    """
    Root endpoint with API information.
    
    Returns:
        dict: API information
    """
    return {
        "message": "PandaAGI SDK API",
        "version": "1.0.0",
        "endpoints": {
            "POST /agent/run": "Run an agent with streaming events",
            "DELETE /conversation/{conversation_id}": "End a conversation",
            "POST /files/upload": "Upload a file to the workspace",
            "GET /{conversation_id}/files/{file_path:path}": "Read a file from the workspace",
            "GET /{conversation_id}/files/download": "Download a file from the workspace",
            "GET /files/test-download": "Test download endpoint",
            "GET /health": "Health check",
            "GET /": "This endpoint",
        },
    }


@router.get("/debug-workspace")
async def debug_workspace():
    """
    Debug workspace path.
    
    Returns:
        dict: Workspace information
    """
    import os
    WORKSPACE_PATH = "/workspace"

    return {
        "workspace_path": WORKSPACE_PATH,
        "workspace_resolved": str(Path(WORKSPACE_PATH).resolve()),
        "current_working_directory": os.getcwd(),
        "file_exists": Path(WORKSPACE_PATH).exists(),
    }
