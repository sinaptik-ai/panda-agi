/**
 * Dynamic Filters Module
 * 
 * Handles dynamic CSV loading and JavaScript formula compilation for filters.
 * This module replaces the server-side filter processing with client-side processing.
 */

class DynamicFilters {
    constructor() {
        this.csvData = null;
        this.columnMapping = {};
        this.filterConfigs = [];
        this.initialized = false;
    }

    /**
     * Initialize the dynamic filters system
     * @param {Object} config - Dashboard configuration containing metadata and filters
     */
    async initialize(config) {
        try {
            this.filterConfigs = config.filters || [];
            
            // Load CSV data using centralized CSV loader
            await window.csvLoader.loadCSV(config.metadata.file_path);
            this.columnMapping = window.csvLoader.getColumnMapping();
            
            // Initialize all filters with their computed values
            this.initializeAllFilters();
            
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing dynamic filters:', error);
            this.initializeFallbackFilters();
        }
    }


    /**
     * Initialize all filters with their computed values
     */
    initializeAllFilters() {
        for (const filterConfig of this.filterConfigs) {
            try {
                this.initializeFilter(filterConfig);
            } catch (error) {
                console.error(`Error initializing filter ${filterConfig.id}:`, error);
                this.initializeEmptyFilter(filterConfig);
            }
        }
    }

    /**
     * Initialize a single filter with computed values
     * @param {Object} filterConfig - Filter configuration
     */
    initializeFilter(filterConfig) {
        const values = this.computeFilterValues(filterConfig.values_formula);
        
        if (filterConfig.type === 'list') {
            this.initializeListFilter(filterConfig.id, values, filterConfig.name);
        } else if (filterConfig.type === 'number_range') {
            this.initializeRangeFilter(filterConfig.id, values, filterConfig.name);
        } else if (filterConfig.type === 'date_range') {
            this.initializeDateRangeFilter(filterConfig.id, values, filterConfig.name);
        }
    }

    /**
     * Compute filter values using Excel formula
     * @param {string} formula - Excel formula to evaluate
     * @returns {Array} Computed values
     */
    computeFilterValues(formula) {
        try {
            // Convert Excel formula to JavaScript
            const jsFormula = this.convertExcelFormulaToJS(formula);
            
            // Create a safe evaluation context
            const context = this.createEvaluationContext();
            
            // Evaluate the formula in the context
            const result = this.safeEval(jsFormula, context);
            
            // Ensure result is an array
            if (Array.isArray(result)) {
                return result;
            } else if (result !== null && result !== undefined) {
                return [result];
            } else {
                return [];
            }
        } catch (error) {
            //
            return [];
        }
    }

    /**
     * Convert Excel formula to JavaScript
     * @param {string} formula - Excel formula
     * @returns {string} JavaScript expression
     */
    convertExcelFormulaToJS(formula) {
        if (!formula.startsWith('=')) {
            return `"${formula}"`; // Return as string literal if not a formula
        }

        // Remove the leading '='
        let jsExpression = formula.substring(1);

        // Replace column references (A:A, B2:B, etc.) with data access
        jsExpression = this.replaceColumnReferences(jsExpression);

        // Replace Excel functions with JavaScript equivalents
        jsExpression = this.replaceExcelFunctions(jsExpression);

        // Handle Excel-style operators
        jsExpression = this.replaceExcelOperators(jsExpression);

        return jsExpression;
    }

    /**
     * Replace Excel column references with JavaScript data access
     * @param {string} expression - Expression to process
     * @returns {string} Processed expression
     */
    replaceColumnReferences(expression) {
        // Pattern for column ranges like A2:A, B:B, C2:C100
        const rangePattern = /([A-Z]+)(\d*):([A-Z]+)(\d*)/g;
        
        expression = expression.replace(rangePattern, (match, startCol, startRow, endCol, endRow) => {
            // For single column ranges (A:A, B2:B)
            if (startCol === endCol) {
                const columnName = this.columnMapping[startCol] || startCol;
                if (startRow && startRow !== "1") {
                    // Range starting from specific row
                    return `getColumnData("${columnName}", ${startRow})`;
                } else {
                    // Entire column (excluding header)
                    return `getColumnData("${columnName}")`;
                }
            }
            return match; // Return original if we can't handle it
        });

        // Pattern for single cell references like A1, B5
        const cellPattern = /([A-Z]+)(\d+)/g;
        expression = expression.replace(cellPattern, (match, col, row) => {
            const columnName = this.columnMapping[col] || col;
            // Convert to 0-based index for JavaScript
            return `getCellValue("${columnName}", ${parseInt(row) - 1})`;
        });

        // Pattern for direct column name references like price_tier, rating_category
        // This handles cases where column names are used directly in formulas
        // Look for function calls with column names as arguments
        const functionWithColumnPattern = /(\w+)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g;
        expression = expression.replace(functionWithColumnPattern, (match, functionName, columnName) => {
            // Check if this column exists in our data
            if (this.columnMapping && Object.values(this.columnMapping).includes(columnName)) {
                return `${functionName}(getColumnData("${columnName}"))`;
            }
            return match;
        });

        return expression;
    }

    /**
     * Replace Excel functions with JavaScript equivalents
     * @param {string} expression - Expression to process
     * @returns {string} Processed expression
     */
    replaceExcelFunctions(expression) {
        // Get function names directly from ExcelHelpers
        const excelFunctionMappings = window.ExcelHelpers.getFunctionMappings();
        
        // All functions map to themselves since they're available in the evaluation context
        const excelToJsFunctions = {};
        Object.keys(excelFunctionMappings).forEach(funcName => {
            excelToJsFunctions[funcName] = funcName;
        });

        // Replace Excel function names with JavaScript equivalents
        for (const [excelFunc, jsFunc] of Object.entries(excelToJsFunctions)) {
            const pattern = new RegExp(`\\b${excelFunc}\\s*\\(`, 'gi');
            expression = expression.replace(pattern, `${jsFunc}(`);
        }

        return expression;
    }

    /**
     * Replace Excel-specific operators
     * @param {string} expression - Expression to process
     * @returns {string} Processed expression
     */
    replaceExcelOperators(expression) {
        // Excel uses <> for not equal, JavaScript uses !=
        expression = expression.replace(/<>/g, '!=');

        // Excel uses = for comparison inside functions, JavaScript uses ==
        // Handle patterns like "column=value" or "function()=value" within function calls
        const dataComparisonPattern = /(getColumnData\([^)]+\))\s*=\s*(\d+)/g;
        expression = expression.replace(dataComparisonPattern, (match, arrayExpr, compareValue) => {
            return `${arrayExpr}.map(val => val == ${compareValue})`;
        });

        // Replace remaining = with == when used for comparison (not assignment)
        if (!expression.includes('.map(val => val ==')) {
            const comparisonPattern = /(\w+(?:\([^)]*\))?)\s*=\s*([^,)]+)/g;
            expression = expression.replace(comparisonPattern, (match, leftSide, rightSide) => {
                // Skip if it's part of our array mapping
                if (expression.includes('.map(') && rightSide.includes('val')) {
                    return match;
                }
                return `${leftSide} == ${rightSide}`;
            });
        }

        // Excel uses & for string concatenation, JavaScript uses +
        expression = expression.replace(/(\w+|\)|"[^"]*")\s*&\s*(\w+|\(|"[^"]*")/g, '$1 + $2');

        return expression;
    }

    createEvaluationContext() {
        return {
            // Data access functions
            getColumnData: (columnName, startRow = 1) => this.getColumnData(columnName, startRow),
            getCellValue: (columnName, rowIndex) => this.getCellValue(columnName, rowIndex),
            
            // Array functions (legacy support)
            arrayUnique: (arr) => this.arrayUnique(arr),
            arraySum: (arr) => this.arraySum(arr),
            arrayAvg: (arr) => this.arrayAvg(arr),
            arrayCount: (arr) => this.arrayCount(arr),
            arrayCountA: (arr) => this.arrayCountA(arr),
            arrayMax: (arr) => this.arrayMax(arr),
            arrayMin: (arr) => this.arrayMin(arr),
            arraySumIf: (arr, condition, sumArr) => this.arraySumIf(arr, condition, sumArr),
            arrayCountIf: (arr, condition) => this.arrayCountIf(arr, condition),
            arrayCountIfs: (arr, conditions) => this.arrayCountIfs(arr, conditions),
            arrayIndex: (arr, index) => this.arrayIndex(arr, index),
            arrayMatch: (arr, value) => this.arrayMatch(arr, value),
            
            // Math functions
            Math: Math,
            
            // Percentage growth function
            arrayPercentageGrowth: (current, previous) => this.arrayPercentageGrowth(current, previous),
            
            // Excel functions - use centralized mappings from ExcelHelpers
            ...window.ExcelHelpers.getFunctionMappings()
        };
    }

    /**
     * Safely evaluate JavaScript code
     * @param {string} code - JavaScript code to evaluate
     * @param {Object} context - Evaluation context
     * @returns {*} Evaluation result
     */
    safeEval(code, context) {
        try {
            // Create a function with the context as its scope
            const func = new Function(...Object.keys(context), `return ${code}`);
            return func(...Object.values(context));
        } catch (error) {
            //
            throw error;
        }
    }

    /**
     * Get column data from CSV
     * @param {string} columnName - Name of the column
     * @param {number} startRow - Starting row (1-based)
     * @returns {Array} Column data
     */
    getColumnData(columnName, startRow = 1) {
        return window.csvLoader.getColumnData(columnName, startRow);
    }

    /**
     * Get cell value from CSV
     * @param {string} columnName - Name of the column
     * @param {number} rowIndex - Row index (0-based)
     * @returns {*} Cell value
     */
    getCellValue(columnName, rowIndex) {
        return window.csvLoader.getCellValue(columnName, rowIndex);
    }

    /**
     * Get unique values from array
     * @param {Array} arr - Input array
     * @returns {Array} Unique values
     */
    arrayUnique(arr) {
        if (!Array.isArray(arr)) return [];
        return [...new Set(arr.filter(val => val !== null && val !== undefined && val !== ''))];
    }

    /**
     * Sum array values
     * @param {Array} arr - Input array
     * @returns {number} Sum
     */
    arraySum(arr) {
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((sum, val) => {
            const num = parseFloat(val);
            return isNaN(num) ? sum : sum + num;
        }, 0);
    }

    /**
     * Average array values
     * @param {Array} arr - Input array
     * @returns {number} Average
     */
    arrayAvg(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const sum = this.arraySum(arr);
        return sum / arr.length;
    }

    /**
     * Count numeric values in array
     * @param {Array} arr - Input array
     * @returns {number} Count
     */
    arrayCount(arr) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter(val => !isNaN(parseFloat(val)) && isFinite(val)).length;
    }

    /**
     * Count non-empty values in array
     * @param {Array} arr - Input array
     * @returns {number} Count
     */
    arrayCountA(arr) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter(val => val !== null && val !== undefined && val !== '').length;
    }

    /**
     * Maximum value in array
     * @param {Array} arr - Input array
     * @returns {number} Maximum value
     */
    arrayMax(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const nums = arr.map(val => parseFloat(val)).filter(num => !isNaN(num));
        return nums.length > 0 ? Math.max(...nums) : 0;
    }

    /**
     * Minimum value in array
     * @param {Array} arr - Input array
     * @returns {number} Minimum value
     */
    arrayMin(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const nums = arr.map(val => parseFloat(val)).filter(num => !isNaN(num));
        return nums.length > 0 ? Math.min(...nums) : 0;
    }

    /**
     * Sum values in array based on condition
     * @param {Array} arr - Array to check condition against
     * @param {*} condition - Condition to match
     * @param {Array} sumArr - Array to sum from
     * @returns {number} Sum
     */
    arraySumIf(arr, condition, sumArr) {
        if (!Array.isArray(arr) || !Array.isArray(sumArr)) return 0;
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === condition) {
                const num = parseFloat(sumArr[i]);
                if (!isNaN(num)) sum += num;
            }
        }
        return sum;
    }

    /**
     * Count values in array based on condition
     * @param {Array} arr - Input array
     * @param {*} condition - Condition to match
     * @returns {number} Count
     */
    arrayCountIf(arr, condition) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter(val => val === condition).length;
    }

    /**
     * Count values in array based on multiple conditions
     * @param {Array} arr - Input array
     * @param {Array} conditions - Array of conditions
     * @returns {number} Count
     */
    arrayCountIfs(arr, conditions) {
        if (!Array.isArray(arr) || !Array.isArray(conditions)) return 0;
        return arr.filter((val, index) => {
            return conditions.every(condition => {
                if (typeof condition === 'function') {
                    return condition(val, index);
                }
                return val === condition;
            });
        }).length;
    }

    /**
     * Get value at index in array
     * @param {Array} arr - Input array
     * @param {number} index - Index (1-based)
     * @returns {*} Value at index
     */
    arrayIndex(arr, index) {
        if (!Array.isArray(arr) || index < 1 || index > arr.length) return null;
        return arr[index - 1];
    }

    /**
     * Find index of value in array
     * @param {Array} arr - Input array
     * @param {*} value - Value to find
     * @returns {number} Index (1-based) or -1 if not found
     */
    arrayMatch(arr, value) {
        if (!Array.isArray(arr)) return -1;
        const index = arr.indexOf(value);
        return index >= 0 ? index + 1 : -1;
    }

    /**
     * Format value as text
     * @param {*} value - Value to format
     * @param {string} format - Format string
     * @returns {string} Formatted text
     */
    excelText(value, format) {
        // Simple text formatting - can be extended
        if (format === 'currency:usd') {
            return `$${parseFloat(value).toFixed(2)}`;
        }
        return String(value);
    }

    /**
     * Calculate percentage growth between two arrays
     * @param {Array} current - Current values
     * @param {Array} previous - Previous values
     * @returns {Array} Percentage growth values
     */
    arrayPercentageGrowth(current, previous) {
        if (!Array.isArray(current) || !Array.isArray(previous)) return [];
        
        const result = [];
        const maxLength = Math.max(current.length, previous.length);
        
        for (let i = 0; i < maxLength; i++) {
            const curr = parseFloat(current[i] || 0);
            const prev = parseFloat(previous[i] || 0);
            
            if (prev !== 0) {
                result.push(((curr - prev) / prev) * 100);
            } else {
                result.push(0);
            }
        }
        
        return result;
    }

    /**
     * Initialize list filter with values
     * @param {string} filterId - Filter ID
     * @param {Array} values - Filter values
     * @param {string} filterName - Filter name
     */
    initializeListFilter(filterId, values, filterName) {
        if (typeof window.initializeListFilter === 'function') {
            window.initializeListFilter(filterId, values, filterName);
        } else {
            console.warn('initializeListFilter function not available');
        }
    }

    /**
     * Initialize range filter with values
     * @param {string} filterId - Filter ID
     * @param {Array} values - Filter values
     * @param {string} filterName - Filter name
     */
    initializeRangeFilter(filterId, values, filterName) {
        if (typeof window.initializeRangeFilter === 'function') {
            window.initializeRangeFilter(filterId, values, filterName);
        } else {
            console.warn('initializeRangeFilter function not available');
        }
    }

    /**
     * Initialize date range filter with values
     * @param {string} filterId - Filter ID
     * @param {Array} values - Filter values
     * @param {string} filterName - Filter name
     */
    initializeDateRangeFilter(filterId, values, filterName) {
        if (typeof window.initializeDateRangeFilter === 'function') {
            window.initializeDateRangeFilter(filterId, values, filterName);
        } else {
            console.warn('initializeDateRangeFilter function not available');
        }
    }

    /**
     * Initialize empty filter as fallback
     * @param {Object} filterConfig - Filter configuration
     */
    initializeEmptyFilter(filterConfig) {
        if (filterConfig.type === 'list') {
            this.initializeListFilter(filterConfig.id, [], filterConfig.name);
        } else if (filterConfig.type === 'number_range') {
            this.initializeRangeFilter(filterConfig.id, [], filterConfig.name);
        } else if (filterConfig.type === 'date_range') {
            this.initializeDateRangeFilter(filterConfig.id, [], filterConfig.name);
        }
    }

    /**
     * Initialize fallback filters when CSV loading fails
     */
    initializeFallbackFilters() {
        console.warn('Initializing fallback filters with empty data');
        for (const filterConfig of this.filterConfigs) {
            this.initializeEmptyFilter(filterConfig);
        }
    }
}

// Create global instance
window.dynamicFilters = new DynamicFilters();
