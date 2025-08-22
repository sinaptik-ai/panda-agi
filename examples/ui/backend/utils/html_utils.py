"""
HTML utilities for generating error pages and other HTML content.
"""

from typing import Optional


def generate_error_page_html(
    status_code: int, error_detail: str, title: Optional[str] = None
) -> str:
    """
    Generate a beautiful HTML error page with PandaAGI branding.

    Args:
        status_code: HTTP status code (e.g., 401, 404, 500)
        error_detail: Error message to display
        title: Optional custom title (defaults to "Oops! Something went wrong")

    Returns:
        str: Complete HTML page as string
    """
    # Default title based on status code
    if title is None:
        if status_code == 401:
            title = "Access Denied"
        elif status_code == 404:
            title = "Page Not Found"
        elif status_code == 500:
            title = "Oops! Something went wrong"
        else:
            title = "Oops! Something went wrong"

    return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Error - {status_code} | PandaAGI</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #2d3748;
        }}
        
        .error-container {{
            background: white;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 90%;
            border: 1px solid #e2e8f0;
        }}
        
        .panda-container {{
            margin-bottom: 30px;
            position: relative;
        }}
        
        .panda-icon {{
            font-size: 80px;
            display: inline-block;
            animation: bounce 2s infinite;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        }}
        
        @keyframes bounce {{
            0%, 20%, 50%, 80%, 100% {{
                transform: translateY(0);
            }}
            40% {{
                transform: translateY(-10px);
            }}
            60% {{
                transform: translateY(-5px);
            }}
        }}
        
        .brand {{
            margin-bottom: 20px;
        }}
        
        .brand-name {{
            font-size: 28px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 5px;
        }}
        
        .brand-tagline {{
            font-size: 14px;
            color: #718096;
            font-weight: 500;
        }}
        
        .error-status {{
            font-size: 72px;
            font-weight: 900;
            color: #e53e3e;
            margin-bottom: 10px;
        }}
        
        .error-title {{
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
        }}
        
        .error-message {{
            font-size: 16px;
            color: #4a5568;
            line-height: 1.6;
        }}
        
        @media (max-width: 480px) {{
            .error-container {{
                padding: 30px 20px;
            }}
            
            .panda-icon {{
                font-size: 60px;
            }}
            
            .error-status {{
                font-size: 56px;
            }}
            
            .brand-name {{
                font-size: 24px;
            }}
        }}
    </style>
</head>
<body>
    <div class="error-container">
        <div class="panda-container">
            <div class="panda-icon">🐼</div>
        </div>
        
        <div class="brand">
            <div class="brand-name">PandaAGI</div>
            <div class="brand-tagline">Agentic General Intelligence</div>
        </div>
        
        <div class="error-status">{status_code}</div>
        <h1 class="error-title">{title}</h1>
        <p class="error-message">{error_detail}</p>
    </div>
</body>
</html>"""


def should_return_html(accept_header: Optional[str]) -> bool:
    """
    Check if the request should return HTML based on the Accept header.

    Args:
        accept_header: The Accept header from the request

    Returns:
        bool: True if HTML should be returned, False otherwise
    """
    if not accept_header:
        return False

    return "text/html" in accept_header.lower()
