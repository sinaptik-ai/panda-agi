import importlib.util
from functools import wraps
import inspect
from contextlib import ContextDecorator, ExitStack
from .utils.logger import ProxyLogger
from typing import List, Optional

# Safely import proxies
def is_package_installed(package_name):
    """Check if a package is installed."""
    return importlib.util.find_spec(package_name) is not None

# Define proxy imports with safe fallbacks
def get_available_proxies():
    """Get a dictionary of available proxies and their availability status."""
    proxies = {}
    
    # Check OpenAI
    try:
        if is_package_installed('openai'):
            from .proxy.openai_proxy import OpenAIProxy
            proxies['openai'] = OpenAIProxy
    except ImportError:
        pass
    
    # Check Anthropic
    try:
        if is_package_installed('anthropic'):
            from .proxy.anthropic_proxy import AnthropicProxy
            proxies['anthropic'] = AnthropicProxy
    except ImportError:
        pass
    
    # Check LiteLLM
    try:
        if is_package_installed('litellm'):
            from .proxy.litellm_proxy import LiteLLMProxy
            proxies['litellm'] = LiteLLMProxy
    except ImportError:
        pass
        
    return proxies

class collect(ContextDecorator):
    def __init__(self, model_name: Optional[str] = None, tags: Optional[List[str]] = None, providers: Optional[List[str]] = None, debug: Optional[bool] = False):
        self.model_name = model_name
        self.tags = tags or []
        available = get_available_proxies()
        self.providers = providers or list(available.keys())
        self.providers = [p for p in self.providers if p in available]
        self.available = available
        self.debug = debug
        self.logger = ProxyLogger(self.__class__.__name__, debug)

    def __enter__(self):
        self.stack = ExitStack()
        self.active = []
        for provider in self.providers:
            try:
                proxy = self.stack.enter_context(self.available[provider](model_name=self.model_name, tags=self.tags, debug=self.debug))
                self.active.append(proxy)
            except Exception as e:
                self.logger.error(f"Error setting up {provider} proxy: {e}")

        return self

    def __exit__(self, exc_type, exc, tb):
        # ExitStack handles cleanup, then display collected data
        for proxy in self.active:
            data = getattr(proxy, "collected_data", None)
            if data:
                self.logger.debug(f"{proxy.__class__.__name__} collected data:\n{data}")
        self.stack.close()
        return False

    def __call__(self, func):
        if inspect.iscoroutinefunction(func):
            async def async_wrapper(*args, **kwargs):
                with self:
                    return await func(*args, **kwargs)
            return wraps(func)(async_wrapper)
        else:
            def sync_wrapper(*args, **kwargs):
                with self:
                    return func(*args, **kwargs)
            return wraps(func)(sync_wrapper)
