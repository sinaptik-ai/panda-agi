"""
Utility functions and classes for pandaagi_train.
"""
from typing import Union, List
from ..conversation import Conversation
import os
import requests
import json
from .logger import ProxyLogger

logger = ProxyLogger(__name__, debug=False)


def is_openai_v0():
    """Get the OpenAI version and determine if it's v0.x or v1.x+"""
    try:
        import openai
        version_str = openai._version.__version__
        version_parts = version_str.split('.')
        version_major = int(version_parts[0]) if version_parts else 0
        
        # v0.x uses ChatCompletion class, v1.x+ uses chat.completions module
        is_openai_v0 = version_major == 0
        return is_openai_v0
    except (AttributeError, ValueError):
        # If we can't determine version from string, use feature detection
        return hasattr(openai, "ChatCompletion") and hasattr(openai.ChatCompletion, "create")

async def send_traces(traces: Union[Conversation, List[Conversation]]):
    """Send LLM trace data to the backend server.
    
    Args:
        traces: A single Conversation or a list of Conversation objects
    
    Returns:
        bool: True if successful, False otherwise
    """
    # Get API key from environment variable
    api_key = os.environ.get("PANDA_AGI_KEY")
    if not api_key:
        logger.warning("Warning: PANDA_AGI_KEY environment variable not set. Cannot send traces to backend.")
        return False
    
    # Get server URL from environment variable or use default
    server_url = os.environ.get("PANDA_AGI_SERVER", "https://agi-api.pandas-ai.com")
    backend_url = f"{server_url}/llm/trace"
    
    # Convert single trace to list if needed
    if isinstance(traces, Conversation):
        traces = [traces]
    
    # Prepare data for sending
    try:
        # Convert traces to JSON-serializable format
        trace_data = [json.loads(trace.json()) for trace in traces]
        
        # Set up headers with API key
        headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }
        
        # Send data to backend
        response = requests.post(
            backend_url,
            headers=headers,
            json=trace_data
        )
        
        # Check if request was successful
        if response.status_code == 200 or response.status_code == 201:
            logger.info("Trace sent successfully!")
            return True
        else:
            logger.error(f"Error sending traces to backend: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending traces to backend: {str(e)}")
        return False
