"""
Artifacts routes for the PandaAGI SDK.
"""

import aiohttp
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from pydantic import BaseModel
import os
import logging
import traceback
import mimetypes
from uuid import UUID
from typing import Optional

from services.artifacts import ArtifactsService
from utils.markdown_utils import process_markdown_to_pdf
from models.agent import (
    ArtifactResponse,
    ArtifactsListResponse,
    ArtifactNameUpdateRequest,
)

logger = logging.getLogger(__name__)

PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

PANDA_CHAT_CLIENT_URL = (
    os.environ.get("PANDA_CHAT_CLIENT_URL") or "https://chat.pandas-ai.com"
)

# Create router
router = APIRouter(prefix="/artifacts", tags=["artifacts"])


def get_base_artifact_url(artifact_id: str, is_public: bool = False) -> str:
    """
    Get the base artifact URL constructed from the source domain.

    Args:
        request: The FastAPI request object
        artifact_id: The artifact ID
        is_public: Whether this is a public artifact

    Returns:
        str: The base artifact URL in format source/artifact_id or source/public/artifact_id
    """
    # Construct base URL
    if is_public:
        base_artifact_url = f"{PANDA_CHAT_CLIENT_URL}/creations/share/{artifact_id}"
    else:
        base_artifact_url = f"{PANDA_CHAT_CLIENT_URL}/creations/private/{artifact_id}"

    return base_artifact_url


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
    if is_public:
        base_url = f"{PANDA_AGI_SERVER_URL}/artifacts/public/{artifact_id}/"
    else:
        base_url = f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}/"

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


# Security scheme for bearer token


class ArtifactPayload(BaseModel):
    type: str
    name: str
    filepath: str


class ArtifactUpdateRequest(BaseModel):
    """Request model for updating artifact name and public status."""

    name: Optional[str] = None
    is_public: Optional[bool] = None


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
        logger.error(f"Error during creation cleanup: {cleanup_error}")


async def upload_file_to_s3(
    presigned_post: dict, file_bytes: bytes, relative_path: str = None
):
    upload_url = presigned_post["url"]
    fields = presigned_post["fields"].copy()

    # Determine the filename or relative path to use in the S3 key
    filename = relative_path if relative_path else "file"

    # Replace ${filename} in the key field
    if "${filename}" in fields["key"]:
        fields["key"] = fields["key"].replace("${filename}", filename)

    # Create file-like object from bytes
    from io import BytesIO

    file_obj = BytesIO(file_bytes)

    try:
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            # Add fields to form data
            for key, value in fields.items():
                data.add_field(key, value)
            # Add file to form data
            data.add_field("file", file_obj, filename=filename)

            async with session.post(upload_url, data=data) as response:
                response.raise_for_status()
                return response
    except aiohttp.ClientError as e:
        logger.error(f"Error uploading file to S3: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to upload file to S3: {str(e)}"
        )


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
        async with aiohttp.ClientSession() as session:
            payload_dict = payload.dict()
            payload_dict["conversation_id"] = conversation_id
            payload_dict["filepath"] = ArtifactsService.get_relative_filepath(
                payload.type, payload.filepath
            )
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.post(
                f"{PANDA_AGI_SERVER_URL}/artifacts", json=payload_dict, headers=headers
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
                artifact_id = response.get("artifact_id")

        files_generator = ArtifactsService.get_files_for_artifact(
            payload.type, payload.filepath, conversation_id, artifact_id
        )

        async for file_bytes, relative_path in files_generator:
            await upload_file_to_s3(
                response["upload_credentials"], file_bytes, relative_path
            )

        return {"detail": "Creations saved successfully"}
    except HTTPException as e:
        raise e
    except ValueError as e:
        # Clean up artifact if it was created before ValueError occurred
        if artifact_id:
            await cleanup_artifact(artifact_id, api_key)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error saving creations: {traceback.format_exc()}")

        # If artifact was created but upload failed, clean it up
        if artifact_id:
            await cleanup_artifact(artifact_id, api_key)

        raise HTTPException(status_code=500, detail="internal server error")


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
                f"{PANDA_AGI_SERVER_URL}/artifacts", headers=headers, params=params
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


async def _get_public_artifact_file(
    artifact_id: UUID,
    file_path: str = "index.html",
    raw: bool = False,
    base_source_url: str = None,
) -> Response:
    """Helper function to get public artifact file content"""
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{PANDA_AGI_SERVER_URL}/artifacts/public/{artifact_id}/{file_path}"
            async with session.get(url) as resp:
                if resp.status != 200:
                    logger.error(f"Error getting creation file: {resp.status}")
                    response = await resp.json()
                    raise HTTPException(
                        status_code=resp.status,
                        detail=f"Failed to get creation file: {response['detail'] if 'detail' in response else resp.status}",
                    )

                # Get content as bytes
                content_bytes = await resp.read()

                # Check if it's a markdown file and raw mode is not requested
                if file_path.lower().endswith((".md", ".markdown")) and not raw:
                    pdf_response = await process_artifact_markdown_to_pdf(
                        file_path,
                        content_bytes,
                        str(artifact_id),
                        session,
                        None,
                        is_public=True,
                        base_source_url=base_source_url,
                    )
                    if pdf_response:
                        return pdf_response

                # Determine MIME type for non-markdown files or when conversion fails
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/octet-stream"

                return Response(content=content_bytes, media_type=mime_type)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting creation file: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="internal server error")


@router.get("/public/{artifact_id}/{file_path:path}")
async def get_artifact_file_public(
    artifact_id: UUID, file_path: str, raw: bool = Query(False, alias="raw")
) -> Response:
    """Get artifact file content (public route, no authentication required)"""
    # Get base artifact URL
    base_source_url = get_base_artifact_url(str(artifact_id), is_public=True)
    return await _get_public_artifact_file(artifact_id, file_path, raw, base_source_url)


@router.get("/{artifact_id}/{file_path:path}")
async def get_artifact_file(
    request: Request,
    artifact_id: str,
    file_path: str,
    raw: bool = Query(False, alias="raw"),
):
    """Get artifact file content"""
    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Get base artifact URL
    base_source_url = get_base_artifact_url(artifact_id, is_public=False)

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            url = f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}/{file_path}"
            async with session.get(url, headers=headers) as resp:
                if resp.status != 200:
                    logger.error(f"Error getting creation file: {resp.status}")
                    raise HTTPException(
                        status_code=resp.status,
                        detail=f"Failed to get creation file: {resp.status}",
                    )

                # Get content as bytes
                content_bytes = await resp.read()

                # Check if it's a markdown file and raw mode is not requested
                if file_path.lower().endswith((".md", ".markdown")) and not raw:
                    pdf_response = await process_artifact_markdown_to_pdf(
                        file_path,
                        content_bytes,
                        artifact_id,
                        session,
                        headers,
                        is_public=False,
                        base_source_url=base_source_url,
                    )
                    if pdf_response:
                        return pdf_response

                # Determine MIME type for non-markdown files
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/octet-stream"

                return Response(content=content_bytes, media_type=mime_type)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting creation file: {traceback.format_exc()}")
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
        logger.error(f"Error deleting creation: {traceback.format_exc()}")
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
                        detail=f"Failed to update creation",
                    )

                return await resp.json()

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating creation: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="internal server error")
