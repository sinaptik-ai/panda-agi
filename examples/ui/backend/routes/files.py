"""
File routes for the PandaAGI SDK API.
"""

import logging
import mimetypes
import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response

from panda_agi.envs.base_env import BaseEnv
from services.agent import get_or_create_agent

logger = logging.getLogger("panda_agi_api")

# Get workspace path from environment variable with fallback
WORKSPACE_PATH = "/workspace"

router = APIRouter(tags=["files"])


@router.post("/files/upload")
async def upload_files(
    file: UploadFile = File(...), conversation_id: Optional[str] = Form(None)
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
        local_env = get_or_create_agent(conversation_id)[0].environment

        if not local_env:
            raise HTTPException(
                status_code=500,
                detail="Something went wrong, unable to create environment!",
            )

        workspace_path = Path(WORKSPACE_PATH)

        if not await local_env.path_exists(workspace_path):
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


async def validate_and_correct_file_path(
    local_env: BaseEnv, file_path: str, workspace_path: str | None = None
):
    """
    Read the content of a file.
    """
    if await local_env.path_exists(file_path):
        return file_path
    else:
        if not workspace_path:
            return None

        files = await local_env.list_files(recursive=True)

        if files["status"] == "success":
            exist_file_path = None
            count_of_files = 0
            for file in files["files"]:
                if file["name"] == file_path and file["type"] == "file":
                    exist_file_path = file
                    count_of_files += 1

            if exist_file_path and count_of_files == 1:
                return exist_file_path["relative_path"]

        return None


@router.get("/{conversation_id}/files/download")
async def download_file(
    conversation_id: str,
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
        local_env = get_or_create_agent(conversation_id)[0].environment
        if not local_env:
            raise HTTPException(
                status_code=500,
                detail="Something went wrong, unable to fetch environment!",
            )

        logger.debug(f"Download request for file_path: '{file_path}'")
        logger.debug(f"Current working directory: {os.getcwd()}")
        logger.debug(f"WORKSPACE_PATH: {WORKSPACE_PATH}")

        # Resolve the file path within environment
        workspace_path = Path(WORKSPACE_PATH)

        # Check if file exists using E2BEnv
        file_path: str | None = await validate_and_correct_file_path(
            local_env, file_path, str(workspace_path)
        )

        # Check if file exists
        if not file_path:
            logger.debug("File not found, raising 404")
            raise HTTPException(status_code=404, detail="File not found")

        file_path_str = str(file_path).lstrip("/")
        resolved_path = workspace_path / file_path_str
        logger.debug(f"Resolved file path: {resolved_path}")
        logger.debug(f"Path exists: {file_path}")

        # Security check: ensure the resolved path is within workspace
        if not str(resolved_path).startswith(str(workspace_path)):
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
            logger.debug(f"Attempting to convert markdown file: {resolved_path}")
            try:
                from io import BytesIO

                import markdown
                import weasyprint

                logger.debug("Successfully imported markdown and weasyprint")

                # Read markdown content using E2BEnv
                file_result = await local_env.read_file(
                    resolved_path, mode="r", encoding="utf-8"
                )
                if file_result["status"] != "success":
                    raise Exception(
                        f"Failed to read file: {file_result.get('message', 'Unknown error')}"
                    )

                md_content = file_result["content"]
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
        # Read file content using E2BEnv and return it as a download
        filename = resolved_path.name

        # Read file content using E2BEnv
        file_result = await local_env.read_file(file_path_str, mode="rb", encoding=None)
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
async def read_file(conversation_id: str, file_path: str):
    """
    Read a file from the E2B sandbox workspace and serve it directly.

    Args:
        conversation_id: ID of the conversation
        file_path: Path to the file to read

    Returns:
        Response: The file content
    """
    try:
        local_env = get_or_create_agent(conversation_id)[0].environment
        if not local_env:
            raise HTTPException(
                status_code=500,
                detail="Something went wrong, unable to fetch environment!",
            )

        # Resolve and check within workspace via local_env logic
        # local_env._resolve_path handles base_path restrictions
        resolved = local_env._resolve_path(file_path)
        # Optional: ensure it's within base_path
        base = Path(local_env.base_path).resolve()
        try:
            resolved.resolve().relative_to(base)
        except Exception:
            raise HTTPException(
                status_code=403, detail="Access denied: outside workspace"
            )

        # Check existence via sandbox API
        file_path: str | None = await validate_and_correct_file_path(
            local_env, file_path, str(base)
        )
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")

        # Read file as binary to preserve any type
        read_res = await local_env.read_file(file_path, mode="rb")
        if read_res.get("status") != "success":
            detail = read_res.get("message", "Unknown error")
            raise HTTPException(status_code=500, detail=f"Error reading file: {detail}")

        content = read_res.get("content", b"")
        # content may be bytes or str; ensure bytes for binary
        if isinstance(content, str):
            content_bytes = content.encode("utf-8")
        else:
            content_bytes = content

        # Determine MIME type by extension
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"

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
