"""
Logs Handler for PandaAGI

Provides a beautifully formatted, colored event handler that displays
each event type with dedicated layouts and visual styling.
"""

from datetime import datetime
from typing import Optional

from .base_handler import BaseHandler
from ..client.models import (
    AgentConnectionSuccessEvent,
    BaseStreamEvent,
    CompletedTaskEvent,
    ErrorEvent,
    FileExploreEvent,
    FileFindEvent,
    FileReadEvent,
    FileReplaceEvent,
    FileWriteEvent,
    ImageGenerationEvent,
    ShellExecEvent,
    ShellViewEvent,
    ShellWriteEvent,
    UserNotificationEvent,
    UserQuestionEvent,
    WebNavigationEvent,
    WebNavigationResultEvent,
    WebSearchEvent,
    WebSearchResultEvent,
)


class Colors:
    """ANSI color codes for terminal output"""
    # Text colors
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    GRAY = '\033[90m'
    
    # Background colors
    BG_RED = '\033[101m'
    BG_GREEN = '\033[102m'
    BG_YELLOW = '\033[103m'
    BG_BLUE = '\033[104m'
    BG_MAGENTA = '\033[105m'
    BG_CYAN = '\033[106m'
    
    # Styles
    BOLD = '\033[1m'
    DIM = '\033[2m'
    ITALIC = '\033[3m'
    UNDERLINE = '\033[4m'
    
    # Reset
    RESET = '\033[0m'


class LogsHandler(BaseHandler):
    """
    Logs handler that provides beautiful, colored output for all event types.
    
    Features:
    - Dedicated layouts for each event type
    - Color-coded output for easy visual distinction
    - Timestamps and metadata display
    - Structured formatting with headers and content sections
    - Process method as main entry point
    - Extends BaseHandler for common functionality
    """
    
    def __init__(self, 
                 show_timestamps: bool = True,
                 show_metadata: bool = True,
                 compact_mode: bool = False,
                 use_colors: bool = True,
                 name: Optional[str] = None):
        """
        Initialize the logs handler.
        
        Args:
            show_timestamps: Whether to display event timestamps
            show_metadata: Whether to show additional metadata
            compact_mode: Use more compact output format
            use_colors: Enable colored output (disable for log files)
            name: Optional name for the handler
        """
        super().__init__(name or "LogsHandler")
        self.show_timestamps = show_timestamps
        self.show_metadata = show_metadata
        self.compact_mode = compact_mode
        self.use_colors = use_colors
        
    def _colorize(self, text: str, color: str) -> str:
        """Apply color to text if colors are enabled"""
        if not self.use_colors:
            return text
        return f"{color}{text}{Colors.RESET}"
    
    def _format_header(self, icon: str, title: str, color: str) -> str:
        """Format a standardized header for events"""
        if self.compact_mode:
            return self._colorize(f"{icon} {title}", color)
        
        header = f"{icon} {title}"
        return self._colorize(f"{'─' * 60}\n{header}\n{'─' * 60}", color)
    
    def _format_timestamp(self, timestamp: Optional[str] = None) -> str:
        """Format timestamp if enabled"""
        if not self.show_timestamps:
            return ""
        
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        
        return self._colorize(f"[{timestamp}]", Colors.GRAY)
    
    def _format_metadata(self, event: BaseStreamEvent) -> str:
        """Format metadata section if enabled"""
        if not self.show_metadata:
            return ""
        
        metadata = f"Type: {event.type}"
        return self._colorize(f"  │ {metadata}", Colors.DIM)
    
    def _print_section(self, label: str, content: str, color: str = Colors.WHITE) -> None:
        """Print a formatted section with label and content"""
        if self.compact_mode:
            print(f"  {self._colorize(label + ':', Colors.BOLD)} {content}")
        else:
            print(f"  │ {self._colorize(label + ':', Colors.BOLD)} {content}")
    
    def _process_connection_success(self, event: AgentConnectionSuccessEvent) -> None:
        """Process agent connection success events"""
        header = self._format_header("🔗", "Agent Connected Successfully", Colors.GREEN)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Directory", event.directory, Colors.CYAN)
        
        if hasattr(event, 'system_info') and event.system_info:
            print(f"  │ {self._colorize('System Info:', Colors.BOLD)}")
            for key, value in event.system_info.items():
                print(f"  │   • {key}: {value}")
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_error(self, event: ErrorEvent) -> None:
        """Process error events"""
        header = self._format_header("❌", "Error Occurred", Colors.RED)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Error", event.error, Colors.RED)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_web_search(self, event: WebSearchEvent) -> None:
        """Process web search events"""
        header = self._format_header("🔍", "Web Search", Colors.BLUE)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Query", f'"{event.query}"', Colors.CYAN)
        self._print_section("Max Results", str(event.max_results), Colors.YELLOW)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_web_search_result(self, event: WebSearchResultEvent) -> None:
        """Process web search result events"""
        header = self._format_header("📋", "Search Results", Colors.BLUE)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Results Found", str(len(event.results)), Colors.GREEN)
        
        if event.results and not self.compact_mode:
            print(f"  │ {self._colorize('Results:', Colors.BOLD)}")
            for i, result in enumerate(event.results[:5], 1):  # Show max 5 results
                print(f"  │   {i}. {self._colorize(result.title, Colors.CYAN)}")
                print(f"  │      {self._colorize(result.url, Colors.GRAY)}")
            
            if len(event.results) > 5:
                print(f"  │   ... and {len(event.results) - 5} more results")
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_web_navigation(self, event: WebNavigationEvent) -> None:
        """Process web navigation events"""
        header = self._format_header("🌐", "Web Navigation", Colors.MAGENTA)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("URL", event.url, Colors.CYAN)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_web_navigation_result(self, event: WebNavigationResultEvent) -> None:
        """Process web navigation result events"""
        header = self._format_header("📄", "Page Content Extracted", Colors.MAGENTA)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("URL", event.url, Colors.CYAN)
        self._print_section("Status Code", str(event.status_code), Colors.GREEN if event.status_code == 200 else Colors.RED)
        
        if not self.compact_mode:
            content_preview = event.content[:200] + "..." if len(event.content) > 200 else event.content
            self._print_section("Content Preview", content_preview, Colors.WHITE)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_file_read(self, event: FileReadEvent) -> None:
        """Process file read events"""
        header = self._format_header("📖", "File Read", Colors.CYAN)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("File", event.file, Colors.YELLOW)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_file_write(self, event: FileWriteEvent) -> None:
        """Process file write events"""
        header = self._format_header("✏️", "File Write", Colors.GREEN)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("File", event.file, Colors.YELLOW)
        self._print_section("Mode", "Append" if event.append else "Write", Colors.MAGENTA)
        
        if not self.compact_mode:
            content_preview = event.content[:100] + "..." if len(event.content) > 100 else event.content
            self._print_section("Content Preview", content_preview, Colors.WHITE)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_file_replace(self, event: FileReplaceEvent) -> None:
        """Process file replace events"""
        header = self._format_header("🔄", "File Replace", Colors.YELLOW)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("File", event.file, Colors.YELLOW)
        
        if not self.compact_mode:
            old_preview = event.old_str[:50] + "..." if len(event.old_str) > 50 else event.old_str
            new_preview = event.new_str[:50] + "..." if len(event.new_str) > 50 else event.new_str
            self._print_section("Old Content", old_preview, Colors.RED)
            self._print_section("New Content", new_preview, Colors.GREEN)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_file_find(self, event: FileFindEvent) -> None:
        """Process file find events"""
        header = self._format_header("🔎", "File Search", Colors.YELLOW)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        if event.file:
            self._print_section("Directory", event.file, Colors.CYAN)
        if event.path:
            self._print_section("Path", event.path, Colors.CYAN)
        if event.regex:
            self._print_section("Pattern", event.regex, Colors.MAGENTA)
        if event.glob_pattern:
            self._print_section("Glob Pattern", event.glob_pattern, Colors.MAGENTA)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_file_explore(self, event: FileExploreEvent) -> None:
        """Process file explore events"""
        header = self._format_header("🗂️", "Directory Exploration", Colors.CYAN)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Path", event.path, Colors.YELLOW)
        self._print_section("Max Depth", str(event.max_depth), Colors.MAGENTA)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_shell_exec(self, event: ShellExecEvent) -> None:
        """Process shell execution events"""
        header = self._format_header("⚡", "Shell Command Execution", Colors.GREEN)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Command", event.command, Colors.CYAN)
        self._print_section("Directory", event.exec_dir, Colors.YELLOW)
        self._print_section("Execution ID", event.id, Colors.GRAY)
        self._print_section("Blocking", "Yes" if event.blocking else "No", Colors.MAGENTA)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_shell_view(self, event: ShellViewEvent) -> None:
        """Process shell view events"""
        header = self._format_header("👁️", "Shell Output View", Colors.BLUE)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Execution ID", event.id, Colors.GRAY)
        self._print_section("Wait Time", f"{event.wait_seconds}s", Colors.YELLOW)
        self._print_section("Kill Process", "Yes" if event.kill_process else "No", Colors.RED if event.kill_process else Colors.GREEN)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_shell_write(self, event: ShellWriteEvent) -> None:
        """Process shell write events"""
        header = self._format_header("✍️", "Shell Input", Colors.MAGENTA)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Execution ID", event.id, Colors.GRAY)
        self._print_section("Input", event.input, Colors.CYAN)
        self._print_section("Press Enter", "Yes" if event.press_enter else "No", Colors.YELLOW)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_user_notification(self, event: UserNotificationEvent) -> None:
        """Process user notification events"""
        header = self._format_header("💬", "Agent Message", Colors.BLUE)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Message", event.text, Colors.WHITE)
        
        if event.attachments:
            print(f"  │ {self._colorize('Attachments:', Colors.BOLD)}")
            for attachment in event.attachments:
                print(f"  │   • {attachment}")
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_user_question(self, event: UserQuestionEvent) -> None:
        """Process user question events"""
        header = self._format_header("❓", "Agent Question", Colors.YELLOW)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Question", event.text, Colors.WHITE)
        
        if event.attachments:
            print(f"  │ {self._colorize('Attachments:', Colors.BOLD)}")
            for attachment in event.attachments:
                print(f"  │   • {attachment}")
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_completed_task(self, event: CompletedTaskEvent) -> None:
        """Process task completion events"""
        success_color = Colors.GREEN if event.success else Colors.RED
        icon = "✅" if event.success else "❌"
        title = "Task Completed Successfully" if event.success else "Task Failed"
        
        header = self._format_header(icon, title, success_color)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        if event.success is not None:
            status = "Success" if event.success else "Failed"
            self._print_section("Status", status, success_color)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_image_generation(self, event: ImageGenerationEvent) -> None:
        """Process image generation events"""
        header = self._format_header("🖼️", "Image Generation", Colors.MAGENTA)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Images Generated", str(len(event.images)), Colors.GREEN)
        self._print_section("Files Saved", str(len(event.saved_files)), Colors.CYAN)
        
        if event.saved_files and not self.compact_mode:
            print(f"  │ {self._colorize('Saved Files:', Colors.BOLD)}")
            for file_path in event.saved_files:
                print(f"  │   • {file_path}")
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def _process_unknown_event(self, event: BaseStreamEvent) -> None:
        """Process unknown or unrecognized events"""
        header = self._format_header("❔", "Unknown Event", Colors.GRAY)
        print(f"\n{header}")
        
        if hasattr(event, 'timestamp'):
            print(self._format_timestamp(event.timestamp))
        
        self._print_section("Event Type", str(event.type), Colors.WHITE)
        
        # Try to display any additional attributes
        event_dict = event.to_dict()
        for key, value in event_dict.items():
            if key not in ['type', 'timestamp']:
                self._print_section(key.title(), str(value), Colors.WHITE)
        
        if self.show_metadata:
            print(self._format_metadata(event))
    
    def process(self, event: BaseStreamEvent) -> None:
        """
        Main event processing method that routes events to specific processors.
        
        This is the primary entry point for event handling.
        
        Args:
            event: The event to process
        """
        try:
            # Route to specific processors based on event type
            if isinstance(event, AgentConnectionSuccessEvent):
                self._process_connection_success(event)
            elif isinstance(event, ErrorEvent):
                self._process_error(event)
            elif isinstance(event, WebSearchEvent):
                self._process_web_search(event)
            elif isinstance(event, WebSearchResultEvent):
                self._process_web_search_result(event)
            elif isinstance(event, WebNavigationEvent):
                self._process_web_navigation(event)
            elif isinstance(event, WebNavigationResultEvent):
                self._process_web_navigation_result(event)
            elif isinstance(event, FileReadEvent):
                self._process_file_read(event)
            elif isinstance(event, FileWriteEvent):
                self._process_file_write(event)
            elif isinstance(event, FileReplaceEvent):
                self._process_file_replace(event)
            elif isinstance(event, FileFindEvent):
                self._process_file_find(event)
            elif isinstance(event, FileExploreEvent):
                self._process_file_explore(event)
            elif isinstance(event, ShellExecEvent):
                self._process_shell_exec(event)
            elif isinstance(event, ShellViewEvent):
                self._process_shell_view(event)
            elif isinstance(event, ShellWriteEvent):
                self._process_shell_write(event)
            elif isinstance(event, UserNotificationEvent):
                self._process_user_notification(event)
            elif isinstance(event, UserQuestionEvent):
                self._process_user_question(event)
            elif isinstance(event, CompletedTaskEvent):
                self._process_completed_task(event)
            elif isinstance(event, ImageGenerationEvent):
                self._process_image_generation(event)
            else:
                self._process_unknown_event(event)
                
        except Exception as e:
            # Fallback error handling
            print(f"\n{self._colorize('⚠️  Event Handler Error', Colors.RED)}")
            print(f"  │ Failed to process event: {type(event).__name__}")
            print(f"  │ Error: {str(e)}")
            print(f"  │ Raw event data: {event.to_dict()}")


