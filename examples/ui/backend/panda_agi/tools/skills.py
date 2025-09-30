from typing import Any, Dict, Optional

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .registry import ToolRegistry
from .skills_ops import SkillRegistry, execute_skill


@ToolRegistry.register(
    "use_skill",
    xml_tag="use_skill",
    required_params=["skill_name"],
    optional_params=["parameters"],
    attribute_mappings={"skill_name": "skill_name"},
)
class UseSkillHandler(ToolHandler):
    """Handler for using custom skills"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["skill_name"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"

        # Check if skill exists
        skill_name = params["skill_name"]
        if not SkillRegistry.get_skill(skill_name):
            available_skills = SkillRegistry.list_skills()
            return f"Skill '{skill_name}' not found. Available skills: {', '.join(available_skills) if available_skills else 'None'}"

        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        skill_name = params["skill_name"]
        skill_parameters = params.get("parameters", {})

        try:
            # Add initial event for skill execution
            await self.add_event(
                EventType.USE_SKILL,
                {"skill_name": skill_name, "parameters": skill_parameters},
            )

            # Execute the skill
            result = await execute_skill(skill_name, skill_parameters)

            # Add completion event with result
            await self.add_event(
                EventType.USE_SKILL_RESULT,
                {
                    "skill_name": skill_name,
                    "parameters": skill_parameters,
                    "result": {"success": True, "data": result},
                },
            )

            return ToolResult(
                success=True,
                data={"skill_name": skill_name, "result": result},
                error=None,
            )

        except Exception as e:
            # Add error event
            await self.add_event(
                EventType.USE_SKILL_RESULT,
                {
                    "skill_name": skill_name,
                    "parameters": skill_parameters,
                    "result": {"success": False, "error": str(e)},
                },
            )

            return ToolResult(
                success=False,
                data={"skill_name": skill_name},
                error=f"Error executing skill '{skill_name}': {str(e)}",
            )
