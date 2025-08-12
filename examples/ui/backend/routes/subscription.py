"""
Subscription routes for the PandaAGI API.
"""

import aiohttp
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request
import os

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
    cancel_url: Optional[str] = Field(
        None, description="URL to redirect after canceling payment"
    )


class UpdateSubscriptionRequest(BaseModel):
    """Request model for creating a customer portal session"""

    package_name: str = Field(
        ..., description="Package name (e.g., 'basic', 'pro', 'enterprise')"
    )
    success_url: Optional[str] = Field(
        None, description="URL to redirect after successful payment"
    )


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
            status_code=400, detail="Package name and success URL are required"
        )

    async with aiohttp.ClientSession() as session:
        headers = {"X-API-KEY": f"{api_key}"}

        payload = {
            "package_name": portal_request.package_name,
            "success_url": portal_request.success_url,
            "cancel_url": portal_request.cancel_url,
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


@router.post("/cancel-subscription")
async def cancel_subscription(request: Request):
    """Cancel the current subscription"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized access")

    async with aiohttp.ClientSession() as session:
        headers = {"X-API-KEY": f"{api_key}"}

        async with session.post(
            f"{PANDA_AGI_SERVER_URL}/payment/stripe/cancel-subscription",
            headers=headers,
            json={},
        ) as resp:
            if resp.status != 200:
                raise HTTPException(
                    status_code=resp.status, detail="Failed to cancel subscription"
                )

            return await resp.json()


@router.post("/update-subscription")
async def update_subscription(
    request: Request, update_subscription_request: UpdateSubscriptionRequest
):
    """Update subscription to a different package"""

    if not all([update_subscription_request.package_name]):
        raise HTTPException(status_code=400, detail="Package is required")

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized access")

    async with aiohttp.ClientSession() as session:
        headers = {"X-API-KEY": f"{api_key}"}

        payload = {
            "package_name": update_subscription_request.package_name,
            "success_url": update_subscription_request.success_url,
        }

        async with session.post(
            f"{PANDA_AGI_SERVER_URL}/payment/stripe/update-subscription",
            headers=headers,
            json=payload,
        ) as resp:
            if resp.status != 200:
                raise HTTPException(
                    status_code=resp.status, detail="Failed to update subscription"
                )

            return await resp.json()
