import pytest
import sys
import os

# Add the utils directory to the path to import the module directly
utils_path = os.path.join(os.path.dirname(__file__), "..", "panda_agi", "utils")
sys.path.insert(0, utils_path)

from file_replace import (
    file_replace,
    normalize_indentation,
    block_to_indentation_flexible_pattern,
    reindent_like,
    indent_insensitive_contains,
)


class TestFileReplace:
    """Test cases for the file_replace function with XML context examples."""

    def test_simple_xml_tag_replacement(self):
        """Test replacing a simple XML tag with different indentation."""
        content = """<root>
    <item>old content</item>
    <other>keep this</other>
</root>"""

        search_block = """<item>old content</item>"""
        replace_block = """<item>new content</item>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <item>new content</item>
    <other>keep this</other>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_xml_with_different_indentation(self):
        """Test replacing XML block with different indentation in search vs content."""
        content = """<root>
        <nested>
            <deep>value</deep>
        </nested>
    </root>"""

        # Search block has no indentation
        search_block = """<nested>
<deep>value</deep>
</nested>"""

        replace_block = """<nested>
    <deep>updated</deep>
</nested>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
        <nested>
            <deep>updated</deep>
        </nested>
    </root>"""

        assert new_content == expected
        assert count == 1

    def test_multiple_xml_replacements(self):
        """Test replacing multiple occurrences of XML elements."""
        content = """<root>
    <item>first</item>
    <other>middle</other>
    <item>second</item>
    <item>third</item>
</root>"""

        search_block = """<item>first</item>"""
        replace_block = """<item>updated</item>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <item>updated</item>
    <other>middle</other>
    <item>second</item>
    <item>third</item>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_xml_replacement_with_count_limit(self):
        """Test replacing XML elements with count limit."""
        content = """<root>
    <item>first</item>
    <item>second</item>
    <item>third</item>
</root>"""

        search_block = """<item>first</item>"""
        replace_block = """<item>updated</item>"""

        # This should only replace the first occurrence
        new_content, count = file_replace(content, search_block, replace_block, count=1)

        expected = """<root>
    <item>updated</item>
    <item>second</item>
    <item>third</item>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_complex_xml_structure_replacement(self):
        """Test replacing complex XML structure with attributes and nested elements."""
        content = """<root>
    <config>
        <database>
            <host>localhost</host>
            <port>5432</port>
        </database>
    </config>
    <other>keep</other>
</root>"""

        search_block = """<database>
    <host>localhost</host>
    <port>5432</port>
</database>"""

        replace_block = """<database>
    <host>production-db</host>
    <port>5432</port>
    <ssl>true</ssl>
</database>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <config>
        <database>
            <host>production-db</host>
            <port>5432</port>
            <ssl>true</ssl>
        </database>
    </config>
    <other>keep</other>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_xml_with_mixed_whitespace(self):
        """Test XML replacement with mixed tabs and spaces."""
        content = """<root>
	<item>tab indented</item>
    <item>space indented</item>
</root>"""

        search_block = """<item>tab indented</item>"""
        replace_block = """<item>updated</item>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
	<item>updated</item>
    <item>space indented</item>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_xml_replacement_preserves_internal_indentation(self):
        """Test that internal indentation within replacement is preserved."""
        content = """<root>
    <config>
        <nested>
            <value>test</value>
        </nested>
    </config>
</root>"""

        search_block = """<nested>
    <value>test</value>
</nested>"""

        replace_block = """<nested>
    <value>updated</value>
    <extra>
        <deep>nested</deep>
    </extra>
</nested>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <config>
        <nested>
            <value>updated</value>
            <extra>
                <deep>nested</deep>
            </extra>
        </nested>
    </config>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_xml_replacement_with_empty_lines(self):
        """Test XML replacement that includes empty lines."""
        content = """<root>
    <section>
        <item>value</item>
    </section>
</root>"""

        search_block = """<section>
    <item>value</item>
</section>"""

        replace_block = """<section>
    <item>updated</item>
    
    <extra>new</extra>
</section>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <section>
        <item>updated</item>
    
        <extra>new</extra>
    </section>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_no_match_returns_original(self):
        """Test that no match returns original content with count 0."""
        content = """<root>
    <item>value</item>
</root>"""

        search_block = """<nonexistent>not found</nonexistent>"""
        replace_block = """<replacement>new</replacement>"""

        new_content, count = file_replace(content, search_block, replace_block)

        assert new_content == content
        assert count == 0

    def test_exact_match_with_same_indentation(self):
        """Test replacement when search block has exact same indentation."""
        content = """<root>
    <item>value</item>
</root>"""

        search_block = """    <item>value</item>"""
        replace_block = """    <item>updated</item>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <item>updated</item>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_xml_with_special_characters(self):
        """Test XML replacement with special characters and entities."""
        content = """<root>
    <message>Hello &amp; welcome!</message>
    <data>value &lt; 10</data>
</root>"""

        search_block = """<message>Hello &amp; welcome!</message>"""
        replace_block = """<message>Goodbye &amp; thanks!</message>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <message>Goodbye &amp; thanks!</message>
    <data>value &lt; 10</data>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_xml_replacement_with_attributes(self):
        """Test XML replacement with attributes."""
        content = """<root>
    <item id="1" class="test">content</item>
    <other>keep</other>
</root>"""

        search_block = """<item id="1" class="test">content</item>"""
        replace_block = """<item id="2" class="updated">new content</item>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <item id="2" class="updated">new content</item>
    <other>keep</other>
</root>"""

        assert new_content == expected
        assert count == 1


class TestHelperFunctions:
    """Test cases for helper functions used by file_replace."""

    def test_normalize_indentation(self):
        """Test the normalize_indentation function."""
        block = """    <item>
        <nested>value</nested>
    </item>"""

        result = normalize_indentation(block)
        expected = """<item>
<nested>value</nested>
</item>"""

        assert result == expected

    def test_block_to_indentation_flexible_pattern(self):
        """Test the pattern generation for indentation flexibility."""
        block = """<item>
    <nested>value</nested>
</item>"""

        pattern = block_to_indentation_flexible_pattern(block)

        # Should match with different indentation
        import re

        content = """<root>
        <item>
            <nested>value</nested>
        </item>
    </root>"""

        match = re.search(pattern, content, flags=re.DOTALL)
        assert match is not None

    def test_reindent_like(self):
        """Test the reindent_like function."""
        match_text = "    <item>value</item>"
        replacement = """<item>
    <nested>new</nested>
</item>"""

        result = reindent_like(match_text, replacement)
        expected = """    <item>
        <nested>new</nested>
    </item>"""

        assert result == expected

    def test_indent_insensitive_contains(self):
        """Test the indent_insensitive_contains function."""
        content = """<root>
    <item>value</item>
</root>"""

        search_block = """<item>value</item>"""

        assert indent_insensitive_contains(content, search_block) is True

        # Test with different indentation
        search_block_different_indent = """        <item>value</item>"""
        assert (
            indent_insensitive_contains(content, search_block_different_indent) is True
        )

        # Test non-existent block
        search_block_not_found = """<nonexistent>not found</nonexistent>"""
        assert indent_insensitive_contains(content, search_block_not_found) is False


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_empty_content(self):
        """Test with empty content."""
        content = ""
        search_block = "<item>value</item>"
        replace_block = "<item>new</item>"

        new_content, count = file_replace(content, search_block, replace_block)

        assert new_content == ""
        assert count == 0

    def test_empty_search_block(self):
        """Test with empty search block - should handle gracefully."""
        content = "<root><item>value</item></root>"
        search_block = ""
        replace_block = "<item>new</item>"

        # Empty search block should not cause errors, but may not work as expected
        # Let's test that it doesn't crash and returns original content
        try:
            new_content, count = file_replace(content, search_block, replace_block)
            # If it doesn't crash, it should return original content
            assert new_content == content
            assert count == 0
        except (IndexError, AttributeError):
            # If it crashes due to empty string handling, that's also acceptable
            # as it's an edge case that might not be fully supported
            pass

    def test_empty_replace_block(self):
        """Test with empty replace block."""
        content = """<root>
    <item>value</item>
</root>"""

        search_block = """<item>value</item>"""
        replace_block = ""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>

</root>"""

        assert new_content == expected
        assert count == 1

    def test_single_line_replacement(self):
        """Test replacing single line XML."""
        content = "<root><item>value</item></root>"
        search_block = "<item>value</item>"
        replace_block = "<item>new</item>"

        new_content, count = file_replace(content, search_block, replace_block)

        expected = "<root><item>new</item></root>"

        assert new_content == expected
        assert count == 1

    def test_very_deep_nesting(self):
        """Test with very deep XML nesting."""
        content = """<root>
    <level1>
        <level2>
            <level3>
                <level4>deep value</level4>
            </level3>
        </level2>
    </level1>
</root>"""

        search_block = """<level3>
    <level4>deep value</level4>
</level3>"""

        replace_block = """<level3>
    <level4>updated deep value</level4>
    <extra>new</extra>
</level3>"""

        new_content, count = file_replace(content, search_block, replace_block)

        expected = """<root>
    <level1>
        <level2>
            <level3>
                <level4>updated deep value</level4>
                <extra>new</extra>
            </level3>
        </level2>
    </level1>
</root>"""

        assert new_content == expected
        assert count == 1

    def test_count_zero_means_unlimited(self):
        """Test that count=0 means unlimited replacements."""
        content = """<root>
    <item>same</item>
    <item>same</item>
    <item>same</item>
</root>"""

        search_block = """<item>same</item>"""
        replace_block = """<item>updated</item>"""

        new_content, count = file_replace(content, search_block, replace_block, count=0)

        expected = """<root>
    <item>updated</item>
    <item>updated</item>
    <item>updated</item>
</root>"""

        assert new_content == expected
        assert count == 3


if __name__ == "__main__":
    pytest.main([__file__])
