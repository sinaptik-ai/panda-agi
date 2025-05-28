import argparse
import asyncio
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from envs import LocalEnv
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

from client.agent import Agent

# Enhanced event type styles with comprehensive visual configuration
EVENT_STYLES = {
    # System events
    "connection_success": {
        "color": "bright_green",
        "icon": "🔗",
        "title": "Connection Established",
        "category": "system",
        "priority": "high",
        "box": DOUBLE,
    },
    "completed_task": {
        "color": "bright_green",
        "icon": "🎯",
        "title": "Task Completed",
        "category": "system",
        "priority": "high",
        "box": HEAVY,
    },
    # User interaction events
    "user_send_message": {
        "color": "cyan",
        "icon": "💬",
        "title": "User Message",
        "category": "user",
        "priority": "high",
        "box": DOUBLE,
    },
    "user_ask_question": {
        "color": "yellow",
        "icon": "❓",
        "title": "User Question",
        "category": "user",
        "priority": "high",
        "box": DOUBLE,
    },
    # Agent operations
    "agent_request": {
        "color": "bright_blue",
        "icon": "🤖",
        "title": "Agent Processing",
        "category": "agent",
        "priority": "high",
        "box": ROUNDED,
    },
    "planning": {
        "color": "purple",
        "icon": "🧠",
        "title": "Planning",
        "category": "agent",
        "priority": "medium",
        "box": ROUNDED,
    },
    # Web operations
    "web_search": {
        "color": "magenta",
        "icon": "🔍",
        "title": "Web Search",
        "category": "web",
        "priority": "medium",
        "box": ROUNDED,
    },
    "web_visit_page": {
        "color": "blue",
        "icon": "🌐",
        "title": "Visit Webpage",
        "category": "web",
        "priority": "medium",
        "box": ROUNDED,
    },
    # File operations
    "file_read": {
        "color": "cyan",
        "icon": "📖",
        "title": "File Read",
        "category": "file",
        "priority": "low",
        "box": ROUNDED,
    },
    "file_write": {
        "color": "yellow",
        "icon": "✏️",
        "title": "File Write",
        "category": "file",
        "priority": "medium",
        "box": ROUNDED,
    },
    "file_replace": {
        "color": "orange3",
        "icon": "🔄",
        "title": "File Replace",
        "category": "file",
        "priority": "medium",
        "box": ROUNDED,
    },
    "file_find_in_content": {
        "color": "bright_cyan",
        "icon": "🔎",
        "title": "Search in File",
        "category": "file",
        "priority": "low",
        "box": ROUNDED,
    },
    "file_search_by_name": {
        "color": "bright_cyan",
        "icon": "🔍",
        "title": "Find Files",
        "category": "file",
        "priority": "low",
        "box": ROUNDED,
    },
    "explore_directory": {
        "color": "bright_blue",
        "icon": "📂",
        "title": "Explore Directory",
        "category": "file",
        "priority": "low",
        "box": ROUNDED,
    },
    # Shell operations
    "shell_exec_command": {
        "color": "bright_black",
        "icon": "💻",
        "title": "Shell Execute",
        "category": "shell",
        "priority": "medium",
        "box": ROUNDED,
    },
    "shell_view_output": {
        "color": "white",
        "icon": "👁️",
        "title": "View Output",
        "category": "shell",
        "priority": "low",
        "box": ROUNDED,
    },
    "shell_write_to_process": {
        "color": "yellow",
        "icon": "⌨️",
        "title": "Write to Process",
        "category": "shell",
        "priority": "medium",
        "box": ROUNDED,
    },
    # Image operations
    "generate_image": {
        "color": "magenta",
        "icon": "🎨",
        "title": "Image Generation",
        "category": "image",
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

    def should_render_event(self, event_data: Dict[str, Any]) -> bool:
        """Check if event should be rendered"""
        event_type = event_data.get("type", "default")
        return event_type != "default" and event_type in EVENT_STYLES

    def create_event_header(
        self, style_info: Dict[str, str], event_number: int
    ) -> Text:
        """Create a rich header for events with numbering and categorization"""
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
        content.append("🎉 Task completed successfully!\n", style="bold bright_green")

        if payload.get("result"):
            content.append(f"Result: {payload['result']}\n", style="bright_green")
        if payload.get("message"):
            content.append(f"Message: {payload['message']}\n", style="bright_green")
        if payload.get("text"):
            content.append(f"Details: {payload['text']}\n", style="bright_green")

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style=style_info["color"],
            box=style_info.get("box", HEAVY),
            padding=(1, 2),
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

        header = self.create_event_header(style_info, self.event_counter)

        return Panel(
            content,
            title=header,
            border_style=style_info["color"],
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

        # Skip rendering default events
        if not self.should_render_event(data):
            return None

        style_info = self.get_event_style(data)
        payload = data.get("payload", {}) or {}

        try:
            # Route to specific renderers based on event type
            if event_type == "connection_success":
                return self.render_connection_success(payload, style_info)

            elif event_type in ["user_send_message", "user_ask_question"]:
                return self.render_user_input_event(payload, style_info)

            elif event_type == "completed_task":
                return self.render_completed_task(payload, style_info)

            elif event_type == "agent_request":
                return self.render_agent_request(payload, style_info)

            elif event_type == "error":
                return self.render_error_event(payload, style_info)

            elif event_type in [
                "web_search",
                "web_visit_page",
                "generate_image",
                "file_read",
                "file_write",
                "file_replace",
                "file_find_in_content",
                "file_search_by_name",
                "explore_directory",
                "shell_exec_command",
                "shell_view_output",
                "shell_write_to_process",
                "planning",
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
        self.console = Console(width=panel_width)
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
            box=DOUBLE,
            padding=(1, 2),
        )

    def create_status_panel(self) -> Panel:
        """Create an enhanced status panel with comprehensive session information"""
        table = Table.grid(padding=1)
        table.add_column(style="cyan", no_wrap=True)
        table.add_column()

        table.add_row("📁 Workspace:", self.workspace_path)

        if self.agent:
            connection_status = (
                "🟢 Connected" if self.agent.is_connected else "🔴 Disconnected"
            )
            table.add_row("🔗 Status:", connection_status)

            if hasattr(self.agent, "conversation_id") and self.agent.conversation_id:
                table.add_row("💬 Conversation:", self.agent.conversation_id)

        # Session statistics
        runtime = datetime.now() - self.session_stats["start_time"]
        table.add_row("⏱️ Runtime:", str(runtime).split(".")[0])
        table.add_row("📊 Events:", str(self.session_stats["events_processed"]))
        table.add_row("💬 User Messages:", str(self.session_stats["user_messages"]))
        table.add_row("🤖 Agent Ops:", str(self.session_stats["agent_operations"]))

        if self.session_stats["errors"] > 0:
            table.add_row("❌ Errors:", str(self.session_stats["errors"]))

        return Panel(table, title="📊 Session Status", border_style="blue", box=ROUNDED)

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

    def update_session_stats(self, event_type: str):
        """Update session statistics based on event type"""
        self.session_stats["events_processed"] += 1

        if event_type in ["user_send_message", "user_ask_question"]:
            self.session_stats["user_messages"] += 1
        elif event_type == "error":
            self.session_stats["errors"] += 1
        elif event_type not in ["user_send_message", "user_ask_question"]:
            self.session_stats["agent_operations"] += 1

    async def start_interactive_session(self, conversation_id: Optional[str] = None):
        """Start an enhanced interactive session with comprehensive error handling"""
        self.console.clear()
        self.console.print(
            Rule("[bold blue]🤖 Enhanced Agent CLI - Best Version[/bold blue]")
        )
        self.console.print(self.create_welcome_screen())
        self.console.print(self.create_status_panel())

        if not self.compact:
            self.console.print(self.create_help_panel())

        # Initialize environment and agent
        env = LocalEnv(self.workspace_path)
        agent = Agent(
            environment=env,
            conversation_id=conversation_id,
        )
        self.agent = agent

        self.console.print(
            Panel(
                "💡 Agent will automatically connect when you send your first request",
                border_style="yellow",
                box=ROUNDED,
            )
        )

        try:
            while True:
                # Enhanced input prompt with better formatting
                self.console.print(Rule("[bold blue]💭 Enter your request[/bold blue]"))
                query = Prompt.ask("\n[bold yellow]User[/bold yellow]", default="")

                if query.lower().strip() in ["exit", "quit", "q"]:
                    break

                if not query.strip():
                    continue

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

                        async for event in agent.run(query, timeout=None):
                            self.progress.update(
                                task, description="🔄 Processing events..."
                            )

                            # Store event in history
                            self.event_history.append(event)

                            # Update statistics
                            event_data = event.get("data", {})
                            event_type = event_data.get("type", "")
                            self.update_session_stats(event_type)

                            # Render and display event
                            panel = self.event_renderer.render_event(event)
                            if panel is not None:
                                self.console.print(panel)

                            # Check for completion
                            if event_type == "completed_task":
                                request_completed = True
                                self.progress.update(task, total=1, completed=1)
                                break

                        # Remove the task after completion
                        self.progress.remove_task(task)

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

                except Exception as e:
                    self.session_stats["errors"] += 1
                    error_text = Text()
                    error_text.append("🚨 An error occurred:\n", style="bold red")
                    error_text.append(str(e), style="red")

                    if self.verbose:
                        import traceback

                        error_text.append(
                            f"\n\nTraceback:\n{traceback.format_exc()}", style="dim red"
                        )

                    self.console.print(
                        Panel(
                            error_text,
                            title="❌ Error",
                            border_style="red",
                            box=HEAVY,
                        )
                    )

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
                    box=DOUBLE,
                )
            )

            # Graceful disconnection
            if agent and agent.is_connected:
                self.console.print(
                    "[yellow]🔗 Disconnecting from agent server...[/yellow]"
                )
                try:
                    await agent.disconnect()
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
