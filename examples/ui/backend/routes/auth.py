"""
Authentication routes for the PandaAGI API.
"""

import aiohttp
import json
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException, Response, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import os

from fastapi.responses import JSONResponse


PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

# Create router
router = APIRouter(prefix="/public/auth", tags=["authentication"])

# Security scheme for bearer token
security = HTTPBearer()


@router.get("/provider/{provider}")
async def auth_provider(
    provider: str = Path(
        ..., description="Authentication provider (e.g., github, google, etc.)"
    ),
    redirect_uri: Optional[str] = Query(None),
):
    """Generic auth endpoint with provider as path parameter"""
    # Validate provider (you can extend this list as needed)
    valid_providers = ["github", "google"]
    if provider.lower() not in valid_providers:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider '{provider}'. Supported providers: {', '.join(valid_providers)}",
        )

    async with aiohttp.ClientSession() as session:
        payload = {}
        # Use the provided redirect_uri or fall back to production URL
        payload["redirect_uri"] = (
            redirect_uri or "https://agi.panda-agi.com/authenticate"
        )

        async with session.post(
            f"{PANDA_AGI_SERVER_URL}/public/auth/provider/{provider.lower()}",
            json=payload,
        ) as resp:
            if resp.status != 200:
                raise HTTPException(
                    status_code=resp.status,
                    detail=f"{provider.title()} authentication failed",
                )

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
            return response


@router.post("/refresh-token")
async def refresh_token(refresh_token_data: dict):
    """Refresh authentication token by forwarding to backend service"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{PANDA_AGI_SERVER_URL}/public/auth/refresh-token",
                json=refresh_token_data,
            ) as resp:
                if resp.status != 200:
                    raise HTTPException(
                        status_code=resp.status, detail="Token refresh failed"
                    )

                response_data = await resp.json()

                # Create response with cookie
                response = JSONResponse(content=response_data)

                return response
    except aiohttp.ClientConnectorError:
        raise HTTPException(
            status_code=503,
            detail="Authentication service is currently unavailable. Please try again later.",
        )
    except aiohttp.ServerTimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Authentication service is taking too long to respond. Please try again.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Authentication service encountered an internal error. Please try again later.",
        )
