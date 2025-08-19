"""
Markdown utility functions for converting markdown to PDF with embedded images.
"""

import logging
import re
import base64
import mimetypes
from pathlib import Path
from urllib.parse import urljoin
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


async def process_markdown_to_pdf(
    markdown_content: str,
    file_path: str,
    base_url: str,
    get_file_func,
    headers: dict = None,
) -> Optional[Tuple[bytes, str]]:
    """
    Convert markdown content to PDF with embedded base64 images.

    Args:
        markdown_content: The markdown content as string
        file_path: The file path for determining filename
        base_url: Base URL for resolving relative image paths
        get_file_func: Async function to fetch files (get_file_func(url, headers) -> bytes)
        headers: Headers to use for file requests

    Returns:
        Tuple of (pdf_bytes, pdf_filename) or None if conversion fails
    """
    try:
        import markdown
        import weasyprint

        # Function to fetch and convert images to base64
        async def fetch_and_convert_images_to_base64(
            md_content, base_url, get_file_func, headers
        ):
            """Replace relative image paths with base64 encoded images"""
            # Pattern to match markdown image syntax: ![alt](path)
            img_pattern = r"!\[([^\]]*)\]\(([^)]+)\)"

            async def replace_image(match):
                alt_text = match.group(1)
                img_path = match.group(2)

                # Skip if already data URL or absolute URL
                if img_path.startswith(("data:", "http://", "https://")):
                    return match.group(0)

                # Resolve relative path to absolute URL
                resolved_url = urljoin(base_url, img_path)

                try:
                    # Fetch the image using the provided function
                    img_bytes = await get_file_func(resolved_url, headers)

                    # Determine MIME type
                    img_mime_type, _ = mimetypes.guess_type(img_path)
                    if not img_mime_type:
                        img_mime_type = "image/png"

                    # Convert to base64
                    img_base64 = base64.b64encode(img_bytes).decode("utf-8")
                    data_url = f"data:{img_mime_type};base64,{img_base64}"

                    return f"![{alt_text}]({data_url})"
                except Exception as e:
                    logger.warning(f"Error fetching image {resolved_url}: {e}")
                    return match.group(0)

            # Use re.sub with async function
            result = md_content
            for match in re.finditer(img_pattern, md_content):
                replacement = await replace_image(match)
                result = result.replace(match.group(0), replacement)

            return result

        # Fetch and convert images to base64 in markdown content
        resolved_markdown = await fetch_and_convert_images_to_base64(
            markdown_content, base_url, get_file_func, headers
        )

        # Convert markdown to HTML
        html = markdown.markdown(
            resolved_markdown,
            extensions=["tables", "fenced_code", "toc", "codehilite"],
        )

        # Add CSS styling for better PDF appearance
        html_with_style = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{Path(file_path).stem}</title>
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    line-height: 1.6; 
                    margin: 40px; 
                    color: #333; 
                }}
                h1, h2, h3, h4, h5, h6 {{ 
                    color: #2c3e50; 
                    margin-top: 24px; 
                    margin-bottom: 16px; 
                }}
                h1 {{ 
                    border-bottom: 2px solid #eaecef; 
                    padding-bottom: 8px; 
                }}
                h2 {{ 
                    border-bottom: 1px solid #eaecef; 
                    padding-bottom: 4px; 
                }}
                code {{ 
                    background-color: #f6f8fa; 
                    padding: 2px 4px; 
                    border-radius: 3px; 
                    font-family: 'SFMono-Regular', Consolas, monospace; 
                }}
                pre {{ 
                    background-color: #f6f8fa; 
                    padding: 16px; 
                    border-radius: 6px; 
                    overflow-x: auto; 
                }}
                blockquote {{ 
                    border-left: 4px solid #dfe2e5; 
                    padding-left: 16px; 
                    margin-left: 0; 
                    color: #6a737d; 
                }}
                table {{ 
                    border-collapse: collapse; 
                    width: 100%; 
                    margin: 16px 0; 
                }}
                th, td {{ 
                    border: 1px solid #dfe2e5; 
                    padding: 8px 12px; 
                    text-align: left; 
                }}
                th {{ 
                    background-color: #f6f8fa; 
                    font-weight: 600; 
                }}
                a {{ 
                    color: #0366d6; 
                    text-decoration: none; 
                }}
                a:hover {{ 
                    text-decoration: underline; 
                }}
                img {{ 
                    max-width: 100%; 
                    height: auto; 
                    display: block; 
                    margin: 16px auto; 
                }}
            </style>
        </head>
        <body>
            {html}
        </body>
        </html>
        """

        # Convert HTML to PDF
        html_doc = weasyprint.HTML(string=html_with_style)
        pdf_bytes = html_doc.write_pdf()

        # Return PDF bytes and filename
        pdf_filename = f"{Path(file_path).stem}.pdf"
        return pdf_bytes, pdf_filename

    except ImportError as ie:
        logger.debug(f"Import error during PDF conversion: {ie}")
        return None
    except Exception as e:
        logger.debug(f"PDF conversion failed with error: {e}")
        return None
