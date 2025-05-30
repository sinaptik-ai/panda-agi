import asyncio
import logging
from typing import Any, AsyncGenerator, Dict, Optional

from .models import BaseStreamEvent, EventFactory, EventType

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
        self._request_complete_event = None

    async def add_event(self, event_type: EventType, data: Dict[str, Any]):
        """Add an event to the queue"""
        event = EventFactory.create(event_type, data)
        await self._event_queue.put(event)

    async def get_event(self):
        """Get an event from the queue"""
        return await self._event_queue.get()

    def set_event_queue(self, event_queue: EventQueue):
        """Set the event queue instance"""
        self._event_queue = event_queue

    def set_request_complete_event(self, event: asyncio.Event):
        """Set the current request future for completion tracking"""
        self._request_complete_event = event

    async def stream_events(
        self, timeout: Optional[float] = None
    ) -> AsyncGenerator[BaseStreamEvent, None]:
        """
        Stream events from the queue with timeout and completion handling

        Args:
            timeout: Maximum time to wait for events in seconds

        Yields:
            BaseStreamEvent: Events from the queue
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

                wait_tasks = [queue_task]
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
                        if (
                            self._request_complete_event
                            and self._request_complete_event.is_set()
                        ):
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
