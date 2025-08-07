"""
Artifacts routes for the PandaAGI SDK.
"""

import aiohttp
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.security import HTTPBearer
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List
import os
import logging
import traceback
import mimetypes

from services.artifacts import ArtifactsService
from models.agent import ArtifactResponse, ArtifactsListResponse

logger = logging.getLogger(__name__)

PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

# Create router
router = APIRouter(prefix="/artifacts", tags=["artifacts"])

# Security scheme for bearer token


class ArtifactPayload(BaseModel):
    type: str
    name: str
    filepath: str


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
                        f"Failed to cleanup artifact {artifact_id}: {cleanup_resp.status}"
                    )
                else:
                    logger.info(f"Successfully cleaned up artifact {artifact_id}")
    except Exception as cleanup_error:
        logger.error(f"Error during artifact cleanup: {cleanup_error}")


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


@router.get("/{artifact_id}/{file_path:path}")
async def get_artifact_file(request: Request, artifact_id: str, file_path: str):
    """Get artifact file content"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            url = f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}/{file_path}"
            async with session.get(url, headers=headers) as resp:
                if resp.status != 200:
                    logger.error(f"Error getting artifact file: {resp.status}")
                    raise HTTPException(
                        status_code=resp.status,
                        detail=f"Failed to get artifact file: {resp.status}",
                    )

                # Get content as bytes
                content_bytes = await resp.read()

                # Determine MIME type
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/octet-stream"

                return Response(content=content_bytes, media_type=mime_type)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting artifact file: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="internal server error")
