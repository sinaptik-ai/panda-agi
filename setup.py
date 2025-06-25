from setuptools import setup, find_packages

setup(
    name="panda_agi",
    version="0.5.3",
    description="PandaAGI SDK - API for AGI",
    author="PandaAGI Team",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "websockets>=11.0.3",
        "pydantic>=2.0.0",
        "python-dotenv",
        "requests",
        "beautifulsoup4",
        "markdownify",
        "tavily-python",
        "pypdf",
    ],
) 