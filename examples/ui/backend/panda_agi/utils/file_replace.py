import re


def normalize_indentation(block: str) -> str:
    """Remove leading indentation from all lines, but keep inner spacing intact."""
    lines = block.strip().splitlines()
    normalized = [re.sub(r"^[ \t]+", "", line) for line in lines]
    return "\n".join(normalized)


def block_to_indentation_flexible_pattern(block: str) -> str:
    """
    Create regex pattern that ignores indentation differences only.
    Spaces inside text/content are preserved literally.
    """
    normalized = normalize_indentation(block)
    # Escape everything literally, but allow optional leading whitespace per line
    escaped_lines = [r"[ \t]*" + re.escape(line) for line in normalized.splitlines()]
    return r"\n".join(escaped_lines)


def reindent_like(match_text: str, replacement: str) -> str:
    """
    Re-indent `replacement` so its lines align with the indentation of the first
    non-empty line in `match_text`.
    """
    first_line = match_text.splitlines()[0]
    indent = re.match(r"[ \t]*", first_line).group(0)

    rep_lines = replacement.splitlines()
    if not rep_lines:
        return replacement

    # Apply indent to all lines (but keep internal indentation relative)
    rep_lines = [indent + rep_lines[0].lstrip()] + [
        indent + ln if ln.strip() else ln  # preserve empty lines
        for ln in rep_lines[1:]
    ]
    return "\n".join(rep_lines)


def indent_insensitive_contains(content: str, search_block: str) -> bool:
    """
    Return True if search_block exists in content, ignoring only indentation differences.
    """
    pat = block_to_indentation_flexible_pattern(search_block)
    return re.search(pat, content, flags=re.DOTALL) is not None


def file_replace(content: str, search_block: str, replace_block: str, count: int = 0):
    """
    Replace occurrences of search_block ignoring indentation differences only.
    Returns (new_content, num_replacements).
    """
    if not search_block:
        return content, 0

    pat = block_to_indentation_flexible_pattern(search_block)
    regex = re.compile(pat, flags=re.DOTALL)

    def _do(m: re.Match) -> str:
        return reindent_like(m.group(0), replace_block)

    new_content, n = regex.subn(_do, content, count=count if count else 0)
    return new_content, n
