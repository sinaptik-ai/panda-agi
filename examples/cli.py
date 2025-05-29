import argparse
import asyncio
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from rich.box import DOUBLE, HEAVY, ROUNDED
from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.prompt import Prompt
from rich.rule import Rule
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text

from panda_agi import Agent
from panda_agi.client.models import EventType, MessageStatus
from panda_agi.envs import LocalEnv

# Status-specific styling for events
STATUS_STYLES = {
    MessageStatus.PENDING.value: {
        "color": "yellow",
        "icon": "⏳",
        "label": "PENDING"
    },
    MessageStatus.SUCCESS.value: {
        "color": "bright_green",
        "icon": "✅",
        "label": "SUCCESS"
    },
    MessageStatus.ERROR.value: {
        "color": "red",
        "icon": "❌",
        "label": "ERROR"
    },
    # Default status style for unknown statuses
    "default": {
        "color": "white",
        "icon": "🔄",
        "label": "UNKNOWN"
    }
}

# Enhanced event type styles with comprehensive visual configuration
EVENT_STYLES = {
    # System events
    EventType.AGENT_CONNECTION_SUCCESS.value: {
        "color": "bright_green",
        "icon": "🔗",
        "title": "Connection Established",
        "category": "system",
        "priority": "high",
        "box": ROUNDED,
    },
    EventType.COMPLETED_TASK.value: {
        "color": "bright_green",
        "icon": "🎯",
        "title": "Task Completed",
        "category": "system",
        "priority": "high",
        "box": HEAVY,
    },
    # User interaction events
    EventType.USER_NOTIFICATION.value: {
        "color": "cyan",
        "icon": "💬",
        "title": "User Notification",
        "category": "user",
        "priority": "high",
        "box": ROUNDED,
    },
    EventType.USER_QUESTION.value: {
        "color": "yellow",
        "icon": "❓",
        "title": "User Question",
        "category": "user",
        "priority": "high",
        "box": ROUNDED,
    },
    # Web operations
    EventType.WEB_SEARCH.value: {
        "color": "magenta",
        "icon": "🔍",
        "title": "Web Search",
        "category": "web",
        "priority": "medium",
        "box": ROUNDED,
    },
    EventType.WEB_SEARCH_RESULT.value: {
        "color": "magenta",
        "icon": "📊",
        "title": "Web Search Results",
        "category": "web",
        "priority": "medium",
        "box": ROUNDED,
    },
    EventType.WEB_NAVIGATION.value: {
        "color": "blue",
        "icon": "🌐",
        "title": "Web Navigation",
        "category": "web",
        "priority": "medium",
        "box": ROUNDED,
    },
    EventType.WEB_NAVIGATION_RESULT.value: {
        "color": "blue",
        "icon": "📄",
        "title": "Web Page Content",
        "category": "web",
        "priority": "medium",
        "box": ROUNDED,
    },
    # File operations
    EventType.FILE_READ.value: {
        "color": "cyan",
        "icon": "📖",
        "title": "File Read",
        "category": "file",
        "priority": "low",
        "box": ROUNDED,
    },
    EventType.FILE_WRITE.value: {
        "color": "yellow",
        "icon": "✏️",
        "title": "File Write",
        "category": "file",
        "priority": "medium",
        "box": ROUNDED,
    },
    EventType.FILE_REPLACE.value: {
        "color": "orange3",
        "icon": "🔄",
        "title": "File Replace",
        "category": "file",
        "priority": "medium",
        "box": ROUNDED,
    },
    EventType.FILE_FIND.value: {
        "color": "bright_cyan",
        "icon": "🔎",
        "title": "Find in Files",
        "category": "file",
        "priority": "low",
        "box": ROUNDED,
    },
    EventType.FILE_EXPLORE.value: {
        "color": "bright_blue",
        "icon": "📂",
        "title": "Explore Directory",
        "category": "file",
        "priority": "low",
        "box": ROUNDED,
    },
    # Image operations
    EventType.IMAGE_GENERATION.value: {
        "color": "magenta",
        "icon": "🎨",
        "title": "Image Generation",
        "category": "image",
        "priority": "medium",
        "box": ROUNDED,
    },
    # Shell operations
    EventType.SHELL_EXEC.value: {
        "color": "bright_black",
        "icon": "💻",
        "title": "Shell Execute",
        "category": "shell",
        "priority": "medium",
        "box": ROUNDED,
    },
    EventType.SHELL_VIEW.value: {
        "color": "white",
        "icon": "👁️",
        "title": "View Output",
        "category": "shell",
        "priority": "low",
        "box": ROUNDED,
    },
    EventType.SHELL_WRITE.value: {
        "color": "yellow",
        "icon": "⌨️",
        "title": "Write to Process",
        "category": "shell",
        "priority": "medium",
        "box": ROUNDED,
    },
    # Error handling
    "error": {
        "color": "red",
        "icon": "❌",
        "title": "Error",
        "category": "error",
        "priority": "high",
        "box": HEAVY,
    },
}

# Category colors for grouping and statistics
CATEGORY_COLORS = {
    "system": "bright_green",
    "user": "cyan",
    "agent": "bright_blue",
    "web": "magenta",
    "file": "yellow",
    "shell": "white",
    "image": "purple",
    "error": "red",
}


class UserMessaging:
    """Enhanced user messaging system with attachment support"""

    def __init__(self, console: Console):
        self.console = console

    def send_message(self, message: str, attachments: Optional[List[str]] = None):
        """Send a formatted message with optional attachments"""
        message_panel = Panel(
            message,
            title="[bold blue]💬 Message[/]",
            border_style="blue",
            padding=(1, 2),
            box=ROUNDED,
            expand=False,
        )

        if attachments:
            attachments_text = Text(
                "\n".join(f"• {attachment}" for attachment in attachments)
            )
            attachments_panel = Panel(
                attachments_text,
                title="[bold green]📎 Attachments[/]",
                border_style="green",
                padding=(1, 2),
                box=ROUNDED,
                style="dim",
            )

            self.console.print(
                Panel(
                    Group(message_panel, "\n", attachments_panel),
                    border_style="blue",
                    box=ROUNDED,
                    padding=0,
                )
            )
        else:
            self.console.print(message_panel)

    def send_tool(self, tool_name: str, tool_params: dict[str, Any]):
        """Display tool call information with syntax highlighting"""
        tool_header = Text.assemble(
            ("🛠️ ", "bold"), (f"{tool_name}", "bold cyan"), (" was called", "dim")
        )

        params_str = json.dumps(tool_params, indent=2, ensure_ascii=False)
        params_syntax = Syntax(
            params_str,
            "json",
            theme="monokai",
            line_numbers=False,
            word_wrap=True,
            background_color="default",
        )

        self.console.print(
            Panel(
                params_syntax,
                title=tool_header,
                border_style="green",
                padding=(1, 2),
                box=ROUNDED,
                title_align="left",
            )
        )

    def send_knowledge(self, knowledge: str):
        """Display knowledge base information"""
        knowledge_header = Text.assemble(
            ("📚 ", "bold"), ("Knowledge", "bold cyan"), (" was called", "dim")
        )

        self.console.print(
            Panel(
                knowledge,
                title=knowledge_header,
                border_style="purple",
                padding=(1, 2),
                box=ROUNDED,
                title_align="left",
            )
        )


class EnhancedEventRenderer:
    """Advanced event renderer with comprehensive categorization and styling"""

    def __init__(
        self, console: Console, compact: bool = False, show_timestamps: bool = True
    ):
        self.console = console
        self.compact = compact
        self.show_timestamps = show_timestamps
        self.event_counter = 0

    def get_timestamp(self) -> str:
        """Get formatted timestamp"""
        return datetime.now().strftime("%H:%M:%S")

    def get_event_style(self, event_data: Dict[str, Any]) -> Dict[str, str]:
        """Get styling information for an event"""
        event_type = event_data.get("type", "default")
        return EVENT_STYLES.get(
            event_type,
            {
                "color": "white",
                "icon": "📋",
                "title": "Event",
                "category": "other",
                "priority": "low",
                "box": ROUNDED,
            },
        )
        
    def get_status_style(self, status: str) -> Dict[str, str]:
        """Get styling information for a status"""
        return STATUS_STYLES.get(status, STATUS_STYLES["default"])

    def should_render_event(self, event_data: Dict[str, Any]) -> bool:
        """Check if event should be rendered"""
        event_type = event_data.get("type", "default")
        
        # Skip redundant events
        if event_type == EventType.WEB_NAVIGATION.value:
            # Skip WEB_NAVIGATION since WEB_NAVIGATION_RESULT provides the same info + content
            return False
            
        # Skip task completion events - user doesn't want to see them
        if event_type == EventType.COMPLETED_TASK.value:
            return False
            
        return event_type != "default" and event_type in EVENT_STYLES

    def create_event_header(
        self, style_info: Dict[str, str], event_number: int, status: Optional[str] = None
    ) -> Text:
        """Create a rich header for events with numbering, categorization, and status"""
        header = Text()

        if self.show_timestamps:
            timestamp = self.get_timestamp()
            header.append(f"[{timestamp}] ", style="dim white")

        header.append(f"#{event_number:03d} ", style="dim white")
        header.append(f"{style_info['icon']} ", style=style_info["color"])
        header.append(f"{style_info['title']}", style=f"bold {style_info['color']}")

        # Add category badge
        category = style_info.get("category", "other")
        if category != "other":
            header.append(
                f" [{category.upper()}]",
                style=f"dim {CATEGORY_COLORS.get(category, 'white')}",
            )
            
        # Add status badge if provided
        if status:
            status_style = self.get_status_style(status)
            header.append(
                f" {status_style['icon']} [{status_style['label']}]",
                style=f"bold {status_style['color']}",
            )

        return header

    def truncate_text(self, text: str, max_length: int = 100) -> str:
        """Truncate text with ellipsis if too long"""
        if not text or not isinstance(text, str):
            return str(text) if text is not None else ""
        if len(text) <= max_length:
            return text
        return text[: max_length - 3] + "..."

    def render_connection_success(
        self, payload: Dict[str, Any], style_info: Dict[str, str]
    ) -> Panel:
        """Render connection success event"""
        self.event_counter += 1

        content = Text()
        content.append(
            "✅ Successfully connected to agent server\n", style="bold bright_green"
        )

        if payload.get("request_file_system"):
            content.append(
                "🔍 Requesting file system structure...", style="dim bright_green"
            )

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style=style_info["color"],
            box=style_info.get("box", ROUNDED),
            padding=(1, 2),
            title_align="left",
        )

    def render_user_input_event(
        self, payload: Dict[str, Any], style_info: Dict[str, str]
    ) -> Panel:
        """Render user input with special highlighting and attachment support"""
        self.event_counter += 1

        message = payload.get("text", payload.get("message", "No message"))

        content = Text()
        content.append("💭 User Input:\n", style="bold cyan")
        content.append(message, style="white")

        # Add attachments if present
        if payload.get("attachments"):
            content.append("\n\n📎 Attachments:\n", style="bold cyan")
            for attachment in payload["attachments"]:
                content.append(f"  • {attachment}\n", style="dim cyan")

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style=style_info["color"],
            box=style_info.get("box", ROUNDED),
            padding=(1, 2),
            title_align="left",
        )

    def render_completed_task(
        self, payload: Dict[str, Any], style_info: Dict[str, str]
    ) -> Panel:
        """Render task completion with comprehensive result display"""
        self.event_counter += 1

        content = Text()
        content.append("🎉 Task completed successfully!", style="bold bright_green")

        if payload.get("result"):
            content.append(f"\nResult: {payload['result']}", style="bright_green")
        if payload.get("message"):
            content.append(f"\nMessage: {payload['message']}", style="bright_green")
        if payload.get("text"):
            content.append(f"\nDetails: {payload['text']}", style="bright_green")

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style=style_info["color"],
            box=style_info.get("box", HEAVY),
            padding=(0, 1),
            title_align="left",
        )

    def render_agent_request(
        self, payload: Dict[str, Any], style_info: Dict[str, str]
    ) -> Panel:
        """Render agent request with query and conversation details"""
        self.event_counter += 1

        content = Text()
        query = payload.get("query", "No query provided")

        content.append("🤖 Agent Query:\n", style="bold bright_blue")
        content.append(query, style="bright_blue")

        if payload.get("conversation_id"):
            content.append(
                f"\n💬 Conversation: {payload['conversation_id']}",
                style="dim bright_blue",
            )

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style=style_info["color"],
            box=style_info.get("box", ROUNDED),
            padding=(1, 2),
            title_align="left",
        )

    def render_tool_operation(
        self, payload: Dict[str, Any], style_info: Dict[str, str], event_type: str
    ) -> Panel:
        """Render comprehensive tool operations with operation-specific formatting"""
        self.event_counter += 1

        content = Text()
        color = style_info["color"]
        
        # Handle list payloads (like web search results)
        if isinstance(payload, list):
            if event_type == EventType.WEB_SEARCH_RESULT.value:
                content.append("🔍 Search Results:\n", style=f"bold {color}")
                for i, result in enumerate(payload[:5]):  # Show first 5 results
                    if isinstance(result, dict):
                        title = result.get("title", "No title")
                        url = result.get("url", "No URL")
                        content.append(f"  {i+1}. {title}\n", style=color)
                        content.append(f"     {url}\n", style=f"dim {color}")
                if len(payload) > 5:
                    content.append(f"  ... and {len(payload) - 5} more results\n", style=f"dim {color}")
            else:
                content.append(f"📋 Results ({len(payload)} items):\n", style=f"bold {color}")
                for i, item in enumerate(payload[:3]):  # Show first 3 items
                    content.append(f"  {i+1}. {str(item)[:50]}...\n", style=f"dim {color}")
                if len(payload) > 3:
                    content.append(f"  ... and {len(payload) - 3} more items\n", style=f"dim {color}")
        else:
            # Handle dictionary payloads (existing logic)
            status = payload.get("status") if isinstance(payload, dict) else None

            # File operations
            if payload.get("file"):
                content.append("📄 File: ", style=f"bold {color}")
                content.append(f"{payload['file']}\n", style=color)

            if payload.get("path"):
                content.append("📁 Path: ", style=f"bold {color}")
                content.append(f"{payload['path']}\n", style=color)

            # Web operations
            if payload.get("url"):
                content.append("🌐 URL: ", style=f"bold {color}")
                content.append(f"{payload['url']}\n", style=color)

            if payload.get("query"):
                content.append("🔍 Query: ", style=f"bold {color}")
                content.append(f"{payload['query']}\n", style=color)

            # Shell operations
            if payload.get("command"):
                content.append("💻 Command: ", style=f"bold {color}")
                content.append(f"{payload['command']}\n", style=color)

            if payload.get("id") and event_type.startswith("shell_"):
                content.append("🆔 Session: ", style=f"bold {color}")
                content.append(f"{payload['id']}\n", style=color)

            # Image generation
            if payload.get("prompt") and event_type == "generate_image":
                content.append("🎨 Prompt: ", style=f"bold {color}")
                content.append(
                    f"{self.truncate_text(str(payload['prompt']), 80)}\n", style=color
                )

            if payload.get("filename") and event_type == "generate_image":
                content.append("📁 Filename: ", style=f"bold {color}")
                content.append(f"{payload['filename']}\n", style=color)

            # Content operations
            if payload.get("content") and event_type in ["file_write", "file_replace"]:
                content.append("📝 Content Preview: ", style=f"bold {color}")
                preview = self.truncate_text(str(payload["content"]), 60)
                content.append(f"{preview}\n", style=f"dim {color}")

            # Replace operations
            if payload.get("old_str") and payload.get("new_str"):
                content.append("🔄 Replace: ", style=f"bold {color}")
                old_str = self.truncate_text(str(payload["old_str"]), 30)
                new_str = self.truncate_text(str(payload["new_str"]), 30)
                content.append(f'"{old_str}" → "{new_str}"\n', style=color)

            # Search patterns
            if (
                payload.get("regex")
                or payload.get("pattern")
                or payload.get("glob_pattern")
            ):
                pattern = (
                    payload.get("regex")
                    or payload.get("pattern")
                    or payload.get("glob_pattern")
                )
                content.append("🔎 Pattern: ", style=f"bold {color}")
                content.append(f"{pattern}\n", style=color)

            # Planning operations
            if event_type == "planning":
                plan_content = payload.get(
                    "reasoning", payload.get("plan", "Planning in progress...")
                )
                content.append("🧠 Agent Planning:\n", style=f"bold {color}")
                content.append(plan_content, style=color)

            # Fallback for empty content
            if not content.plain.strip():
                if payload:
                    content.append("📋 Operation Details:\n", style=f"bold {color}")
                    content.append(json.dumps(payload, indent=2), style=f"dim {color}")
                else:
                    content.append("Operation in progress...", style=f"dim {color}")

            # Add status information if present
            if status:
                status_style = self.get_status_style(status)
                content.append(f"\n{status_style['icon']} Status: {status_style['label']}", 
                              style=f"bold {status_style['color']}")

        header = self.create_event_header(style_info, self.event_counter)
        
        # Adjust border style based on status if present for dictionary payloads
        border_style = style_info["color"]
        if isinstance(payload, dict):
            status = payload.get("status")
            if status:
                status_style = self.get_status_style(status)
                # For error status, use the error color for border
                if status == MessageStatus.ERROR.value:
                    border_style = status_style["color"]

        return Panel(
            content,
            title=header,
            border_style=border_style,
            box=style_info.get("box", ROUNDED),
            padding=(1, 2),
            title_align="left",
        )

    def render_error_event(
        self, payload: Dict[str, Any], style_info: Dict[str, str]
    ) -> Panel:
        """Render error events with comprehensive error information"""
        self.event_counter += 1

        content = Text()
        content.append("🚨 ERROR OCCURRED\n\n", style="bold red")

        error_msg = payload.get("error", payload.get("message", "Unknown error"))
        content.append(f"Error: {error_msg}\n", style="red")

        if payload.get("details"):
            content.append(f"\nDetails: {payload['details']}\n", style="dim red")

        if payload.get("traceback"):
            content.append(f"\nTraceback:\n{payload['traceback']}", style="dim red")

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style="red",
            box=HEAVY,
            padding=(1, 2),
            title_align="left",
        )

    def render_generic_event(
        self, payload: Dict[str, Any], style_info: Dict[str, str]
    ) -> Panel:
        """Render generic events with JSON formatting"""
        self.event_counter += 1

        if not payload:
            content = Text("No data available", style="dim")
        elif self.compact and len(str(payload)) > 200:
            content = Text(f"<{len(str(payload))} characters of data>", style="dim")
        else:
            params_str = json.dumps(payload, indent=2, ensure_ascii=False)
            content = Syntax(
                params_str,
                "json",
                theme="monokai",
                line_numbers=False,
                word_wrap=True,
                background_color="default",
            )

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style=style_info["color"],
            box=style_info.get("box", ROUNDED),
            padding=(1, 2),
            title_align="left",
        )

    def render_event(self, event: Dict[str, Any]) -> Optional[Panel]:
        """Main event rendering method with comprehensive error handling"""
        if not event or not isinstance(event, dict):
            return Panel(
                Text("Invalid event data", style="red"),
                title="⚠️ Error",
                border_style="red",
                box=ROUNDED,
            )

        data = event.get("data", {}) or {}
        event_type = data.get("type", "default")
        
        # Extract status if present
        status = data.get("status")

        # Skip rendering default events
        if not self.should_render_event(data):
            return None

        style_info = self.get_event_style(data)
        payload = data.get("payload", {}) or {}
        
        # Add status to payload if present in the event data
        if status:
            payload["status"] = status

        try:
            # Route to specific renderers based on event type
            if event_type == EventType.AGENT_CONNECTION_SUCCESS.value:
                return self.render_connection_success(payload, style_info)

            elif event_type in [EventType.USER_NOTIFICATION.value, EventType.USER_QUESTION.value]:
                return self.render_user_input_event(payload, style_info)

            elif event_type == EventType.COMPLETED_TASK.value:
                return self.render_completed_task(payload, style_info)

            elif event_type == "error":
                return self.render_error_event(payload, style_info)

            # Handle tool operations
            elif event_type in [
                # Web operations
                EventType.WEB_SEARCH.value,
                EventType.WEB_SEARCH_RESULT.value,
                EventType.WEB_NAVIGATION.value,
                EventType.WEB_NAVIGATION_RESULT.value,
                # File operations
                EventType.FILE_READ.value,
                EventType.FILE_WRITE.value,
                EventType.FILE_REPLACE.value,
                EventType.FILE_FIND.value,
                EventType.FILE_EXPLORE.value,
                # Shell operations
                EventType.SHELL_EXEC.value,
                EventType.SHELL_VIEW.value,
                EventType.SHELL_WRITE.value,
                # Image operations
                EventType.IMAGE_GENERATION.value,
            ]:
                return self.render_tool_operation(payload, style_info, event_type)

            else:
                return self.render_generic_event(payload, style_info)

        except Exception as e:
            # Fallback for any rendering errors
            return Panel(
                Text(f"Error rendering event: {str(e)}", style="red"),
                title="⚠️ Render Error",
                border_style="red",
                box=ROUNDED,
            )


class EnhancedAgentCLI:
    """Enhanced Agent CLI with comprehensive features and improved user experience"""

    def __init__(
        self,
        workspace_path: str = "./my_agent_workspace",
        verbose: bool = False,
        compact: bool = False,
        panel_width: int = 120,
        show_timestamps: bool = True,
    ):
        # Use the smaller of the requested width or actual terminal width
        import shutil
        terminal_width = shutil.get_terminal_size().columns
        actual_width = min(panel_width, terminal_width) if terminal_width > 0 else panel_width
        
        self.console = Console(
            width=actual_width, 
            legacy_windows=False,
            force_terminal=True
        )
        self.messaging = UserMessaging(self.console)
        self.workspace_path = os.path.abspath(workspace_path)
        self.verbose = verbose
        self.compact = compact
        self.panel_width = panel_width
        self.show_timestamps = show_timestamps
        self.agent = None
        self.event_history: List[Dict[str, Any]] = []
        self.session_stats = {
            "events_processed": 0,
            "user_messages": 0,
            "agent_operations": 0,
            "errors": 0,
            "start_time": datetime.now(),
        }

        # Enhanced progress display
        self.progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TimeElapsedColumn(),
            console=self.console,
            transient=True,
        )

        # Event renderer
        self.event_renderer = EnhancedEventRenderer(
            self.console, compact=compact, show_timestamps=show_timestamps
        )

        # Create workspace directory if it doesn't exist
        os.makedirs(self.workspace_path, exist_ok=True)

    def create_welcome_screen(self) -> Panel:
        """Create an enhanced welcome screen with feature overview"""
        welcome_text = Text()
        welcome_text.append(
            "🤖 Enhanced Agent CLI Interface\n\n", style="bold bright_blue"
        )
        welcome_text.append("Features:\n", style="bold yellow")
        welcome_text.append(
            "  • Real-time event streaming with timestamps\n", style="white"
        )
        welcome_text.append(
            "  • Categorized operation display with icons\n", style="white"
        )
        welcome_text.append(
            "  • Enhanced visual feedback and progress tracking\n", style="white"
        )
        welcome_text.append(
            "  • Session statistics and history tracking\n", style="white"
        )
        welcome_text.append(
            "  • Comprehensive error handling and debugging\n", style="white"
        )
        welcome_text.append(
            "  • User messaging with attachment support\n", style="white"
        )

        return Panel(
            welcome_text,
            title="🚀 Welcome",
            border_style="bright_blue",
            box=ROUNDED,
            padding=(1, 2),
        )

    def create_status_panel(self) -> Panel:
        """Create an enhanced status panel with comprehensive session information"""
        now = datetime.now()
        session_duration = now - self.session_stats["start_time"]
        hours, remainder = divmod(session_duration.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)

        status_table = Table(show_header=False, box=None, padding=(0, 1))
        status_table.add_column("Metric")
        status_table.add_column("Value")

        status_table.add_row(
            Text("Session Duration", style="bright_blue"),
            Text(f"{int(hours)}h {int(minutes)}m {int(seconds)}s", style="white"),
        )
        status_table.add_row(
            Text("Events Processed", style="bright_blue"),
            Text(f"{self.session_stats['events_processed']}", style="white"),
        )
        status_table.add_row(
            Text("User Messages", style="bright_blue"),
            Text(f"{self.session_stats['user_messages']}", style="cyan"),
        )
        status_table.add_row(
            Text("Agent Operations", style="bright_blue"),
            Text(f"{self.session_stats['agent_operations']}", style="yellow"),
        )
        
        # Add status-specific counts if we start tracking them
        pending_count = sum(1 for event in self.event_history if event.get("status") == MessageStatus.PENDING.value)
        success_count = sum(1 for event in self.event_history if event.get("status") == MessageStatus.SUCCESS.value)
        error_count = self.session_stats["errors"]
        
        status_table.add_row(
            Text("Pending Operations", style="bright_blue"),
            Text(f"{pending_count}", style="yellow"),
        )
        status_table.add_row(
            Text("Successful Operations", style="bright_blue"),
            Text(f"{success_count}", style="bright_green"),
        )
        status_table.add_row(
            Text("Errors", style="bright_blue"),
            Text(f"{error_count}", style="red"),
        )

        return Panel(
            status_table,
            title="📊 Session Statistics",
            border_style="bright_blue",
            box=ROUNDED,
            padding=(1, 2),
        )

    def create_help_panel(self) -> Panel:
        """Create a comprehensive help panel with all available commands"""
        help_text = Text()
        help_text.append("Available commands:\n", style="bold yellow")

        commands = [
            ("Type your request and press Enter", "Send a request to the agent"),
            ("'exit', 'quit', or 'q'", "Quit the CLI"),
            ("'help'", "Show this help"),
            ("'status'", "Show current status and statistics"),
            ("'clear'", "Clear the screen"),
            ("'history'", "Show event history summary"),
            ("'stats'", "Show detailed session statistics"),
            ("'reset'", "Reset session statistics"),
        ]

        for cmd, desc in commands:
            help_text.append("• ", style="yellow")
            help_text.append(f"{cmd}", style="bold white")
            help_text.append(f" - {desc}\n", style="dim white")

        return Panel(help_text, title="❓ Help", border_style="yellow", box=ROUNDED)

    def create_history_summary(self) -> Panel:
        """Create a comprehensive summary of event history by category"""
        if not self.event_history:
            return Panel(
                Text("No events in history yet", style="dim white"),
                title="📜 Event History",
                border_style="blue",
                box=ROUNDED,
            )

        # Count events by category
        category_counts = {}
        for event in self.event_history:
            data = event.get("data", {})
            event_type = data.get("type", "unknown")
            style_info = self.event_renderer.get_event_style(data)
            category = style_info.get("category", "other")
            category_counts[category] = category_counts.get(category, 0) + 1

        table = Table(show_header=True, header_style="bold blue")
        table.add_column("Category", style="cyan")
        table.add_column("Count", justify="right", style="white")
        table.add_column("Icon", justify="center")

        category_icons = {
            "system": "⚙️",
            "user": "👤",
            "agent": "🤖",
            "web": "🌐",
            "file": "📁",
            "shell": "💻",
            "image": "🎨",
            "error": "❌",
        }

        for category, count in sorted(category_counts.items()):
            icon = category_icons.get(category, "🔧")
            table.add_row(category.title(), str(count), icon)

        return Panel(
            table,
            title="📜 Event History Summary",
            border_style="blue",
            box=ROUNDED,
        )

    async def handle_special_commands(self, query: str) -> bool:
        """Handle special CLI commands with enhanced functionality"""
        query_lower = query.lower().strip()

        if query_lower == "help":
            self.console.print(self.create_help_panel())
            return True
        elif query_lower == "status":
            self.console.print(self.create_status_panel())
            return True
        elif query_lower == "clear":
            self.console.clear()
            self.console.print(Rule("[bold blue]🤖 Enhanced Agent CLI[/bold blue]"))
            self.console.print(self.create_welcome_screen())
            self.console.print(self.create_status_panel())
            return True
        elif query_lower == "history":
            self.console.print(self.create_history_summary())
            return True
        elif query_lower == "stats":
            # Show detailed statistics
            stats_table = Table(show_header=True, header_style="bold green")
            stats_table.add_column("Metric", style="cyan")
            stats_table.add_column("Value", justify="right", style="white")

            runtime = datetime.now() - self.session_stats["start_time"]
            stats_table.add_row("Session Runtime", str(runtime).split(".")[0])
            stats_table.add_row(
                "Total Events", str(self.session_stats["events_processed"])
            )
            stats_table.add_row(
                "User Messages", str(self.session_stats["user_messages"])
            )
            stats_table.add_row(
                "Agent Operations", str(self.session_stats["agent_operations"])
            )
            stats_table.add_row("Errors Encountered", str(self.session_stats["errors"]))

            if self.session_stats["events_processed"] > 0:
                avg_per_min = self.session_stats["events_processed"] / max(
                    runtime.total_seconds() / 60, 1
                )
                stats_table.add_row("Events/Minute", f"{avg_per_min:.1f}")

            self.console.print(
                Panel(
                    stats_table,
                    title="📊 Detailed Session Statistics",
                    border_style="green",
                    box=ROUNDED,
                )
            )
            return True
        elif query_lower == "reset":
            # Reset session statistics
            self.session_stats = {
                "events_processed": 0,
                "user_messages": 0,
                "agent_operations": 0,
                "errors": 0,
                "start_time": datetime.now(),
            }
            self.event_history = []
            self.event_renderer.event_counter = 0

            self.console.print(
                Panel(
                    Text(
                        "✅ Session statistics reset successfully", style="bold green"
                    ),
                    title="🔄 Reset Complete",
                    border_style="green",
                    box=ROUNDED,
                )
            )
            return True

        return False

    def update_session_stats(self, event_type: str, status: Optional[str] = None):
        """Update session statistics based on event type and status"""
        self.session_stats["events_processed"] += 1

        # User messages
        if event_type in [EventType.USER_NOTIFICATION.value, EventType.USER_QUESTION.value]:
            self.session_stats["user_messages"] += 1
        
        # Agent operations
        elif event_type in [
            # Web operations
            EventType.WEB_SEARCH.value,
            EventType.WEB_SEARCH_RESULT.value,
            EventType.WEB_NAVIGATION.value,
            EventType.WEB_NAVIGATION_RESULT.value,
            # File operations
            EventType.FILE_READ.value,
            EventType.FILE_WRITE.value,
            EventType.FILE_REPLACE.value,
            EventType.FILE_FIND.value,
            EventType.FILE_EXPLORE.value,
            # Shell operations
            EventType.SHELL_EXEC.value,
            EventType.SHELL_VIEW.value,
            EventType.SHELL_WRITE.value,
            # Image operations
            EventType.IMAGE_GENERATION.value,
        ]:
            self.session_stats["agent_operations"] += 1
        
        # Count errors based on either event type or status
        if event_type == "error" or status == MessageStatus.ERROR.value:
            self.session_stats["errors"] += 1

    async def start_interactive_session(self, conversation_id: Optional[str] = None):
        """Start an enhanced interactive session with comprehensive error handling"""
        self.console.print(self.create_welcome_screen())

        # Initialize the agent with the workspace path
        env = LocalEnv(base_path=self.workspace_path)
        self.agent = Agent(environment=env)

        # Connect to the agent and start the session
        try:
            while True:
                # Enhanced input prompt with better formatting
                self.console.print(Rule("[bold blue]💬 Enter your request[/bold blue]"))
                try:
                    query = Prompt.ask("\n[bold yellow]User[/bold yellow]", default="")
                    
                    if query.lower().strip() in ["exit", "quit", "q"]:
                        break
                    
                    if not query.strip():
                        continue
                except (EOFError, KeyboardInterrupt):
                    self.console.print("\n[yellow]Exiting...[/yellow]")
                    break

                # Handle special commands
                if await self.handle_special_commands(query):
                    continue

                # Show processing header
                self.console.print(Rule("[bold blue]🔄 Agent Processing[/bold blue]"))

                request_completed = False
                try:
                    with self.progress:
                        task = self.progress.add_task(
                            "🤖 Processing request...", total=None
                        )

                        # Connect to the agent if not already connected
                        if not self.agent.is_connected:
                            await self.agent.connect()

                        # Process the query
                        async for event in self.agent.run(query):
                            self.progress.update(
                                task, description="🔄 Processing events..."
                            )

                            event_type = event.type.value if hasattr(event.type, 'value') else str(event.type)
                            event_data = {"type": event_type, "payload": event.data}
                            status = getattr(event.data, 'status', None) if hasattr(event.data, 'status') else event.data.get('status') if isinstance(event.data, dict) else None
                            event_id = getattr(event, 'id', None)
                            
                            # Convert StreamEvent to dictionary format for compatibility with existing code
                            event_dict = {
                                "id": event_id,
                                "data": event_data,
                                "timestamp": event.timestamp
                            }
                            
                            # Store the event in history
                            self.event_history.append(event_dict)
                            self.update_session_stats(event_type, status)
                            
                            # Check if this is an update to an existing event (by ID)
                            updated_existing = False
                            if event_id:
                                # Look for previous events with the same ID to update their status
                                for i, prev_event in enumerate(self.event_history[:-1]):  # Skip the current event
                                    prev_data = prev_event.get("data", {})
                                    if prev_event.get("id") == event_id and prev_event != event_dict:
                                        # Update the status in the previous event's data
                                        if status and "data" in prev_event:
                                            prev_event["data"]["status"] = status
                                            # Re-render the updated event
                                            updated_panel = self.event_renderer.render_event(prev_event)
                                            if updated_panel:
                                                self.console.print(updated_panel)
                                            updated_existing = True
                                            break
                            
                            # Only render the event if it's not just a status update for an existing event
                            if not updated_existing:
                                panel = self.event_renderer.render_event(event_dict)
                                if panel:
                                    self.console.print(panel)

                            # Check for completion
                            if event_type == EventType.COMPLETED_TASK.value:
                                request_completed = True
                                self.progress.update(task, total=1, completed=1)
                                break

                        # Remove the task after completion
                        self.progress.remove_task(task)
                except Exception as e:
                    self.console.print(f"[bold red]Error: {str(e)}[/bold red]")
                    continue

                if request_completed:
                    # Show completion summary with enhanced formatting
                    completion_text = Text()
                    completion_text.append(
                        "✅ Request completed successfully\n", style="bold green"
                    )
                    completion_text.append(
                        f"Events processed: {len([e for e in self.event_history if e.get('data', {}).get('type') != 'default'])}",
                        style="dim green",
                    )

                    self.console.print(
                        Panel(
                            completion_text,
                            title="🎯 Request Complete",
                            border_style="green",
                            box=HEAVY,
                        )
                    )

                    # Error handling is done in the except block above

        except KeyboardInterrupt:
            self.console.print(
                "\n[yellow]⚠️ Keyboard interrupt detected. Shutting down gracefully...[/yellow]"
            )
        finally:
            # Show comprehensive session summary
            runtime = datetime.now() - self.session_stats["start_time"]
            summary_text = Text()
            summary_text.append("📊 Session Summary:\n", style="bold blue")
            summary_text.append(
                f"Runtime: {str(runtime).split('.')[0]}\n", style="white"
            )
            summary_text.append(
                f"Events processed: {self.session_stats['events_processed']}\n",
                style="white",
            )
            summary_text.append(
                f"User messages: {self.session_stats['user_messages']}\n", style="white"
            )
            summary_text.append(
                f"Agent operations: {self.session_stats['agent_operations']}\n",
                style="white",
            )
            if self.session_stats["errors"] > 0:
                summary_text.append(
                    f"Errors: {self.session_stats['errors']}\n", style="red"
                )

            # Performance metrics
            if self.session_stats["events_processed"] > 0:
                avg_per_min = self.session_stats["events_processed"] / max(
                    runtime.total_seconds() / 60, 1
                )
                summary_text.append(
                    f"Average events/minute: {avg_per_min:.1f}\n", style="dim white"
                )

            self.console.print(
                Panel(
                    summary_text,
                    title="📋 Session Complete",
                    border_style="blue",
                    box=ROUNDED,
                )
            )

            # Graceful disconnection
            if self.agent and self.agent.is_connected:
                self.console.print(
                    "[yellow]🔗 Disconnecting from agent server...[/yellow]"
                )
                try:
                    await self.agent.disconnect()
                    self.console.print(
                        Panel(
                            Text("✅ Disconnected successfully", style="bold green"),
                            border_style="green",
                            box=ROUNDED,
                        )
                    )
                except Exception as e:
                    self.console.print(
                        Panel(
                            Text(f"⚠️ Disconnect error: {str(e)}", style="yellow"),
                            border_style="yellow",
                            box=ROUNDED,
                        )
                    )
            else:
                self.console.print(
                    "[bold yellow]ℹ️ No active connection to disconnect[/bold yellow]"
                )

    @classmethod
    async def from_args(cls):
        """Create CLI instance from command line arguments with comprehensive options"""
        parser = argparse.ArgumentParser(
            description="Enhanced Agent CLI Interface - Best Version with comprehensive features",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  python enhanced_cli.py                           # Start with default settings
  python enhanced_cli.py -w ./workspace           # Custom workspace
  python enhanced_cli.py --compact --no-timestamps # Compact mode without timestamps
  python enhanced_cli.py --width 100               # Set panel width to 100 characters
  python enhanced_cli.py -v                        # Verbose mode with extra details
  python enhanced_cli.py --no-colors               # Disable colored output
            """,
        )
        parser.add_argument(
            "--workspace",
            "-w",
            default="./my_agent_workspace",
            help="Path to agent workspace directory (default: ./my_agent_workspace)",
        )
        parser.add_argument(
            "--verbose",
            "-v",
            action="store_true",
            help="Show additional debug information and full tracebacks",
        )
        parser.add_argument(
            "--compact",
            "-c",
            action="store_true",
            help="Use compact display mode for better performance",
        )
        parser.add_argument(
            "--width",
            type=int,
            default=120,
            help="Panel width in characters (default: 120)",
        )
        parser.add_argument(
            "--no-timestamps",
            action="store_true",
            help="Disable timestamp display in events",
        )
        parser.add_argument(
            "--conversation-id",
            help="Resume an existing conversation by ID",
        )

        args = parser.parse_args()
        cli = cls(
            workspace_path=args.workspace,
            verbose=args.verbose,
            compact=args.compact,
            panel_width=args.width,
            show_timestamps=not args.no_timestamps,
        )
        await cli.start_interactive_session(conversation_id=args.conversation_id)


async def main():
    """Main entry point for the Enhanced Agent CLI"""
    await EnhancedAgentCLI.from_args()


if __name__ == "__main__":
    asyncio.run(main())
