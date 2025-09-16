from typing import Any, Dict, Optional
import xml

from ..client.models import EventType
from .base import ToolHandler, ToolResult
from .file_system_ops.file_ops import (
    file_explore_directory,
    file_find_by_name,
    file_find_in_content,
    file_read,
    file_str_replace,
    file_write,
)
from .registry import ToolRegistry
from .xml_validator import validate_xml_parser


@ToolRegistry.register(
    "file_read",
    xml_tag="file_read",
    required_params=["file"],
    optional_params=["start_line", "end_line"],
    attribute_mappings={
        "file": "file",
        "start_line": "start_line",
        "end_line": "end_line",
    },
)
class FileReadHandler(ToolHandler):
    """Handler for file read operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_READ, params)
        params["start_line"] = int(params.get("start_line", 1))
        params["end_line"] = int(params.get("end_line", 1))

        file = params.get("file", None)
        # check if extension is csv set end_line
        if file and file.endswith(".csv"):
            params["end_line"] = min(params["end_line"], 20)

        result = await file_read(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_write",
    xml_tag="file_write",
    required_params=["file", "content"],
    optional_params=["append"],
    content_param="content",
    attribute_mappings={"file": "file", "append": "append"},
)
class FileWriteHandler(ToolHandler):
    """Handler for file write operations"""

    VALID_FILE_EXTENSIONS = [".pxml", ".csv", ".md"]

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        if "content" not in params:
            return "Missing required parameter: content"

        # Validate file extension
        file_extension = "." + params.get("file", "").split(".")[-1]
        if file_extension not in self.VALID_FILE_EXTENSIONS:
            return f"Invalid file extension: {file_extension}. Valid extensions: {', '.join(self.VALID_FILE_EXTENSIONS)}"

        if file_extension == ".pxml" and params.get("content", "").strip() != "":
            # Use the comprehensive XML parser validation
            content = """<?pxml version="1.0" encoding="UTF-8"?>
<dashboard>
  <name>Walmart Sales & Performance Dashboard</name>
  <description>Comprehensive analysis of Walmart's weekly sales performance across stores, tracking key metrics like total sales volume, holiday impacts, and correlations with external factors such as temperature and fuel prices.</description>
  <file_path>Walmart_Sales.csv</file_path>
  <fa_icon>fa-store</fa_icon>

  <!-- Define transformations to enhance analysis capabilities -->
  <transformations>
    <define_column name="Month_Year">
      <formula>=TEXT(B:B,"MMM YYYY")</formula>
    </define_column>
  </transformations>

  <!-- Create filters for interactive data exploration -->
  <filters>
    <filter type="list">
      <name>Store</name>
      <values>
        <formula>=unique(A2:A)</formula>
      </values>
    </filter>
    <filter type="date_range">
      <name>Date Range</name>
      <values>
        <formula>=unique(B2:B)</formula>
      </values>
    </filter>
    <filter type="list">
      <name>Holiday Status</name>
      <values>
        <formula>=unique(D2:D)</formula>
      </values>
    </filter>
  </filters>

  <!-- Organize dashboard content in logical grid layout -->
  <grid>
    <!-- Row 1: Key Performance Indicators -->
    <row>
      <column size="1">
        <kpi>
          <fa_icon>fa-dollar-sign</fa_icon>
          <name>Total Sales</name>
          <value>
            <formula>=SUM(C2:C)</formula>
            <format>currency:usd</format>
            <unit>USD</unit>
          </value>
        </kpi>
      </column>
      <column size="1">
        <kpi>
          <fa_icon>fa-chart-line</fa_icon>
          <name>Average Weekly Sales</name>
          <value>
            <formula>=AVERAGE(C2:C)</formula>
            <format>currency:usd</format>
            <unit>USD</unit>
          </value>
        </kpi>
      </column>
      <column size="1">
        <kpi>
          <fa_icon>fa-trophy</fa_icon>
          <name>Highest Single Week Sales</name>
          <value>
            <formula>=MAX(C2:C)</formula>
            <format>currency:usd</format>
            <unit>USD</unit>
          </value>
        </kpi>
      </column>
      <column size="1">
        <kpi>
          <fa_icon>fa-store-alt</fa_icon>
          <name>Number of Stores</name>
          <value>
            <formula>=COUNTA(unique(A2:A))</formula>
            <format>number</format>
            <unit>Stores</unit>
          </value>
        </kpi>
      </column>
    </row>

    <!-- Row 2: Sales trend and store comparison -->
    <row>
      <column size="2">
        <chart type="line" area="true">
          <name>Weekly Sales Trend Over Time</name>
          <x_axis>
            <name>Date</name>
            <column>B</column>
            <group_by>B</group_by>
          </x_axis>
          <series_list>
            <series>
              <name>Sales</name>
              <column>C</column>
              <aggregation>sum</aggregation>
              <format>currency</format>
              <unit>USD</unit>
            </series>
          </series_list>
        </chart>
      </column>
      <column size="2">
        <chart type="bar">
          <name>Sales by Store</name>
          <x_axis>
            <name>Store</name>
            <column>A</column>
            <group_by>A</group_by>
          </x_axis>
          <series_list>
            <series>
              <name>Total Sales</name>
              <column>C</column>
              <aggregation>sum</aggregation>
              <format>currency</format>
              <unit>USD</unit>
            </series>
          </series_list>
        </chart>
      </column>
    </row>

    <!-- Row 3: Holiday impact and external factors analysis -->
    <row>
      <column size="2">
        <chart type="horizontal_bar">
          <name>Sales During Holidays vs Non-Holidays</name>
          <x_axis>
            <name>Holiday Status</name>
            <column>D</column>
            <group_by>D</group_by>
          </x_axis>
          <series_list>
            <series>
              <name>Sales</name>
              <column>C</column>
              <aggregation>sum</aggregation>
              <format>currency</format>
              <unit>USD</unit>
            </series>
          </series_list>
        </chart>
      </column>
      <column size="2">
        <chart type="scatter">
          <name>Sales vs Temperature Correlation</name>
          <x_axis>
            <name>Temperature (°F)</name>
            <column>E</column>
            <group_by>E</group_by>
          </x_axis>
          <series_list>
            <series>
              <name>Temperature</name>
              <column>E</column>
              <aggregation>avg</aggregation>
              <format>number</format>
              <unit>°F</unit>
            </series>
            <series>
              <name>Sales</name>
              <column>C</column>
              <aggregation>avg</aggregation>
              <format>currency</format>
              <unit>USD</unit>
            </series>
          </series_list>
        </chart>
      </column>
    </row>

    <!-- Row 4: Multi-factor analysis and distribution visualization -->
    <row>
      <column size="2">
        <chart type="combo_chart">
          <name>External Factors Impact on Sales</name>
          <x_axis>
            <name>Temperature</name>
            <column>E</column>
            <group_by>E</group_by>
          </x_axis>
          <series_list>
            <series>
              <name>Temperature</name>
              <column>E</column>
              <aggregation>avg</aggregation>
              <format>number</format>
              <unit>°F</unit>
            </series>
            <series>
              <name>Fuel Price</name>
              <column>F</column>
              <aggregation>avg</aggregation>
              <format>currency</format>
              <unit>USD</unit>
            </series>
          </series_list>
        </chart>
      </column>
      <column size="2">
        <chart type="pie">
          <name>Sales Distribution by Store</name>
          <x_axis>
            <name>Store</name>
            <column>A</column>
            <group_by>A</group_by>
          </x_axis>
          <series_list>
            <series>
              <name>Sales Share</name>
              <column>C</column>
              <aggregation>sum</aggregation>
              <format>currency</format>
              <unit>USD</unit>
            </series>
          </series_list>
        </chart>
      </column>
    </row>

    <!-- Row 5: Monthly trend and detailed data view -->
    <row>
      <column size="2">
        <chart type="line">
          <name>Monthly Sales Trend</name>
          <x_axis>
            <name>Month</name>
            <column>Month_Year</column>
            <group_by>Month_Year</group_by>
          </x_axis>
          <series_list>
            <series>
              <name>Sales</name>
              <column>C</column>
              <aggregation>sum</aggregation>
              <format>currency</format>
              <unit>USD</unit>
            </series>
          </series_list>
        </chart>
      </column>
      <column size="2">
        <table>
          <name>Detail View</name>
          <fields>
            <field>
              <name>Date</name>
              <column>B</column>
              <format>date</format>
            </field>
            <field>
              <name>Store</name>
              <column>A</column>
              <format>text</format>
            </field>
            <field>
              <name>Sales</name>
              <column>C</column>
              <format>currency</format>
              <unit>USD</unit>
            </field>
            <field>
              <name>Weekday</name>
              <column>B</column>
              <format>text</format>
            </field>
            <field>
              <name>Temperature</name>
              <column>E</column>
              <format>number</format>
              <unit>°F</unit>
            </field>
            <field>
              <name>Fuel Price</name>
              <column>F</column>
              <format>currency</format>
              <unit>USD</unit>
            </field>
            <field>
              <name>Holiday</name>
              <column>D</column>
              <format>text</format>
            </field>
          </fields>
        </table>
      </column>
    </row>
  </grid>
</dashboard>"""
            is_valid, error_message = validate_xml_parser(content, file_extension)
            if not is_valid:
                return f"Invalid pxml file: {error_message}. \n Please check the file and rewrite the file again with the fix."

        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_WRITE, params)
        params["append"] = params.get("append", "false") == "true"  # Convert to boolean
        result = await file_write(self.environment, **params)
        await self.add_event(EventType.FILE_WRITE, params)

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_replace",
    xml_tag="file_replace",
    required_params=["file", "find_str", "replace_str"],
    attribute_mappings={
        "file": "file",
        "find_str": "find_str",
        "replace_str": "replace_str",
    },
)
class FileReplaceHandler(ToolHandler):
    """Handler for file string replacement operations"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        required_params = ["file", "find_str", "replace_str"]
        missing = [param for param in required_params if param not in params]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        # await self.add_event(EventType.FILE_REPLACE, params)
        # Map the XML parameter names to the function parameter names
        mapped_params = {
            "file": params["file"],
            "old_str": params["find_str"],
            "new_str": params["replace_str"],
        }
        result = await file_str_replace(self.environment, **mapped_params)
        await self.add_event(EventType.FILE_REPLACE, params)

        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_find_in_content",
    xml_tag="file_find_in_content",
    required_params=["file", "regex"],
    attribute_mappings={
        "file": "file",
        "regex": "regex",
    },
)
class FileFindInContentHandler(ToolHandler):
    """Handler for finding content in files"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "file" not in params:
            return "Missing required parameter: file"
        if "regex" not in params:
            return "Missing required parameter: regex"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_FIND, params)
        result = await file_find_in_content(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "file_search_by_name",
    xml_tag="file_search_by_name",
    required_params=["path", "glob_pattern"],
    attribute_mappings={
        "path": "path",
        "glob_pattern": "glob_pattern",
    },
)
class FileSearchByNameHandler(ToolHandler):
    """Handler for searching files by name"""

    def validate_input(self, params: Dict[str, Any]) -> Optional[str]:
        if "path" not in params:
            return "Missing required parameter: path"
        if "glob_pattern" not in params:
            return "Missing required parameter: glob_pattern"
        return None

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_FIND, params)
        result = await file_find_by_name(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )


@ToolRegistry.register(
    "explore_directory",
    xml_tag="explore_directory",
    required_params=["path"],
    optional_params=["max_depth"],
    attribute_mappings={"path": "path", "max_depth": "max_depth"},
)
class ExploreDirectoryHandler(ToolHandler):
    """Handler for exploring directory structure"""

    async def execute(self, params: Dict[str, Any]) -> ToolResult:
        await self.add_event(EventType.FILE_EXPLORE, params)
        try:
            max_depth = params.get("max_depth", 2)
            params["max_depth"] = int(max_depth) if max_depth not in (None, "") else 2
        except (ValueError, TypeError):
            params["max_depth"] = 2

        result = await file_explore_directory(self.environment, **params)
        return ToolResult(
            success=result.get("status") == "success",
            data=result,
            error=result.get("message") if result.get("status") != "success" else None,
        )
