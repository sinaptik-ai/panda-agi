"""
Authentication routes for the PandaAGI API.
"""

import aiohttp
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os


PANDA_AGI_SERVER_URL = os.environ.get("PANDA_AGI_URL") or "http://localhost:8000"

# Create router
router = APIRouter(prefix="/public/auth", tags=["authentication"])

# Security scheme for bearer token
security = HTTPBearer()


@router.get("/github")
async def github_auth(redirect_uri: Optional[str] = Query(None)):
    """GitHub auth endpoint with optional redirect_uri"""
    async with aiohttp.ClientSession() as session:
        payload = {}
        # Use the provided redirect_uri or fall back to production URL
        payload["redirect_uri"] = (
            redirect_uri or "https://agi.panda-agi.com/authenticate"
        )

        async with session.post(
            f"{PANDA_AGI_SERVER_URL}/public/auth/github", json=payload
        ) as resp:
            response = await resp.json()
            return response


@router.get("/validate")
async def validate_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate authentication token by forwarding to backend service"""
    token = credentials.credentials  # Extract the token from the bearer header

    async with aiohttp.ClientSession() as session:
        # Pass the token in the Authorization header to the backend service
        headers = {"X-Authorization": f"Bearer {token}"}

        async with session.get(
            f"{PANDA_AGI_SERVER_URL}/auth/validate", headers=headers
        ) as resp:
            if resp.status != 200:
                raise HTTPException(
                    status_code=resp.status, detail="Token validation failed"
                )

            response = await resp.json()
            return response


@router.post("/refresh-token")
async def refresh_token(refresh_token_data: dict):
    """Refresh authentication token by forwarding to backend service"""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{PANDA_AGI_SERVER_URL}/public/auth/refresh-token", json=refresh_token_data
        ) as resp:
            if resp.status != 200:
                raise HTTPException(
                    status_code=resp.status, detail="Token refresh failed"
                )

            response = await resp.json()
            return response
