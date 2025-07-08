from typing import Union, List, Dict, Any, Optional
from .conversation import Conversation, ConversationMessage
from .utils import send_traces
import asyncio


class TrainingModel:
    """
    A class to collect and send LLM conversation data to the backend server for training.
    
    This class provides both synchronous and asynchronous methods to collect conversation
    data and send it to a backend server for storage or analysis. It handles the conversion
    of raw message dictionaries to ConversationMessage objects and manages the creation
    of Conversation objects with appropriate metadata.
    
    Attributes:
        name (str): The name of the model being used
        meta (Optional[Dict]): Additional metadata to associate with conversations
        tags (List[str]): Tags to categorize the conversations
    
    Example:
        ```python
        # Synchronous usage
        model = TrainingModel(name="model_name")
        model.collect([
            {"role": "user", "content": "Hello, how are you?"},
            {"role": "assistant", "content": "I'm doing well, thank you!"}
        ])
        ```
    """
    def __init__(self, name: str, tags: Optional[List[str]] = None, meta: Optional[Dict]=None):
        """
        Initialize a TrainingModel instance.
        
        Args:
            name (str): The name of the model to train
            tags (Optional[List[str]]): List of tags to categorize conversations
            meta (Optional[Dict]): Additional metadata to associate with all conversations
                collected by this instance
        """
        self.name = name
        self.meta = meta
        self.tags = tags or []

    def collect(self, conversation_messages: Union[List[ConversationMessage], List[Dict[str, Any]]]):
        """
        Synchronously accepts a list of messages and stores the conversation.
        
        Args:
            conversation_messages: List of messages in ConversationMessage format or dict format
            
        Returns:
            The created Conversation object
        """
        conversation_messages = [ConversationMessage(**message) if isinstance(message, dict) else message for message in conversation_messages]

        conversation = Conversation(messages=conversation_messages, model_name=self.name, meta=self.meta, tags=self.tags)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(send_traces(conversation))
        except RuntimeError:
            # No running loop (e.g. in sync script) – fallback
            asyncio.run(send_traces(conversation))
            
        return conversation
