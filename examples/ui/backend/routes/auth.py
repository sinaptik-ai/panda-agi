"""
Authentication routes for the PandaAGI API.
"""

import aiohttp
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Security scheme for bearer token
security = HTTPBearer()


@router.get("/github")
async def github_auth(redirect_uri: Optional[str] = Query(None)):
    """GitHub auth endpoint with optional redirect_uri"""
    async with aiohttp.ClientSession() as session:
        payload = {}
        # if redirect_uri:
        payload["redirect_uri"] = redirect_uri or "http://localhost:3001/authenticate"

        async with session.post(
            "http://localhost:8000/public/auth/github", json=payload
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
            "http://localhost:8000/auth/validate", headers=headers
        ) as resp:
            if resp.status != 200:
                raise HTTPException(
                    status_code=resp.status, detail="Token validation failed"
                )

            response = await resp.json()
            return response
