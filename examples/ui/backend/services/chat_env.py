from e2b.api.client.models import sandbox
from panda_agi.envs import E2BEnv
from panda_agi.envs.local_env import LocalEnv
import os
from typing import Dict, Any, Optional

WORKSPACE_PATH = os.getenv(
    "WORKSPACE_PATH", os.path.join(os.path.dirname(__file__), "workspace")
)


def get_env(metadata: Optional[Dict[str, Any]] = None, force_new: bool = False):
    env = os.getenv("ENV", "local")
    if env == "e2b":
        sandbox = None
        if not force_new:
            sandbox = E2BEnv.get_active_sandbox(metadata)
            if sandbox:
                return E2BEnv(
                    "/workspace",
                    metadata=metadata,
                    timeout=1800,
                    sandbox=sandbox,
                )

        if not sandbox:
            sandbox = E2BEnv("/workspace", metadata=metadata, timeout=1800)

        return sandbox

    return LocalEnv(WORKSPACE_PATH, metadata)
