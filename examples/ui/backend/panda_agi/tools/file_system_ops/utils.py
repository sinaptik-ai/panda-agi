import asyncio
from typing import Any, Dict, List


async def _check_command_version(command: List[str], name: str) -> Dict[str, Any]:
    """Check if a command is available and get its version"""
    try:
        process = await asyncio.create_subprocess_exec(
            *command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=5.0)

            if process.returncode == 0:
                return {"installed": True, "version": stdout.decode().strip()}
            else:
                return {
                    "installed": False,
                    "error": f"Command failed with return code {process.returncode}",
                }

        except asyncio.TimeoutError:
            try:
                process.kill()
                await process.wait()
            except:
                pass
            return {"installed": False, "error": "Command timed out"}

    except FileNotFoundError:
        return {"installed": False, "error": f"{name} command not found"}
    except Exception as e:
        return {"installed": False, "error": str(e)}


async def _get_system_info() -> Dict[str, Any]:
    """Get system information including installed software"""
    # Define tools to check with their commands
    tools_to_check = [
        (["python", "--version"], "python"),
        (["node", "--version"], "node"),
        (["npm", "--version"], "npm"),
        (["git", "--version"], "git"),
        (["docker", "--version"], "docker"),
        (["pip", "--version"], "pip"),
    ]

    # Run all checks concurrently
    tasks = [_check_command_version(command, name) for command, name in tools_to_check]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Build system info dictionary
    system_info = {}

    # Add results from concurrent checks
    for i, (command, name) in enumerate(tools_to_check):
        result = results[i]
        if isinstance(result, Exception):
            system_info[name] = {"installed": False, "error": str(result)}
        else:
            system_info[name] = result

    return system_info
