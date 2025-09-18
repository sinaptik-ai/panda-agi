"""
Main entry point for the PandaAGI SDK API.
"""

import logging
import os
import sys

import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from middleware.auth import AuthMiddleware
from routes import agent, auth, conversation, files, health, artifacts, subscription
import logging

# Load environment variables from .env file
load_dotenv()


# Configure logging with more explicit settings
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),  # Ensure output goes to stdout
        logging.FileHandler("api.log"),  # Also log to file
    ],
)

logger = logging.getLogger("panda_agi_api")
logger.setLevel(logging.DEBUG)


def before_sentry_send(event, hint):
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]
        if exc_type.__name__ == "KeyboardInterrupt":
            return None
    return event


def init_sentry():
    sentry_dsn = os.getenv("SENTRY_DSN")
    environment = os.getenv("ENV", "development")
    if sentry_dsn:
        logging_integration = LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR,
        )
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                logging_integration,
            ],
            traces_sample_rate=0.1 if environment == "production" else 1.0,
            profiles_sample_rate=0.1 if environment == "production" else 1.0,
            send_default_pii=False,
            attach_stacktrace=True,
            before_send=before_sentry_send,
        )
        sentry_sdk.set_context("app", {"name": "PandaAGI API", "version": "1.0.0"})
        logger.info(f"Sentry initialized for environment: {environment}")
    else:
        logger.warning("SENTRY_DSN not found, Sentry monitoring disabled")


# Initialize Sentry
init_sentry()


app = FastAPI(title="PandaAGI SDK API", version="1.0.0")

# Add CORS middleware
# Define allowed origins for CORS
# When allow_credentials=True, we cannot use wildcard "*" for origins
allowed_origins = ["http://localhost:3000", "http://localhost:3001"]

# Add environment variable support for additional origins
additional_origins = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
if additional_origins and additional_origins[0]:  # Only add if not empty
    allowed_origins.extend([origin.strip() for origin in additional_origins])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Authentication middleware
app.add_middleware(AuthMiddleware)

# Include routers
app.include_router(agent.router)
app.include_router(auth.router)
app.include_router(conversation.router)
app.include_router(files.router)
app.include_router(health.router)
app.include_router(artifacts.router)
app.include_router(subscription.router)

if __name__ == "__main__":
    import uvicorn

    # Allow reload to be controlled by environment variable
    # Defaults to True for development, can be set to False in production
    reload_enabled = os.getenv("FASTAPI_RELOAD", "false").lower() in (
        "true",
        "1",
        "yes",
    )
    print("Reload enabled: ", reload_enabled)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=reload_enabled,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
