"""
CSV Processor for Dashboard Data

Loads and processes CSV files, providing data access and manipulation capabilities.
"""

import csv
import re
import pandas as pd
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
from io import StringIO


class CSVProcessor:
    """Processes CSV files and provides data access for dashboard generation"""

    def __init__(self):
        self.data = None
        self.headers = []
        self.column_mapping = {}  # Maps column letters (A, B, C...) to column names
        self.reverse_mapping = {}  # Maps column names to letters

    # Excel function implementations
    def excel_left(self, text, num_chars):
        """Excel LEFT function"""
        return str(text)[: int(num_chars)]

    def excel_right(self, text, num_chars):
        """Excel RIGHT function"""
        return str(text)[-int(num_chars) :]

    def excel_mid(self, text, start_num, num_chars):
        """Excel MID function"""
        start = int(start_num) - 1
        end = start + int(num_chars)
        return str(text)[start:end]

    def excel_time(self, hours, minutes, seconds=0):
        """Excel TIME function - returns decimal hours"""
        try:
            # Convert parameters, handling empty strings
            actual_hours = int(hours) if hours and str(hours).strip() else 0
            actual_minutes = int(minutes) if minutes and str(minutes).strip() else 0
            actual_seconds = int(seconds) if seconds and str(seconds).strip() else 0

            # Return hours + minutes/60 + seconds/3600
            return actual_hours + actual_minutes / 60 + actual_seconds / 3600

        except (ValueError, TypeError):
            return 0

    def excel_value(self, text):
        """Excel VALUE function"""
        try:
            return float(text)
        except:
            return 0

    def excel_isnumber(self, value):
        """Excel ISNUMBER function"""
        try:
            num_value = float(value)
            import math

            return not math.isnan(num_value)
        except (ValueError, TypeError):
            return False

    def excel_search(self, find_text, within_text, start_num=1):
        """Excel SEARCH function - case insensitive find"""
        try:
            within_str = str(within_text).lower()
            find_str = str(find_text).lower()
            start_pos = int(start_num) - 1  # Convert to 0-based index

            pos = within_str.find(find_str, start_pos)
            if pos == -1:
                return float(
                    "nan"
                )  # Return NaN for not found, so ISNUMBER returns False
            return pos + 1  # Return 1-based index
        except:
            return float("nan")  # Return NaN for errors, so ISNUMBER returns False

    def excel_timevalue(self, time_text):
        """Excel TIMEVALUE function - convert time text to time value"""
        try:
            from datetime import datetime

            time_str = str(time_text).strip()

            # Handle various time formats
            if ":" in time_str:
                # Parse HH:MM or HH:MM:SS format
                parts = time_str.split(":")
                if len(parts) >= 2:
                    hour = int(parts[0])
                    minute = int(parts[1])
                    second = int(parts[2]) if len(parts) > 2 else 0

                    # Return as decimal hours for compatibility with Excel TIME function
                    return hour + minute / 60 + second / 3600

            return 0
        except:
            return 0

    def excel_hour(self, time_value):
        """Excel HOUR function - extract hour from time value"""
        try:
            # time_value is expected to be decimal hours from TIMEVALUE
            if isinstance(time_value, (int, float)):
                return int(time_value)  # Extract the integer part (hours)

            # If it's a time string, parse it directly
            time_str = str(time_value).strip()
            if ":" in time_str:
                hour = int(time_str.split(":")[0])
                return hour

            return 0
        except:
            return 0

    def excel_int(self, number):
        """Excel INT function - rounds down to the nearest integer"""
        try:
            import math

            return math.floor(float(number))
        except:
            return 0

    def excel_year(self, date_value):
        """Excel YEAR function - extract year from date with comprehensive date format support"""
        try:
            from datetime import datetime

            date_str = str(date_value).strip()

            # Try multiple common date formats
            date_formats = [
                "%Y-%m-%d",  # 2024-03-15
                "%m/%d/%Y",  # 03/15/2024
                "%d/%m/%Y",  # 15/03/2024
                "%Y-%m-%d %H:%M:%S",  # 2024-03-15 14:30:00
                "%m/%d/%Y %H:%M:%S",  # 03/15/2024 14:30:00
                "%d/%m/%Y %H:%M:%S",  # 15/03/2024 14:30:00
                "%Y/%m/%d",  # 2024/03/15
                "%d-%m-%Y",  # 15-03-2024
                "%Y.%m.%d",  # 2024.03.15
                "%m.%d.%Y",  # 03.15.2024
                "%d.%m.%Y",  # 15.03.2024
            ]

            for date_format in date_formats:
                try:
                    date_obj = datetime.strptime(date_str, date_format)
                    return date_obj.year
                except:
                    continue

            # If all formats fail, try to extract year from ISO format or similar patterns
            import re

            # Look for 4-digit year pattern
            year_match = re.search(r"\b(19|20)\d{2}\b", date_str)
            if year_match:
                return int(year_match.group())

            return 0
        except:
            return 0

    def excel_today(self):
        """Excel TODAY function - return today's date as string"""
        from datetime import datetime

        today = datetime.now()
        return today.strftime("%Y-%m-%d")

    def excel_row(self, row_index=None):
        """Excel ROW function - return current row number (1-based)"""
        # In pandas context, we need to get the row index
        # This will be set during evaluation
        if hasattr(self, '_current_row_index'):
            return self._current_row_index + 1  # Convert to 1-based
        return 1  # Default if not set

    def excel_offset(self, reference, rows, cols, height=1, width=1):
        """Excel OFFSET function - return value offset from reference"""
        try:
            if hasattr(self, '_current_row_index') and hasattr(self, 'data'):
                current_index = self._current_row_index
                
                # Calculate target row index
                target_index = current_index + int(rows)
                
                # Check bounds
                if target_index >= 0 and target_index < len(self.data):
                    # For the case OFFSET(B2,-1,0), we want the value from column B in the previous row
                    # Since we're dealing with the current row context, the reference should be the current value
                    # and we want to get the same column but offset by the specified rows
                    
                    # Find which column the reference came from in current context
                    # This is a simplified approach - in real Excel, reference would be a cell reference
                    current_row = self._current_row
                    
                    # Try to find which column has the reference value
                    matching_column = None
                    for col_name in self.data.columns:
                        if current_row[col_name] == reference:
                            matching_column = col_name
                            break
                    
                    if matching_column:
                        target_value = self.data.iloc[target_index][matching_column]
                        return target_value if not pd.isna(target_value) else 0
                    else:
                        # If we can't find the matching column, assume it's from the same column as referenced
                        # For formulas like OFFSET(B2,-1,0), try to get from column B
                        # This is a fallback approach
                        if len(self.data.columns) > 1:  # Assuming B is the second column (index 1)
                            target_value = self.data.iloc[target_index, 1]  # Column B (second column)
                            return target_value if not pd.isna(target_value) else 0
                
                return 0
            
            return 0  # Fallback
        except Exception as e:
            print(f"OFFSET function error: {e}")
            return 0

    def excel_text(self, value, format_code):
        """Excel TEXT function - format date/number as text with comprehensive format support"""
        try:
            from datetime import datetime
            import re

            value_str = str(value).strip()
            format_str = str(format_code).strip().strip('"')

            # Try to parse as date first (support multiple input formats)
            date_obj = None
            date_formats = [
                "%Y-%m-%d",  # 2024-03-15
                "%m/%d/%Y",  # 03/15/2024
                "%d/%m/%Y",  # 15/03/2024
                "%Y-%m-%d %H:%M:%S",  # 2024-03-15 14:30:00
                "%m/%d/%Y %H:%M:%S",  # 03/15/2024 14:30:00
                "%d/%m/%Y %H:%M:%S",  # 15/03/2024 14:30:00
                "%Y/%m/%d",  # 2024/03/15
                "%d-%m-%Y",  # 15-03-2024
                "%Y.%m.%d",  # 2024.03.15
                "%m.%d.%Y",  # 03.15.2024
                "%d.%m.%Y",  # 15.03.2024
                "%d.%m.%Y",  # 15.04.2024
                "%d-%m-%Y",  # 25-06-2024
            ]

            for date_format in date_formats:
                try:
                    date_obj = datetime.strptime(value_str, date_format)
                    break
                except:
                    continue

            if date_obj:
                # Date formatting patterns
                if format_str.lower() in ["mmm yyyy", "mmm-yyyy"]:
                    months = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                    ]
                    return f"{months[date_obj.month - 1]} {date_obj.year}"

                elif format_str.lower() in ["mmmm yyyy", "mmmm-yyyy"]:
                    months = [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                    ]
                    return f"{months[date_obj.month - 1]} {date_obj.year}"

                elif format_str.lower() in ["mm/yyyy", "mm-yyyy"]:
                    return f"{date_obj.month:02d}/{date_obj.year}"

                elif format_str.lower() in ["yyyy-mm", "yyyy/mm"]:
                    return f"{date_obj.year}-{date_obj.month:02d}"

                elif format_str.lower() in ["yyyy-mm-dd"]:
                    return f"{date_obj.year}-{date_obj.month:02d}-{date_obj.day:02d}"

                elif format_str.lower() in ["mm/dd/yyyy"]:
                    return f"{date_obj.month:02d}/{date_obj.day:02d}/{date_obj.year}"

                elif format_str.lower() in ["dd/mm/yyyy"]:
                    return f"{date_obj.day:02d}/{date_obj.month:02d}/{date_obj.year}"

                elif format_str.lower() in ["mmm", "mon"]:
                    months = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                    ]
                    return months[date_obj.month - 1]

                elif format_str.lower() in ["mmmm", "month"]:
                    months = [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                    ]
                    return months[date_obj.month - 1]

                elif format_str.lower() in ["yyyy", "year"]:
                    return str(date_obj.year)

                elif format_str.lower() in ["mm", "month_num"]:
                    return f"{date_obj.month:02d}"

                elif format_str.lower() in ["dd", "day"]:
                    return f"{date_obj.day:02d}"

            # Try to parse as number for numeric formatting
            try:
                num_value = float(value_str)

                # Number formatting patterns
                if format_str.lower() in ["0", "#"]:
                    return str(int(num_value))
                elif format_str.lower() in ["0.0", "#.#"]:
                    return f"{num_value:.1f}"
                elif format_str.lower() in ["0.00", "#.##"]:
                    return f"{num_value:.2f}"
                elif format_str.lower() in ["0%", "#%"]:
                    return f"{num_value * 100:.0f}%"
                elif format_str.lower() in ["0.0%", "#.#%"]:
                    return f"{num_value * 100:.1f}%"
                elif format_str.lower() in ["0.00%", "#.##%"]:
                    return f"{num_value * 100:.2f}%"
                elif format_str.lower() in ["$0", "$#"]:
                    return f"${num_value:.0f}"
                elif format_str.lower() in ["$0.00", "$#.##"]:
                    return f"${num_value:.2f}"
                elif re.match(r"^[#0,]+$", format_str):
                    # Comma-separated numbers
                    return f"{num_value:,.0f}"
                elif re.match(r"^[#0,]+\.[#0]+$", format_str):
                    # Comma-separated with decimals
                    decimal_places = len(format_str.split(".")[1])
                    return f"{num_value:,.{decimal_places}f}"

            except ValueError:
                pass

            # For unhandled formats or non-date/non-number values, return the original value as string
            return value_str

        except Exception as e:
            return str(value)

    def load_csv_from_string(self, csv_content: str) -> bool:
        """Load CSV from string and create column mappings"""
        try:
            # Use StringIO to convert string content to file-like object for pandas
            csv_io = StringIO(csv_content)
            self.data = pd.read_csv(csv_io, on_bad_lines="skip")
            self.headers = list(self.data.columns)
            self._create_column_mappings()
            return True
        except Exception as e:
            raise Exception(f"Error loading CSV: {e}")

    def load_csv(self, file_path: str) -> bool:
        """Load CSV file and create column mappings"""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"CSV file not found: {file_path}")

            # Load with pandas for better handling
            self.data = pd.read_csv(file_path)
            self.headers = list(self.data.columns)

            # Create column letter mappings (A, B, C, ...)
            self._create_column_mappings()

            return True

        except Exception as e:
            raise Exception(f"Error loading CSV file: {e}")

    def _create_column_mappings(self):
        """Create mappings between column letters and column names"""
        self.column_mapping = {}
        self.reverse_mapping = {}

        for idx, header in enumerate(self.headers):
            letter = self._number_to_letter(idx)
            self.column_mapping[letter] = header
            self.reverse_mapping[header] = letter

    def _number_to_letter(self, num: int) -> str:
        """Convert column number to Excel-style letter (0->A, 1->B, etc.)"""
        result = ""
        while num >= 0:
            result = chr(65 + (num % 26)) + result
            num = num // 26 - 1
            if num < 0:
                break
        return result

    def get_column_by_letter(self, letter: str) -> Optional[str]:
        """Get column name by Excel-style letter"""
        return self.column_mapping.get(letter.upper())

    def get_letter_by_column(self, column_name: str) -> Optional[str]:
        """Get Excel-style letter by column name"""
        return self.reverse_mapping.get(column_name)

    def get_unique_values(self, column_letter: str) -> List[Any]:
        """Get unique values from a column specified by letter"""
        column_name = self.get_column_by_letter(column_letter)
        if column_name is None or column_name not in self.data.columns:
            return []

        # Remove NaN values and get unique values
        unique_vals = self.data[column_name].dropna().unique()
        return sorted(unique_vals.tolist())

    def get_column_data(self, column_letter: str, start_row: int = 1) -> List[Any]:
        """Get all data from a column (excluding header if start_row=1)"""
        column_name = self.get_column_by_letter(column_letter)
        if column_name is None or column_name not in self.data.columns:
            return []

        # Adjust for 0-based indexing (Excel is 1-based)
        if start_row > 0:
            start_row -= 1

        return self.data[column_name].iloc[start_row:].tolist()

    def get_data_as_json(self) -> str:
        """Convert CSV data to JSON format for JavaScript consumption"""
        if self.data is None:
            return "[]"

        # Convert DataFrame to JSON, handling NaN values
        return self.data.fillna("").to_json(orient="records", default_handler=str)

    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary information about the loaded data"""
        if self.data is None:
            return {}

        return {
            "rows": len(self.data),
            "columns": len(self.data.columns),
            "column_names": self.headers,
            "sample_data": self.data.head(3).to_dict("records"),
        }

    def apply_filters(self, filters: Dict[str, Any]) -> pd.DataFrame:
        """Apply filters to the data and return filtered DataFrame"""
        if self.data is None:
            return pd.DataFrame()

        filtered_data = self.data.copy()

        for filter_name, filter_value in filters.items():
            if filter_value is None or filter_value == "":
                continue

            # Find column for this filter
            column_name = None
            for col in self.headers:
                if col.lower() == filter_name.lower():
                    column_name = col
                    break

            if column_name is None:
                continue

            # Apply filter based on value type
            if isinstance(filter_value, list):
                # Multi-select filter
                filtered_data = filtered_data[
                    filtered_data[column_name].isin(filter_value)
                ]
            elif (
                isinstance(filter_value, dict)
                and "min" in filter_value
                and "max" in filter_value
            ):
                # Range filter
                min_val = filter_value.get("min")
                max_val = filter_value.get("max")
                if min_val is not None:
                    filtered_data = filtered_data[filtered_data[column_name] >= min_val]
                if max_val is not None:
                    filtered_data = filtered_data[filtered_data[column_name] <= max_val]
            else:
                # Single value filter
                filtered_data = filtered_data[
                    filtered_data[column_name] == filter_value
                ]

        return filtered_data

    def get_filtered_data_json(self, filters: Dict[str, Any]) -> str:
        """Get filtered data as JSON"""
        filtered_data = self.apply_filters(filters)
        return filtered_data.fillna("").to_json(orient="records", default_handler=str)

    def apply_transformations(self, transformations: List[Any]) -> None:
        """Apply transformation formulas to create new columns"""
        if not transformations or self.data is None:
            return

        for transformation in transformations:
            column_name = transformation.name
            formula = transformation.formula

            try:
                # Generic formula evaluation
                self.data[column_name] = self._evaluate_formula(formula)

                # Update mappings to include the new column
                self._add_column_to_mappings(column_name)

                # Show results
                sample_values = self.data[column_name].value_counts()
                print(f"✅ Created '{column_name}' column: {dict(sample_values)}")

            except Exception as e:
                print(
                    f"Warning: Could not apply transformation for column '{column_name}': {e}"
                )

    def _evaluate_formula(self, formula: str):
        """Evaluate an Excel-style formula and return a pandas Series"""
        if not formula.startswith("="):
            return formula

        # Remove the = sign
        formula = formula[1:]

        # Handle Excel IF statements with nested conditions
        def evaluate_row(row):
            return self._evaluate_formula_for_row(formula, row)

        return self.data.apply(evaluate_row, axis=1)

    def _evaluate_formula_for_row(self, formula: str, row):
        """Evaluate a formula for a single row"""
        eval_formula = formula

        # Set current row context for ROW() and OFFSET() functions
        self._current_row = row
        self._current_row_index = row.name if hasattr(row, 'name') and row.name is not None else 0

        # Convert Excel functions to Python first (before column replacement)
        eval_formula = self._convert_excel_functions_to_python(eval_formula, row)

        # Replace Excel-style column references (A:A, B2:B, etc.) with row values
        eval_formula = self._replace_excel_column_refs_for_row(eval_formula, row)

        # Replace direct column name references with values
        for col_name in self.data.columns:
            # Use word boundaries to ensure exact matches
            pattern = r"\b" + re.escape(col_name) + r"\b"
            eval_formula = re.sub(pattern, f'row["{col_name}"]', eval_formula)

        try:
            # Create a safe evaluation environment with Excel functions
            safe_dict = {
                "row": row,
                "__builtins__": {},
                "len": len,
                "str": str,
                "int": int,
                "float": float,
                "None": None,
                "LEFT": self.excel_left,
                "RIGHT": self.excel_right,
                "MID": self.excel_mid,
                "TIME": self.excel_time,
                "VALUE": self.excel_value,
                "ISNUMBER": self.excel_isnumber,
                "SEARCH": self.excel_search,
                "HOUR": self.excel_hour,
                "TIMEVALUE": self.excel_timevalue,
                "INT": self.excel_int,
                "YEAR": self.excel_year,
                "TEXT": self.excel_text,
                "TODAY": self.excel_today,
                "ROW": self.excel_row,
                "OFFSET": self.excel_offset,
            }
            result = eval(eval_formula, safe_dict)
            return result
        except Exception as e:
            print(
                f"Error evaluating formula '{formula}' -> '{eval_formula}' for row: {e}"
            )
            return None

    def _convert_excel_functions_to_python(self, formula: str, row) -> str:
        """Convert Excel functions to Python equivalents"""
        # Handle string comparisons (clean up quotes first)
        formula = formula.replace('"', "'")

        # Excel functions are now defined at class level and will be available in evaluation context

        # Handle nested IF statements (process from innermost to outermost)
        formula = self._convert_if_statements(formula)

        # Handle AND statements (process after IF to handle AND inside IF arguments)
        formula = self._convert_and_statements(formula)

        # Handle OR statements (process after IF to handle OR inside IF arguments)
        formula = self._convert_or_statements(formula)

        # Handle comparison operators (after all other conversions)
        formula = self._convert_comparison_operators(formula)

        return formula

    def _convert_comparison_operators(self, formula: str) -> str:
        """Convert Excel comparison operators to Python"""
        # Convert single = to == for comparison (but not in string assignments)
        # Only convert = that are not inside quotes and not already ==
        formula = re.sub(r"(?<![=!<>])=(?!=)", "==", formula)

        # Handle <> as !=
        formula = formula.replace("<>", "!=")

        return formula

    def _convert_or_statements(self, formula: str) -> str:
        """Convert OR statements to Python or operators"""
        # Find and convert OR statements
        while "OR(" in formula:
            start_idx = formula.find("OR(")
            if start_idx == -1:
                break

            # Find the matching closing parenthesis
            paren_count = 0
            i = start_idx + 2  # Start after 'OR'
            while i < len(formula):
                if formula[i] == "(":
                    paren_count += 1
                elif formula[i] == ")":
                    paren_count -= 1
                    if paren_count == 0:
                        end_idx = i
                        break
                i += 1
            else:
                break

            # Extract the arguments from inside the parentheses
            args_str = formula[start_idx + 3 : end_idx]  # Skip 'OR('

            # Split arguments by commas
            args = self._split_function_args(args_str)

            if len(args) >= 2:
                # Join all arguments with 'or'
                or_expression = " or ".join(arg.strip() for arg in args)
                replacement = f"({or_expression})"
                formula = formula[:start_idx] + replacement + formula[end_idx + 1 :]
            else:
                break

        return formula

    def _convert_and_statements(self, formula: str) -> str:
        """Convert AND statements to Python and operators"""
        # Find and convert AND statements
        while "AND(" in formula:
            start_idx = formula.find("AND(")
            if start_idx == -1:
                break

            # Find the matching closing parenthesis
            paren_count = 0
            i = start_idx + 3  # Start after 'AND'
            while i < len(formula):
                if formula[i] == "(":
                    paren_count += 1
                elif formula[i] == ")":
                    paren_count -= 1
                    if paren_count == 0:
                        end_idx = i
                        break
                i += 1
            else:
                break

            # Extract the arguments from inside the parentheses
            args_str = formula[start_idx + 4 : end_idx]  # Skip 'AND('

            # Split arguments by commas
            args = self._split_function_args(args_str)

            if len(args) >= 2:
                # Join all arguments with 'and'
                and_expression = " and ".join(arg.strip() for arg in args)
                replacement = f"({and_expression})"
                formula = formula[:start_idx] + replacement + formula[end_idx + 1 :]
            else:
                break

        return formula

    def _convert_if_statements(self, formula: str) -> str:
        """Convert nested IF statements to Python conditional expressions"""
        # Find and convert IF statements from innermost to outermost
        while "IF(" in formula:
            # Find an IF statement and extract its arguments
            start_idx = formula.find("IF(")
            if start_idx == -1:
                break

            # Find the matching closing parenthesis by counting parentheses
            paren_count = 0
            i = start_idx + 2  # Start after 'IF'
            while i < len(formula):
                if formula[i] == "(":
                    paren_count += 1
                elif formula[i] == ")":
                    paren_count -= 1
                    if paren_count == 0:
                        end_idx = i
                        break
                i += 1
            else:
                # No matching closing parenthesis found
                break

            # Extract the arguments from inside the parentheses
            args_str = formula[start_idx + 3 : end_idx]  # Skip 'IF('

            # Split arguments by commas that are not inside parentheses
            args = self._split_function_args(args_str)

            if len(args) == 3:
                condition, true_value, false_value = args
                replacement = f"({true_value.strip()} if {condition.strip()} else {false_value.strip()})"
                formula = formula[:start_idx] + replacement + formula[end_idx + 1 :]
            else:
                # Can't parse this IF statement, skip it
                break

        return formula

    def _split_function_args(self, args_str: str) -> List[str]:
        """Split function arguments by commas, respecting nested parentheses and quotes"""
        args = []
        current_arg = ""
        paren_count = 0
        quote_char = None

        for char in args_str:
            if quote_char:
                # Inside a string literal
                current_arg += char
                if char == quote_char:
                    quote_char = None
            elif char in ['"', "'"]:
                # Start of string literal
                current_arg += char
                quote_char = char
            elif char == "(":
                current_arg += char
                paren_count += 1
            elif char == ")":
                current_arg += char
                paren_count -= 1
            elif char == "," and paren_count == 0:
                # Argument separator at top level
                args.append(current_arg)
                current_arg = ""
            else:
                current_arg += char

        # Add the last argument
        if current_arg:
            args.append(current_arg)

        return args

    def _replace_excel_column_refs_for_row(self, formula: str, row) -> str:
        """Replace Excel-style column references with actual row values for Python evaluation"""

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
            # If they're the same name
            elif start_name == end_name:
                base_name = start_name
            else:
                return match.group(0)  # Return original if we can't handle it

            # Get the value from the row
            if base_name in row.index:
                value = row[base_name]
                if pd.isna(value):
                    return "0"
                elif isinstance(value, str):
                    return f'"{value}"'
                else:
                    return str(value)
            else:
                return f'"{base_name}"'  # Fallback to the name itself

        formula = re.sub(custom_range_pattern, replace_custom_range, formula)

        # Pattern for column ranges like A:A, B2:B, C:C, etc.
        range_pattern = r"([A-Z]+)(\d*):([A-Z]+)(\d*)"

        def replace_range(match):
            start_col = match.group(1)
            start_row = match.group(2)
            end_col = match.group(3)
            end_row = match.group(4)

            # For single column ranges (A:A, B2:B), get the column name and row value
            if start_col == end_col:
                column_name = self.column_mapping.get(start_col)
                if column_name and column_name in row.index:
                    # Return the actual value from the row, properly quoted if it's a string
                    value = row[column_name]
                    if pd.isna(value):  # Handle NaN/null values
                        return "0"  # Use 0 for numeric comparisons instead of None
                    elif isinstance(value, str):
                        return f'"{value}"'
                    else:
                        return str(value)
                else:
                    return f'"{start_col}"'  # Fallback to the letter itself

            return match.group(0)  # Return original if we can't handle it

        formula = re.sub(range_pattern, replace_range, formula)

        # Pattern for single cell references like A1, B5 (treat as current row value)
        cell_pattern = r"([A-Z]+)(\d+)"

        def replace_cell(match):
            col = match.group(1)
            # For single cell references, use current row value (ignore the row number)
            column_name = self.column_mapping.get(col)
            if column_name and column_name in row.index:
                value = row[column_name]
                if pd.isna(value):  # Handle NaN/null values
                    return "0"  # Use 0 for numeric comparisons instead of None
                elif isinstance(value, str):
                    return f'"{value}"'
                else:
                    return str(value)
            else:
                return f'"{col}"'  # Fallback

        formula = re.sub(cell_pattern, replace_cell, formula)

        return formula

    def _add_column_to_mappings(self, column_name: str) -> None:
        """Add a new column to the letter mappings"""
        # Find the next available letter
        next_index = len(self.headers)
        letter = self._number_to_letter(next_index)

        # Add to headers and mappings
        self.headers.append(column_name)
        self.column_mapping[letter] = column_name
        self.reverse_mapping[column_name] = letter
