"""
File routes for the PandaAGI SDK API.
"""

import logging
import mimetypes
import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, Response
from utils.exceptions import RestrictedAccessError, FileNotFoundError
from utils.markdown_utils import process_markdown_to_pdf
from services.files import FilesService
from services.agent import get_or_create_agent


logger = logging.getLogger("panda_agi_api")

# Get workspace path from environment variable with fallback
WORKSPACE_PATH = os.getenv("WORKSPACE_PATH", "./workspace")

router = APIRouter(tags=["files"])


async def process_markdown_file_for_response(
    file_path: str, local_env, content_bytes: bytes = None
) -> Response:
    """
    Process a markdown file and return it as a PDF response.

    Args:
        file_path: Path to the markdown file
        local_env: The environment to read files from
        content_bytes: Optional pre-read content bytes (if None, will read from env)

    Returns:
        Response: PDF response if conversion successful, None if should fall back
    """
    logger.debug(f"Attempting to convert markdown file: {file_path}")
    try:
        # Read markdown content if not provided
        if content_bytes is None:
            file_result = await local_env.read_file(
                file_path, mode="r", encoding="utf-8"
            )
            if file_result["status"] != "success":
                raise Exception(
                    f"Failed to read file: {file_result.get('message', 'Unknown error')}"
                )
            markdown_content = file_result["content"]
        else:
            markdown_content = content_bytes.decode("utf-8")

        logger.debug(f"Read markdown content, length: {len(markdown_content)}")

        # Define async function to fetch files from the environment
        async def fetch_file_from_env(file_path: str, headers: dict = None) -> bytes:
            """Fetch file content from the environment"""
            file_result = await local_env.read_file(file_path, mode="rb", encoding=None)
            if file_result["status"] != "success":
                raise Exception(
                    f"Failed to read file: {file_result.get('message', 'Unknown error')}"
                )
            return file_result["content"]

        # Use the utility function to convert markdown to PDF
        result = await process_markdown_to_pdf(
            markdown_content=markdown_content,
            file_path=file_path,
            base_url="",  # No base URL needed for local files
            get_file_func=fetch_file_from_env,
            headers=None,
        )

        if result:
            pdf_bytes, pdf_filename = result
            logger.debug(f"Returning PDF: {pdf_filename}")
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename={pdf_filename}"},
            )
        else:
            logger.debug("PDF conversion failed, falling back to regular response")
            return None

    except ImportError as ie:
        # If markdown/weasyprint not available, fall back to regular response
        logger.debug(f"Import error during PDF conversion: {ie}")
        return None
    except Exception as e:
        # If conversion fails, fall back to regular response
        logger.debug(f"PDF conversion failed with error: {e}")
        return None


@router.post("/files/upload")
async def upload_files(
    request: Request,
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
):
    """
    Upload a file to the workspace using E2BEnv.

    Args:
        file: The file to upload
        conversation_id: Optional ID of the conversation

    Returns:
        dict: Upload status and file information
    """
    try:
        # Get API key from request state (set by AuthMiddleware)
        api_key = getattr(request.state, "api_key", None)
        local_agent = await get_or_create_agent(conversation_id, api_key=api_key)
        local_env = local_agent[0].environment

        if not local_env:
            raise HTTPException(
                status_code=500,
                detail="Something went wrong, unable to create environment!",
            )

        workspace_path = Path(WORKSPACE_PATH)

        path_exists = await local_env.path_exists(workspace_path)
        if not path_exists:
            # Ensure workspace directory exists using environment abstraction
            await local_env.mkdir(workspace_path, parents=True, exist_ok=True)

        # Sanitize filename to prevent directory traversal
        safe_filename = (
            file.filename.replace("..", "").replace("/", "_").replace("\\", "_")
        )
        if not safe_filename:
            raise HTTPException(status_code=400, detail="Invalid filename")

        # Create the target file path
        file_path = workspace_path / safe_filename

        # Handle file name conflicts by adding a counter
        counter = 1
        original_stem = file_path.stem
        original_suffix = file_path.suffix

        # Check if file exists using E2BEnv and handle conflicts
        while await local_env.path_exists(file_path):
            file_path = workspace_path / f"{original_stem}_{counter}{original_suffix}"
            counter += 1

        # Read the uploaded file content
        content = await file.read()

        # Write the file using E2BEnv
        result = await local_env.write_file(
            safe_filename, content, mode="wb", encoding=None
        )

        if result["status"] != "success":
            raise Exception(
                f"Failed to write file: {result.get('message', 'Unknown error')}"
            )

        # Return success response
        return {
            "status": "success",
            "filename": file_path.name,
            "original_filename": file.filename,
            "size": len(content),
            "path": str(file_path).replace(WORKSPACE_PATH, ""),
            "conversation_id": (
                conversation_id or local_env.metadata.get("conversation_id", None)
                if local_env.metadata
                else None
            ),
            "event_type": "file_upload",
        }

    except Exception as e:
        import traceback

        error_trace = traceback.format_exc()
        logger.error(f"Error in upload_files: {e}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{conversation_id}/files/download")
async def download_file(
    conversation_id: str,
    request: Request,
    file_path: str = Query(..., description="Path to the file to download"),
):
    """
    Download a file from the workspace.

    Args:
        conversation_id: ID of the conversation
        file_path: Path to the file to download

    Returns:
        FileResponse: The file to download
    """
    try:
        # Get API key from request state (set by AuthMiddleware)
        api_key = getattr(request.state, "api_key", None)
        local_agent = await get_or_create_agent(conversation_id, api_key=api_key)
        local_env = local_agent[0].environment
        if not local_env:
            raise HTTPException(
                status_code=500,
                detail="Something went wrong, unable to fetch environment!",
            )

        logger.debug(f"Download request for file_path: '{file_path}'")
        logger.debug(f"Current working directory: {os.getcwd()}")

        base = Path(local_env.base_path).resolve()

        # Check if file exists using E2BEnv
        file_path: str | None = await FilesService.validate_and_correct_file_path(
            local_env, file_path, str(base)
        )
        # Check if file exists
        if not file_path:
            logger.debug("File not found, raising 404")
            raise HTTPException(status_code=404, detail="File not found")

        resolved_path = local_env._resolve_path(file_path)
        logger.debug(f"Resolved file path: {resolved_path}")
        logger.debug(f"Path exists: {file_path}")

        # Security check: ensure the resolved path is within workspace
        if not str(resolved_path).startswith(str(base)):
            logger.debug("Security check failed")
            raise HTTPException(
                status_code=403, detail="Access denied: path outside workspace"
            )

        # Get file info to check if it's a directory
        file_info = await local_env.list_files(resolved_path.parent)
        if file_info["status"] == "success":
            logger.debug(f"File info: {file_info}")
            for file in file_info["files"]:
                logger.debug(f"Checking file: {file}")
                # Check if this is the file we're looking for and if it's a directory
                if (
                    isinstance(file, dict)
                    and file.get("name") == resolved_path.name
                    and file.get("type") == "directory"
                ):
                    logger.debug("Path is not a file, raising 400")
                    raise HTTPException(status_code=400, detail="Path is not a file")

        logger.debug("File found, proceeding with download logic")

        # Check if it's a markdown file
        if resolved_path.suffix.lower() in [".md", ".markdown"]:
            pdf_response = await process_markdown_file_for_response(
                str(resolved_path), local_env
            )
            if pdf_response:
                return pdf_response

        logger.debug(f"Serving regular file download: {resolved_path.name}")
        # Read file content using E2BEnv and return it as a download
        filename = resolved_path.name

        # Read file content using E2BEnv
        file_result = await local_env.read_file(file_path, mode="rb", encoding=None)
        if file_result["status"] != "success":
            raise Exception(
                f"Failed to read file: {file_result.get('message', 'Unknown error')}"
            )

        # Create a temporary file to serve
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            # Ensure content is bytes
            content = file_result["content"]
            if isinstance(content, str):
                content = content.encode("utf-8")
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Return file for download
        return FileResponse(
            path=temp_file_path,
            filename=filename,
            media_type=mimetypes.guess_type(filename)[0] or "application/octet-stream",
        )
    except Exception as e:
        import traceback

        error_trace = traceback.format_exc()
        logger.error(f"Error in download_file: {e}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")


@router.get("/{conversation_id}/files/{file_path:path}")
async def read_file(
    conversation_id: str,
    file_path: str,
    request: Request,
    raw: bool = Query(False, alias="raw"),
):
    """
    Read a file from the E2B sandbox workspace and serve it directly.

    Args:
        conversation_id: ID of the conversation
        file_path: Path to the file to read

    Returns:
        Response: The file content
    """
    try:
        # Get API key from request state (set by AuthMiddleware)
        api_key = getattr(request.state, "api_key", None)
        local_agent = await get_or_create_agent(conversation_id, api_key=api_key)
        local_env = local_agent[0].environment
        if not local_env:
            raise HTTPException(
                status_code=500,
                detail="Something went wrong, unable to fetch environment!",
            )

        try:
            content_bytes, mime_type = await FilesService.get_file_from_env(
                file_path, local_env
            )
        except RestrictedAccessError as e:
            raise HTTPException(status_code=403, detail=str(e))
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise

        # Check if it's a markdown file and raw mode is not requested
        if file_path.lower().endswith((".md", ".markdown")) and not raw:
            pdf_response = await process_markdown_file_for_response(
                file_path, local_env, content_bytes
            )
            if pdf_response:
                return pdf_response

        return Response(content=content_bytes, media_type=mime_type)

    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except Exception as e:
        import traceback

        error_trace = traceback.format_exc()
        logger.error(f"Error in read_file: {e}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@router.get("/files/test-download")
async def test_download_file(
    file_path: str = Query(..., description="Path to the file to download"),
):
    """
    Test download endpoint.

    Args:
        file_path: Path to the file to download

    Returns:
        FileResponse or dict: The file to download or error message
    """
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
