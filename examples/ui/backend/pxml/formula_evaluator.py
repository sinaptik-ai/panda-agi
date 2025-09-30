"""
Formula Evaluator for Excel-style Functions

Converts Excel formulas to JavaScript expressions and provides evaluation utilities.
"""

import re
from typing import Dict, List, Any, Optional


class FormulaEvaluator:
    """Converts Excel formulas to JavaScript expressions"""

    def __init__(self):
        # Mapping of Excel functions to JavaScript equivalents
        self.excel_to_js_functions = {
            "SUM": "arraySum",
            "AVG": "arrayAvg",
            "AVERAGE": "arrayAvg",
            "COUNT": "arrayCount",
            "COUNTA": "arrayCountA",
            "MAX": "arrayMax",
            "MIN": "arrayMin",
            "SUMIF": "arraySumIf",
            "COUNTIF": "arrayCountIf",
            "COUNTIFS": "arrayCountIfs",
            "UNIQUE": "arrayUnique",
            "IF": "excelIf",
            "AND": "excelAnd",
            "OR": "excelOr",
            "ROUND": "Math.round",
            "ABS": "Math.abs",
            "MONTH": "getMonth",
            "TODAY": "excelToday",
            "INDEX": "arrayIndex",
            "MATCH": "arrayMatch",
            "TIME": "excelTime",
            "RIGHT": "excelRight",
            "MID": "excelMid",
            "LEFT": "excelLeft",
            "VALUE": "parseFloat",
            "ISNUMBER": "excelIsNumber",
            "SEARCH": "excelSearch",
            "HOUR": "excelHour",
            "TIMEVALUE": "excelTimeValue",
            "INT": "Math.floor",
            "YEAR": "arrayMapYear",
            "TEXT": "excelText",
            "CHOOSE": "excelChoose",
            "SPLIT": "excelSplit",
            "LEN": "excelLen",
        }

    def convert_formula_to_js(
        self, formula: str, column_mapping: Dict[str, str]
    ) -> str:
        """Convert Excel formula to JavaScript expression"""
        if not formula.startswith("="):
            return f'"{formula}"'  # Return as string literal if not a formula

        # Remove the leading '='
        js_expression = formula[1:]

        # Handle special patterns first
        js_expression = self._handle_special_patterns(js_expression, column_mapping)

        # Replace column references (A:A, B2:B, etc.) with data access
        js_expression = self._replace_column_references(js_expression, column_mapping)

        # Replace Excel functions with JavaScript equivalents
        js_expression = self._replace_excel_functions(js_expression)

        # Handle Excel-style operators
        js_expression = self._replace_excel_operators(js_expression)

        return js_expression

    def _handle_special_patterns(
        self, expression: str, column_mapping: Dict[str, str]
    ) -> str:
        """Handle special formula patterns that need custom JavaScript conversion"""
        import re

        # Pattern for percentage growth: AVERAGE(((O2:O-P2:P)/P2:P)*100)
        growth_pattern = r"AVERAGE\(\(\(([A-Z]+\d*:\d*[A-Z]*)-([A-Z]+\d*:\d*[A-Z]*)\)/([A-Z]+\d*:\d*[A-Z]*)\)\*100\)"

        match = re.search(growth_pattern, expression)
        if match:
            col1_ref = match.group(1)  # O2:O (current values)
            col2_ref = match.group(2)  # P2:P (previous values)
            col3_ref = match.group(3)  # P2:P (denominator, should be same as col2)

            # Extract column letters
            col1_letter = re.search(r"([A-Z]+)", col1_ref).group(1)
            col2_letter = re.search(r"([A-Z]+)", col2_ref).group(1)

            if col1_letter in column_mapping and col2_letter in column_mapping:
                col1_name = column_mapping[col1_letter]
                col2_name = column_mapping[col2_letter]

                # Replace with specialized function
                replacement = f'arrayAvg(arrayPercentageGrowth(getColumnData("{col1_name}", 2), getColumnData("{col2_name}", 2)))'
                expression = re.sub(growth_pattern, replacement, expression)

        return expression

    def _replace_column_references(
        self, expression: str, column_mapping: Dict[str, str]
    ) -> str:
        """Replace Excel column references with JavaScript data access"""

        # Pattern for custom column name ranges like survival_rate2:survival_rate, plant_type2:plant_type
        # Exclude single letters (those are handled by the letter range pattern)
        custom_range_pattern = (
            r"([a-zA-Z_][a-zA-Z0-9_]{1,})(\d*):([a-zA-Z_][a-zA-Z0-9_]{1,})"
        )

        def replace_custom_range(match):
            start_name = match.group(1)
            start_row = match.group(2)
            end_name = match.group(3)
            # If start and end names are similar (like survival_rate2:survival_rate), use the base name
            if start_name.startswith(end_name) or end_name.startswith(start_name):
                base_name = end_name if len(end_name) <= len(start_name) else start_name
                return f'getColumnData("{base_name}")'
            # If they're the same name
            elif start_name == end_name:
                return f'getColumnData("{start_name}")'

            return match.group(0)  # Return original if we can't handle it

        expression = re.sub(custom_range_pattern, replace_custom_range, expression)

        # Pattern for column ranges like A2:A, B:B, C2:C100
        range_pattern = r"([A-Z]+)(\d*):([A-Z]+)(\d*)"

        def replace_range(match):
            start_col = match.group(1)
            start_row = match.group(2)
            end_col = match.group(3)
            end_row = match.group(4)

            # For now, we'll assume single column ranges (A:A, B2:B)
            if start_col == end_col:
                column_name = column_mapping.get(start_col, start_col)
                if start_row and start_row != "1":
                    # Range starting from specific row
                    return f'getColumnData("{column_name}", {start_row})'
                else:
                    # Entire column (excluding header)
                    return f'getColumnData("{column_name}")'

            return match.group(0)  # Return original if we can't handle it

        expression = re.sub(range_pattern, replace_range, expression)

        # Pattern for single cell references like A1, B5
        cell_pattern = r"([A-Z]+)(\d+)"

        def replace_cell(match):
            col = match.group(1)
            row = int(match.group(2))
            column_name = column_mapping.get(col, col)
            # Convert to 0-based index for JavaScript
            return f'getCellValue("{column_name}", {row - 1})'

        expression = re.sub(cell_pattern, replace_cell, expression)

        # Handle direct column name references (like "crime_category", "year_period")
        # This is for user-defined columns that might be referenced by name
        reverse_mapping = {v: k for k, v in column_mapping.items()}

        # Pattern for direct column names in function calls like COUNTIF(crime_category, "value")
        # Look for column names that appear as standalone words (not already inside getColumnData calls)
        for column_name, letter in reverse_mapping.items():
            # Only replace if it's a standalone word AND not already inside a getColumnData call
            # Use negative lookbehind to avoid replacing inside existing getColumnData calls
            column_pattern = (
                r"(?<!getColumnData\(\")\b" + re.escape(column_name) + r"\b(?!\"\))"
            )
            expression = re.sub(
                column_pattern, f'getColumnData("{column_name}")', expression
            )

        return expression

    def _replace_excel_functions(self, expression: str) -> str:
        """Replace Excel functions with JavaScript equivalents"""

        for excel_func, js_func in self.excel_to_js_functions.items():
            # Pattern to match function calls
            pattern = rf"\b{excel_func}\s*\("
            replacement = f"{js_func}("
            expression = re.sub(pattern, replacement, expression, flags=re.IGNORECASE)

        return expression

    def _replace_excel_operators(self, expression: str) -> str:
        """Replace Excel-specific operators"""
        # Excel uses <> for not equal, JavaScript uses !=
        expression = expression.replace("<>", "!=")

        # Excel uses = for comparison inside functions, JavaScript uses ==
        # Handle patterns like "column=value" or "function()=value" within function calls
        # This matches = that are not at the start of the expression (which would be formula assignment)
        import re

        # First, handle array comparisons with data access functions
        data_comparison_pattern = r"(getColumnData\([^)]+\))\s*=\s*(\d+)"

        def replace_data_comparison(match):
            array_expr = match.group(1)
            compare_value = match.group(2)
            return f"{array_expr}.map(val => val == {compare_value})"

        expression = re.sub(
            data_comparison_pattern, replace_data_comparison, expression
        )

        # Then replace remaining = with == when used for comparison (not assignment)
        # But skip anything that's already inside a map() function with arrow syntax
        # Use negative lookbehind and lookahead to avoid arrow function syntax
        if ".map(val => val ==" not in expression:
            # Look for patterns like: identifier=value, function()=value, array=value
            comparison_pattern = r"(\w+(?:\([^)]*\))?)\s*=\s*([^,)]+)"

            def replace_comparison(match):
                left_side = match.group(1)
                right_side = match.group(2)
                # Skip if it's part of our array mapping
                if ".map(" in expression and "val" in right_side:
                    return match.group(0)
                return f"{left_side} == {right_side}"

            expression = re.sub(comparison_pattern, replace_comparison, expression)

        # Excel uses & for string concatenation, JavaScript uses +
        # Note: This is simplified and may need more sophisticated handling
        expression = re.sub(
            r'(\w+|\)|"[^"]*")\s*&\s*(\w+|\(|"[^"]*")', r"\1 + \2", expression
        )

        return expression


    def get_filter_values_js(self, formula: str, column_mapping: Dict[str, str]) -> str:
        """Convert filter values formula to JavaScript"""
        js_expression = self.convert_formula_to_js(formula, column_mapping)

        # Wrap in a function that returns the values
        return f"(function() {{ return {js_expression}; }})()"
