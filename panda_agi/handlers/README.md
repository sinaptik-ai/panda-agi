# Event Handlers

This package contains event handlers for PandaAGI that provide beautiful, formatted output for agent events.

## Handler Architecture

All handlers extend the `BaseHandler` abstract class, providing a consistent interface and common functionality.

### BaseHandler

The `BaseHandler` is an abstract base class that all custom handlers should extend. It provides:

- Standard `process(event)` method interface
- Built-in error handling and statistics tracking
- Callable interface for backward compatibility
- Performance monitoring capabilities

### LogsHandler

The `LogsHandler` extends `BaseHandler` and provides a comprehensive, color-coded display for all event types with dedicated layouts and visual styling.

### Features

- 🎨 **Color-coded output** - Each event type has its own color scheme
- 📱 **Dedicated layouts** - Custom formatting for each event type
- ⏰ **Timestamps** - Optional timestamp display
- 📊 **Metadata** - Optional event metadata display
- 📦 **Compact mode** - Space-efficient output option
- 🔧 **Configurable** - Extensive customization options

### Quick Usage

```python
from panda_agi import Agent, LogsHandler
from panda_agi.envs import LocalEnv

# Create a handler instance
event_handler = LogsHandler()

# Or with custom configuration
event_handler = LogsHandler(
    compact_mode=True,     # Use compact output
    use_colors=True,       # Enable colors
    show_timestamps=True   # Show timestamps
)

# Use with agent - automatically detects BaseHandler subclasses!
agent = Agent(environment=LocalEnv("./workspace"))
response = await agent.run("your query", event_handler=event_handler)
```

### Creating Custom Handlers

```python
from panda_agi import BaseHandler, FilterHandler
from panda_agi.client.models import BaseStreamEvent, WebSearchEvent

# Simple custom handler
class MyHandler(BaseHandler):
    def process(self, event: BaseStreamEvent) -> None:
        print(f"Processing: {event.type}")

# Filtered handler (only processes specific events)
class WebHandler(FilterHandler):
    def should_process(self, event: BaseStreamEvent) -> bool:
        return isinstance(event, WebSearchEvent)

    def process_filtered_event(self, event: BaseStreamEvent) -> None:
        print(f"Web search: {event.query}")

# Use your custom handler
handler = MyHandler("CustomHandler")
response = await agent.run("query", event_handler=handler)
```

### Advanced Usage

```python
from panda_agi import LogsHandler

# Create handler instance directly with full control
event_handler = LogsHandler(
    show_timestamps=True,    # Show event timestamps
    show_metadata=True,      # Show event metadata
    compact_mode=False,      # Use full layout mode
    use_colors=True          # Enable colored output
)

# Use the process method explicitly (main entry point)
event_handler.process(some_event)

# Or use as callable (backward compatibility)
event_handler(some_event)
```

### Event Types Supported

The handler supports all event types defined in `panda_agi.client.models`:

#### Connection Events

- ✅ `AgentConnectionSuccessEvent` - Agent successfully connected
- ❌ `ErrorEvent` - Connection or execution errors

#### Web Research Events

- 🔍 `WebSearchEvent` - Web search operations
- 📋 `WebSearchResultEvent` - Search results
- 🌐 `WebNavigationEvent` - Web page navigation
- 📄 `WebNavigationResultEvent` - Page content extraction

#### File System Events

- 📖 `FileReadEvent` - File reading operations
- ✏️ `FileWriteEvent` - File writing operations
- 🔄 `FileReplaceEvent` - File content replacement
- 🔎 `FileFindEvent` - File search operations
- 🗂️ `FileExploreEvent` - Directory exploration

#### Shell Events

- ⚡ `ShellExecEvent` - Command execution
- 👁️ `ShellViewEvent` - Output viewing
- ✍️ `ShellWriteEvent` - Input writing

#### Communication Events

- 💬 `UserNotificationEvent` - Agent messages
- ❓ `UserQuestionEvent` - Agent questions
- ✅ `CompletedTaskEvent` - Task completion

#### Creative Events

- 🖼️ `ImageGenerationEvent` - Image generation

## Built-in Handler Types

### BaseHandler (Abstract)

The abstract base class that all handlers must extend.

**Key Methods:**

- `process(event)`: Abstract method to implement event processing
- `get_stats()`: Get handler performance statistics
- `handle_error(event, error)`: Override to customize error handling

### LogsHandler

Beautiful, colored output for all event types.

**Configuration:**
| Option | Type | Default | Description |
| ----------------- | ------ | ------- | ------------------------------ |
| `show_timestamps` | `bool` | `True` | Display event timestamps |
| `show_metadata` | `bool` | `True` | Show additional event metadata |
| `compact_mode` | `bool` | `False` | Use space-efficient formatting |
| `use_colors` | `bool` | `True` | Enable ANSI color output |

### FilterHandler (Abstract)

Base class for handlers that filter events before processing.

**Key Methods:**

- `should_process(event)`: Return True if event should be processed
- `process_filtered_event(event)`: Process events that pass the filter

### CompositeHandler

Combines multiple handlers to process events together.

```python
from panda_agi import CompositeHandler, LogsHandler

# Combine multiple handlers
handler = CompositeHandler([
    LogsHandler(compact_mode=True),
    MyCustomHandler(),
    StatsHandler()
])
```

### Examples

#### Basic Event Handler

```python
# Create with defaults
handler = LogsHandler()

# Use with agent - handler class is automatically detected
response = await agent.run("search for python tutorials", event_handler=handler)
```

#### Compact Mode for Logs

```python
# Compact mode for log files
handler = LogsHandler(
    compact_mode=True,
    use_colors=False,      # Disable colors for log files
    show_timestamps=True
)
```

#### Handler Class vs Callable Function

```python
# Method 1: Handler class (recommended)
handler = LogsHandler(
    show_timestamps=False,   # Hide timestamps
    show_metadata=False,     # Hide metadata
    compact_mode=True,       # Compact output
    use_colors=True          # Keep colors
)

# Agent automatically detects it's a handler class and calls process()
response = await agent.run("query", event_handler=handler)

# Method 2: Callable function (backward compatibility)
def simple_handler(event):
    print(f"Event: {event.type}")
    return event

# Agent detects it's callable and calls it directly
response = await agent.run("query", event_handler=simple_handler)
```

#### Manual Event Processing

```python
# You can also process events manually
handler = LogsHandler()

# Process events explicitly using the main entry point
handler.process(event)

# Or use as callable for backward compatibility
handler(event)
```

### Error Handling

The handler includes robust error handling:

- Graceful fallback for unknown event types
- Exception handling with detailed error messages
- Raw event data display for debugging

### Color Scheme

Each event type uses a specific color to make them easily distinguishable:

- 🟢 **Green**: Success events, file writes, shell execution
- 🔵 **Blue**: Web operations, notifications, shell views
- 🟡 **Yellow**: File operations, questions, warnings
- 🟣 **Magenta**: Navigation, shell input, image generation
- 🔴 **Red**: Errors, failures
- 🟠 **Cyan**: Directories, URLs, file paths
- ⚫ **Gray**: Metadata, IDs, timestamps
