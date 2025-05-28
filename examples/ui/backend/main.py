import json
import os

# Import the agent and environment from the parent directory
import sys
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from panda_agi.client.agent import Agent
from panda_agi.envs import LocalEnv

app = FastAPI(title="Panda AGI SDK API", version="1.0.0")

# Create environment and agent
agent_env = LocalEnv("./workspace")
agent = Agent(environment=agent_env)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AgentQuery(BaseModel):
    query: str
    timeout: Optional[int] = None


async def event_stream(query: str, timeout: int = None) -> AsyncGenerator[str, None]:
    """Stream agent events as Server-Sent Events"""
    try:
        # Stream events
        async for event in agent.run(query, timeout=timeout):
            # Format as SSE
            yield f"data: {json.dumps(event)}\n\n"

    except Exception as e:
        # Send error event
        error_data = {"type": "error", "data": {"error": str(e)}}
        yield f"data: {json.dumps(error_data)}\n\n"

    finally:
        # Clean up
        if agent:
            try:
                await agent.disconnect()
            except Exception as e:
                print(f"Error disconnecting agent: {e}")


@app.post("/agent/run")
async def run_agent(query_data: AgentQuery):
    """Run an agent with the given query and stream events"""
    try:
        return StreamingResponse(
            event_stream(query_data.query, query_data.timeout),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Panda AGI SDK API",
        "version": "1.0.0",
        "endpoints": {
            "POST /agent/run": "Run an agent with streaming events",
            "GET /health": "Health check",
            "GET /": "This endpoint",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
