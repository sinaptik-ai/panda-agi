import asyncio
import logging
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, Optional

from .models import EventType, StreamEvent

logger = logging.getLogger("AgentClient")


class EventQueue:
    """Event queue for managing WebSocket events"""

    def __init__(self):
        self._queue = asyncio.Queue()

    async def put(self, event):
        """Put an event into the queue"""
        await self._queue.put(event)

    async def get(self):
        """Get an event from the queue"""
        return await self._queue.get()


class EventManager:
    """Manager for handling events across the system"""

    def __init__(self, event_queue: Optional[EventQueue] = None):
        self._event_queue = event_queue or EventQueue()
        self._current_request_future = None

    async def add_event(self, event_type: EventType, data: Dict[str, Any]):
        """Add an event to the queue"""
        event = StreamEvent(
            type=event_type, data=data, timestamp=datetime.now().isoformat()
        )
        await self._event_queue.put(event)

    async def get_event(self):
        """Get an event from the queue"""
        return await self._event_queue.get()

    def set_event_queue(self, event_queue: EventQueue):
        """Set the event queue instance"""
        self._event_queue = event_queue

    def set_request_future(self, future: asyncio.Future):
        """Set the current request future for completion tracking"""
        self._current_request_future = future

    async def stream_events(
        self, timeout: Optional[float] = None
    ) -> AsyncGenerator[StreamEvent, None]:
        """
        Stream events from the queue with timeout and completion handling

        Args:
            timeout: Maximum time to wait for events in seconds

        Yields:
            StreamEvent: Events from the queue
        """
        queue_task = None
        seen_events = False
        start_time = asyncio.get_event_loop().time()

        try:
            while True:
                # Check for timeout if specified
                if (
                    timeout
                    and (asyncio.get_event_loop().time() - start_time > timeout)
                    and not seen_events
                ):
                    raise TimeoutError(f"No events received within {timeout} seconds")

                # Create task for event queue if not already monitoring
                if queue_task is None or queue_task.done():
                    queue_task = asyncio.create_task(self.get_event())

                # Add the current request future to our wait set
                wait_tasks = [queue_task]
                if (
                    self._current_request_future
                    and not self._current_request_future.done()
                ):
                    wait_tasks.append(self._current_request_future)

                # Wait for either queue to have an event or the request to complete
                done, pending = await asyncio.wait(
                    wait_tasks,
                    return_when=asyncio.FIRST_COMPLETED,
                    timeout=1.0,  # Short timeout to check for cancellation
                )

                # No events ready yet, continue waiting
                if not done:
                    continue

                # Process completed tasks
                for task in done:
                    try:
                        event = task.result()
                        seen_events = True
                        yield event
                        logger.info(f"DEBUG: Task: {task}")
                        logger.info(
                            f"DEBUG: Current request future: {self._current_request_future}"
                        )
                        if task == self._current_request_future:
                            logger.info("Request completed due to stop event")
                            return

                    except Exception as e:
                        logger.error(f"Error processing event: {e}")

        except asyncio.CancelledError:
            # Handle cancellation gracefully
            logger.info("Event streaming cancelled")
            self._current_request_future = None
            raise
        except Exception as e:
            # Clean up
            self._current_request_future = None
            logger.error(f"Error in event streaming: {e}")
            raise
