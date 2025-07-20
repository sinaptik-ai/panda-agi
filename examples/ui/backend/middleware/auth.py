"""
Authentication middleware for the PandaAGI SDK API.
"""

import os
import aiohttp
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

PANDA_AGI_SERVER_URL = os.environ.get("PANDA_AGI_URL") or "http://localhost:8000"

# CORS headers to include in error responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
}


async def get_api_key(auth_token: str) -> str | None:
    """
    Get the API key based on the auth token.
    """

    async with aiohttp.ClientSession() as session:
        # Pass the auth token in X-Authorization header
        headers = {"X-Authorization": f"Bearer {auth_token}"}

        async with session.get(
            f"{PANDA_AGI_SERVER_URL}/auth/api-keys", headers=headers
        ) as resp:
            response = await resp.json()

            if len(response.get("api_keys", [])) > 0:
                return response["api_keys"][0].get("key")
            else:
                return None

    return None


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle authentication for all routes except /public/ paths.

    Checks for:
    1. X-Authorization header with Bearer token
    2. Falls back to PANDA_AGI_KEY environment variable
    3. Skips authentication for /public/ routes
    """

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for /public/ routes
        if request.url.path.startswith("/public/"):
            return await call_next(request)

        # Skip authentication for health endpoints
        if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Check for X-Authorization header
        auth_header = request.headers.get("X-Authorization")
        api_key = None

        if auth_header:
            # Extract Bearer token from X-Authorization header
            if auth_header.startswith("Bearer "):
                api_key = await get_api_key(auth_header[7:])
                if not api_key:
                    print("Invalid authorization token")
                    return JSONResponse(
                        status_code=401,
                        content={
                            "error": "Invalid authorization",
                            "detail": "Invalid Authorization token",
                        },
                        headers=CORS_HEADERS,
                    )
            else:
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": "Invalid authorization format",
                        "detail": "X-Authorization header must use Bearer token format",
                    },
                    headers=CORS_HEADERS,
                )
        else:
            # Fall back to PANDA_AGI_KEY environment variable
            api_key = os.getenv("PANDA_AGI_KEY")

        # If no API key found, return authorization error
        if not api_key:
            return JSONResponse(
                status_code=401,
                content={
                    "error": "Authorization required",
                    "detail": "PANDA_AGI_KEY required. Provide X-Authorization header or set PANDA_AGI_KEY environment variable.",
                },
                headers=CORS_HEADERS,
            )

        # Add the API key to request state so routes can access it
        request.state.api_key = api_key

        # Continue with the request
        return await call_next(request)
