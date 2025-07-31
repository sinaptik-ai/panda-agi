import asyncio

from panda_agi.envs import E2BEnv
from panda_agi.tools.file_system_ops.shell_ops import ShellOutput


async def deploy_nodejs_app():
    env = E2BEnv("/workspace", timeout=30)
    await env.create()
    assert env.sandbox is not None

    source_path = "/workspace"

    session_id = "nodejs_session"
    package_json_check = f"test -f {source_path}/package.json"
    result: ShellOutput = await env.exec_shell(
        command=package_json_check,
        session_id=session_id,
        blocking=True,
    )
    print(result)


async def main():
    await deploy_nodejs_app()


if __name__ == "__main__":
    asyncio.run(main())
