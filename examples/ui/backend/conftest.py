"""
Pytest configuration for the backend tests.
This file sets up the Python path and shared test fixtures.
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path so we can import services
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Add the parent directory to import panda_agi modules
parent_dir = backend_dir.parent.parent
sys.path.insert(0, str(parent_dir))
