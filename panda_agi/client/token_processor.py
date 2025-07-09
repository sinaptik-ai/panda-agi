import json
import logging
from typing import AsyncGenerator, Dict, List

logger = logging.getLogger("TokenProcessor")
logger.setLevel(logging.INFO)


class TokenProcessor:
    """Simple processor to collect and handle streaming tokens"""

    def __init__(self):
        self.collected_tokens: List[str] = []
        self.accumulated_content = ""

    def reset(self):
        """Reset the processor state"""
        self.collected_tokens.clear()
        self.accumulated_content = ""

    async def process_token_stream(
        self, token_stream: AsyncGenerator[str, None]
    ) -> AsyncGenerator[Dict[str, str], None]:
        """
        Process streaming tokens and yield processed events

        Args:
            token_stream: AsyncGenerator that yields raw tokens

        Yields:
            Dictionary events with token information
        """
        try:
            async for token in token_stream:
                # Collect the raw token
                self.collected_tokens.append(token)

                # Try to parse JSON if the token looks like JSON
                try:
                    token_data = json.loads(token)

                    # Extract content if it's a structured response
                    if isinstance(token_data, dict):
                        content = self._extract_content(token_data)
                        if content:
                            self.accumulated_content += content

                        # Yield structured event
                        yield {
                            "type": "token",
                            "raw_token": token,
                            "parsed_data": token_data,
                            "content": content,
                            "accumulated_content": self.accumulated_content,
                        }
                    else:
                        # Handle non-dict JSON data
                        self.accumulated_content += str(token_data)
                        yield {
                            "type": "token",
                            "raw_token": token,
                            "parsed_data": token_data,
                            "content": str(token_data),
                            "accumulated_content": self.accumulated_content,
                        }

                except json.JSONDecodeError:
                    # Handle plain text tokens
                    self.accumulated_content += token
                    yield {
                        "type": "token",
                        "raw_token": token,
                        "parsed_data": None,
                        "content": token,
                        "accumulated_content": self.accumulated_content,
                    }

        except Exception as e:
            logger.error(f"Error processing token stream: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "accumulated_content": self.accumulated_content,
            }

    def _extract_content(self, data: Dict) -> str:
        """Extract content from structured token data"""
        # Common patterns for extracting content from streaming responses
        if "choices" in data and isinstance(data["choices"], list) and data["choices"]:
            choice = data["choices"][0]
            if "delta" in choice and "content" in choice["delta"]:
                return choice["delta"]["content"] or ""

        if "content" in data:
            return str(data["content"])

        if "text" in data:
            return str(data["text"])

        return ""

    def get_collected_tokens(self) -> List[str]:
        """Get all collected tokens"""
        return self.collected_tokens.copy()

    def get_accumulated_content(self) -> str:
        """Get the accumulated content"""
        return self.accumulated_content

    def get_token_count(self) -> int:
        """Get the number of tokens collected"""
        return len(self.collected_tokens)
