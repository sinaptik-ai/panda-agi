import os
from typing import Any, Dict, Optional

from panda_agi.envs import E2BEnv
from panda_agi.envs.local_env import LocalEnv

WORKSPACE_PATH = os.getenv("WORKSPACE_PATH", "./workspace")


async def get_env(metadata: Optional[Dict[str, Any]] = None, force_new: bool = False):
    env = os.getenv("ENV", "local")
    if env == "e2b":
        sandbox = None
        if not force_new:
            sandbox = await E2BEnv.get_active_sandbox(metadata)
            if sandbox:
                return E2BEnv(
                    "/workspace",
                    metadata=metadata,
                    timeout=1800,
                    sandbox=sandbox,
                )

        if not sandbox:
            sandbox = E2BEnv("/workspace", metadata=metadata, timeout=1800)
            await sandbox.create()

        return sandbox

    return LocalEnv(WORKSPACE_PATH, metadata)
