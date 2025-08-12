"""
Subscription routes for the PandaAGI API.
"""

import aiohttp
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import json

from pydantic import BaseModel, Field

PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

# Create router
router = APIRouter(prefix="/payment/stripe", tags=["stripe"])


class CustomerSubscriptionRequest(BaseModel):
    """Request model for creating a customer and subscription"""

    package_name: str = Field(
        ..., description="Package name (e.g., 'basic', 'pro', 'enterprise')"
    )
    success_url: Optional[str] = Field(
        None, description="URL to redirect after successful payment"
    )


class PortalRequest(BaseModel):
    """Request model for creating a customer portal session"""

    return_url: Optional[str] = Field(
        None, description="URL to redirect after leaving the portal"
    )
    check_availability: Optional[bool] = Field(
        None, description="Whether to check availability of the subscription"
    )


def get_user_from_token(token: str) -> Dict[str, Any]:
    """Extract user information from token"""
    # This is a placeholder - in a real implementation, you would decode the JWT token
    # and extract user information from it
    return {"user_id": "user_123", "email": "user@example.com"}


@router.get("/subscription")
async def get_subscription(request: Request):
    """Get the current user's subscription"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    async with aiohttp.ClientSession() as session:
        headers = {"X-API-KEY": f"{api_key}"}

        async with session.get(
            f"{PANDA_AGI_SERVER_URL}/payment/stripe/subscription",
            headers=headers,
        ) as resp:
            if resp.status == 404:
                # User has no subscription
                return {"has_subscription": False}
            elif resp.status != 200:
                raise HTTPException(
                    status_code=resp.status, detail="Failed to fetch subscription"
                )

            return await resp.json()


@router.post("/create-payment-session")
async def create_payment_session(
    request: Request, portal_request: CustomerSubscriptionRequest
):
    """Create a payment session for subscription"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not all([portal_request.package_name, portal_request.success_url]):
        raise HTTPException(
            status_code=400, detail="Package name and success url are required"
        )

    async with aiohttp.ClientSession() as session:
        headers = {"X-API-KEY": f"{api_key}"}

        payload = {
            "package_name": portal_request.package_name,
            "success_url": portal_request.success_url,
        }

        async with session.post(
            f"{PANDA_AGI_SERVER_URL}/payment/stripe/create-payment-session",
            headers=headers,
            json=payload,
        ) as resp:
            if resp.status != 200:
                raise HTTPException(
                    status_code=resp.status, detail="Failed to create payment session"
                )

            return await resp.json()


# @router.post("/cancel-subscription")
# async def cancel_subscription(
#     request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)
# ):
#     """Cancel the current subscription"""
#     token = credentials.credentials
#     user = get_user_from_token(token)

#     # Get request body
#     body = await request.json()
#     user_id = body.get("user_id")

#     if not user_id:
#         raise HTTPException(status_code=400, detail="user_id is required")

#     async with aiohttp.ClientSession() as session:
#         headers = {
#             "X-Authorization": f"Bearer {token}",
#             "Content-Type": "application/json",
#         }

#         payload = {"user_id": user_id}

#         async with session.post(
#             f"{PANDA_AGI_SERVER_URL}/payment/stripe/cancel-subscription",
#             headers=headers,
#             json=payload,
#         ) as resp:
#             if resp.status != 200:
#                 raise HTTPException(
#                     status_code=resp.status, detail="Failed to cancel subscription"
#                 )

#             return await resp.json()


# @router.post("/reactivate")
# async def reactivate_subscription(
#     credentials: HTTPAuthorizationCredentials = Depends(security),
# ):
#     """Reactivate a canceled subscription"""
#     token = credentials.credentials
#     user = get_user_from_token(token)

#     async with aiohttp.ClientSession() as session:
#         headers = {"X-Authorization": f"Bearer {token}"}

#         async with session.post(
#             f"{PANDA_AGI_SERVER_URL}/api/subscription/reactivate", headers=headers
#         ) as resp:
#             if resp.status != 200:
#                 raise HTTPException(
#                     status_code=resp.status, detail="Failed to reactivate subscription"
#                 )

#             return {"success": True}


# @router.post("/update-subscription")
# async def update_subscription(
#     request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)
# ):
#     """Update subscription to a different package"""
#     token = credentials.credentials
#     user = get_user_from_token(token)

#     # Get request body
#     body = await request.json()
#     user_id = body.get("user_id")
#     package_name = body.get("package_name")
#     success_url = body.get("success_url")

#     if not all([user_id, package_name]):
#         raise HTTPException(
#             status_code=400, detail="user_id and package_name are required"
#         )

#     async with aiohttp.ClientSession() as session:
#         headers = {
#             "X-Authorization": f"Bearer {token}",
#             "Content-Type": "application/json",
#         }

#         payload = {
#             "user_id": user_id,
#             "package_name": package_name,
#             "success_url": success_url,
#         }

#         async with session.post(
#             f"{PANDA_AGI_SERVER_URL}/payment/stripe/update-subscription",
#             headers=headers,
#             json=payload,
#         ) as resp:
#             if resp.status != 200:
#                 raise HTTPException(
#                     status_code=resp.status, detail="Failed to update subscription"
#                 )

#             return await resp.json()


# @router.post("/create-customer-portal")
# async def create_customer_portal(
#     request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)
# ):
#     """Create a customer portal session for managing billing"""
#     token = credentials.credentials
#     user = get_user_from_token(token)

#     # Get request body
#     body = await request.json()
#     return_url = body.get("return_url")
#     check_availability = body.get("check_availability", False)

#     async with aiohttp.ClientSession() as session:
#         headers = {
#             "X-Authorization": f"Bearer {token}",
#             "Content-Type": "application/json",
#         }

#         payload = {}
#         if return_url:
#             payload["return_url"] = return_url
#         if check_availability:
#             payload["check_availability"] = check_availability

#         async with session.post(
#             f"{PANDA_AGI_SERVER_URL}/payment/stripe/create-customer-portal",
#             headers=headers,
#             json=payload,
#         ) as resp:
#             if resp.status != 200:
#                 raise HTTPException(
#                     status_code=resp.status,
#                     detail="Failed to create customer portal session",
#                 )

#             return await resp.json()
