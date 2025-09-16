from typing import Optional, Tuple
import xml.etree.ElementTree as ET
import re


def validate_xml_parser(
    content: str, file_extension: str = ".pxml"
) -> Tuple[bool, Optional[str]]:
    """
    Validates XML content for the XML parser, with special handling for pxml files.
    Uses the same preprocessing logic as the XML parser to ensure consistency.

    Args:
        content: The XML content to validate
        file_extension: The file extension (default: ".pxml")

    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if XML is valid, False otherwise
        - error_message: Error description if invalid, None if valid
    """
    if not content or not content.strip():
        return True, None  # Empty content is considered valid

    try:
        # Preprocess content using the same logic as the XML parser
        if file_extension == ".pxml":
            processed_content = _preprocess_xml_content(content)
        else:
            processed_content = content

        # Parse the preprocessed XML
        ET.fromstring(processed_content)

        return True, None

    except ET.ParseError as e:
        return False, f"XML parsing error: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error during XML validation: {str(e)}"


def _preprocess_xml_content(content: str) -> str:
    """
    Preprocess XML content to escape comparison operators in formula tags, attributes, and {{}} expressions.
    This is the same preprocessing logic used by the XML parser to ensure consistency.
    """
    # Mapping for formula operators that need escaping in XML
    formula_operators = {
        "<=": "&lt;=",
        ">=": "&gt;=",
        "<>": "&lt;&gt;",
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
    }

    # Find all formula tags and escape operators within them
    def escape_formula_content(match):
        formula_content = match.group(1)
        # Escape operators in order of specificity (longer operators first)
        for operator, escaped in sorted(
            formula_operators.items(), key=len, reverse=True
        ):
            formula_content = formula_content.replace(operator, escaped)
        return f"<formula>{formula_content}</formula>"

    # Find all {{}} expressions and escape operators within them
    def escape_curly_brace_formula(match):
        formula_content = match.group(1)
        # Escape operators in order of specificity (longer operators first)
        for operator, escaped in sorted(
            formula_operators.items(), key=len, reverse=True
        ):
            formula_content = formula_content.replace(operator, escaped)
        return f"{{{{{formula_content}}}}}"

    # Find all name tags and escape operators within them
    def escape_name_content(match):
        name_content = match.group(1)
        # Escape operators in order of specificity (longer operators first)
        for operator, escaped in sorted(
            formula_operators.items(), key=len, reverse=True
        ):
            name_content = name_content.replace(operator, escaped)
        return f"<name>{name_content}</name>"

    # Pattern to match content within formula tags
    formula_pattern = r"<formula>(.*?)</formula>"
    processed_content = re.sub(
        formula_pattern, escape_formula_content, content, flags=re.DOTALL
    )

    # Pattern to match content within name tags
    name_pattern = r"<name>(.*?)</name>"
    processed_content = re.sub(
        name_pattern, escape_name_content, processed_content, flags=re.DOTALL
    )

    # Pattern to match content within {{ }} expressions
    curly_brace_pattern = r"\{\{(.*?)\}\}"
    processed_content = re.sub(
        curly_brace_pattern,
        escape_curly_brace_formula,
        processed_content,
        flags=re.DOTALL,
    )

    # Handle formula attributes - use a more targeted approach
    # Process each line individually to avoid greedy matching across the entire file
    # IMPORTANT: This is needed because LLMs often generate formula="" with nested quotes like "Q1", "Q2"
    # which breaks standard XML parsing without proper escaping
    def process_formula_attributes_line_by_line(content):
        lines = content.split("\n")
        result = []

        for line in lines:
            # Look for formula attributes in this line only
            if 'formula="' in line:
                # Use a simpler approach for single-line formulas
                pattern = r'formula="([^"]*(?:"[^"]*"[^"]*)*)"'

                def escape_line_formula(match):
                    formula_content = match.group(1)
                    for operator, escaped in sorted(
                        formula_operators.items(), key=len, reverse=True
                    ):
                        formula_content = formula_content.replace(operator, escaped)
                    return f'formula="{formula_content}"'

                line = re.sub(pattern, escape_line_formula, line)

            result.append(line)

        return "\n".join(result)

    processed_content = process_formula_attributes_line_by_line(processed_content)

    return processed_content
