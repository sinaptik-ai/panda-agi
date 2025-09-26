"""
Main Dashboard Compiler

Orchestrates the parsing, processing, and generation of dashboard HTML from XML specifications.
"""

import os
from pathlib import Path
from typing import Dict, Any

from .xml_parser import XMLParser
from .csv_processor import CSVProcessor
from .formula_evaluator import FormulaEvaluator
from .html_generator import HTMLGenerator


class DashboardCompiler:
    """Main compiler class that coordinates all dashboard generation components"""

    def __init__(self):
        self.xml_parser = XMLParser()
        self.csv_processor = CSVProcessor()
        self.formula_evaluator = FormulaEvaluator()
        self.html_generator = HTMLGenerator()

    def compile_dashboard_with_csv(
        self,
        dashboard_data: dict,
        csv_content: str,
        artifact_id: str = None,
        remove_watermark: bool = False,
    ) -> str:
        """Compile dashboard from XML file and CSV file"""
        try:
            # Load CSV data
            self.csv_processor.load_csv_from_string(csv_content)

            # Skip server-side transformations - they will be handled client-side
            # transformations = dashboard_data.get("transformations", [])
            # self.csv_processor.apply_transformations(transformations)

            # Get data as JSON
            csv_data_json = self.csv_processor.get_data_as_json()
            column_mapping = self.csv_processor.column_mapping

            # Generate HTML dashboard
            html_content = self.html_generator.generate_dashboard_html(
                dashboard_data,
                csv_data_json,
                column_mapping,
                artifact_id,
                remove_watermark=remove_watermark,
            )
            return html_content
        except Exception as e:
            raise Exception(f"Error compiling dashboard: {e}")

    def compile_dashboard(self, xml_file_path: str, output_dir: str = "output") -> str:
        """Compile dashboard from XML file and return output HTML file path"""
        try:
            # Parse XML dashboard specification
            dashboard_data = self.xml_parser.parse_file(xml_file_path)

            # Get CSV file path from metadata
            csv_file_path = dashboard_data["metadata"].file_path
            if not os.path.isabs(csv_file_path):
                # Make relative to XML file location
                xml_dir = os.path.dirname(xml_file_path)
                csv_file_path = os.path.join(xml_dir, csv_file_path)

            # Load CSV data
            self.csv_processor.load_csv(csv_file_path)

            # Apply transformations (define_column formulas)
            transformations = dashboard_data.get("transformations", [])
            self.csv_processor.apply_transformations(transformations)

            csv_data_json = self.csv_processor.get_data_as_json()
            column_mapping = self.csv_processor.column_mapping

            # Generate HTML dashboard
            html_content = self.html_generator.generate_dashboard_html(
                dashboard_data, csv_data_json, column_mapping
            )

            # Ensure output directory exists
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            # Create output filename
            xml_filename = os.path.splitext(os.path.basename(xml_file_path))[0]
            output_file = os.path.join(output_dir, f"{xml_filename}_dashboard.html")

            # Write HTML file
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html_content)

            return output_file

        except Exception as e:
            raise Exception(f"Error compiling dashboard: {e}")

    def compile_from_string(
        self, xml_string: str, csv_file_path: str, output_dir: str = "output"
    ) -> str:
        """Compile dashboard from XML string and CSV file"""
        try:
            # Parse XML dashboard specification
            dashboard_data = self.xml_parser.parse_string(xml_string)

            # Load CSV data
            self.csv_processor.load_csv(csv_file_path)

            # Apply transformations (define_column formulas)
            transformations = dashboard_data.get("transformations", [])
            self.csv_processor.apply_transformations(transformations)

            csv_data_json = self.csv_processor.get_data_as_json()
            column_mapping = self.csv_processor.column_mapping

            # Generate HTML dashboard
            html_content = self.html_generator.generate_dashboard_html(
                dashboard_data, csv_data_json, column_mapping
            )

            # Ensure output directory exists
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            # Create output filename based on dashboard name
            dashboard_name = dashboard_data["metadata"].name.lower().replace(" ", "_")
            output_file = os.path.join(output_dir, f"{dashboard_name}_dashboard.html")

            # Write HTML file
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html_content)

            return output_file

        except Exception as e:
            raise Exception(f"Error compiling dashboard from string: {e}")

    def get_dashboard_preview(self, xml_file_path: str) -> Dict[str, Any]:
        """Get dashboard preview information without generating full HTML"""
        try:
            dashboard_data = self.xml_parser.parse_file(xml_file_path)

            # Get CSV info if available
            csv_info = {}
            try:
                csv_file_path = dashboard_data["metadata"].file_path
                if not os.path.isabs(csv_file_path):
                    xml_dir = os.path.dirname(xml_file_path)
                    csv_file_path = os.path.join(xml_dir, csv_file_path)

                self.csv_processor.load_csv(csv_file_path)
                csv_info = self.csv_processor.get_data_summary()
            except Exception:
                pass

            return {
                "metadata": dashboard_data["metadata"].__dict__,
                "filters_count": len(dashboard_data["filters"]),
                "transformations_count": len(dashboard_data["transformations"]),
                "csv_info": csv_info,
            }

        except Exception as e:
            raise Exception(f"Error getting dashboard preview: {e}")

    def validate_dashboard(self, xml_file_path: str) -> Dict[str, Any]:
        """Validate dashboard XML and return validation results"""
        validation_results = {"valid": True, "errors": [], "warnings": []}

        try:
            # Parse XML
            dashboard_data = self.xml_parser.parse_file(xml_file_path)

            # Check metadata
            metadata = dashboard_data["metadata"]
            if not metadata.name:
                validation_results["errors"].append("Dashboard name is required")
            if not metadata.file_path:
                validation_results["errors"].append("CSV file path is required")

            # Check CSV file exists
            csv_file_path = metadata.file_path
            if not os.path.isabs(csv_file_path):
                xml_dir = os.path.dirname(xml_file_path)
                csv_file_path = os.path.join(xml_dir, csv_file_path)

            if not os.path.exists(csv_file_path):
                validation_results["errors"].append(
                    f"CSV file not found: {csv_file_path}"
                )
            else:
                # Validate CSV can be loaded
                try:
                    self.csv_processor.load_csv(csv_file_path)
                except Exception as e:
                    validation_results["errors"].append(f"Error loading CSV: {e}")

            # Check filters
            filters = dashboard_data["filters"]
            if not filters:
                validation_results["warnings"].append("No filters defined")

            for filter_spec in filters:
                if not filter_spec.name:
                    validation_results["errors"].append("Filter name is required")
                if not filter_spec.values_formula:
                    validation_results["errors"].append(
                        f"Filter '{filter_spec.name}' missing values formula"
                    )

            # Set valid flag
            validation_results["valid"] = len(validation_results["errors"]) == 0

        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"XML parsing error: {e}")

        return validation_results
