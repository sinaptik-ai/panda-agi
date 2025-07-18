"""
Main entry point for the PandaAGI SDK API.
"""

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()

# Add parent directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

# Import routes
from routes import agent, auth, conversation, files, health

# Import middleware
from middleware.auth import AuthMiddleware

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

app = FastAPI(title="PandaAGI SDK API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=reload_enabled)
