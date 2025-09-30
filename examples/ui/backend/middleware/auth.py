"""
Authentication middleware for the PandaAGI SDK API.
"""

import os
import json
import aiohttp
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)


def parse_cookies(cookie_header: str) -> dict:
    """
    Parse cookie header string into a dictionary.
    """
    cookies = {}
    if cookie_header:
        for cookie in cookie_header.split(";"):
            if "=" in cookie:
                name, value = cookie.strip().split("=", 1)
                cookies[name] = value

    return cookies


def extract_token_from_cookie(cookies: dict) -> str | None:
    """
    Extract auth token from cookies.
    """
    auth_cookie = cookies.get("auth_token")
    if not auth_cookie:
        return None

    try:
        # URL decode the cookie value
        import urllib.parse

        decoded_cookie = urllib.parse.unquote(auth_cookie)
        token_data = json.loads(decoded_cookie)
        return token_data.get("access_token")
    except (json.JSONDecodeError, KeyError, TypeError):
        return None


async def get_api_key(auth_token: str) -> str | None:
    """
    Get the API key based on the auth token.
    """

    try:
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
    except aiohttp.ClientConnectorError as e:
        # Backend server is not reachable
        logger.error(f"Backend server is not responding at {PANDA_AGI_SERVER_URL}: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable. Please try again later.",
        )
    except Exception as e:
        # Other unexpected errors
        logger.error(f"Unexpected error while getting API key: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error while authenticating"
        )

    return None


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle authentication for all routes except /public/ paths.

    Checks for:
    1. X-Authorization header with Bearer token
    2. auth_token cookie if header is not provided
    3. Falls back to PANDA_AGI_KEY environment variable
    4. Skips authentication for /public/ routes
    """

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for /public/ routes
        if request.url.path.startswith("/public/"):
            return await call_next(request)

        # Skip authentication for health endpoints
        if (
            request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]
            or "/public/" in request.url.path
        ):
            return await call_next(request)

        is_artifact_route = request.url.path.startswith("/artifacts/serve/")

        # Check for X-Authorization header first
        auth_header = request.headers.get("x-authorization")
        auth_token = None

        if auth_header:
            # Extract Bearer token from X-Authorization header
            if auth_header.startswith("Bearer "):
                auth_token = auth_header[7:]
            else:
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": "Invalid authorization format",
                        "detail": "X-Authorization header must use Bearer token format",
                    },
                )
        else:
            # Check for auth_token cookie if header is not provided
            cookie_header = request.headers.get("cookie")
            if cookie_header:
                cookies = parse_cookies(cookie_header)
                auth_token = extract_token_from_cookie(cookies)

        api_key = os.getenv("PANDA_AGI_KEY", None)

        if not api_key and auth_token:
            try:
                api_key = await get_api_key(auth_token)
                if not api_key and not is_artifact_route:
                    return JSONResponse(
                        status_code=401,
                        content={
                            "error": "Invalid authorization",
                            "detail": "Invalid Authorization token",
                        },
                    )

            except HTTPException as e:
                return JSONResponse(
                    status_code=e.status_code,
                    content={
                        "error": "Authentication service error",
                        "detail": e.detail,
                    },
                )

        # For artifact serve routes, allow the request to proceed even without API key
        # The route handler will determine if it's public or private access
        if is_artifact_route:
            # Add the API key to request state (may be None for public access)
            request.state.api_key = api_key
            return await call_next(request)

        # If no API key found, return authorization error
        if not api_key and request.method != "OPTIONS":
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Authorization required",
                },
            )

        # Add the API key to request state so routes can access it
        request.state.api_key = api_key

        # Continue with the request
        return await call_next(request)
