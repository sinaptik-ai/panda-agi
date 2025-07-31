import asyncio

from panda_agi.envs import DockerEnv


async def test_e2b_env():
    env = DockerEnv("./test_workspace")

    print("Echoing 'Hello, World!'")
    result = await env.exec_shell(command="echo 'Hello, World!'")
    print("Result:")
    print(result)


async def test_process_output():
    env = DockerEnv("./test_workspace")

    session_id = "test_session"

    print("Installing gradio")
    result = await env.exec_shell(
        "pip install gradio", session_id=session_id, blocking=False
    )
    print(result)

    print("Checking process output")
    output = await env.get_process_output(session_id=session_id, wait_seconds=5)
    print(output)

    print("Killing process")
    await env.kill_background_process(session_id=session_id)


async def test_write_to_process():
    env = DockerEnv("./test_workspace")

    session_id = "test_session"

    print("Run a command that requires user input")
    result = await env.exec_shell(
        command="read -p 'Press Enter to continue' ; echo 'Done'",
        session_id=session_id,
        blocking=False,
    )
    print(result)

    await asyncio.sleep(5)

    print("Write to process")
    output = await env.write_to_process(
        session_id=session_id, input_text="Enter", press_enter=True
    )
    print(output)

    print("Checking process output")
    output = await env.get_process_output(session_id=session_id, wait_seconds=5)
    print(output)

    await env.kill_background_process(session_id)


async def test_server():
    env = DockerEnv("./test_workspace")

    session_id = "server_session"

    print("Running a server")
    result = await env.exec_shell(
        command="python -m http.server 8080", session_id=session_id, blocking=False
    )
    print(result)

    print("Checking process output")
    output = await env.get_process_output(session_id=session_id, wait_seconds=5)
    print(output)

    session_id = "curl_session"

    print("Curl localhost:8080")
    result = await env.exec_shell(
        command="curl http://localhost:8080", session_id=session_id
    )
    print(result)

    print("Checking process output")
    output = await env.get_process_output(session_id=session_id, wait_seconds=5)
    print(output)

    await env.kill_background_process("server_session")


async def test_file_write():
    env = DockerEnv("./test_workspace")

    print("Writing a file")
    result = await env.write_file("hello.txt", "Hello from E2B sandbox!")
    print(result)

    print("Checking file content")
    output = await env.read_file("hello.txt")
    print(output)

    print("Deleting file")
    result = await env.exec_shell(
        command="rm -i hello.txt",
        session_id="test_session",
        blocking=False,
    )
    print(result)

    print("Checking process output")
    output = await env.get_process_output(session_id="test_session", wait_seconds=5)
    print(output)

    print("Writing y to process")
    output = await env.write_to_process(
        session_id="test_session", input_text="y", press_enter=True
    )
    print(output)

    print("Checking process output")
    output = await env.get_process_output(session_id="test_session", wait_seconds=5)
    print(output)

    await env.kill_background_process("test_session")

    # await env.delete_file("hello.txt")

    # print("Checking file content")
    # output = await env.read_file("hello.txt")
    # print(output)


async def main():
    await test_e2b_env()
    await test_process_output()
    await test_write_to_process()
    await test_server()
    await test_file_write()


if __name__ == "__main__":
    asyncio.run(main())
