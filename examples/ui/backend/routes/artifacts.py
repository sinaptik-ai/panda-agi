"""
Artifacts routes for the PandaAGI SDK.
"""

from io import BytesIO
import aiohttp
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from pydantic import BaseModel
import os
import logging
import traceback
import mimetypes
from typing import Optional, Tuple

from utils.datetime_utils import parse_timestamp
from routes.conversation import get_conversation_messages
from services.artifacts import DEFAULT_ARTIFACT_NAME, ArtifactsService
from services.pxml import PXMLService
from utils.markdown_utils import (
    convert_relative_links_to_absolute,
    process_markdown_to_pdf,
)
from utils.html_utils import should_return_html, create_html_redirect_response
from models.agent import (
    ArtifactResponse,
    ArtifactsListResponse,
    ArtifactNameUpdateRequest,
    ArtifactFileUpdateRequest,
)
from services.agent import get_or_create_agent
from services.files import FilesService
import datetime
from pathlib import Path
from pxml.xml_parser import XMLParser

logger = logging.getLogger(__name__)

PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

PANDA_CHAT_CLIENT_URL = (
    os.environ.get("PANDA_CHAT_CLIENT_URL") or "https://chat.pandas-ai.com"
)

ERROR_PAGE_URL = f"{PANDA_CHAT_CLIENT_URL}/404"

# Create router
router = APIRouter(prefix="/artifacts", tags=["artifacts"])


async def process_artifact_markdown_to_pdf(
    file_path: str,
    content_bytes: bytes,
    artifact_id: str,
    session: aiohttp.ClientSession,
    headers: Optional[dict],
    is_public: bool = False,
    base_source_url: str = None,
) -> Optional[Response]:
    """
    Process a markdown file from artifacts and return it as a PDF response.

    Args:
        file_path: Path to the markdown file
        content_bytes: The markdown content as bytes
        artifact_id: The artifact ID
        session: The aiohttp session for making requests
        headers: Headers to use for requests
        is_public: Whether this is a public artifact (affects base URL)

    Returns:
        Response: PDF response if conversion successful, None if should fall back
    """
    logger.debug(f"Converting markdown file to PDF: {file_path}")

    # Define async function to fetch files
    async def fetch_file(url: str, headers: dict) -> bytes:
        async with session.get(url, headers=headers) as resp:
            if resp.status == 200:
                return await resp.read()
            else:
                raise Exception(f"Failed to fetch file from {url}: {resp.status}")

    # Decode markdown content
    markdown_content = content_bytes.decode("utf-8")

    # Get the base URL for resolving relative image paths
    base_url = f"{PANDA_CHAT_CLIENT_URL}/creations/{artifact_id}/"

    # Use the utility function to convert markdown to PDF
    result = await process_markdown_to_pdf(
        markdown_content=markdown_content,
        file_path=file_path,
        base_url=base_url,
        get_file_func=fetch_file,
        headers=headers,
        base_source_url=base_source_url,
    )

    if result:
        pdf_bytes, pdf_filename = result
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={pdf_filename}"},
        )
    else:
        # Fall back to regular markdown response if conversion fails
        logger.debug("PDF conversion failed, falling back to markdown response")
        return None


async def process_artifact_pxml_to_html(
    file_path: str,
    content_bytes: bytes,
    artifact_id: str,
    session: aiohttp.ClientSession,
    headers: Optional[dict],
) -> Optional[Response]:
    """
    Process a PXML file from artifacts and return it as an HTML response.

    Args:
        file_path: Path to the PXML file
        content_bytes: The PXML content as bytes
        artifact_id: The artifact ID
        session: The aiohttp session for making requests
        headers: Headers to use for requests

    Returns:
        Response: HTML response if conversion successful, None if should fall back
    """
    logger.debug(f"Converting PXML file to HTML: {file_path}")

    # Define async function to fetch files
    async def fetch_file(file_path: str) -> Tuple[bytes, str]:
        # For PXML files, we need to fetch referenced files (like CSV) from the artifact
        # This is a simplified implementation - in practice, you might need to handle
        # multiple file types and paths more robustly
        try:
            # Try to fetch the file from the artifact
            file_url = (
                f"{PANDA_AGI_SERVER_URL}/artifacts/serve/{artifact_id}/{file_path}"
            )
            async with session.get(file_url, headers=headers) as resp:
                if resp.status == 200:
                    file_bytes = await resp.read()
                    return file_bytes, file_path
                else:
                    raise Exception(
                        f"Failed to fetch file from {file_url}: {resp.status}"
                    )
        except Exception as e:
            logger.error(
                f"Error fetching file /artifacts/serve/{artifact_id}/{file_path}: {e}"
            )
            raise e

    try:
        # Decode PXML content
        pxml_content = content_bytes.decode("utf-8")

        # Use PXMLService.compile to convert PXML to HTML
        html_content = await PXMLService.compile(pxml_content, fetch_file, artifact_id)

        if html_content:
            # Convert HTML content to bytes
            html_bytes = html_content.encode("utf-8")
            html_filename = file_path.replace(".pxml", ".html").replace(".xml", ".html")

            return Response(
                content=html_bytes,
                media_type="text/html",
                headers={"Content-Disposition": f"inline; filename={html_filename}"},
            )
        else:
            # Fall back to regular PXML response if conversion fails
            logger.debug("HTML conversion failed, falling back to PXML response")
            return None

    except Exception as e:
        logger.error(
            f"Error converting PXML to HTML artifact:{artifact_id} file:{file_path}: {e}"
        )
        # Fall back to regular PXML response if conversion fails
        logger.debug("HTML conversion failed, falling back to PXML response")
        return None


class ArtifactPayload(BaseModel):
    type: str
    name: str
    filepath: str
    timestamp: Optional[str] = None


class ArtifactUpdateRequest(BaseModel):
    """Request model for updating artifact name and public status."""

    name: Optional[str] = None
    is_public: Optional[bool] = None


class NameSuggestionRequest(BaseModel):
    """Request model for name suggestion."""

    type: str
    filepath: str
    content: str


class NameSuggestionResponse(BaseModel):
    """Response model for name suggestion."""

    suggested_name: str


async def get_artifact_upload_credentials(artifact_id: str, api_key: str) -> dict:
    """
    Get upload credentials for an artifact.

    Args:
        artifact_id: The artifact ID
        filepath: The filepath of the artifact
        api_key: The API key for authentication

    Returns:
        dict: Response containing upload credentials

    Raises:
        HTTPException: If there's an error getting upload credentials
    """
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.post(
                f"{PANDA_AGI_SERVER_URL}/artifacts/upload-credentials/{artifact_id}",
                headers=headers,
            ) as resp:
                response = await resp.json()

                if resp.status != 200:
                    logger.error(f"Error getting upload credentials: {response}")
                    message = (
                        "Unknown error"
                        if "detail" not in response
                        else response["detail"]
                    )

                    raise HTTPException(
                        status_code=resp.status,
                        detail=response.get(
                            "message",
                            message,
                        ),
                    )

                return response

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(
            f"Error getting upload credentials for artifact: {artifact_id}: {traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="internal server error")


async def cleanup_artifact(artifact_id: str, api_key: str):
    """
    Clean up an artifact by calling the delete endpoint.

    Args:
        artifact_id: The ID of the artifact to delete
        api_key: The API key for authentication
    """
    try:
        logger.info(f"Cleaning up artifact {artifact_id} due to upload failure")
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.delete(
                f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}", headers=headers
            ) as cleanup_resp:
                if cleanup_resp.status != 200:
                    logger.error(
                        f"Failed to cleanup creation {artifact_id}: {cleanup_resp.status}"
                    )
                else:
                    logger.info(f"Successfully cleaned up creation {artifact_id}")
    except Exception as cleanup_error:
        logger.error(
            f"Error during creation cleanup artifact:{artifact_id}: {cleanup_error}"
        )


async def upload_file_to_gcs(
    presigned_post: dict,
    file_bytes: bytes,
    prefix: str,
    relative_path: str = None,
):
    """Upload a file to GCS.

    Args:
        presigned_post (dict): GCP bucket presigned credentials
        file_bytes (bytes): file content in bytes
        prefix (str): Artifact ID to upload to
        relative_path (str, optional): relative path of file Defaults to None.
    """
    upload_url = presigned_post["url"]
    fields = presigned_post["fields"].copy()

    filename = f"{prefix}/{(relative_path or 'file').lstrip('/')}"
    # This is required for `starts-with` policies.
    fields["key"] = filename

    file_obj = BytesIO(file_bytes)

    try:

        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()

            for key, value in fields.items():
                data.add_field(key, value)

            data.add_field("file", file_obj)

            async with session.post(upload_url, data=data) as resp:
                if not resp.status in (200, 201, 204):
                    body = await resp.text()
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to upload file to GCS: {resp.status} {body}",
                    )

                logger.info(
                    f"Successfully uploaded {filename} with status {resp.status}"
                )
                return resp

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error uploading file to GCS artifact({upload_url}): {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.post("/{conversation_id}/suggest-name")
async def suggest_artifact_name(
    request: Request, conversation_id: str, payload: NameSuggestionRequest
) -> NameSuggestionResponse:
    """Suggest a name for an artifact based on its type and filepath"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        filepath = ArtifactsService.get_relative_filepath(
            payload.type, payload.filepath
        )
        suggested_name = await ArtifactsService.suggest_artifact_name(
            conversation_id, filepath, content=payload.content
        )
        return NameSuggestionResponse(suggested_name=suggested_name)
    except Exception as e:
        logger.error(
            f"Error suggesting artifact name conversation({conversation_id}): {traceback.format_exc()}"
        )
        # Return a default name if there's an error
        return NameSuggestionResponse(suggested_name=DEFAULT_ARTIFACT_NAME)


@router.post("/{conversation_id}/save")
async def save_artifact(
    request: Request, conversation_id: str, payload: ArtifactPayload
):
    """Save artifacts to the database"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    artifact_id = None
    try:
        # TODO - remove these fixes after the model is improved
        # LLM hallucination with path
        # validate and correct file path before saving
        local_agent = await get_or_create_agent(conversation_id, api_key=api_key)
        env = local_agent[0].environment
        base = Path(env.base_path).resolve()
        # Check existence via sandbox API
        file_path: str | None = await FilesService.validate_and_correct_file_path(
            env, payload.filepath, str(base)
        )
        file_path = FilesService.relative_from_base(base, file_path)

        async with aiohttp.ClientSession() as session:
            payload_dict = payload.dict()
            payload_dict["conversation_id"] = conversation_id
            payload_dict["filepath"] = ArtifactsService.get_relative_filepath(
                payload.type, file_path
            )
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.post(
                f"{PANDA_AGI_SERVER_URL}/artifacts/", json=payload_dict, headers=headers
            ) as resp:
                response = await resp.json()

                if resp.status != 200:
                    logger.error(f"Error saving creations: {response}")
                    message = (
                        "Unknown error"
                        if "detail" not in response
                        else response["detail"]
                    )

                    raise HTTPException(
                        status_code=resp.status,
                        detail=response.get(
                            "message",
                            message,
                        ),
                    )

                # Store the artifact ID for potential cleanup
                artifact = response.get("artifact")
                artifact_id = artifact.get("id") if artifact else None

        # Get conversation messages for artifact

        if payload.timestamp:
            conversation_messages = await get_conversation_messages(
                conversation_id, api_key, parse_timestamp(payload.timestamp)
            )
        else:
            conversation_messages = None

        # Get files for artifact
        files_generator = ArtifactsService.get_files_for_artifact(
            payload.type,
            file_path,
            conversation_id,
            artifact_id,
            conversation_messages,
        )
        total_files = 0
        async for file_bytes, relative_path in files_generator:
            await upload_file_to_gcs(
                response["upload_credentials"], file_bytes, artifact_id, relative_path
            )

            total_files += 1

        if total_files == 0:
            logger.error(f"No files found for artifact {artifact_id}")
            raise HTTPException(status_code=400, detail="No files found for creation")

        logger.info(f"Uploaded {total_files} files for artifact {artifact_id}")

        return {"detail": "Creations saved successfully", "artifact": artifact}

    except HTTPException as e:
        if artifact_id:
            await cleanup_artifact(artifact_id, api_key)
        raise e
    except ValueError as e:
        if artifact_id:
            await cleanup_artifact(artifact_id, api_key)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if artifact_id:
            await cleanup_artifact(artifact_id, api_key)
        logger.error(
            f"Error saving creations conversation({conversation_id}) {traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Failed to save creations")


@router.get("/", response_model=ArtifactsListResponse)
async def get_user_artifacts(
    request: Request,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get creations for a conversation"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            params = {"limit": limit, "offset": offset}
            async with session.get(
                f"{PANDA_AGI_SERVER_URL}/artifacts/", headers=headers, params=params
            ) as resp:
                response = await resp.json()

                if resp.status != 200:
                    logger.error(f"Error getting creations: {response}")
                    message = (
                        "Unknown error"
                        if "detail" not in response
                        else response["detail"]
                    )

                    raise HTTPException(
                        status_code=resp.status,
                        detail=response.get(
                            "message",
                            message,
                        ),
                    )

                return response

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting creations: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="internal server error")


@router.get("/serve/{artifact_id}/{file_path:path}")
async def serve_artifact_file(
    request: Request,
    artifact_id: str,
    file_path: str,
    raw: bool = Query(False, alias="raw"),
):
    """Get artifact file content - handles both authenticated and public access"""
    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    # Determine if this is a public or private artifact based on API key presence
    is_public = api_key is None

    # Get base artifact URL for setting the path in the markdown HTML response
    base_source_url = f"{PANDA_CHAT_CLIENT_URL}/creations/{artifact_id}"

    try:
        async with aiohttp.ClientSession() as session:
            # Set up headers - only include API key if available
            headers = {}
            if api_key:
                headers["X-API-KEY"] = f"{api_key}"

            url = f"{PANDA_AGI_SERVER_URL}/artifacts/serve/{artifact_id}/{file_path}"

            async with session.get(url, headers=headers) as resp:
                if resp.status != 200:
                    logger.error(
                        f"Error getting creation file /artifacts/serve/{artifact_id}/{file_path}: {resp.status}"
                    )
                    response = await resp.json()
                    error_detail = (
                        response["detail"]
                        if "detail" in response
                        else f"HTTP {resp.status}"
                    )

                    # Check if client accepts HTML
                    if should_return_html(request.headers.get("accept")):
                        return create_html_redirect_response(ERROR_PAGE_URL)

                    raise HTTPException(
                        status_code=resp.status,
                        detail=error_detail,
                    )

                # Get content as bytes
                content_bytes = await resp.read()

                # Check if it's a markdown file and raw mode is not requested
                if file_path.lower().endswith((".md", ".markdown")):
                    if raw:
                        # Convert relative links to absolute URLs
                        content_str = content_bytes.decode("utf-8")
                        updated_content = await convert_relative_links_to_absolute(
                            content_str, base_source_url or ""
                        )
                        return Response(
                            content=updated_content.encode("utf-8"),
                            media_type="text/markdown",
                        )

                    pdf_response = await process_artifact_markdown_to_pdf(
                        file_path,
                        content_bytes,
                        artifact_id,
                        session,
                        headers,
                        is_public=is_public,
                        base_source_url=base_source_url,
                    )
                    if pdf_response:
                        return pdf_response

                # Check if it's a pxml file and raw mode is not requested
                if file_path.lower().endswith((".pxml")):
                    if not raw:
                        html_response = await process_artifact_pxml_to_html(
                            file_path, content_bytes, artifact_id, session, headers
                        )
                        if html_response:
                            return html_response
                        else:
                            raise HTTPException(
                                status_code=500, detail="Failed to convert PXML to HTML"
                            )
                    else:
                        # Return the raw PXML content
                        xml_parser = XMLParser()
                        import re

                        file_content = content_bytes.decode("utf-8")
                        file_content = re.sub(
                            r"<\?pxml[^>]*\?>", "", file_content
                        ).strip()
                        preprocessed_content_bytes = xml_parser._preprocess_xml_content(
                            file_content
                        )

                        print(preprocessed_content_bytes)
                        return Response(
                            content=preprocessed_content_bytes.encode("utf-8"),
                            media_type="application/octet-stream",
                        )

                # Determine MIME type for non-markdown files
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/octet-stream"

                return Response(content=content_bytes, media_type=mime_type)

    except HTTPException as e:
        raise e
    except aiohttp.ClientConnectorError as e:
        logger.error(f"Backend server is not responding at {PANDA_AGI_SERVER_URL}: {e}")
        if should_return_html(request.headers.get("accept")):
            return create_html_redirect_response(ERROR_PAGE_URL)
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable. Please try again later.",
        )
    except Exception as e:
        logger.error(f"Error getting creation file: {traceback.format_exc()}")
        # Check if client accepts HTML
        if should_return_html(request.headers.get("accept")):
            return create_html_redirect_response(ERROR_PAGE_URL)
        raise HTTPException(status_code=500, detail="internal server error")


@router.delete("/{artifact_id}")
async def delete_artifact(request: Request, artifact_id: str):
    """Delete an artifact by ID"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.delete(
                f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}", headers=headers
            ) as resp:
                if resp.status != 200:
                    response = await resp.json()
                    logger.error(
                        f"Error deleting artifact: {resp.status} {response.get('detail', 'Unknown error')}"
                    )
                    raise HTTPException(
                        status_code=resp.status,
                        detail="Failed to delete creation",
                    )

                return {"detail": "Creation deleted successfully"}

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(
            f"Error deleting creation artifact({artifact_id}): {traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="internal server error")


@router.patch("/{artifact_id}", response_model=ArtifactResponse)
async def update_artifact(
    request: Request, artifact_id: str, update_data: ArtifactUpdateRequest
) -> ArtifactResponse:
    """Update an artifact name and/or public status"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.patch(
                f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}",
                json=update_data.dict(exclude_none=True),
                headers=headers,
            ) as resp:
                if resp.status != 200:
                    response = await resp.json()
                    logger.error(
                        f"Error updating creation: {resp.status} {response.get('detail', 'Unknown error')}"
                    )
                    raise HTTPException(
                        status_code=resp.status,
                        detail=response.get("detail", "Failed to update creation"),
                    )

                return await resp.json()

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(
            f"Error updating creation artifact({artifact_id}): {traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="internal server error")


@router.patch("/{artifact_id}/file")
async def update_artifact_file(
    request: Request, artifact_id: str, update_data: ArtifactFileUpdateRequest
):
    """Update a specific file within an artifact"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Get upload credentials using the new function
        response = await get_artifact_upload_credentials(artifact_id, api_key)
        upload_credentials = response.get("upload_credentials")

        if not upload_credentials:
            raise HTTPException(
                status_code=500,
                detail="No upload credentials received from server",
            )

        # Convert content to bytes
        content_bytes = update_data.content.encode("utf-8")

        # Upload the updated file to GCS
        await upload_file_to_gcs(
            upload_credentials,
            content_bytes,
            artifact_id,
            update_data.file_path,
        )

        return {"detail": "File updated successfully"}

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(
            f"Error updating artifact({artifact_id}) file({update_data.file_path}): {traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="internal server error")
