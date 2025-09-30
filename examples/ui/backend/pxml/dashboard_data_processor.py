"""
Dashboard Data Processor

Prepares comprehensive JSON configuration for frontend rendering.
Separates data preparation logic from HTML generation.
"""

import json
import uuid
from typing import Dict, List, Any, Optional
from .xml_parser import FilterSpec, DashboardMetadata, KPISpec, ChartSpec
from .formula_evaluator import FormulaEvaluator


class DashboardDataProcessor:
    """Processes dashboard data into JSON configuration for frontend rendering"""

    def __init__(self):
        self.formula_evaluator = FormulaEvaluator()

    def process_dashboard_config(
        self,
        dashboard_data: Dict[str, Any],
        csv_data_json: str = None,
        column_mapping: Dict[str, str] = None,
    ) -> Dict[str, Any]:
        """
        Process dashboard data into a simplified JSON configuration.
        
        Note: CSV data and column mapping are now loaded dynamically on the client-side,
        so we only include the dashboard structure and metadata.
        
        Returns:
            A simplified JSON configuration that the frontend can use to render the dashboard
        """
        metadata = dashboard_data["metadata"]
        filters = dashboard_data["filters"]
        grid_data = dashboard_data.get("grid", {})

        # Build the simplified configuration (include column mapping for editor)
        config = {
            "metadata": self._process_metadata(metadata),
            "filters": self._process_filters_simplified(filters),
            "components": self._process_grid_components_simplified(grid_data),
        }
        
        # Include transformations for client-side defined columns
        transformations = dashboard_data.get("transformations", [])
        if transformations:
            config["transformations"] = [
                {
                    "type": "define_column",
                    "name": transformation.name,
                    "formula": transformation.formula
                }
                for transformation in transformations
            ]
        
        # Include column mapping for the chart editor
        if column_mapping:
            # Start with the base CSV column mapping
            full_column_mapping = column_mapping.copy()
            
            # Add defined columns from transformations
            transformations = dashboard_data.get("transformations", [])
            for transformation in transformations:
                # TransformationSpec has name and formula attributes
                column_name = transformation.name
                if column_name:
                    # Generate a letter for the defined column (after Z, use AA, AB, etc.)
                    next_letter = self._get_next_column_letter(full_column_mapping)
                    full_column_mapping[next_letter] = column_name
            
            config["column_mapping"] = full_column_mapping
            
            # Include filter-to-column mapping for filtering functionality
            config["filter_to_column_mapping"] = self._generate_filter_to_column_mapping(filters, full_column_mapping)

        return config

    def _get_next_column_letter(self, column_mapping: Dict[str, str]) -> str:
        """Get the next available column letter for defined columns"""
        # Get all existing letters
        existing_letters = set(column_mapping.keys())
        
        # Single letters A-Z
        for i in range(26):
            letter = chr(ord('A') + i)
            if letter not in existing_letters:
                return letter
        
        # Double letters AA-ZZ
        for i in range(26):
            for j in range(26):
                letter = chr(ord('A') + i) + chr(ord('A') + j)
                if letter not in existing_letters:
                    return letter
        
        # Fallback (shouldn't happen in practice)
        return "ZZ"

    def _process_metadata(self, metadata: DashboardMetadata) -> Dict[str, Any]:
        """Process dashboard metadata"""
        return {
            "name": metadata.name,
            "description": metadata.description,
            "file_path": metadata.file_path,
            "fa_icon": metadata.fa_icon,
        }

    def _process_filters(
        self, filters: List[FilterSpec], column_mapping: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Process filters into JSON configuration"""
        processed_filters = []

        for filter_spec in filters:
            filter_id = f"filter_{filter_spec.name.lower().replace(' ', '_')}"
            
            # Pass the raw Excel formula to be compiled in JavaScript
            # This allows for dynamic evaluation based on the actual CSV data
            filter_config = {
                "id": filter_id,
                "name": filter_spec.name,
                "type": filter_spec.type,
                "values_formula": filter_spec.values_formula,  # Raw Excel formula
                "column_mapping": column_mapping,  # Include column mapping for JS compilation
            }

            processed_filters.append(filter_config)

        return processed_filters

    def _process_filters_simplified(
        self, filters: List[FilterSpec]
    ) -> List[Dict[str, Any]]:
        """Process filters into simplified frontend configuration (no column mapping)"""
        processed_filters = []

        for filter_spec in filters:
            filter_id = f"filter_{filter_spec.name.lower().replace(' ', '_')}"
            
            # Pass the raw Excel formula to be compiled in JavaScript
            # Column mapping will be obtained from CSV loader on client-side
            filter_config = {
                "id": filter_id,
                "name": filter_spec.name,
                "type": filter_spec.type,
                "values_formula": filter_spec.values_formula,  # Raw Excel formula
            }

            processed_filters.append(filter_config)

        return processed_filters

    def _process_grid_components(
        self, grid_data: Dict[str, Any], column_mapping: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Process grid layout and components"""
        components = []

        for row_data in grid_data.get("rows", []):
            row_id = f"row_{uuid.uuid4().hex[:8]}"
            columns = row_data.get("columns", [])
            total_size = sum(int(col.get("size", "1")) for col in columns)

            row_component = {
                "type": "row",
                "id": row_id,
                "columns": [],
            }

            for i, column_data in enumerate(columns):
                size = int(column_data.get("size", "1"))
                flex_grow = size
                col_id = f"{row_id}_col_{i}"

                column_component = {
                    "type": "column",
                    "id": col_id,
                    "flex_grow": flex_grow,
                    "content": [],
                }

                # Process content for this column
                for content_item in column_data.get("content", []):
                    if content_item["type"] == "kpi":
                        kpi_config = self._process_kpi_component(
                            content_item["spec"], column_mapping
                        )
                        column_component["content"].append(kpi_config)
                    elif content_item["type"] == "chart":
                        chart_config = self._process_chart_component(
                            content_item["spec"], column_mapping
                        )
                        column_component["content"].append(chart_config)

                row_component["columns"].append(column_component)

            components.append(row_component)

        return components

    def _process_grid_components_simplified(
        self, grid_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Process grid layout and components (simplified, no column mapping)"""
        components = []

        for row_data in grid_data.get("rows", []):
            row_id = f"row_{uuid.uuid4().hex[:8]}"
            columns = row_data.get("columns", [])
            total_size = sum(int(col.get("size", "1")) for col in columns)

            row_component = {
                "type": "row",
                "id": row_id,
                "columns": [],
            }

            for i, column_data in enumerate(columns):
                size = int(column_data.get("size", "1"))
                flex_grow = size
                col_id = f"{row_id}_col_{i}"

                column_component = {
                    "type": "column",
                    "id": col_id,
                    "flex_grow": flex_grow,
                    "content": [],
                }

                # Process content for this column
                for content_item in column_data.get("content", []):
                    if content_item["type"] == "kpi":
                        kpi_config = self._process_kpi_component_simplified(
                            content_item["spec"]
                        )
                        column_component["content"].append(kpi_config)
                    elif content_item["type"] == "chart":
                        chart_config = self._process_chart_component_simplified(
                            content_item["spec"]
                        )
                        column_component["content"].append(chart_config)

                row_component["columns"].append(column_component)

            components.append(row_component)

        return components

    def _process_kpi_component(
        self, kpi_spec: KPISpec, column_mapping: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process KPI component into JSON configuration"""
        kpi_id = f"kpi_{kpi_spec.name.lower().replace(' ', '_').replace('(', '').replace(')', '')}"
        js_formula = self.formula_evaluator.convert_formula_to_js(
            kpi_spec.value_formula, column_mapping
        )

        return {
            "type": "kpi",
            "id": kpi_id,
            "name": kpi_spec.name,
            "fa_icon": kpi_spec.fa_icon,
            "value_formula": js_formula,
            "format_type": kpi_spec.format_type,
            "unit": kpi_spec.unit,
            # Add data params for reuse - all the data needed to rebuild this KPI component
            "data_params": {
                "original_formula": kpi_spec.value_formula,  # Keep original Excel formula
                "column_mapping": column_mapping,  # Column mapping used
                "kpi_spec": {
                    "name": kpi_spec.name,
                    "fa_icon": kpi_spec.fa_icon,
                    "format_type": kpi_spec.format_type,
                    "unit": kpi_spec.unit,
                    "value_formula": kpi_spec.value_formula
                }
            }
        }

    def _process_chart_component(
        self, chart_spec: ChartSpec, column_mapping: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process Chart component into JSON configuration"""
        chart_id = f"chart_{chart_spec.name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('-', '_')}"

        chart_config = {
            "type": "chart",
            "id": chart_id,
            "chart_type": chart_spec.chart_type,
            "name": chart_spec.name,
            "original_name": chart_spec.name,
            "x_axis": {
                "name": chart_spec.x_axis.name,
                "column": chart_spec.x_axis.column,
                "group_by": chart_spec.x_axis.group_by,
            },
            "series_list": [],
            "style": chart_spec.style,
            "area": chart_spec.area,
            "cumulative": chart_spec.cumulative,
            "top_n": 0,  # Will be set dynamically based on data count
            "default_filter_conditions": self._format_default_filter_conditions(
                chart_spec.default_filter_conditions, column_mapping
            )
            if chart_spec.default_filter_conditions
            else None,
        }

        # Process series
        for series in chart_spec.series_list:
            series_config = {
                "name": series.name,
                "column": series.column,
                "aggregation": series.aggregation,
                "format": series.format_type,
                "unit": series.unit,
                "filter_condition": series.filter_condition,
                "axis": series.axis,
            }
            chart_config["series_list"].append(series_config)

        return chart_config

    def _process_kpi_component_simplified(
        self, kpi_spec: KPISpec
    ) -> Dict[str, Any]:
        """Process KPI component into simplified JSON configuration (no column mapping)"""
        kpi_id = f"kpi_{kpi_spec.name.lower().replace(' ', '_').replace('(', '').replace(')', '')}"
        
        # Pass the raw Excel formula to be compiled in JavaScript
        # Column mapping will be obtained from CSV loader on client-side
        kpi_config = {
            "type": "kpi",
            "id": kpi_id,
            "name": kpi_spec.name,
            "fa_icon": kpi_spec.fa_icon,
            "value_formula": kpi_spec.value_formula,  # Raw Excel formula
            "format_type": kpi_spec.format_type,
            "unit": kpi_spec.unit,
        }

        return kpi_config

    def _process_chart_component_simplified(
        self, chart_spec: ChartSpec
    ) -> Dict[str, Any]:
        """Process Chart component into simplified JSON configuration (no column mapping)"""
        chart_id = f"chart_{chart_spec.name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('-', '_')}"

        chart_config = {
            "type": "chart",
            "id": chart_id,
            "chart_type": chart_spec.chart_type,
            "name": chart_spec.name,
            "original_name": chart_spec.name,
            "x_axis": {
                "name": chart_spec.x_axis.name,
                "column": chart_spec.x_axis.column,  # Raw column reference
                "group_by": chart_spec.x_axis.group_by,
            },
            "series_list": [],
            "style": chart_spec.style,
            "area": chart_spec.area,
            "cumulative": chart_spec.cumulative,
            "top_n": chart_spec.top_n,
            "default_filter_conditions": chart_spec.default_filter_conditions,
        }

        # Process series
        for series in chart_spec.series_list:
            series_config = {
                "name": series.name,
                "column": series.column,  # Raw column reference
                "aggregation": series.aggregation,
                "format": series.format_type,  # Use format_type instead of format
                "unit": series.unit,
                "filter_condition": series.filter_condition,
                "axis": series.axis,
            }
            chart_config["series_list"].append(series_config)

        return chart_config

    def _format_default_filter_conditions(
        self, conditions: List[str], column_mapping: Dict[str, str]
    ) -> List[str]:
        """Format default filter conditions as list"""
        if not conditions:
            return None

        import re

        formatted_conditions = []
        for condition in conditions:
            # Convert Excel column references (like S>0, N2:N="Male") to column names
            js_condition = condition

            # Sort column letters by length (descending) to handle longer letters first
            sorted_columns = sorted(
                column_mapping.items(), key=lambda x: len(x[0]), reverse=True
            )

            for col_letter, col_name in sorted_columns:
                # Replace Excel patterns
                patterns = [
                    r"\b"
                    + re.escape(col_letter)
                    + r"(\d+):"
                    + re.escape(col_letter)
                    + r"\b",  # N2:N
                    r"\b"
                    + re.escape(col_letter)
                    + r":"
                    + re.escape(col_letter)
                    + r"\b",  # N:N
                    r"\b" + re.escape(col_letter) + r"(?=\s*[><=!])",  # N> N= N< etc.
                    r"\b" + re.escape(col_letter) + r"(?=\s*$)",  # N at end
                ]

                for pattern in patterns:
                    if col_letter + "2:" + col_letter in condition:
                        js_condition = re.sub(
                            col_letter + r"2:" + col_letter,
                            col_name + "2:" + col_name,
                            js_condition,
                        )
                    else:
                        js_condition = re.sub(pattern, col_name, js_condition)

            formatted_conditions.append(js_condition)

        return formatted_conditions

    def _generate_filter_to_column_mapping(
        self, filters: List[FilterSpec], column_mapping: Dict[str, str]
    ) -> Dict[str, Any]:
        """Generate mapping from filter names to actual column names and transformation functions"""
        mapping = {}
        reverse_column_mapping = {v: k for k, v in column_mapping.items()}

        for filter_spec in filters:
            filter_name = filter_spec.name
            formula = filter_spec.values_formula

            # Handle computed filters with functions like YEAR(C2:C)
            import re

            # Check for YEAR function
            year_match = re.search(r"YEAR\(([A-Z]+)(?:\d*):?(?:[A-Z]+)?\)", formula)
            if year_match:
                col_letter = year_match.group(1)
                if col_letter in column_mapping:
                    mapping[filter_name] = {
                        "column": column_mapping[col_letter],
                        "transform": "YEAR",
                    }
                    continue

            # Check if the formula contains direct column name references
            column_name_found = None
            all_column_names = set(column_mapping.values())
            for col_name in all_column_names:
                if col_name in formula:
                    column_name_found = col_name
                    break

            if column_name_found:
                mapping[filter_name] = column_name_found
            else:
                # Excel-style reference like A2:A, B:B, etc.
                col_match = re.search(r"([A-Z]+)(?:\d*):?(?:[A-Z]+)?", formula)
                if col_match:
                    col_letter = col_match.group(1)
                    column_name = column_mapping.get(col_letter, filter_name)
                    mapping[filter_name] = column_name
                else:
                    mapping[filter_name] = filter_name

        return mapping

    def _extract_column_mapping_from_csv_data(
        self, csv_data_json: str
    ) -> Dict[str, str]:
        """Extract column mapping from CSV data"""
        try:
            data = json.loads(csv_data_json)
            if data and len(data) > 0:
                columns = list(data[0].keys())
                mapping = {}
                for idx, col in enumerate(columns):
                    letter = chr(65 + idx)  # A, B, C, ...
                    mapping[letter] = col
                return mapping
        except:
            pass
        return {}
