/**
 * Chart Management Module
 * Handles chart registration, rendering, updates, and Chart.js integration
 */

// Helper function to get column mapping from CSV loader or fallback
function getColumnMapping() {
    if (window.csvLoader && window.csvLoader.isLoaded()) {
        return window.csvLoader.getColumnMapping();
    }
    return window.columnMapping || {};
}

// Chart card HTML template
function createChartCardHTML(chartId, config, isLoading = false) {
    const chart_name = (config.name || "").charAt(0).toUpperCase() + (config.name || "").slice(1).replace(/_/g, ' ');
    const chart_type = config.chart_type;
    
    // Generate top N filter for bar and horizontal_bar charts
    let topNFilterHTML = "";
    if (chart_type === "bar" || chart_type === "horizontal_bar") {
        topNFilterHTML = `
            <div id="${chartId}_top_n_container" class="mb-3" style="display: none;">
                <select id="${chartId}_top_n" class="text-sm border border-gray-300 rounded px-2 py-1 bg-white" onchange="updateChartTopN('${chartId}')">
                    <option value="0">All</option>
                    <option value="5">Top 5</option>
                    <option value="10" selected>Top 10</option>
                </select>
            </div>`;
    }
    
    if (isLoading) {
        // Generate different skeleton based on chart type
        let skeletonContent = '';
        
        if (chart_type === 'bar' || chart_type === 'horizontal_bar') {
            // Bar chart skeleton with subtle animations
            skeletonContent = `
                <div class="w-full h-full p-4">
                    <!-- Skeleton chart bars with staggered animations -->
                    <div class="flex items-end justify-between h-full space-x-1">
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 60%; animation-delay: 0s;"></div>
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 80%; animation-delay: 0.1s;"></div>
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 45%; animation-delay: 0.2s;"></div>
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 70%; animation-delay: 0.3s;"></div>
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 55%; animation-delay: 0.4s;"></div>
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 90%; animation-delay: 0.5s;"></div>
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 35%; animation-delay: 0.6s;"></div>
                        <div class="flex-1 bg-gray-200 rounded-t bar-skeleton" style="height: 65%; animation-delay: 0.7s;"></div>
                    </div>
                    <!-- Skeleton axis labels with wave animation -->
                    <div class="mt-2 flex justify-between text-xs text-gray-400">
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 0.8s;"></div>
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 0.9s;"></div>
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 1.0s;"></div>
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 1.1s;"></div>
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 1.2s;"></div>
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 1.3s;"></div>
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 1.4s;"></div>
                        <div class="w-8 h-3 bg-gray-200 rounded label-skeleton" style="animation-delay: 1.5s;"></div>
                    </div>
                </div>
                <style>
                    @keyframes barSkeletonPulse {
                        0%, 100% { 
                            opacity: 0.6; 
                            transform: scaleY(1);
                        }
                        50% { 
                            opacity: 1; 
                            transform: scaleY(1.05);
                        }
                    }
                    @keyframes barSkeletonWave {
                        0%, 100% { 
                            transform: translateY(0px);
                        }
                        50% { 
                            transform: translateY(-2px);
                        }
                    }
                    @keyframes labelSkeletonFade {
                        0%, 100% { 
                            opacity: 0.4;
                        }
                        50% { 
                            opacity: 0.8;
                        }
                    }
                    .bar-skeleton {
                        animation: barSkeletonPulse 2s ease-in-out infinite, barSkeletonWave 3s ease-in-out infinite;
                    }
                    .label-skeleton {
                        animation: labelSkeletonFade 1.5s ease-in-out infinite;
                    }
                </style>`;
        } else if (chart_type === 'pie' || chart_type === 'doughnut') {
            // Pie chart skeleton with subtle animations
            skeletonContent = `
                <div class="w-full h-full p-4 flex items-center justify-center">
                    <div class="relative w-48 h-48">
                        <!-- Pie chart skeleton with breathing animation -->
                        <div class="w-full h-full rounded-full bg-gray-200 pie-skeleton"></div>
                        <!-- Center hole for doughnut -->
                        ${chart_type === 'doughnut' ? '<div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full"></div>' : ''}
                        <!-- Legend skeleton with staggered animation -->
                        <div class="absolute -right-20 top-1/2 transform -translate-y-1/2 space-y-2">
                            <div class="flex items-center space-x-2">
                                <div class="w-3 h-3 bg-gray-200 rounded legend-dot" style="animation-delay: 0s;"></div>
                                <div class="w-16 h-3 bg-gray-200 rounded legend-text" style="animation-delay: 0.1s;"></div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <div class="w-3 h-3 bg-gray-200 rounded legend-dot" style="animation-delay: 0.2s;"></div>
                                <div class="w-12 h-3 bg-gray-200 rounded legend-text" style="animation-delay: 0.3s;"></div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <div class="w-3 h-3 bg-gray-200 rounded legend-dot" style="animation-delay: 0.4s;"></div>
                                <div class="w-20 h-3 bg-gray-200 rounded legend-text" style="animation-delay: 0.5s;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    @keyframes pieSkeletonBreath {
                        0%, 100% { 
                            opacity: 0.7; 
                            transform: scale(1);
                        }
                        50% { 
                            opacity: 1; 
                            transform: scale(1.02);
                        }
                    }
                    @keyframes legendFade {
                        0%, 100% { 
                            opacity: 0.5;
                        }
                        50% { 
                            opacity: 0.9;
                        }
                    }
                    .pie-skeleton {
                        animation: pieSkeletonBreath 3s ease-in-out infinite;
                    }
                    .legend-dot {
                        animation: legendFade 2s ease-in-out infinite;
                    }
                    .legend-text {
                        animation: legendFade 2s ease-in-out infinite;
                    }
                </style>`;
        } else if (chart_type === 'line') {
            // Line chart skeleton
            skeletonContent = `
                <div class="w-full h-full p-4">
                    <!-- Line chart skeleton -->
                    <div class="relative w-full h-full">
                        <!-- Grid lines -->
                        <div class="absolute inset-0 opacity-20">
                            <div class="h-full border-t border-gray-200" style="top: 25%;"></div>
                            <div class="h-full border-t border-gray-200" style="top: 50%;"></div>
                            <div class="h-full border-t border-gray-200" style="top: 75%;"></div>
                        </div>
                        <!-- Line path skeleton -->
                        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 10,80 Q 20,60 30,70 T 50,50 T 70,30 T 90,40" 
                                  stroke="#d1d5db" stroke-width="2" fill="none" 
                                  stroke-dasharray="5,5" class="animate-pulse">
                                <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite"/>
                            </path>
                            <!-- Data points -->
                            <circle cx="10" cy="80" r="2" fill="#d1d5db" class="animate-pulse"/>
                            <circle cx="30" cy="70" r="2" fill="#d1d5db" class="animate-pulse"/>
                            <circle cx="50" cy="50" r="2" fill="#d1d5db" class="animate-pulse"/>
                            <circle cx="70" cy="30" r="2" fill="#d1d5db" class="animate-pulse"/>
                            <circle cx="90" cy="40" r="2" fill="#d1d5db" class="animate-pulse"/>
                        </svg>
                        <!-- Axis labels -->
                        <div class="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400">
                            <div class="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div class="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div class="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div class="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div class="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>`;
        } else if (chart_type === 'area') {
            // Area chart skeleton
            skeletonContent = `
                <div class="w-full h-full p-4">
                    <div class="relative w-full h-full">
                        <!-- Area chart skeleton -->
                        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:#d1d5db;stop-opacity:0.3" />
                                    <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:0.1" />
                                </linearGradient>
                            </defs>
                            <path d="M 10,80 L 20,60 L 30,70 L 50,50 L 70,30 L 90,40 L 90,100 L 10,100 Z" 
                                  fill="url(#areaGradient)" class="animate-pulse"/>
                            <path d="M 10,80 Q 20,60 30,70 T 50,50 T 70,30 T 90,40" 
                                  stroke="#d1d5db" stroke-width="2" fill="none" class="animate-pulse"/>
                        </svg>
                    </div>
                </div>`;
        } else {
            // Default skeleton (fallback)
            skeletonContent = `
                <div class="w-full h-full p-4 flex items-center justify-center">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-gray-200 rounded-lg animate-pulse mx-auto mb-4"></div>
                        <div class="w-24 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </div>
                </div>`;
        }
        
        return `
            <div class="bg-white rounded-lg shadow-sm border p-6 chart-component h-full flex flex-col">
                <div class="flex justify-between items-start mb-4">
                    <h3 id="${chartId}_title" class="text-lg font-semibold text-gray-900 chart-title" data-chart-id="${chartId}">${chart_name}</h3>
                    <div class="flex items-center space-x-2">
                        ${topNFilterHTML}
                    </div>
                </div>
                <div class="relative flex-1 min-h-80" style="max-height: 400px; max-width: 100%; overflow: hidden;">
                    <div class="w-full h-full bg-gray-50 rounded flex items-center justify-center">
                        ${skeletonContent}
                    </div>
                </div>
            </div>`;
    }
    
    return `
        <div class="bg-white rounded-lg shadow-sm border p-6 chart-component h-full flex flex-col">
            <div class="flex justify-between items-start mb-4">
                <h3 id="${chartId}_title" class="text-lg font-semibold text-gray-900 chart-title" data-chart-id="${chartId}">${chart_name}</h3>
                <div class="flex items-center space-x-2">
                    ${topNFilterHTML}
                </div>
            </div>
            <div class="relative flex-1 min-h-80" style="max-height: 400px; max-width: 100%; overflow: hidden;">
                <canvas id="${chartId}_canvas" class="w-full h-full" style="max-width: 100%; max-height: 100%;"></canvas>
                <div id="${chartId}_loading" class="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p class="text-sm text-gray-600">Loading chart...</p>
                    </div>
                </div>
            </div>
        </div>`;
}

// Chart Management Functions
function renderChartCard(chartId, config, isLoading = false) {
    const container = document.getElementById(chartId + '_container');
    if (!container) {
        console.error('❌ Chart container not found:', chartId + '_container');
        return;
    }
    
    // Render the chart card HTML
    const html = createChartCardHTML(chartId, config, isLoading);
    container.innerHTML = html;
    
    // Register the chart only if not loading
    if (!isLoading) {
        registerChart(chartId, config);
    }
    
    // Debug: Log that chart card was rendered
    console.log('Chart card rendered for:', chartId, 'Container exists:', !!container);
}

function registerChart(chartId, config) {
    window.registeredCharts[chartId] = {
        config: config,
        chartInstance: null,
        canvas: document.getElementById(chartId + '_canvas'),
        loadingElement: document.getElementById(chartId + '_loading')
    };
}

function displayChartError(loadingElement, errorData, config) {
    // Show error state but keep the chart card structure intact for editing
    loadingElement.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <i class="fas fa-exclamation-circle text-gray-400 text-2xl mb-2"></i>
                <p class="text-sm text-gray-500">Unable to render chart</p>
            </div>
        </div>
    `;
    
    // Ensure the loading element is visible (it should be hidden when chart renders successfully)
    loadingElement.style.display = 'flex';
}

function updateChart(chartId) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    const { config, canvas, loadingElement } = chartInfo;
    if (!canvas) return;
    
    // Show loading
    loadingElement.style.display = 'flex';
    
    try {
        // Get filtered data
        const filteredData = getFilteredData();
        
        // Process data for chart
        const chartData = processChartData(filteredData, config);
        
        // Check if chart should show error state (only for visual rendering)
        const hasErrors = checkForFormulaErrors(filteredData, config);
        const isEmpty = chartData.labels.length === 0 || chartData.datasets.every(d => d.data.length === 0);
        
        if (hasErrors || isEmpty) {
            // Destroy existing chart
            if (chartInfo.chartInstance) {
                chartInfo.chartInstance.destroy();
                chartInfo.chartInstance = null;
            }
            
            // Display error message but keep chart card structure intact
            displayChartError(loadingElement, {
                error: true,
                message: "Chart cannot be rendered - no data available",
                details: hasErrors || [{
                    type: 'empty_data',
                    message: `Chart has ${chartData.labels.length} labels and ${chartData.datasets.length} datasets with no data`
                }]
            }, config);
            
            // Ensure the chart card remains clickable for editing
            return;
        }
        
        // Destroy existing chart
        if (chartInfo.chartInstance) {
            chartInfo.chartInstance.destroy();
        }
        
        // Create new chart
        const ctx = canvas.getContext('2d');
        const chartOptions = getChartOptions(config, chartData.labels);
        chartInfo.chartInstance = new Chart(ctx, {
            type: getChartJsType(config.chart_type),
            data: chartData,
            options: chartOptions
        });
        
        // Hide loading
        loadingElement.style.display = 'none';
        
    } catch (error) {
        console.error(`Error updating chart ${chartId}:`, error);
        displayChartError(loadingElement, {
            error: true,
            message: 'Chart rendering failed',
            details: [{ type: 'render_error', message: error.message }]
        }, config);
    }
}

function updateAllCharts() {
    Object.keys(window.registeredCharts).forEach(chartId => {
        updateChart(chartId);
    });
}

function checkForFormulaErrors(data, config) {
    const { x_axis, series_list } = config;
    const errors = [];
    
    // Check if data is empty or invalid
    if (!data || data.length === 0) {
        return {
            type: 'no_data',
            message: 'No data available for chart rendering'
        };
    }
    
    // Check if x-axis column has any valid data
    const columnMapping = getColumnMapping();
    const xColumnName = columnMapping[x_axis.column] || x_axis.column;
    const xValues = data.map(row => row[xColumnName]).filter(val => val !== null && val !== undefined && val !== '');
    
    if (xValues.length === 0) {
        errors.push({
            type: 'x_axis_error',
            message: `X-axis column '${x_axis.column}' has no valid data`,
            column: x_axis.column
        });
    }
    
    // Check if any series has valid data
    let hasValidSeries = false;
    series_list.forEach((series, index) => {
        const seriesColumnName = columnMapping[series.column] || series.column;
        const seriesValues = data.map(row => row[seriesColumnName]).filter(val => val !== null && val !== undefined && val !== '');
        
        if (seriesValues.length > 0) {
            hasValidSeries = true;
        }
    });
    
    if (!hasValidSeries) {
        errors.push({
            type: 'series_error',
            message: 'No series have valid data',
            series: 'All series'
        });
    }
    
    // Check for transformation column errors if they're being used
    const transformationColumns = ['performance_tier', 'attendance_category'];
    const usedTransformationColumns = transformationColumns.filter(colName => 
        data.some(row => row.hasOwnProperty(colName))
    );
    
    // Check if transformation columns have all null values (indicating formula failure)
    usedTransformationColumns.forEach(colName => {
        const allNulls = data.every(row => row[colName] === null || row[colName] === undefined);
        if (allNulls) {
            errors.push({
                type: 'transformation_error',
                message: `Transformation column '${colName}' formula evaluation failed`,
                column: colName
            });
        }
    });
    
    return errors.length > 0 ? errors : null;
}

// Utility function to clean numeric values by removing non-numeric characters
function cleanNumericValue(value) {
    // Early returns for common cases
    if (value === null || value === undefined || value === "") return null;
    
    // If already a number, return it (most efficient case)
    if (typeof value === 'number' && !isNaN(value)) return value;
    
    // Convert to string and trim once
    const str = String(value).trim();
    
    // Early return for empty string after trim
    if (str === '') return null;
    
    // Use a single regex to remove all non-numeric characters except decimal point and minus
    // This is more efficient than multiple operations
    let cleaned = str.replace(/[^\d.-]/g, '');
    
    // Early return if nothing left after cleaning
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
    
    // Handle multiple decimal points more efficiently
    const lastDotIndex = cleaned.lastIndexOf('.');
    if (lastDotIndex > 0) {
        // Remove all dots except the last one
        cleaned = cleaned.substring(0, lastDotIndex).replace(/\./g, '') + cleaned.substring(lastDotIndex);
    }
    
    // Handle multiple minus signs more efficiently
    const firstMinusIndex = cleaned.indexOf('-');
    if (firstMinusIndex > 0) {
        // Keep only the first minus sign
        cleaned = '-' + cleaned.replace(/-/g, '');
    }
    
    // Convert to number and return
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
}

function processChartData(data, config) {
    const { x_axis, series_list, default_filter_conditions } = config;
    
    // Apply default filter conditions if they exist
    let filteredData = data;
    if (default_filter_conditions && Array.isArray(default_filter_conditions)) {
        filteredData = data.filter(row => {
            return default_filter_conditions.every(condition => {
                // Handle range conditions like "user_gender2:user_gender=\"Male\""
                const rangeConditionMatch = condition.match(/^([^:]+)2:([^=]+)=(.+)$/);
                if (rangeConditionMatch) {
                    const [, , columnName, value] = rangeConditionMatch;
                    const rowValue = row[columnName.trim()];
                    // Remove quotes and unescape escaped quotes
                    const compareValue = value.trim().replace(/\\"/g, '"').replace(/^["']|["']$/g, '');
                    return rowValue == compareValue;
                }
                
                // Parse simple condition like "error_code>0"
                const conditionMatch = condition.match(/^([^><=!]+)\s*([><=!]+)\s*(.+)$/);
                if (conditionMatch) {
                    const [, columnName, operator, value] = conditionMatch;
                    const rowValue = row[columnName.trim()];
                    const compareValue = isNaN(value) ? value.trim() : Number(value);
                    
                    switch (operator) {
                        case '>': return Number(rowValue) > compareValue;
                        case '>=': return Number(rowValue) >= compareValue;
                        case '<': return Number(rowValue) < compareValue;
                        case '<=': return Number(rowValue) <= compareValue;
                        case '=': return rowValue == compareValue;
                        case '!=': return rowValue != compareValue;
                        default: return true;
                    }
                }
                return true;
            });
        });
    }
    
    // For scatter charts, don't group data - show individual points
    let grouped = {};
    let labels = [];
    
    if (config.chart_type === 'scatter') {
        // For scatter charts, we don't need grouped data or labels
        // Individual data points will be handled in the series processing
        grouped = { 'scatter': filteredData }; // Dummy grouping for consistency
        labels = ['scatter']; // Dummy label
    } else {
        // Group data by x-axis column for other chart types
        filteredData.forEach(row => {
            const columnMapping = getColumnMapping();
            const xValue = row[columnMapping[x_axis.column] || x_axis.column];
            if (!grouped[xValue]) {
                grouped[xValue] = [];
            }
            grouped[xValue].push(row);
        });
        
        // Generate labels and datasets
        labels = Object.keys(grouped);
        
        // Format labels: capitalize first letter and replace underscores with spaces
        labels = labels.map(label => {
            return label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, ' ');
        });
        
        // Special sorting for month names
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        if (labels.every(label => monthOrder.includes(label))) {
            // Sort by month order
            labels = labels.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
        } else {
            // Default alphabetical sort
            labels = labels.sort();
        }
    }
    const datasets = [];
    
    // Automatically assign axes based on series characteristics
    const shouldUseDualAxes = series_list.length > 1 && (
        // Always use dual axes for combo charts
        config.chart_type === 'combo_chart' ||
        // Different units
        new Set(series_list.map(s => s.unit)).size > 1 ||
        // Different format types (percentage vs number, etc.)
        new Set(series_list.map(s => s.format)).size > 1 ||
        // Different aggregation types (count vs avg/sum/etc)
        (series_list.some(s => s.aggregation === 'count') && 
         series_list.some(s => s.aggregation !== 'count'))
    );
    
    series_list.forEach((series, index) => {
        // Automatically assign axis based on chart type
        if (shouldUseDualAxes && index > 0) {
            // For horizontal bar charts, secondary axis is x1 (top)
            // For vertical charts, secondary axis is y1 (right)
            series.axis = config.chart_type === 'horizontal_bar' ? 'x1' : 'y1';
        } else {
            // Primary axis is x for horizontal, y for vertical
            series.axis = config.chart_type === 'horizontal_bar' ? 'x' : 'y';
        }
        
        const columnMapping = getColumnMapping();
        const columnName = columnMapping[series.column] || series.column;
        
        // Handle bubble chart data structure differently
        let seriesData;
        if (config.chart_type === 'bubble') {
            // For bubble charts, show individual data points without aggregation
            const xColumnName = getColumnMapping()[x_axis.column] || x_axis.column;
            const yColumnName = getColumnMapping()[columnName] || columnName;
            
            // Apply filter condition if specified
            let bubbleData = filteredData;
            if (series.filter_condition) {
                const [filterColumn, filterValue] = series.filter_condition.split('=');
                const columnMapping = getColumnMapping();
                const filterColumnName = columnMapping[filterColumn] || filterColumn;
                bubbleData = bubbleData.filter(row => row[filterColumnName] === filterValue);
            }
            
            // For bubble charts, create meaningful bubble sizes based on data density and aggregation
            const sizeColumnName = series.size_column;
            
            // Group data by x-axis values to calculate meaningful sizes
            const groupedData = {};
            bubbleData.forEach(row => {
                const xValue = Number(row[xColumnName]) || 0;
                const yValue = Number(row[yColumnName]) || 0;
                
                if (!groupedData[xValue]) {
                    groupedData[xValue] = [];
                }
                groupedData[xValue].push({
                    y: yValue,
                    sizeValue: sizeColumnName && row[sizeColumnName] !== undefined ? Number(row[sizeColumnName]) || 0 : yValue
                });
            });
            
            // Calculate aggregated values and counts for each x-group
            const aggregatedGroups = Object.entries(groupedData).map(([xValue, points]) => {
                const yValues = points.map(p => p.y);
                const sizeValues = points.map(p => p.sizeValue);
                
                // Calculate aggregation for Y values
                let aggregatedY = 0;
                switch (series.aggregation) {
                    case 'sum':
                        aggregatedY = yValues.reduce((a, b) => a + b, 0);
                        break;
                    case 'avg':
                        aggregatedY = yValues.length > 0 ? yValues.reduce((a, b) => a + b, 0) / yValues.length : 0;
                        break;
                    case 'count':
                        aggregatedY = yValues.length;
                        break;
                    case 'max':
                        aggregatedY = Math.max(...yValues);
                        break;
                    case 'min':
                        aggregatedY = Math.min(...yValues);
                        break;
                    default:
                        aggregatedY = yValues.reduce((a, b) => a + b, 0);
                }
                
                // Calculate size based on data density and aggregation
                let sizeValue = 0;
                if (sizeColumnName && points.some(p => p.sizeValue > 0)) {
                    // Use specified size column with aggregation
                    switch (series.aggregation) {
                        case 'sum':
                            sizeValue = sizeValues.reduce((a, b) => a + b, 0);
                            break;
                        case 'avg':
                            sizeValue = sizeValues.length > 0 ? sizeValues.reduce((a, b) => a + b, 0) / sizeValues.length : 0;
                            break;
                        case 'count':
                            sizeValue = sizeValues.length;
                            break;
                        case 'max':
                            sizeValue = Math.max(...sizeValues);
                            break;
                        case 'min':
                            sizeValue = Math.min(...sizeValues);
                            break;
                        default:
                            sizeValue = sizeValues.reduce((a, b) => a + b, 0);
                    }
                } else {
                    // Use data density (count of points) for size
                    sizeValue = points.length;
                }
                
                return {
                    x: Number(xValue),
                    y: aggregatedY,
                    sizeValue: sizeValue,
                    count: points.length
                };
            });
            
            // Normalize sizes to reasonable range (5-30px) based on all size values
            const allSizeValues = aggregatedGroups.map(g => g.sizeValue);
            const minSize = Math.min(...allSizeValues);
            const maxSize = Math.max(...allSizeValues);
            const sizeRange = maxSize - minSize;
            
            seriesData = aggregatedGroups.map(group => {
                // Calculate bubble size based on normalized data
                let bubbleSize = 10; // Default fallback
                if (sizeRange > 0) {
                    const normalizedSize = (group.sizeValue - minSize) / sizeRange;
                    bubbleSize = Math.max(5, Math.min(30, normalizedSize * 25 + 5));
                } else if (group.sizeValue > 0) {
                    // If all values are the same but > 0, use a medium size
                    bubbleSize = 15;
                }
                
                return {
                    x: group.x,
                    y: group.y,
                    r: bubbleSize
                };
            });
        } else if (config.chart_type === 'scatter') {
            // For scatter plots, show individual data points without aggregation
            // Use the first series for X values and current series for Y values
            const xColumnName = getColumnMapping()[x_axis.column] || x_axis.column;
            const yColumnName = getColumnMapping()[columnName] || columnName;
            
            // Apply filter condition if specified
            let scatterData = filteredData;
            if (series.filter_condition) {
                const [filterColumn, filterValue] = series.filter_condition.split('=');
                const columnMapping = getColumnMapping();
                const filterColumnName = columnMapping[filterColumn] || filterColumn;
                scatterData = scatterData.filter(row => row[filterColumnName] === filterValue);
            }
            
            // Create individual data points (x, y) pairs
            // Ignore aggregation for scatter plots - always show raw data points
            seriesData = scatterData.map(row => ({
                x: cleanNumericValue(row[xColumnName]) || 0,
                y: cleanNumericValue(row[yColumnName]) || 0
            })).filter(point => point.x !== 0 || point.y !== 0); // Filter out (0,0) points
        } else if (config.chart_type === 'radar') {
            // For radar charts, show individual data points without aggregation
            // Use the x_axis column for labels and current series for values
            const xColumnName = getColumnMapping()[x_axis.column] || x_axis.column;
            const yColumnName = getColumnMapping()[columnName] || columnName;
            
            // Apply filter condition if specified
            let radarData = filteredData;
            if (series.filter_condition) {
                const [filterColumn, filterValue] = series.filter_condition.split('=');
                const columnMapping = getColumnMapping();
                const filterColumnName = columnMapping[filterColumn] || filterColumn;
                radarData = radarData.filter(row => row[filterColumnName] === filterValue);
            }
            
            // Create individual data points for radar charts
            // Ignore aggregation for radar charts - always show raw data points
            seriesData = radarData.map(row => ({
                label: row[xColumnName] || '',
                value: cleanNumericValue(row[yColumnName]) || 0
            }));
        } else {
            seriesData = labels.map(label => {
            let groupData = grouped[label];
            
            // Apply filter condition if specified
            if (series.filter_condition) {
                const [filterColumn, filterValue] = series.filter_condition.split('=');
                const columnMapping = getColumnMapping();
                const filterColumnName = columnMapping[filterColumn] || filterColumn;
                groupData = groupData.filter(row => row[filterColumnName] === filterValue);
            }
            
            const cleanedValues = groupData.map(row => cleanNumericValue(row[columnName])).filter(val => val !== null);
            
            switch (series.aggregation) {
                case 'sum': {
                    let sum = 0;
                    for (let i = 0; i < cleanedValues.length; i++) {
                        sum += cleanedValues[i];
                    }
                    return sum;
                }
                case 'avg': {
                    if (cleanedValues.length === 0) return 0;
                    let sum = 0;
                    for (let i = 0; i < cleanedValues.length; i++) {
                        sum += cleanedValues[i];
                    }
                    return sum / cleanedValues.length;
                }
                case 'count':
                    return cleanedValues.length;
                case 'max': {
                    if (cleanedValues.length === 0) return 0;
                    let max = cleanedValues[0];
                    for (let i = 1; i < cleanedValues.length; i++) {
                        max = Math.max(max, cleanedValues[i]);
                    }
                    return max;
                }
                case 'min': {
                    if (cleanedValues.length === 0) return 0;
                    let min = cleanedValues[0];
                    for (let i = 1; i < cleanedValues.length; i++) {
                        min = Math.min(min, cleanedValues[i]);
                    }
                    return min;
                }
                default: {
                    let sum = 0;
                    for (let i = 0; i < cleanedValues.length; i++) {
                        sum += cleanedValues[i];
                    }
                    return sum;
                }
            }
            });
        }
        
        // Comprehensive color palette with 20 distinct, accessible colors
        const colors = [
            // Primary blues and teals
            'rgba(59, 130, 246, 0.8)',   // Blue 500
            'rgba(16, 185, 129, 0.8)',   // Emerald 500
            'rgba(14, 165, 233, 0.8)',   // Sky 500
            'rgba(6, 182, 212, 0.8)',    // Cyan 500
            
            // Warm colors
            'rgba(245, 158, 11, 0.8)',   // Amber 500
            'rgba(249, 115, 22, 0.8)',   // Orange 500
            'rgba(239, 68, 68, 0.8)',    // Red 500
            'rgba(251, 191, 36, 0.8)',   // Yellow 400
            
            // Purples and pinks
            'rgba(139, 92, 246, 0.8)',   // Violet 500
            'rgba(168, 85, 247, 0.8)',   // Purple 500
            'rgba(236, 72, 153, 0.8)',   // Pink 500
            'rgba(244, 63, 94, 0.8)',    // Rose 500
            
            // Greens
            'rgba(34, 197, 94, 0.8)',    // Green 500
            'rgba(101, 163, 13, 0.8)',   // Lime 600
            'rgba(22, 163, 74, 0.8)',    // Green 600
            'rgba(5, 150, 105, 0.8)',    // Emerald 600
            
            // Additional distinctive colors
            'rgba(99, 102, 241, 0.8)',   // Indigo 500
            'rgba(217, 70, 239, 0.8)',   // Fuchsia 500
            'rgba(245, 101, 101, 0.8)',  // Red 400
            'rgba(52, 211, 153, 0.8)',   // Emerald 400
            
            // Muted alternatives for overflow
            'rgba(156, 163, 175, 0.8)',  // Gray 400
            'rgba(107, 114, 128, 0.8)',  // Gray 500
            'rgba(75, 85, 99, 0.8)',     // Gray 600
            'rgba(55, 65, 81, 0.8)'      // Gray 700
        ];
        
        // For pie/donut charts, assign different colors to each segment
        let backgroundColor, borderColor;
        if (['pie', 'donut'].includes(config.chart_type)) {
            backgroundColor = seriesData.map((_, i) => colors[i % colors.length]);
            borderColor = seriesData.map((_, i) => colors[i % colors.length].replace('0.8', '1'));
        } else if (['bar', 'horizontal_bar'].includes(config.chart_type) && config.chart_type !== 'bubble' && seriesData.some(val => val < 0) && seriesData.some(val => val > 0)) {
            // For bar charts with negative values, use green for positive and red for negative
            backgroundColor = seriesData.map(val => val >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'); // Green for positive, red for negative
            borderColor = seriesData.map(val => val >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)');
        } else {
            backgroundColor = colors[index % colors.length];
            borderColor = colors[index % colors.length].replace('0.8', '1');
        }
        
        const axisProperty = config.chart_type === 'horizontal_bar' ? 'xAxisID' : 'yAxisID';
        const dataset = {
            label: series.name,
            data: seriesData,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 2,
            fill: config.area || false
        };
        
        // Handle combo charts: first series is bar, others are line
        if (config.chart_type === 'combo_chart') {
            if (index === 0) {
                dataset.type = 'bar';
            } else {
                dataset.type = 'line';
                dataset.fill = false; // Lines should not be filled by default
            }
        }
        
        // Assign axis ID for dual axis support
        if (config.chart_type === 'horizontal_bar') {
            dataset.xAxisID = series.axis || 'x';
        } else if (config.chart_type === 'bubble') {
            // For bubble charts, only assign yAxisID (x-axis is always the same)
            dataset.yAxisID = series.axis || 'y';
        } else {
            dataset.yAxisID = series.axis || 'y';
        }
        
        datasets.push(dataset);
    });
    
    // Handle top N filtering for bar and horizontal_bar charts
    if (['bar', 'horizontal_bar'].includes(config.chart_type)) {
        // Store original count for filter visibility decision
        const originalLabelCount = labels.length;
        
        // Show/hide top N filter based on data count
        const chartId = Object.keys(window.registeredCharts).find(id => 
            window.registeredCharts[id].config === config);
        if (chartId) {
            updateTopNFilterVisibility(chartId, config, originalLabelCount);
        }
        
        // Apply top N filtering
        if (config.top_n > 0 && labels.length > config.top_n) {
            // Sort by the first series data to get top N
            if (datasets.length > 0) {
                const sortedIndices = datasets[0].data
                    .map((value, index) => ({ value, index }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, config.top_n)
                    .map(item => item.index);
                
                labels = sortedIndices.map(i => labels[i]);
                datasets.forEach(dataset => {
                    dataset.data = sortedIndices.map(i => dataset.data[i]);
                });
            }
        }
    }
    
    // Handle 100% stacked charts by converting data to percentages
    if (config.style === '100% stacked' && datasets.length > 1) {
        const dataLength = labels.length;
        for (let i = 0; i < dataLength; i++) {
            // Calculate total for this data point across all series
            const total = datasets.reduce((sum, dataset) => {
                return sum + (dataset.data[i] || 0);
            }, 0);
            
            // Convert each dataset value to percentage
            if (total > 0) {
                datasets.forEach(dataset => {
                    if (dataset.data[i] !== undefined) {
                        dataset.data[i] = (dataset.data[i] / total) * 100;
                    }
                });
            }
        }
    }
    
    return { labels, datasets };
}

function getChartJsType(xmlType) {
    const typeMapping = {
        'bar': 'bar',
        'horizontal_bar': 'bar',
        'line': 'line',
        'pie': 'pie',
        'donut': 'doughnut',
        'bubble': 'bubble',
        'scatter': 'scatter',
        'radar': 'radar',
        'combo_chart': 'bar'
    };
    return typeMapping[xmlType] || 'bar';
}

function getChartOptions(config, labels) {
    // Provide fallback for labels if not provided
    labels = labels || [];
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false
            }
        },
        scales: {},
        onResize: function(chart, size) {
            // Ensure chart respects container bounds
            if (size.width > chart.canvas.parentNode.clientWidth) {
                chart.resize(chart.canvas.parentNode.clientWidth, size.height);
            }
        }
    };
    
    // Configure scales for bar, line, scatter, bubble, and combo charts
    if (['bar', 'horizontal_bar', 'line', 'scatter', 'bubble', 'combo_chart'].includes(config.chart_type)) {
        
        // Special handling for bubble charts
        if (config.chart_type === 'bubble') {
            // Check if bubble charts need dual axes
            const bubbleHasDualAxes = config.series_list.length > 1 && (
                new Set(config.series_list.map(s => s.unit)).size > 1 ||
                new Set(config.series_list.map(s => s.format)).size > 1
            );
            
            options.scales.x = {
                type: 'linear',
                title: {
                    display: true,
                    text: config.x_axis.name
                },
                ticks: {
                    stepSize: 1,
                    callback: function(value, index) {
                        // Show category labels instead of numeric indices
                        return labels[value] || value;
                    }
                },
                min: 0,
                max: labels.length - 1
            };
            
            // Primary y-axis (left)
            const primaryBubbleSeries = config.series_list.filter(s => s.axis === 'y' || !s.axis || !bubbleHasDualAxes)[0];
            options.scales.y = {
                type: 'linear',
                title: {
                    display: true,
                    text: primaryBubbleSeries ? primaryBubbleSeries.name : 'Value'
                },
                beginAtZero: true
            };
            
            // Secondary y-axis (right) for bubble charts if needed
            if (bubbleHasDualAxes) {
                const secondaryBubbleSeries = config.series_list.filter(s => s.axis === 'y1')[0];
                if (secondaryBubbleSeries) {
                    options.scales.y1 = {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: secondaryBubbleSeries.name
                        },
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        }
                    };
                }
            }
            
            // Custom tooltip for bubble charts
            options.plugins.tooltip = {
                callbacks: {
                    title: function(tooltipItems) {
                        const item = tooltipItems[0];
                        const point = item.raw;
                        return `Age: ${point.x}, Credit Limit: ${point.y.toLocaleString()}`;
                    },
                    label: function(context) {
                        const point = context.raw;
                        const sizePercent = ((point.r - 5) / 25 * 100).toFixed(0);
                        return `${context.dataset.label}: Size represents ${sizePercent}% of range (aggregated)`;
                    },
                    afterLabel: function(context) {
                        const point = context.raw;
                        // This would need to be passed from the data processing
                        return `Bubble size based on data density and aggregation`;
                    }
                }
            };
            
        } else {
        
        // Check if we need dual axes
        const hasSecondaryAxis = config.series_list.some(series => 
            series.axis === 'y1' || series.axis === 'x1');
        
        // Get series names for each axis
        const primarySeriesNames = config.series_list
            .filter(series => series.axis === 'y' || series.axis === 'x' || !series.axis)
            .map(series => series.name);
        const secondarySeriesNames = config.series_list
            .filter(series => series.axis === 'y1' || series.axis === 'x1')
            .map(series => series.name);
        
        if (config.chart_type === 'horizontal_bar') {
            options.indexAxis = 'y';
            
            // For horizontal bars: y-axis is categories, x-axis is values
            options.scales.y = {
                title: {
                    display: true,
                    text: config.x_axis.name
                }
            };
            
            // Primary x-axis (bottom)
            options.scales.x = {
                type: 'linear',
                display: true,
                position: 'bottom',
                title: {
                    display: true,
                    text: primarySeriesNames.length > 0 ? primarySeriesNames.join(', ') : 'Value'
                },
                beginAtZero: true
            };
            
            // Secondary x-axis (top) if needed
            if (hasSecondaryAxis && config.series_list.some(s => s.axis === 'x1')) {
                const x1SeriesNames = config.series_list
                    .filter(series => series.axis === 'x1')
                    .map(series => series.name);
                options.scales.x1 = {
                    type: 'linear',
                    display: true,
                    position: 'top',
                    title: {
                        display: true,
                        text: x1SeriesNames.join(', ')
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                };
            }
        } else {
            // For vertical bars and lines: x-axis is categories, y-axis is values
            options.scales.x = {
                title: {
                    display: true,
                    text: config.x_axis.name
                }
            };
            
            // Primary y-axis (left)
            options.scales.y = {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: primarySeriesNames.length > 0 ? primarySeriesNames.join(', ') : 'Value'
                },
                beginAtZero: true
            };
            
            // Secondary y-axis (right) if needed
            if (hasSecondaryAxis && config.series_list.some(s => s.axis === 'y1')) {
                const y1SeriesNames = config.series_list
                    .filter(series => series.axis === 'y1')
                    .map(series => series.name);
                options.scales.y1 = {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: y1SeriesNames.join(', ')
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                };
            }
        }
        
        // For stacked charts, disable dual axes and use single axis (but not for combo charts)
        if (config.style === 'stacked' && config.chart_type !== 'combo_chart') {
            options.scales.x.stacked = true;
            options.scales.y.stacked = true;
            // Remove secondary axis for stacked charts
            delete options.scales.y1;
            delete options.scales.x1;
        } else if (config.style === '100% stacked' && config.chart_type !== 'combo_chart') {
            options.scales.x.stacked = true;
            options.scales.y.stacked = true;
            if (config.chart_type === 'horizontal_bar') {
                options.scales.x.max = 100;
                options.scales.x.ticks = {
                    callback: function(value) {
                        return value + '%';
                    }
                };
            } else {
                options.scales.y.max = 100;
                options.scales.y.ticks = {
                    callback: function(value) {
                        return value + '%';
                    }
                };
            }
            options.plugins.tooltip = {
                callbacks: {
                    label: function(context) {
                        return context.dataset.label + ': ' + context.formattedValue + '%';
                    }
                }
            };
            // Remove secondary axis for 100% stacked charts
            delete options.scales.y1;
            delete options.scales.x1;
        }
        }
    }
    
    // Remove scales for pie/donut charts
    if (['pie', 'donut'].includes(config.chart_type)) {
        delete options.scales;
    }
    
    return options;
}

// Chart Top N Filter Functions
function updateChartTopN(chartId) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    const selectElement = document.getElementById(chartId + '_top_n');
    const newTopN = parseInt(selectElement.value) || 0;
    
    // Update the chart config
    chartInfo.config.top_n = newTopN;
    
    // Track when user explicitly selects "All" 
    if (newTopN === 0) {
        chartInfo.config.userSelectedAll = true;
    } else {
        chartInfo.config.userSelectedAll = false;
    }
    
    // Update chart title to include (top x) indicator
    updateChartTitle(chartId, chartInfo.config);
    
    // Redraw the chart with new filter
    updateChart(chartId);
}

function updateChartTitle(chartId, config) {
    const titleElement = document.getElementById(chartId + '_title');
    if (!titleElement) return;
    
    // Use the current name, allow empty strings
    let title = config.name || '';
    if (['bar', 'horizontal_bar'].includes(config.chart_type) && config.top_n > 0) {
        title += ` (top ${config.top_n})`;
    }
    
    titleElement.textContent = title;
}

function updateTopNFilterVisibility(chartId, config, totalLabels) {
    if (!['bar', 'horizontal_bar'].includes(config.chart_type)) return;
    
    const topNContainer = document.getElementById(chartId + '_top_n_container');
    if (!topNContainer) return;
    
    if (totalLabels > 10) {
        topNContainer.style.display = 'block';
        // Only auto-set to top 10 if this is the first time and user hasn't explicitly chosen
        if (config.top_n === 0 && !config.userSelectedAll) {
            config.top_n = 10;
            const selectElement = document.getElementById(chartId + '_top_n');
            if (selectElement) selectElement.value = '10';
        }
        // If user explicitly selected "All", respect that choice
        else if (config.userSelectedAll) {
            config.top_n = 0;
            const selectElement = document.getElementById(chartId + '_top_n');
            if (selectElement) selectElement.value = '0';
        }
    } else {
        topNContainer.style.display = 'none';
        config.top_n = 0;
        config.userSelectedAll = false; // Reset flag when filter not needed
        const selectElement = document.getElementById(chartId + '_top_n');
        if (selectElement) selectElement.value = '0';
    }
    
    // Update the chart title to reflect the current state
    updateChartTitle(chartId, config);
}

// Chart editing functions (hooks for future implementation)
function editChart(chartId) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    // Check if we're in an iframe and can send messages to parent
    if (window.parent && window.parent !== window) {
        // Send message to parent window (dashboard editor)
        window.parent.postMessage({ 
            type: "chart-edit", 
            chartId: chartId,
            config: chartInfo.config 
        }, "*");
    } else {
        // Fallback for standalone usage
        alert(`Chart editing will be implemented here for: ${chartInfo.config.name}`);
    }
}

function updateChartProperty(chartId, property, value) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    // Update chart config
    chartInfo.config[property] = value;
    
    // Update UI element if needed
    if (property === 'name') {
        const titleElement = document.getElementById(chartId + '_title');
        if (titleElement) {
            titleElement.textContent = value;
        }
    }
    
    // Re-render chart with new settings
    updateChart(chartId);
}

/**
 * Render chart from individual data attributes - makes each component self-contained
 */
function renderChartFromDataAttributes(containerId, isLoading = false) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  const config = buildChartConfigFromDataAttributes(container, containerId);
  if (!config) return false;

  try {
    renderChartCard(config.id, config, isLoading);
    if (!isLoading) {
      updateChart(config.id);
    }
    return true;
  } catch (error) {
    console.error(`Error rendering chart ${containerId}:`, error);
    return false;
  }
}

/**
 * Build chart config object from individual data attributes
 * Self-contained with essential chart properties
 */
function buildChartConfigFromDataAttributes(container, containerId = null) {
  // Helper function to decode HTML entities from attributes
  function decodeHtmlEntities(str) {
    if (!str) return str;
    return str
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }

  // Helper function to parse JSON from attributes
  function parseJsonAttribute(str) {
    if (!str) return null;
    try {
      return JSON.parse(decodeHtmlEntities(str));
    } catch (e) {
      console.error("Error parsing JSON attribute:", str, e);
      return null;
    }
  }

  const config = {
    id: decodeHtmlEntities(container.getAttribute("data-id")) || "",
    name: decodeHtmlEntities(container.getAttribute("data-name")) || "",
    chart_type: decodeHtmlEntities(container.getAttribute("data-chart-type")) || "bar",
    x_axis: parseJsonAttribute(container.getAttribute("data-x-axis")) || { name: "Category", column: "category" },
    series_list: parseJsonAttribute(container.getAttribute("data-series-list")) || [],
    style: decodeHtmlEntities(container.getAttribute("data-style")) || "default",
    area: container.getAttribute("data-area") === "true",
    cumulative: container.getAttribute("data-cumulative") === "true",
    top_n: parseInt(container.getAttribute("data-top-n")) || 0,
    default_filter_conditions: parseJsonAttribute(container.getAttribute("data-default-filter-conditions")) || null,
    original_name: decodeHtmlEntities(container.getAttribute("data-original-name")) || "",
  };

  // Validate that we have the minimum required data
  if (!config.id) {
    console.error("Missing required chart data attributes (id)");
    return null;
  }

  // Set original_name if not provided
  if (!config.original_name) {
    config.original_name = config.name;
  }

  return config;
}

/**
 * Re-render all chart components from their data attributes
 * This automatically re-renders any chart that has changed
 */
function reRenderAllChartComponents() {
  const chartContainers = document.querySelectorAll(
    '[data-component-type="chart"]'
  );
  chartContainers.forEach((container) => {
    renderChartFromDataAttributes(container.id);
  });
}

/**
 * Initialize Chart MutationObserver to watch for data attribute changes
 * This automatically recreates components when data-* attributes change
 */
function initializeChartMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (window.chartFixingInProgress) return;

    const containersToUpdate = new Set();

    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const target = mutation.target;
        const attributeName = mutation.attributeName;

        if (
          target.getAttribute("data-component-type") === "chart" &&
          isChartDataAttribute(attributeName)
        ) {
          const oldValue = mutation.oldValue || '';
          const newValue = target.getAttribute(attributeName) || '';
          
          // Always trigger update if the value actually changed
          if (oldValue !== newValue) {
            containersToUpdate.add(target.id);
          }
        }
      }
    });

    if (containersToUpdate.size > 0) {
      setTimeout(() => {
        containersToUpdate.forEach((containerId) => {
          renderChartFromDataAttributes(containerId);
        });
      }, 10);
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [
      "data-id",
      "data-name",
      "data-chart-type",
      "data-x-axis",
      "data-series-list",
      "data-style",
      "data-area",
      "data-cumulative",
      "data-top-n",
      "data-default-filter-conditions",
      "data-original-name",
    ],
    subtree: true,
  });

  window.chartMutationObserver = observer;
  return observer;
}

/**
 * Check if an attribute name is a chart data attribute we care about
 */
function isChartDataAttribute(attributeName) {
  const chartDataAttributes = [
    "data-id",
    "data-name",
    "data-chart-type",
    "data-x-axis",
    "data-series-list",
    "data-style",
    "data-area",
    "data-cumulative",
    "data-top-n",
    "data-default-filter-conditions",
    "data-original-name",
  ];
  return chartDataAttributes.includes(attributeName);
}

/**
 * Update chart individual data attributes
 * MutationObserver will automatically handle the re-render
 */
function updateChartDataAndRender(containerId, newConfig) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Chart container not found:", containerId);
    return false;
  }

  // Update individual data attributes - clean and simple
  container.setAttribute("data-id", newConfig.id || "");
  container.setAttribute("data-name", newConfig.name || "");
  container.setAttribute("data-chart-type", newConfig.chart_type || "bar");
  container.setAttribute("data-x-axis", JSON.stringify(newConfig.x_axis || {}));
  container.setAttribute("data-series-list", JSON.stringify(newConfig.series_list || []));
  container.setAttribute("data-style", newConfig.style || "default");
  container.setAttribute("data-area", newConfig.area ? "true" : "false");
  container.setAttribute("data-cumulative", newConfig.cumulative ? "true" : "false");
  container.setAttribute("data-top-n", (newConfig.top_n || 0).toString());
  container.setAttribute("data-default-filter-conditions", 
    newConfig.default_filter_conditions ? JSON.stringify(newConfig.default_filter_conditions) : "");
  container.setAttribute("data-original-name", newConfig.original_name || newConfig.name || "");

  // MutationObserver will automatically handle the re-render
  return true;
}

/**
 * Get chart config from individual data attributes
 */
function getChartConfigFromDataAttributes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  return buildChartConfigFromDataAttributes(container, containerId);
}

/**
 * Available chart properties that can be updated
 */
const CHART_PROPERTIES = {
  name: {
    dataAttribute: "data-name",
    validate: (value) => typeof value === "string",
  },
  chart_type: {
    dataAttribute: "data-chart-type",
    validate: (value) => 
      ["bar", "horizontal_bar", "line", "pie", "donut", "bubble", "scatter", "radar", "combo_chart"].includes(value),
  },
  style: {
    dataAttribute: "data-style",
    validate: (value) => 
      ["default", "stacked", "100% stacked"].includes(value),
  },
  area: {
    dataAttribute: "data-area",
    validate: (value) => typeof value === "boolean",
  },
  cumulative: {
    dataAttribute: "data-cumulative",
    validate: (value) => typeof value === "boolean",
  },
  top_n: {
    dataAttribute: "data-top-n",
    validate: (value) => typeof value === "number" && value >= 0,
  },
  x_axis: {
    dataAttribute: "data-x-axis",
    validate: (value) => typeof value === "object" && value !== null,
  },
  series_list: {
    dataAttribute: "data-series-list",
    validate: (value) => Array.isArray(value),
  },
  default_filter_conditions: {
    dataAttribute: "data-default-filter-conditions",
    validate: (value) => value === null || Array.isArray(value),
  },
};

/**
 * Update a specific chart property with validation and automatic rebuilding
 * This now works directly with data attributes - MutationObserver handles the rebuilding
 */
function updateChartProperty(containerId, property, value) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  const propertyDef = CHART_PROPERTIES[property];
  if (!propertyDef) return false;

  // Validate the new value
  if (propertyDef.validate && !propertyDef.validate(value)) {
    return false;
  }

  // Check if value actually changed
  let currentValue;
  if (propertyDef.dataAttribute === "data-x-axis" || 
      propertyDef.dataAttribute === "data-series-list" || 
      propertyDef.dataAttribute === "data-default-filter-conditions") {
    currentValue = JSON.parse(container.getAttribute(propertyDef.dataAttribute) || "null");
  } else if (propertyDef.dataAttribute === "data-area" || propertyDef.dataAttribute === "data-cumulative") {
    currentValue = container.getAttribute(propertyDef.dataAttribute) === "true";
  } else if (propertyDef.dataAttribute === "data-top-n") {
    currentValue = parseInt(container.getAttribute(propertyDef.dataAttribute) || "0");
  } else {
    currentValue = container.getAttribute(propertyDef.dataAttribute);
  }

  if (currentValue === value) {
    return true; // No change needed
  }

  // Update the data attribute - MutationObserver will handle the rebuild automatically
  let attributeValue;
  if (propertyDef.dataAttribute === "data-x-axis" || 
      propertyDef.dataAttribute === "data-series-list" || 
      propertyDef.dataAttribute === "data-default-filter-conditions") {
    attributeValue = JSON.stringify(value);
  } else if (propertyDef.dataAttribute === "data-area" || propertyDef.dataAttribute === "data-cumulative") {
    attributeValue = value ? "true" : "false";
  } else {
    attributeValue = value || "";
  }

  container.setAttribute(propertyDef.dataAttribute, attributeValue);

  // Trigger change event for external listeners
  triggerChartPropertyChange(containerId, property, currentValue, value);

  return true;
}

/**
 * Get the current value of a chart property from data attributes
 */
function getChartProperty(containerId, property) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const propertyDef = CHART_PROPERTIES[property];
  if (!propertyDef) return null;

  const attributeValue = container.getAttribute(propertyDef.dataAttribute);
  
  if (propertyDef.dataAttribute === "data-x-axis" || 
      propertyDef.dataAttribute === "data-series-list" || 
      propertyDef.dataAttribute === "data-default-filter-conditions") {
    return JSON.parse(attributeValue || "null");
  } else if (propertyDef.dataAttribute === "data-area" || propertyDef.dataAttribute === "data-cumulative") {
    return attributeValue === "true";
  } else if (propertyDef.dataAttribute === "data-top-n") {
    return parseInt(attributeValue || "0");
  } else {
    return attributeValue;
  }
}

/**
 * Trigger a property change event for external listeners
 */
function triggerChartPropertyChange(containerId, property, oldValue, newValue) {
  const event = new CustomEvent("chartPropertyChanged", {
    detail: {
      containerId,
      property,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    },
  });

  document.dispatchEvent(event);
}

/**
 * Get all available chart properties
 */
function getAvailableChartProperties() {
  return Object.keys(CHART_PROPERTIES);
}

/**
 * Get detailed information about a specific chart property
 */
function getChartPropertyInfo(property) {
  return CHART_PROPERTIES[property] || null;
}

/**
 * Validate a chart property value without updating
 */
function validateChartProperty(property, value) {
  const propertyDef = CHART_PROPERTIES[property];
  if (!propertyDef) {
    return { valid: false, error: "Unknown property" };
  }

  if (propertyDef.validate) {
    const isValid = propertyDef.validate(value);
    return {
      valid: isValid,
      error: isValid ? null : "Value does not meet validation requirements",
    };
  }

  return { valid: true, error: null };
}

/**
 * Get all current property values for a chart from data attributes
 */
function getAllChartProperties(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const properties = {};
  for (const property of Object.keys(CHART_PROPERTIES)) {
    properties[property] = getChartProperty(containerId, property);
  }

  return properties;
}

// Make functions globally available
window.renderChartCard = renderChartCard;
window.renderChartFromDataAttributes = renderChartFromDataAttributes;
window.reRenderAllChartComponents = reRenderAllChartComponents;
window.updateChartDataAndRender = updateChartDataAndRender;
window.getChartConfigFromDataAttributes = getChartConfigFromDataAttributes;
window.updateChart = updateChart;
window.updateChartTopN = updateChartTopN;
window.updateChartTitle = updateChartTitle;
window.editChart = editChart;
window.updateChartProperty = updateChartProperty;

// Property management functions
window.getChartProperty = getChartProperty;
window.getAllChartProperties = getAllChartProperties;
window.getAvailableChartProperties = getAvailableChartProperties;
window.getChartPropertyInfo = getChartPropertyInfo;
window.validateChartProperty = validateChartProperty;

// MutationObserver functions
window.initializeChartMutationObserver = initializeChartMutationObserver;

// Auto-initialize MutationObserver when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeChartMutationObserver();
  });
} else {
  // DOM is already ready
  initializeChartMutationObserver();
}
