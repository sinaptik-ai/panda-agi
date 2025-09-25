/**
 * Data Utilities Module
 * Handles data filtering, processing, and utility functions
 */

// Data access functions used by Excel helpers
function getColumnData(columnName, startRow = 1) {
    // Use centralized CSV loader if available, otherwise fall back to window.dashboardData
    if (window.csvLoader && window.csvLoader.isLoaded()) {
        const data = window.csvLoader.getData();
        const filtered = getFilteredData();
        return filtered.map(row => row[columnName]).filter(val => val !== undefined);
    }
    
    if (!window.dashboardData || !Array.isArray(window.dashboardData)) return [];
    
    const filtered = getFilteredData();
    
    // Since window.dashboardData is already processed JSON data without headers,
    // we always return all filtered data regardless of startRow
    return filtered.map(row => row[columnName]).filter(val => val !== undefined);
}

function getCellValue(columnName, rowIndex) {
    // Use centralized CSV loader if available, otherwise fall back to window.dashboardData
    if (window.csvLoader && window.csvLoader.isLoaded()) {
        const data = window.csvLoader.getData();
        const filtered = getFilteredData();
        if (rowIndex >= 0 && rowIndex < filtered.length) {
            return filtered[rowIndex][columnName];
        }
        return null;
    }
    
    if (!window.dashboardData || !Array.isArray(window.dashboardData)) return null;
    
    const filtered = getFilteredData();
    if (rowIndex >= 0 && rowIndex < filtered.length) {
        return filtered[rowIndex][columnName];
    }
    return null;
}

// Data filtering functions
function getFilteredData() {
    // Use CSV loader data if available, otherwise fall back to window.dashboardData
    let data;
    if (window.csvLoader && window.csvLoader.isLoaded()) {
        data = window.csvLoader.getData();
    } else {
        data = window.dashboardData;
    }
    
    if (!data || data.length === 0) {
        return [];
    }

    return data.filter(row => {
        for (const [filterName, filterValue] of Object.entries(window.currentFilters)) {
            // Get the actual column name for this filter
            const columnMapping = window.filterToColumnMap[filterName];
            
            if (!columnMapping) {
                console.warn(`No column mapping found for filter: ${filterName}`);
                continue;
            }
            
            let columnName, transform;
            if (typeof columnMapping === 'string') {
                columnName = columnMapping;
                transform = null;
            } else if (typeof columnMapping === 'object') {
                columnName = columnMapping.column;
                transform = columnMapping.transform;
            }
            
            const rowValue = row[columnName];
            
            // Apply transformation if specified
            let processedValue = rowValue;
            if (transform === 'YEAR' && rowValue) {
                // Extract year from date string
                const dateStr = String(rowValue);
                if (dateStr.length >= 4) {
                    processedValue = dateStr.substring(0, 4);
                }
            }
            
            // Handle different filter types
            if (Array.isArray(filterValue)) {
                // List filter - check if row value is in selected values
                if (!filterValue.includes(String(processedValue))) {
                    return false;
                }
            } else if (typeof filterValue === 'object') {
                // Range filter (number or date)
                if (filterValue.min !== undefined || filterValue.max !== undefined) {
                    // Number range filter
                    const numValue = Number(processedValue);
                    if (filterValue.min !== undefined && numValue < filterValue.min) {
                        return false;
                    }
                    if (filterValue.max !== undefined && numValue > filterValue.max) {
                        return false;
                    }
                } else if (filterValue.start !== undefined || filterValue.end !== undefined) {
                    // Date range filter
                    const dateValue = new Date(processedValue);
                    if (filterValue.start && dateValue < new Date(filterValue.start)) {
                        return false;
                    }
                    if (filterValue.end && dateValue > new Date(filterValue.end)) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    });
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
    let cleaned = str.replace(/[^\d.-]/g, '');
    
    // Early return if nothing left after cleaning
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
    
    // Handle multiple decimal points more efficiently
    const lastDotIndex = cleaned.lastIndexOf('.');
    if (lastDotIndex > 0) {
        cleaned = cleaned.substring(0, lastDotIndex).replace(/\./g, '') + cleaned.substring(lastDotIndex);
    }
    
    // Handle multiple minus signs more efficiently
    const firstMinusIndex = cleaned.indexOf('-');
    if (firstMinusIndex > 0) {
        cleaned = '-' + cleaned.replace(/-/g, '');
    }
    
    // Convert to number and return
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
}

// Utility functions for data processing
function aggregateValues(values, aggregationType) {
    switch (aggregationType) {
        case 'sum': {
            let sum = 0;
            for (let i = 0; i < values.length; i++) {
                const cleaned = cleanNumericValue(values[i]);
                if (cleaned !== null) sum += cleaned;
            }
            return sum;
        }
        case 'avg': {
            let sum = 0;
            let count = 0;
            for (let i = 0; i < values.length; i++) {
                const cleaned = cleanNumericValue(values[i]);
                if (cleaned !== null) {
                    sum += cleaned;
                    count++;
                }
            }
            return count > 0 ? sum / count : 0;
        }
        case 'count': {
            let count = 0;
            for (let i = 0; i < values.length; i++) {
                const cleaned = cleanNumericValue(values[i]);
                if (cleaned !== null) count++;
            }
            return count;
        }
        case 'max': {
            let max = -Infinity;
            let hasValue = false;
            for (let i = 0; i < values.length; i++) {
                const cleaned = cleanNumericValue(values[i]);
                if (cleaned !== null) {
                    max = Math.max(max, cleaned);
                    hasValue = true;
                }
            }
            return hasValue ? max : 0;
        }
        case 'min': {
            let min = Infinity;
            let hasValue = false;
            for (let i = 0; i < values.length; i++) {
                const cleaned = cleanNumericValue(values[i]);
                if (cleaned !== null) {
                    min = Math.min(min, cleaned);
                    hasValue = true;
                }
            }
            return hasValue ? min : 0;
        }
        default: {
            let sum = 0;
            for (let i = 0; i < values.length; i++) {
                const cleaned = cleanNumericValue(values[i]);
                if (cleaned !== null) sum += cleaned;
            }
            return sum;
        }
    }
}

function groupDataBy(data, columnName) {
    const grouped = {};
    data.forEach(row => {
        const key = row[columnName];
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(row);
    });
    return grouped;
}

function getUniqueValues(data, columnName) {
    const values = data.map(row => row[columnName]).filter(v => v !== null && v !== undefined);
    return [...new Set(values)].sort();
}

function formatValue(value, formatType) {
    // Clean the value first to remove any non-numeric characters
    const cleanedValue = cleanNumericValue(value);
    
    if (cleanedValue === null || isNaN(cleanedValue)) {
        return '--';
    }
    
    switch (formatType) {
        case 'number':
            return new Intl.NumberFormat('en-US').format(Math.round(cleanedValue));
        case 'currency':
        case 'currency:usd':
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(cleanedValue);
        case 'percentage':
            return new Intl.NumberFormat('en-US', {
                style: 'percent',
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }).format(cleanedValue / 100);
        case 'decimal':
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }).format(cleanedValue);
        default:
            return cleanedValue.toString();
    }
}
