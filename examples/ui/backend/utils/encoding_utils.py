"""
Encoding utilities for file handling.
"""

import logging
from charset_normalizer import from_bytes

logger = logging.getLogger("panda_agi_api")


def convert_bytes_to_utf8(content_bytes):
    """
    Convert bytes content to UTF-8 encoded bytes.

    Args:
        content_bytes (bytes): The bytes content to convert

    Returns:
        bytes: UTF-8 encoded content
    """
    # Detect encoding & get best guess
    results = from_bytes(content_bytes)
    best_guess = results.best()

    if best_guess is None:
        raise ValueError("Unable to detect encoding for provided bytes.")

    # Convert text back to UTF-8 bytes
    return best_guess.output(encoding="utf-8")
