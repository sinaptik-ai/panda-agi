"""
Authentication routes for the PandaAGI API.
"""

import aiohttp
import json
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import os


PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

# Create router
router = APIRouter(prefix="/public/auth", tags=["authentication"])

# Security scheme for bearer token
security = HTTPBearer()


def set_auth_cookie(response: Response, token_data: dict):
    """Set authentication cookie on the response"""
    is_localhost = os.getenv("ENVIRONMENT", "development") == "development"
    domain = "" if is_localhost else None

    # Set the cookie with proper attributes
    response.set_cookie(
        key="auth_token",
        value=json.dumps(token_data),
        max_age=30 * 24 * 60 * 60,  # 30 days
        path="/",
        httponly=False,  # Allow JavaScript access
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",  # Allow cross-site requests
        domain=domain,
    )


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
    """Validate authentication token by forwarding to backend service and set cookie"""
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

            response_data = await resp.json()

            # Create response with cookie
            response = JSONResponse(content=response_data)

            # Set the auth cookie with the token data
            token_data = {
                "access_token": token,
                "expires_at": response_data.get("expires_at"),
                "expires_in": response_data.get("expires_in"),
                "refresh_token": response_data.get("refresh_token"),
                "token_type": response_data.get("token_type"),
                "provider_token": response_data.get("provider_token"),
            }
            set_auth_cookie(response, token_data)

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

            response_data = await resp.json()

            # Create response with cookie
            response = JSONResponse(content=response_data)

            # Set the auth cookie with the new token data
            set_auth_cookie(response, response_data)

            return response
