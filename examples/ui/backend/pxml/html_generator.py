"""
HTML Generator V2 for Dashboard

Simplified HTML generator that separates data preparation from rendering.
Uses modular JavaScript components for interactivity.
"""

import json
from typing import Dict, List, Any, Optional
from .xml_parser import FilterSpec, DashboardMetadata, KPISpec, ChartSpec
from .dashboard_data_processor import DashboardDataProcessor


class HTMLGenerator:
    """Simplified HTML generator using modular JavaScript architecture"""

    def __init__(self):
        self.data_processor = DashboardDataProcessor()

    def generate_dashboard_html(
        self,
        dashboard_data: Dict[str, Any],
        csv_data_json: str,
        column_mapping: Dict[str, str] = None,
        artifact_id: str = None,
        remove_watermark: bool = False,
    ) -> str:
        """Generate complete dashboard HTML using modular approach"""

        # Process dashboard data into simplified JSON configuration
        # CSV data and column mapping are now loaded dynamically on client-side
        config = self.data_processor.process_dashboard_config(
            dashboard_data, csv_data_json, column_mapping
        )

        # Add artifact ID to the configuration if provided
        if artifact_id:
            config["artifact_id"] = artifact_id

        # Generate the complete HTML
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{config['metadata']['name']}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        {self._generate_styles()}
        
        /* Ensure table headers truncate properly */
        #dataTable th {{
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}
        
        /* Ensure table cells also truncate */
        #dataTable td {{
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}
    </style>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        {self._generate_header(config['metadata'])}
        {self._generate_filters_section(config['filters'])}
        {self._generate_content_section(config['components'])}
    </div>
    
    {self._generate_data_modal()}
    {self._generate_watermark() if not remove_watermark else ""}
    {self._generate_scripts(config)}
</body>
</html>"""
        return html

    def _generate_styles(self) -> str:
        """Generate CSS styles"""
        return """
        .filter-container {
            max-height: 200px;
            overflow-y: auto;
        }
        .filter-item {
            cursor: pointer;
            transition: all 0.2s;
        }
        .filter-item:hover {
            background-color: rgb(243 244 246);
        }
        .filter-item.selected {
            background-color: rgb(59 130 246);
            color: white;
        }
        .kpi-component {
            /* Removed transition to prevent weird resize effects */
        }
        .kpi-value {
            /* Removed transition to prevent weird resize effects */
        }
        .kpi-updating {
            opacity: 0.6;
        }
        .chart-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .kpi-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .chart-component {
            height: 100%;
            max-height: 500px;
            max-width: 100%;
            overflow: hidden;
        }
        .chart-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-width: 100%;
            overflow: hidden;
        }
        
        /* Watermark Styles */
        .watermark {
            position: fixed;
            bottom: 20px;
            right: 30px;
            z-index: 1000;
            transition: all 0.3s ease;
            pointer-events: auto;
            user-select: none;
            cursor: pointer;
        }
        
        .watermark:hover {
            transform: scale(1.05);
        }
        
        .watermark-content {
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #1f2937, #111827);
            border: 1px solid #4b5563;
            border-radius: 12px;
            padding: 8px 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
            pointer-events: none;
        }
        
        .watermark-icon {
            color: #e5e7eb;
            font-size: 16px;
        }
        
        .watermark-text {
            color: #ffffff;
            font-size: 15px;
            font-weight: 500;
            letter-spacing: 0.025em;
        }
        
        .watermark-annie {
            font-weight: 700;
            font-size: 18px;
        }
        """

    def _generate_header(self, metadata: Dict[str, Any]) -> str:
        """Generate dashboard header"""
        return f"""
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas {metadata['fa_icon']} text-2xl text-blue-600" data-dashboard-icon></i>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900" data-dashboard-name>{metadata['name']}</h1>
                            <p class="text-sm text-gray-600" data-dashboard-description>{metadata['description']}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 text-sm text-gray-500">
                        <i class="fas fa-database"></i>
                        <span id="dataPreviewButton" class="text-gray-400 cursor-not-allowed transition-colors" style="pointer-events: none;" title="Loading data...">Data: {metadata['file_path']}</span>
                    </div>
                </div>
            </div>
        </header>"""

    def _generate_filters_section(self, filters: List[Dict[str, Any]]) -> str:
        """Generate filters section - always create the section, JavaScript will show/hide it"""
        # Always create the filters section, even if empty
        # JavaScript will handle showing/hiding based on filter count
        filters_html = """
        <section class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                        <i class="fas fa-filter mr-2 text-blue-600"></i>
                        Filters
                    </h2>
                    <button onclick="clearAllFilters()" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Clear All
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">"""

        # Add individual filter components if they exist
        for filter_config in filters:
            filters_html += self._generate_filter_component(filter_config)

        filters_html += """
                </div>
            </div>
        </section>"""

        return filters_html

    def _generate_filter_component(self, filter_config: Dict[str, Any]) -> str:
        """Generate individual filter component"""
        filter_id = filter_config["id"]
        filter_name = filter_config["name"]
        filter_type = filter_config["type"]

        if filter_type == "list":
            return self._generate_list_filter(filter_id, filter_name)
        elif filter_type == "number_range":
            return self._generate_number_range_filter(filter_id, filter_name)
        elif filter_type == "date_range":
            return self._generate_date_range_filter(filter_id, filter_name)
        else:
            return self._generate_list_filter(filter_id, filter_name)

    def _generate_list_filter(self, filter_id: str, filter_name: str) -> str:
        """Generate list/dropdown filter"""
        return f"""
        <div class="filter-component">
            <label class="block text-sm font-medium text-gray-700 mb-2">{filter_name}</label>
            <div class="relative">
                <button 
                    id="{filter_id}_button"
                    onclick="toggleFilterDropdown('{filter_id}')"
                    class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between">
                    <span id="{filter_id}_display" class="text-gray-700">Select {filter_name}</span>
                    <i class="fas fa-chevron-down text-gray-400"></i>
                </button>
                <div 
                    id="{filter_id}_dropdown"
                    class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg hidden">
                    <div class="p-2 border-b">
                        <input 
                            type="text"
                            id="{filter_id}_search"
                            placeholder="Search..."
                            class="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onkeyup="filterDropdownOptions('{filter_id}')">
                    </div>
                    <div class="filter-container p-1" id="{filter_id}_options">
                        <!-- Options will be populated by JavaScript -->
                    </div>
                    <div class="p-2 border-t bg-gray-50 flex justify-end">
                        <button 
                            onclick="clearFilterSelection('{filter_id}', '{filter_name}')"
                            class="text-xs text-red-600 hover:text-red-800">Clear</button>
                    </div>
                </div>
            </div>
        </div>"""

    def _generate_number_range_filter(self, filter_id: str, filter_name: str) -> str:
        """Generate number range filter"""
        return f"""
        <div class="filter-component">
            <label class="block text-sm font-medium text-gray-700 mb-2">{filter_name}</label>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <input 
                        type="number"
                        id="{filter_id}_min"
                        placeholder="Min"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onblur="validateAndUpdateRangeFilter('{filter_id}', '{filter_name}', 'min')"
                        onchange="validateAndUpdateRangeFilter('{filter_id}', '{filter_name}', 'min')">
                </div>
                <div>
                    <input 
                        type="number"
                        id="{filter_id}_max"
                        placeholder="Max"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onblur="validateAndUpdateRangeFilter('{filter_id}', '{filter_name}', 'max')"
                        onchange="validateAndUpdateRangeFilter('{filter_id}', '{filter_name}', 'max')">
                </div>
            </div>
            <div class="mt-1 text-xs text-gray-500" id="{filter_id}_range_info">
                Range: <span id="{filter_id}_min_val">-</span> to <span id="{filter_id}_max_val">-</span>
            </div>
        </div>"""

    def _generate_date_range_filter(self, filter_id: str, filter_name: str) -> str:
        """Generate date range filter"""
        return f"""
        <div class="filter-component">
            <label class="block text-sm font-medium text-gray-700 mb-2">{filter_name}</label>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <input 
                        type="date"
                        id="{filter_id}_start"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onblur="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_name}', 'start')"
                        onchange="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_name}', 'start')">
                </div>
                <div>
                    <input 
                        type="date"
                        id="{filter_id}_end"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onblur="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_name}', 'end')"
                        onchange="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_name}', 'end')">
                </div>
            </div>
        </div>"""

    def _generate_content_section(self, components: List[Dict[str, Any]]) -> str:
        """Generate main dashboard content"""
        content_html = """
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">"""

        for component in components:
            content_html += self._generate_component(component)

        content_html += """
        </main>"""

        return content_html

    def _generate_component(self, component: Dict[str, Any]) -> str:
        """Generate a component recursively"""
        if component["type"] == "row":
            return self._generate_row_component(component)
        elif component["type"] == "kpi":
            return self._generate_kpi_component(component)
        elif component["type"] == "chart":
            return self._generate_chart_component(component)
        else:
            return ""

    def _generate_row_component(self, row_component: Dict[str, Any]) -> str:
        """Generate a grid row with columns"""
        row_id = row_component["id"]
        columns = row_component["columns"]

        row_html = f"""
            <div class="flex flex-col md:flex-row gap-6 mb-6 md:items-stretch" id="{row_id}">"""

        for column in columns:
            col_id = column["id"]
            flex_grow = column["flex_grow"]

            column_html = f"""
                <div class="w-full md:w-auto" id="{col_id}">
                    <style>
                        @media (min-width: 768px) {{
                            #{col_id} {{ flex: {flex_grow} 1 0 !important; }}
                        }}
                    </style>
                    <div class="h-full flex flex-col">"""

            for content_item in column["content"]:
                column_html += self._generate_component(content_item)

            column_html += """
                    </div>
                </div>"""

            row_html += column_html

        row_html += """
            </div>"""

        return row_html

    def _generate_kpi_component(self, kpi_config: Dict[str, Any]) -> str:
        """Generate KPI container with individual data attributes for each property"""
        kpi_id = kpi_config["id"]

        # Create individual data attributes for each KPI property
        # Properly escape quotes and special characters for HTML attributes
        def escape_html_attr(value):
            if value is None:
                return ""
            return str(value).replace('"', "&quot;").replace("'", "&#39;")

        data_attrs = []
        data_attrs.append(f'data-component-type="kpi"')
        data_attrs.append(f'data-id="{escape_html_attr(kpi_config.get("id", ""))}"')
        data_attrs.append(f'data-name="{escape_html_attr(kpi_config.get("name", ""))}"')
        data_attrs.append(
            f'data-fa-icon="{escape_html_attr(kpi_config.get("fa_icon", ""))}"'
        )
        data_attrs.append(
            f'data-value-formula="{escape_html_attr(kpi_config.get("value_formula", ""))}"'
        )
        data_attrs.append(
            f'data-format-type="{escape_html_attr(kpi_config.get("format_type", ""))}"'
        )
        data_attrs.append(
            f'data-unit="{escape_html_attr(kpi_config.get("unit", "") or "")}"'
        )

        # Note: We don't store data_params anymore - the component is fully self-contained
        # with just the basic properties above. The JS formula is already converted from Excel.

        data_attributes = " ".join(data_attrs)

        return f"""
        <div id="{kpi_id}_container" 
             class="kpi-container h-full flex flex-col" 
             {data_attributes}>
            <!-- KPI content will be rendered by JavaScript -->
        </div>"""

    def _generate_chart_component(self, chart_config: Dict[str, Any]) -> str:
        """Generate chart container with data attributes for self-contained rendering"""
        chart_id = chart_config["id"]

        # Build data attributes for chart configuration
        data_attributes = f"""
            data-component-type="chart"
            data-id="{chart_config['id']}"
            data-name="{chart_config['name']}"
            data-chart-type="{chart_config['chart_type']}"
            data-x-axis="{self._escape_json(chart_config['x_axis'])}"
            data-series-list="{self._escape_json(chart_config['series_list'])}"
            data-style="{chart_config.get('style', 'default')}"
            data-area="{str(chart_config.get('area', False)).lower()}"
            data-cumulative="{str(chart_config.get('cumulative', False)).lower()}"
            data-top-n="{chart_config.get('top_n', 0)}"
            data-default-filter-conditions="{self._escape_json(chart_config.get('default_filter_conditions', ''))}"
            data-original-name="{chart_config.get('original_name', chart_config['name'])}"
        """.strip()

        return f"""
        <div id="{chart_id}_container" 
             class="chart-container h-full flex flex-col" 
             {data_attributes}>
            <!-- Chart content will be rendered by JavaScript -->
        </div>"""

    def _generate_data_modal(self) -> str:
        """Generate minimal data modal HTML focused on the table"""
        return """
        <!-- Data Modal -->
        <div id="dataModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 hidden">
            <div class="relative top-2 mx-auto p-0 w-11/12 max-w-7xl shadow-2xl rounded-xl bg-white">
                <!-- Minimal Header -->
                <div class="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-xl">
                    <div class="flex items-center space-x-3 min-w-0">
                        <i class="fas fa-table text-blue-600 flex-shrink-0"></i>
                        <h3 id="modalTitle" class="text-lg font-semibold text-gray-900 truncate min-w-0" title="Data Preview">Data Preview</h3>
                        <span id="dataRowCount" class="text-sm text-gray-500 flex-shrink-0">(0 rows)</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="relative">
                            <i class="fas fa-search absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input 
                                type="text" 
                                id="dataSearch" 
                                placeholder="Search..." 
                                class="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                onkeyup="filterDataTable()"
                            />
                        </div>
                        <button onclick="exportData()" class="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                            <i class="fas fa-download"></i>
                        </button>
                        <button onclick="closeDataModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <i class="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Data Table - Main Focus -->
                <div class="overflow-auto rounded-b-xl" style="max-height: 85vh;">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0 z-10">
                            <tr id="dataTableHeader">
                                <!-- Headers will be populated by JavaScript -->
                            </tr>
                        </thead>
                        <tbody id="dataTableBody" class="bg-white divide-y divide-gray-200">
                            <!-- Data will be populated by JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>"""

    def _generate_watermark(self) -> str:
        """Generate watermark HTML"""
        return """
        <!-- Watermark -->
        <div class="watermark" id="dashboardWatermark" onclick="window.open('https://chat.pandas-ai.com', '_blank', 'noopener,noreferrer')">
            <div class="watermark-content">
                <span class="watermark-text">Made with <span class="watermark-annie">Annie</span></span>
                <i class="fas fa-chart-line watermark-icon"></i>
            </div>
        </div>"""

    def _generate_scripts(self, config: Dict[str, Any]) -> str:
        """Generate JavaScript scripts section"""
        config_json = json.dumps(config, indent=2)

        # Read JavaScript modules
        js_modules = []
        js_files = [
            "excel-helpers.js",
            "csv-loader.js",
            "data-utils.js",
            "filters.js",
            "kpis.js",
            "charts.js",
            "data-modal.js",
            "dynamic-filters.js",
            "dashboard-core.js",
        ]

        for js_file in js_files:
            try:
                print("Loading JavaScript file:", js_file)
                with open(
                    f"pxml/js/{js_file}",
                    "r",
                ) as f:
                    js_modules.append(f.read())
            except FileNotFoundError:
                print(f"Warning: JavaScript file {js_file} not found")
                continue

        return f"""
    <script>
        // Dashboard configuration
        const dashboardConfig = {config_json};
        
        // Make dashboard config available globally
        window.dashboardConfig = dashboardConfig;
        
        // Make column mapping available globally for the chart editor
        if (dashboardConfig.column_mapping) {{
            window.columnMapping = dashboardConfig.column_mapping;
        }}
        
        {chr(10).join(js_modules)}
        
        // Initialize dashboard when DOM is ready
        document.addEventListener('DOMContentLoaded', async function() {{
            try {{
                // Initialize dashboard with skeleton loading first
                window.dashboard.initialize(dashboardConfig);
                
                // Load CSV data in the background
                await window.csvLoader.loadCSV(dashboardConfig.metadata.file_path);
                
                // Initialize dynamic filters with loaded data
                await window.dynamicFilters.initialize(dashboardConfig);
                
                // Initialize chart titles
                Object.keys(window.registeredCharts).forEach(chartId => {{
                    const chartInfo = window.registeredCharts[chartId];
                    if (chartInfo && ['bar', 'horizontal_bar'].includes(chartInfo.config.chart_type)) {{
                        updateChartTitle(chartId, chartInfo.config);
                    }}
                }});
                
            }} catch (error) {{
                console.error('Error during dashboard initialization:', error);
            }}
        }});
    </script>"""

    def _escape_json(self, data: Any) -> str:
        """Escape JSON data for use in HTML attributes"""
        if data is None:
            return ""
        json_str = json.dumps(data)
        # Escape quotes and other special characters for HTML attributes
        return (
            json_str.replace('"', "&quot;").replace("'", "&#39;").replace("&", "&amp;")
        )
