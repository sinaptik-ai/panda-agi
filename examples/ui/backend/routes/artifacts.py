"""
Artifacts routes for the PandaAGI API.
"""

import aiohttp
from fastapi import APIRouter, HTTPException, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import os
import logging

from services.artifacts import ArtifactsService

logger = logging.getLogger(__name__)

PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

# Create router
router = APIRouter(prefix="/artifacts", tags=["artifacts"])

# Security scheme for bearer token
security = HTTPBearer()


class ArtifactPayload(BaseModel):
    type: str
    name: str
    filepath: str


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

    async with aiohttp.ClientSession() as session:
        payload_dict = payload.dict()
        payload_dict["conversation_id"] = conversation_id
        headers = {"X-API-KEY": f"{api_key}"}
        async with session.post(
            f"{PANDA_AGI_SERVER_URL}/artifacts", json=payload_dict, headers=headers
        ) as resp:
            response = await resp.json()

            if resp.status != 200:
                logger.error(f"Error saving artifact: {response}")
                message = (
                    "Unknown error" if "detail" not in response else response["detail"]
                )

                raise HTTPException(
                    status_code=resp.status,
                    detail=response.get(
                        "message",
                        message,
                    ),
                )

    files_generator = ArtifactsService.get_files_for_artifact(
        payload.type, payload.filepath, conversation_id
    )

    async for file_bytes, relative_path in files_generator:
        await upload_file_to_s3(
            response["upload_credentials"], file_bytes, relative_path
        )

    return {"detail": "Artifacts saved successfully"}
