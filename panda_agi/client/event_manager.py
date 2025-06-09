import asyncio
import logging
from typing import Any, AsyncGenerator, Dict, Optional

from .models import COMPLETION_MESSAGE_TYPES, BaseStreamEvent, EventFactory, EventType

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
                        event: BaseStreamEvent = task.result()
                        seen_events = True
                        yield event
                        if event.type in COMPLETION_MESSAGE_TYPES:
                            return

                    except Exception as e:
                        logger.error(f"Error processing event: {e}")

        except Exception as e:
            logger.error(f"Error in event streaming: {e}")
            raise e
