import inspect
import re
from typing import Any, Callable, Dict, List, Optional, Union

from panda_agi.client.models import Skill, SkillParameter


class SkillRegistry:
    """Registry for managing skills"""

    _skills: Dict[str, Skill] = {}

    @classmethod
    def register(cls, skill: Skill):
        """Register a skill"""
        cls._skills[skill.name] = skill

    @classmethod
    def get_skill(cls, name: str) -> Optional[Skill]:
        """Get a skill by name"""
        return cls._skills.get(name)

    @classmethod
    def list_skills(cls) -> List[str]:
        """List all registered skill names"""
        return list(cls._skills.keys())

    @classmethod
    def get_all_skills(cls) -> List[Skill]:
        """Get all registered skills"""
        return list(cls._skills.values())

    @classmethod
    def clear(cls):
        """Clear all skills (useful for testing)"""
        cls._skills.clear()


def _parse_google_docstring(docstring: str) -> Dict[str, Any]:
    """Parse Google-style docstring to extract skill metadata"""

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
            if line:
                result["examples"].append(line)

    return result


def skill(name_or_func: Optional[Union[str, Callable]] = None):
    """
    Decorator to create a skill from a function

    Args:
        name_or_func: Either a custom name for the skill or the function itself (when used as @skill)

    Returns:
        The decorated function or decorator

    Examples:
        @skill
        def calculate_area(width: float, height: float) -> float:
            '''Calculate the area of a rectangle.

            Args:
                width (float): Width of the rectangle
                height (float): Height of the rectangle

            Returns:
                float: The calculated area

            Examples:
                calculate_area(5.0, 3.0) returns 15.0
            '''
            return width * height

        @skill("custom_name")
        def my_function():
            pass
    """

    def decorator(func: Callable) -> Callable:
        # Get function name
        skill_name = name_or_func if isinstance(name_or_func, str) else func.__name__

        # Parse docstring
        docstring_data = _parse_google_docstring(func.__doc__ or "")

        # Get function signature to validate parameters
        sig = inspect.signature(func)

        # Create skill parameters from docstring and function signature
        skill_params = []
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
                skill_params.append(
                    SkillParameter(
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

                skill_params.append(
                    SkillParameter(
                        name=param_name,
                        type=param_type,
                        description=f"Parameter {param_name}",
                        required=required,
                        default=default,
                    )
                )

        # Create the skill
        skill_obj = Skill(
            name=skill_name,
            description=docstring_data["description"] or f"Skill {skill_name}",
            parameters=skill_params,
            returns=docstring_data["returns"] or "Any",
            examples=docstring_data["examples"],
            function=func,
        )

        # Register the skill
        SkillRegistry.register(skill_obj)

        # Add skill attribute to function for easy access
        func._skill = skill_obj

        return func

    # Handle both @skill and @skill() and @skill("name") syntax
    if callable(name_or_func):
        # Called as @skill (without parentheses)
        return decorator(name_or_func)
    else:
        # Called as @skill() or @skill("name") (with parentheses)
        return decorator


def get_all_skills_as_string() -> str:
    """Get all registered skills as string"""
    return "\n".join([skill.to_string() for skill in SkillRegistry.get_all_skills()])


async def execute_skill(skill_name: str, parameters: Dict[str, str]) -> Any:
    """Execute a skill by name with given parameters"""
    skill_obj = SkillRegistry.get_skill(skill_name)
    if not skill_obj:
        raise ValueError(f"Skill '{skill_name}' not found")

    return await skill_obj.execute(**parameters)
