from panda_agi.envs import E2BEnv
from panda_agi.envs.local_env import LocalEnv
import os
from typing import Dict, Any

WORKSPACE_PATH = os.getenv(
    "WORKSPACE_PATH", os.path.join(os.path.dirname(__file__), "workspace")
)


def get_env(metadata: Dict[str, Any] = None):
    env = os.getenv("ENV", "local")
    if env == "e2b":
        return E2BEnv("/workspace", metadata=metadata, timeout=300)

    print("Local environment", WORKSPACE_PATH)
    return LocalEnv(WORKSPACE_PATH, metadata)
