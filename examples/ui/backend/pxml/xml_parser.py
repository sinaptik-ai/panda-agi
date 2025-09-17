"""
XML Parser for Dashboard Specifications

Parses XML dashboard files and extracts metadata, transformations, filters, and layout information.
Handles comparison operators in formulas without requiring manual escaping.
"""

import xml.etree.ElementTree as ET
import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from xml.sax.saxutils import escape


@dataclass
class FilterSpec:
    """Filter specification from XML"""

    name: str
    type: str  # list, number_range, date_range
    values_formula: str


@dataclass
class TransformationSpec:
    """Transformation specification from XML"""

    name: str
    formula: str


@dataclass
class KPISpec:
    """KPI specification from XML"""

    fa_icon: str
    name: str
    value_formula: str
    format_type: str
    unit: str


@dataclass
class ChartSeriesSpec:
    """Chart series specification from XML"""

    name: str
    column: str
    aggregation: str
    format_type: str = "number"
    unit: str = ""
    filter_condition: str = ""
    axis: str = "y"  # 'y' for primary (left) axis, 'y1' for secondary (right) axis


@dataclass
class ChartAxisSpec:
    """Chart axis specification from XML"""

    name: str
    column: str
    group_by: str


@dataclass
class ChartSpec:
    """Chart specification from XML"""

    chart_type: str
    name: str
    x_axis: ChartAxisSpec
    series_list: List[ChartSeriesSpec]
    style: str = ""
    area: bool = False
    cumulative: bool = False
    top_n: int = 0  # 0 means show all, >0 means show top N
    default_filter_conditions: List[str] = (
        None  # List of default filter conditions like ["S>0"]
    )


@dataclass
class DashboardMetadata:
    """Dashboard metadata from XML"""

    name: str
    description: str
    file_path: str
    fa_icon: str


class XMLParser:
    """Parses XML dashboard specifications into structured data"""

    def __init__(self):
        self.dashboard_data = {}
        # Mapping for formula operators that need escaping in XML
        self.formula_operators = {
            "<=": "&lt;=",
            ">=": "&gt;=",
            "<>": "&lt;&gt;",
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            '"': "&quot;",
        }

    def _escape_operators_in_content(self, content: str) -> str:
        """Helper method to escape operators in content, processing longer operators first"""
        for operator, escaped in sorted(
            self.formula_operators.items(), key=lambda pair: len(pair[0]), reverse=True
        ):
            content = content.replace(operator, escaped)
        return content

    def remove_xml_comments(self, xml_string: str) -> str:
        """
        Remove all XML comments <!-- comment --> from the input string.
        """
        result = ""
        i = 0
        while i < len(xml_string):
            comment_start = xml_string.find("<!--", i)
            if comment_start == -1:
                # No more comments; append the rest
                result += xml_string[i:]
                break
            # Append text before comment
            result += xml_string[i:comment_start]

            # Find the end of the comment
            comment_end = xml_string.find("-->", comment_start)
            if comment_end == -1:
                # Malformed comment: remove till the end
                break

            # Skip over the comment
            i = comment_end + 3

        return result

    def process_xml(self, xml_string: str) -> str:
        """Process XML string to escape operators in content"""
        i = 0
        result = ""

        while i < len(xml_string):

            # Find next tag
            opening_tag_start = xml_string.find("<", i)
            if opening_tag_start == -1:
                result += escape(xml_string[i:])
                break

            # Escape text before tag
            result += escape(xml_string[i:opening_tag_start])

            opening_tag_end = xml_string.find(">", opening_tag_start)
            if opening_tag_end == -1:
                result += escape(xml_string[opening_tag_start:])
                break

            # Preserve the full opening tag (with attributes)
            full_opening_tag = xml_string[opening_tag_start : opening_tag_end + 1]
            tag_name = full_opening_tag.strip("<>/ ").split()[0]

            # Check if this is a self-closing tag
            if full_opening_tag.endswith("/>"):
                # Self-closing tag - no inner content to process
                result += full_opening_tag
                i = opening_tag_end + 1
                continue

            # Find matching closing tag, handling nested same-name tags
            pos = opening_tag_end + 1
            depth = 1
            while depth > 0:
                next_open = xml_string.find(f"<{tag_name}", pos)
                next_close = xml_string.find(f"</{tag_name}>", pos)

                if next_close == -1:
                    # Malformed XML
                    next_close = len(xml_string)
                    break

                if next_open != -1 and next_open < next_close:
                    depth += 1
                    pos = next_open + 1
                else:
                    depth -= 1
                    pos = next_close + len(f"</{tag_name}>")

            closing_tag_start = pos - len(f"</{tag_name}>")
            inner_content = xml_string[opening_tag_end + 1 : closing_tag_start]

            # Recursively process inner content
            processed_inner = self.process_xml(inner_content)

            # Reconstruct full tag using the preserved opening tag
            full_closing_tag = f"</{tag_name}>"
            result += f"{full_opening_tag}{processed_inner}{full_closing_tag}"

            # Move index past closing tag
            i = closing_tag_start + len(full_closing_tag)

        return result

    def _preprocess_xml_content(self, content: str) -> str:
        """Preprocess XML content to escape comparison operators in formula tags, attributes, and {{}} expressions"""
        # Remove any XML declaration (<?xml version="..." encoding="..."?>)
        content = re.sub(r"<\?pxml[^>]*\?>", "", content)

        xml_input = self.remove_xml_comments(content)
        processed_content = self.process_xml(xml_input)

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
                        formula_content = self._escape_operators_in_content(
                            formula_content
                        )
                        return f'formula="{formula_content}"'

                    line = re.sub(pattern, escape_line_formula, line)

                result.append(line)

            return "\n".join(result)

        processed_content = process_formula_attributes_line_by_line(processed_content)

        return processed_content

    def _unescape_formula(self, formula: str) -> str:
        """Unescape comparison operators in formula strings"""
        if not formula:
            return formula

        # Unescape operators in reverse order
        for operator, escaped in self.formula_operators.items():
            formula = formula.replace(escaped, operator)

        return formula

    def parse(self, file_content: str) -> Dict[str, Any]:
        try:
            # Preprocess to handle comparison operators
            processed_content = self._preprocess_xml_content(file_content)

            # Parse the processed XML
            root = ET.fromstring(processed_content)
            return self.parse_dashboard(root)
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML format: {e}")

    def parse_file(self, xml_file_path: str) -> Dict[str, Any]:
        """Parse XML file and return structured dashboard data"""
        try:
            # Read file content
            with open(xml_file_path, "r", encoding="utf-8") as f:
                content = f.read()

            return self.parse(content)
        except FileNotFoundError:
            raise FileNotFoundError(f"XML file not found: {xml_file_path}")

    def parse_string(self, xml_string: str) -> Dict[str, Any]:
        """Parse XML string and return structured dashboard data"""
        try:
            # Preprocess to handle comparison operators
            processed_content = self._preprocess_xml_content(xml_string)

            # Parse the processed XML
            root = ET.fromstring(processed_content)
            return self.parse_dashboard(root)
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML format: {e}")

    def parse_dashboard(self, root: ET.Element) -> Dict[str, Any]:
        """Parse dashboard XML element into structured data"""
        if root.tag != "dashboard":
            raise ValueError("Root element must be 'dashboard'")

        dashboard_data = {
            "metadata": self._parse_metadata(root),
            "transformations": self._parse_transformations(root),
            "filters": self._parse_filters(root),
            "grid": self._parse_grid(root),
            "insights": self._parse_insights(root),
            "table": self._parse_table(root),
        }

        return dashboard_data

    def _parse_metadata(self, root: ET.Element) -> DashboardMetadata:
        """Parse dashboard metadata"""
        name = self._get_text(root, "name", "Untitled Dashboard")
        description = self._get_text(root, "description", "")
        file_path = self._get_text(root, "file_path", "")
        fa_icon = self._get_text(root, "fa_icon", "fa-chart-line")

        return DashboardMetadata(
            name=name, description=description, file_path=file_path, fa_icon=fa_icon
        )

    def _parse_transformations(self, root: ET.Element) -> List[TransformationSpec]:
        """Parse transformations section"""
        transformations = []
        transformations_elem = root.find("transformations")

        if transformations_elem is not None:
            for define_col in transformations_elem.findall("define_column"):
                name = define_col.get("name", "")

                # Check for formula as attribute first, then as element
                formula = define_col.get("formula", "")
                if not formula:
                    formula_elem = define_col.find("formula")
                    formula = formula_elem.text if formula_elem is not None else ""

                # Unescape comparison operators in formula
                formula = self._unescape_formula(formula)

                if name and formula:
                    transformations.append(
                        TransformationSpec(name=name, formula=formula)
                    )

        return transformations

    def _parse_filters(self, root: ET.Element) -> List[FilterSpec]:
        """Parse filters section"""
        filters = []
        filters_elem = root.find("filters")

        if filters_elem is not None:
            for filter_elem in filters_elem.findall("filter"):
                filter_type = filter_elem.get("type", "list")
                name = self._get_text(filter_elem, "name", "")

                values_elem = filter_elem.find("values")
                values_formula = ""
                if values_elem is not None:
                    formula_elem = values_elem.find("formula")
                    if formula_elem is not None:
                        values_formula = self._unescape_formula(formula_elem.text or "")

                if name:
                    filters.append(
                        FilterSpec(
                            name=name, type=filter_type, values_formula=values_formula
                        )
                    )

        return filters

    def _parse_grid(self, root: ET.Element) -> Dict[str, Any]:
        """Parse grid layout section"""
        grid_data = {"rows": []}
        grid_elem = root.find("grid")

        if grid_elem is not None:
            for row_elem in grid_elem.findall("row"):
                row_data = {"columns": []}

                for col_elem in row_elem.findall("column"):
                    size = col_elem.get("size", "1")
                    column_data = {"size": size, "content": []}

                    # Parse KPIs, Charts, etc.
                    for child in col_elem:
                        if child.tag == "kpi":
                            kpi_spec = self._parse_kpi(child)
                            column_data["content"].append(
                                {"type": "kpi", "spec": kpi_spec}
                            )
                        elif child.tag == "chart":
                            chart_spec = self._parse_chart(child)
                            column_data["content"].append(
                                {"type": "chart", "spec": chart_spec}
                            )
                        else:
                            column_data["content"].append(
                                {"type": child.tag, "element": child}
                            )

                    row_data["columns"].append(column_data)

                grid_data["rows"].append(row_data)

        return grid_data

    def _parse_kpi(self, kpi_elem: ET.Element) -> KPISpec:
        """Parse individual KPI element"""
        fa_icon = self._get_text(kpi_elem, "fa_icon", "fa-chart-line")
        name = self._get_text(kpi_elem, "name", "Untitled KPI")

        # Parse value section
        value_elem = kpi_elem.find("value")
        if value_elem is not None:
            value_formula = self._unescape_formula(
                self._get_text(value_elem, "formula", "0")
            )
            format_type = self._get_text(value_elem, "format", "number")
            unit = self._get_text(value_elem, "unit", "")
        else:
            # Fallback for simple value structure
            value_formula = self._unescape_formula(
                self._get_text(kpi_elem, "value", "0")
            )
            format_type = "number"
            unit = ""

        return KPISpec(
            fa_icon=fa_icon,
            name=name,
            value_formula=value_formula,
            format_type=format_type,
            unit=unit,
        )

    def _parse_chart(self, chart_elem: ET.Element) -> ChartSpec:
        """Parse individual chart element"""
        chart_type = chart_elem.get("type", "bar")
        name = self._get_text(chart_elem, "name", "Untitled Chart")
        style = chart_elem.get("style", "")
        area = chart_elem.get("area", "false").lower() == "true"
        cumulative = chart_elem.get("cumulative", "false").lower() == "true"

        # Parse top_n attribute for bar and horizontal_bar charts
        top_n = 0
        if chart_type in ["bar", "horizontal_bar"]:
            try:
                top_n = int(chart_elem.get("top_n", "0"))
            except ValueError:
                top_n = 0

        # Parse x_axis
        x_axis_elem = chart_elem.find("x_axis")
        if x_axis_elem is not None:
            x_axis = ChartAxisSpec(
                name=self._get_text(x_axis_elem, "name", "X Axis"),
                column=self._get_text(x_axis_elem, "column", "A"),
                group_by=self._get_text(
                    x_axis_elem, "group_by", self._get_text(x_axis_elem, "column", "A")
                ),
            )
        else:
            x_axis = ChartAxisSpec(name="X Axis", column="A", group_by="A")

        # Parse series_list
        series_list = []
        series_list_elem = chart_elem.find("series_list")
        if series_list_elem is not None:
            for series_elem in series_list_elem.findall("series"):
                series_spec = ChartSeriesSpec(
                    name=self._get_text(series_elem, "name", "Series"),
                    column=self._get_text(series_elem, "column", "B"),
                    aggregation=self._get_text(series_elem, "aggregation", "sum"),
                    format_type=self._get_text(series_elem, "format", "number"),
                    unit=self._get_text(series_elem, "unit", ""),
                    filter_condition=self._get_text(
                        series_elem, "filter_condition", ""
                    ),
                    axis=self._get_text(
                        series_elem, "axis", "y"
                    ),  # Will be auto-assigned in JavaScript
                )
                series_list.append(series_spec)

        # Parse default filters
        default_filter_conditions = []
        filters_elem = chart_elem.find("filters")
        if filters_elem is not None:
            default_filter_elem = filters_elem.find("default_filter")
            if default_filter_elem is not None:
                conditions_elem = default_filter_elem.find("conditions")
                if conditions_elem is not None:
                    for condition_elem in conditions_elem.findall("condition"):
                        condition_text = condition_elem.text
                        if condition_text and condition_text.strip():
                            # Unescape any operators in the condition
                            condition_text = self._unescape_formula(
                                condition_text.strip()
                            )
                            default_filter_conditions.append(condition_text)

        return ChartSpec(
            chart_type=chart_type,
            name=name,
            x_axis=x_axis,
            series_list=series_list,
            style=style,
            area=area,
            cumulative=cumulative,
            top_n=top_n,
            default_filter_conditions=(
                default_filter_conditions if default_filter_conditions else None
            ),
        )

    def _parse_insights(self, root: ET.Element) -> List[Dict[str, str]]:
        """Parse insights section"""
        insights = []
        insights_elem = root.find("insights")

        if insights_elem is not None:
            for insight_elem in insights_elem.findall("insight"):
                content = self._get_text(insight_elem, "content", "")
                if content:
                    insights.append({"content": content})

        return insights

    def _parse_table(self, root: ET.Element) -> Optional[Dict[str, Any]]:
        """Parse table section"""
        table_elem = root.find("table")
        if table_elem is None:
            return None

        name = self._get_text(table_elem, "name", "Data Table")
        fields = []

        fields_elem = table_elem.find("fields")
        if fields_elem is not None:
            for field_elem in fields_elem.findall("field"):
                field_data = {
                    "name": self._get_text(field_elem, "name", ""),
                    "column": self._get_text(field_elem, "column", ""),
                    "format": self._get_text(field_elem, "format", "text"),
                    "unit": self._get_text(field_elem, "unit", ""),
                }
                if field_data["name"] and field_data["column"]:
                    fields.append(field_data)

        return {"name": name, "fields": fields}

    def _get_text(self, parent: ET.Element, tag: str, default: str = "") -> str:
        """Safely get text content of a child element"""
        elem = parent.find(tag)
        return elem.text if elem is not None and elem.text else default
