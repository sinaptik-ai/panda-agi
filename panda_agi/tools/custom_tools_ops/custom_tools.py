import inspect
import re
from typing import Any, Callable, Dict, List, Optional, Union

from panda_agi.client.models import CustomTool, CustomToolParameter


class CustomToolRegistry:
    """Registry for managing custom tools"""

    _tools: Dict[str, CustomTool] = {}

    @classmethod
    def register(cls, tool: CustomTool):
        """Register a custom tool"""
        cls._tools[tool.name] = tool

    @classmethod
    def get_tool(cls, name: str) -> Optional[CustomTool]:
        """Get a custom tool by name"""
        return cls._tools.get(name)

    @classmethod
    def list_tools(cls) -> List[str]:
        """List all registered custom tool names"""
        return list(cls._tools.keys())

    @classmethod
    def get_all_tools(cls) -> List[CustomTool]:
        """Get all registered custom tools"""
        return list(cls._tools.values())

    @classmethod
    def clear(cls):
        """Clear all custom tools (useful for testing)"""
        cls._tools.clear()


def _parse_google_docstring(docstring: str) -> Dict[str, Any]:
    """Parse Google-style docstring to extract tool metadata"""

    result = {"description": "", "parameters": [], "returns": "", "examples": []}

    if not docstring:
        return result

    # Clean up the docstring
    lines = [line.strip() for line in docstring.strip().split("\n")]

    current_section = "description"
    current_param = None

    for line in lines:
        # Check for section headers
        if line in ["Args:", "Arguments:", "Parameters:", "Params:"]:
            current_section = "args"
            continue
        elif line in ["Returns:", "Return:"]:
            current_section = "returns"
            continue
        elif line in ["Examples:", "Example:"]:
            current_section = "examples"
            continue
        elif line == "":
            continue

        if current_section == "description":
            if result["description"]:
                result["description"] += " " + line
            else:
                result["description"] = line

        elif current_section == "args":
            # Look for parameter definition: param_name (type): description
            param_match = re.match(r"(\w+)\s*\(([^)]+)\):\s*(.+)", line)
            if param_match:
                param_name, param_type, param_desc = param_match.groups()

                # Check if parameter is optional
                required = True
                default = None
                if "optional" in param_desc.lower():
                    required = False

                # Extract default value if present
                default_match = re.search(
                    r"default[:\s]+([^,\.].*?)(?:[,\.]|$)", param_desc, re.IGNORECASE
                )
                if default_match:
                    default_str = default_match.group(1).strip()
                    required = False  # If there's a default, it's optional
                    # Try to parse common default values
                    if default_str.lower() == "none":
                        default = None
                    elif default_str.lower() in ["true", "false"]:
                        default = default_str.lower() == "true"
                    elif default_str.isdigit():
                        default = int(default_str)
                    else:
                        default = default_str

                result["parameters"].append(
                    {
                        "name": param_name,
                        "type": param_type.strip(),
                        "description": param_desc.strip(),
                        "required": required,
                        "default": default,
                    }
                )
            elif current_param and line.startswith("    "):
                # Continuation of previous parameter description
                result["parameters"][-1]["description"] += " " + line.strip()

        elif current_section == "returns":
            if result["returns"]:
                result["returns"] += " " + line
            else:
                result["returns"] = line

        elif current_section == "examples":
            if line.strip():
                result["examples"].append(line.strip())

    return result


def tool(name_or_func: Optional[Union[str, Callable]] = None):
    """
    Decorator to create a custom tool from a function

    Args:
        name_or_func: Either a custom name for the tool or the function itself (when used as @tool)

    Returns:
        The decorated function or decorator

    Examples:
        @tool
        def calculate_area(width: float, height: float) -> float:
            '''
            Calculate the area of a rectangle

            Args:
                width (float): Width of the rectangle
                height (float): Height of the rectangle

            Returns:
                float: The calculated area

            Examples:
                calculate_area(5.0, 3.0) returns 15.0
            '''
            return width * height

        @tool("custom_name")
        def my_function():
            pass
    """

    def decorator(func: Callable) -> Callable:
        # Get function name
        tool_name = name_or_func if isinstance(name_or_func, str) else func.__name__

        # Parse docstring
        docstring_data = _parse_google_docstring(func.__doc__ or "")

        # Get function signature to validate parameters
        sig = inspect.signature(func)

        # Create tool parameters from docstring and function signature
        tool_params = []
        for param_name, param in sig.parameters.items():
            # Find corresponding docstring parameter
            docstring_param = next(
                (p for p in docstring_data["parameters"] if p["name"] == param_name),
                None,
            )

            # Determine if parameter is required based on function signature
            required = param.default == inspect.Parameter.empty
            default = (
                param.default if param.default != inspect.Parameter.empty else None
            )

            if docstring_param:
                # Use docstring info but override required/default from function signature
                tool_params.append(
                    CustomToolParameter(
                        name=docstring_param["name"],
                        type=docstring_param["type"],
                        description=docstring_param["description"],
                        required=required,
                        default=default,
                    )
                )
            else:
                # Create parameter from signature if not in docstring
                param_type = (
                    str(param.annotation)
                    if param.annotation != inspect.Parameter.empty
                    else "Any"
                )

                # Extract simple type name from class representation
                if param_type.startswith("<class '") and param_type.endswith("'>"):
                    param_type = param_type[8:-2]  # Remove "<class '" and "'>"
                elif hasattr(param.annotation, "__name__"):
                    param_type = param.annotation.__name__

                tool_params.append(
                    CustomToolParameter(
                        name=param_name,
                        type=param_type,
                        description=f"Parameter {param_name}",
                        required=required,
                        default=default,
                    )
                )

        # Create the custom tool
        tool_obj = CustomTool(
            name=tool_name,
            description=docstring_data["description"] or f"Custom tool {tool_name}",
            parameters=tool_params,
            returns=docstring_data["returns"] or "Any",
            examples=docstring_data["examples"],
            function=func,
        )

        # Register the tool
        CustomToolRegistry.register(tool_obj)

        # Add tool attribute to function for easy access
        func._custom_tool = tool_obj

        return func

    # Handle both @tool and @tool() and @tool("name") syntax
    if callable(name_or_func):
        # Called as @tool (without parentheses)
        return decorator(name_or_func)
    else:
        # Called as @tool() or @tool("name") (with parentheses)
        return decorator


def get_all_custom_tools_as_string() -> str:
    """Get all registered custom tools as string"""
    return "\n".join([tool.to_string() for tool in CustomToolRegistry.get_all_tools()])


async def execute_custom_tool(tool_name: str, parameters: Dict[str, str]) -> Any:
    """Execute a custom tool by name with given parameters"""
    tool_obj = CustomToolRegistry.get_tool(tool_name)
    if not tool_obj:
        raise ValueError(f"Custom tool '{tool_name}' not found")

    return await tool_obj.execute(**parameters)
