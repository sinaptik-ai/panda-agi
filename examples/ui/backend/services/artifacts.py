"""
Interact with environment and return relevant files
"""

import re
from typing import List, Set
from urllib.parse import urlparse

from .chat_env import get_env
from .files import FilesService
from panda_agi.envs.base_env import BaseEnv


class ArtifactsService:

    @staticmethod
    def get_main_html_file_from_url(url: str) -> str:
        """
        Extract the HTML file path from a website URL.

        Args:
            url: Website URL like http://localhost:3000, http://localhost:3000/dashboard.html, etc.

        Returns:
            The HTML file path (e.g., 'index.html', 'dashboard.html', 'test/index.html')
        """
        parsed_url = urlparse(url)
        path = parsed_url.path

        # Remove leading slash if present
        if path.startswith("/"):
            path = path[1:]

        # If path is empty or ends with '/', default to index.html
        if not path or path.endswith("/"):
            return "index.html"

        # If path doesn't have an extension, assume it's a directory and add index.html
        if "." not in path.split("/")[-1]:
            return f"{path}/index.html"

        # Return the path as is if it already has an extension
        return path

    @staticmethod
    def extract_asset_paths_from_content(content: str) -> Set[str]:
        """
        Extract asset paths from HTML and JS content.

        Args:
            content: HTML or JS content as string

        Returns:
            Set of relative asset paths
        """
        asset_paths = set()

        # Asset file extensions to look for
        asset_extensions = (
            ".png",
            ".jpg",
            ".jpeg",
            ".svg",
            ".gif",
            ".ico",
            ".woff",
            ".woff2",
            ".ttf",
            ".otf",
            ".eot",
            ".json",
            ".csv",
        )

        # Patterns to match asset references
        patterns = [
            # HTML img src
            r'src=["\']([^"\']*\.(?:png|jpg|jpeg|svg|gif|ico))["\']',
            # HTML link href (for fonts, favicons)
            r'href=["\']([^"\']*\.(?:woff|woff2|ttf|otf|eot|ico))["\']',
            # CSS background-image
            r'background-image:\s*url\(["\']?([^"\')\s]*\.(?:png|jpg|jpeg|svg|gif))["\']?\)',
            # CSS @font-face src
            r'src:\s*url\(["\']?([^"\')\s]*\.(?:woff|woff2|ttf|otf|eot))["\']?\)',
            # JavaScript dynamic imports or asset loading
            r'["\']([^"\']*\.(?:png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|otf|eot|json|csv))["\']',
            # Data attributes
            r'data-[^=]*=["\']([^"\']*\.(?:png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|otf|eot|json|csv))["\']',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                # Clean up the path
                path = match.strip()

                # Skip absolute URLs and data URIs
                if path.startswith(
                    ("http://", "https://", "//", "data:", "blob:")
                ) or path.startswith("/"):
                    continue

                # Remove query parameters and fragments
                path = path.split("?")[0].split("#")[0]

                # Remove ./ prefix if present
                if path.startswith("./"):
                    path = path[2:]

                # Only add if it's a valid asset path
                if path and any(path.lower().endswith(ext) for ext in asset_extensions):
                    asset_paths.add(path)

        return asset_paths

    @staticmethod
    async def get_files_for_artifact(type: str, filepath: str, conversation_id: str):

        env: BaseEnv = await get_env(
            {"conversation_id": conversation_id}, force_new=conversation_id is None
        )

        if type == "markdown":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_markdown(filepath, env):
                yield file_bytes, relative_path
        elif type == "iframe":
            async for (
                file_bytes,
                relative_path,
            ) in ArtifactsService.get_files_for_iframe(filepath, env):
                yield file_bytes, relative_path
        else:
            raise ValueError(f"Error: Unsupported creation type provided {type}")

    @staticmethod
    def extract_relative_paths_from_markdown(markdown_text: str) -> List[str]:
        # Match markdown links and images: ![alt](path) or [text](path)
        pattern = r"!?\[.*?\]\((.*?)\)"
        matches = re.findall(pattern, markdown_text)

        relative_paths = []
        for path in matches:
            # Clean up optional titles after space (e.g., [text](path "title"))
            cleaned_path = path.split()[0]

            # Check if it's a relative path
            if not cleaned_path.startswith(("http://", "https://", "/", "#")):
                # Remove ./ prefix if present
                if cleaned_path.startswith("./"):
                    cleaned_path = cleaned_path[2:]
                relative_paths.append(cleaned_path)

        return relative_paths

    @staticmethod
    async def get_files_for_markdown(filepath: str, env: BaseEnv):

        content_bytes, _ = await FilesService.get_file_from_env(filepath, env)

        markdown_text = content_bytes.decode("utf-8")
        yield content_bytes, filepath
        relative_paths = ArtifactsService.extract_relative_paths_from_markdown(
            markdown_text
        )

        for relative_path in relative_paths:
            content_bytes, _ = await FilesService.get_file_from_env(relative_path, env)
            yield content_bytes, relative_path

    @staticmethod
    async def get_files_for_iframe(filepath: str, env: BaseEnv):

        index_html_file_path = ArtifactsService.get_main_html_file_from_url(filepath)
        content_bytes, _ = await FilesService.get_file_from_env(
            index_html_file_path, env
        )
        html_content = content_bytes.decode("utf-8")
        yield content_bytes, index_html_file_path

        # Extract asset paths from the main HTML file
        asset_paths = ArtifactsService.extract_asset_paths_from_content(html_content)

        # Get all HTML, JS, and CSS files from env
        files = await env.list_files(recursive=True)
        for file in files["files"]:
            if file["type"] == "file" and file["name"].endswith(
                (".html", ".js", ".css")
            ):
                content_bytes, _ = await FilesService.get_file_from_env(
                    file["relative_path"], env
                )
                yield content_bytes, file["relative_path"]

                # Extract asset paths from HTML and JS files
                if file["name"].endswith((".html", ".js")):
                    file_content = content_bytes.decode("utf-8")
                    file_asset_paths = (
                        ArtifactsService.extract_asset_paths_from_content(file_content)
                    )
                    asset_paths.update(file_asset_paths)

        # Return all discovered assets
        for asset_path in asset_paths:
            try:
                content_bytes, _ = await FilesService.get_file_from_env(asset_path, env)
                yield content_bytes, asset_path
            except Exception:
                # Skip assets that don't exist in the environment
                continue
