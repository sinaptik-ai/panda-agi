/**
 * CSV Loader Module
 * 
 * Centralized CSV loading and parsing functionality for dashboard components.
 * This module handles dynamic CSV loading from the server and provides
 * parsed data to other dashboard components.
 */

class CSVLoader {
    constructor() {
        this.csvData = null;
        this.columnMapping = {};
        this.loading = false;
        this.loaded = false;
        this.loadPromise = null;
    }

    /**
     * Load CSV data from the specified file path
     * @param {string} filePath - Path to the CSV file
     * @param {Object} options - Loading options
     * @returns {Promise<Array>} Parsed CSV data
     */
    async loadCSV(filePath, options = {}) {
        // If already loading, return the existing promise
        if (this.loading && this.loadPromise) {
            return this.loadPromise;
        }

        // If already loaded, return cached data
        if (this.loaded && this.csvData) {
            return this.csvData;
        }

        this.loading = true;
        this.loadPromise = this._performLoad(filePath, options);
        
        try {
            const result = await this.loadPromise;
            this.loaded = true;
            this.loading = false;
            return result;
        } catch (error) {
            this.loading = false;
            throw error;
        }
    }

    /**
     * Perform the actual CSV loading
     * @param {string} filePath - Path to the CSV file
     * @param {Object} options - Loading options
     * @returns {Promise<Array>} Parsed CSV data
     */
    async _performLoad(filePath, options) {
        try {
            // Always fetch CSV from server to ensure we have the latest data
            const csvData = await this.fetchCSVFromServer(filePath);
            this.csvData = csvData;
            this.columnMapping = this.generateColumnMapping(csvData);
            
            // Apply defined columns from transformations
            this.applyDefinedColumns();
            
            // Enable data preview button now that data is loaded
            if (window.enableDataPreviewButton) {
                // Use setTimeout to ensure DOM is ready
                setTimeout(() => {
                    window.enableDataPreviewButton();
                }, 100);
            }
            
            return this.csvData;
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.csvData = [];
            this.columnMapping = {};
            throw error;
        }
    }

    /**
     * Fetch CSV data from the server
     * @param {string} filePath - Path to the CSV file
     * @returns {Promise<Array>} Parsed CSV data
     */
    async fetchCSVFromServer(filePath) {
        try {
            // Get artifact ID from dashboard configuration first, then fallback to URL parsing
            let artifactId = null;
            
            // Try to get artifact ID from dashboard configuration
            if (window.dashboardConfig && window.dashboardConfig.artifact_id) {
                artifactId = window.dashboardConfig.artifact_id;
            } else {
                // Fallback to URL parsing
                artifactId = this.getArtifactId();
            }
            
            // Use the actual file path from PXML, not hardcoded 'dataset.csv'
            // Extract just the filename from the full path
            const fileName = filePath.split('/').pop();

            // Construct the correct URL for the CSV file
            // URL pattern: /creations/{artifactId}/{fileName}
            // By default it picks the base path browser or when iframe is used
            let fileUrl = "";
            if (artifactId !== "default") {
                fileUrl = `/creations/${artifactId}/${fileName}`;
            } else {
                fileUrl = filePath;
            }
            
            const response = await fetch(fileUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            
            // Parse CSV data
            const csvData = this.parseCSV(csvText);
            
            return csvData;
        } catch (error) {
            console.error('Error fetching CSV from server:', error);
            throw error;
        }
    }

    /**
     * Parse CSV text into array of objects
     * @param {string} csvText - Raw CSV text
     * @returns {Array} Parsed CSV data
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            return [];
        }
        
        // Get headers from first line
        const headers = this.parseCSVLine(lines[0]);
        
        // Parse data rows
        const data = [];
        let skippedRows = 0;
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            } else {
                skippedRows++;
            }
        }
        
        return data;
    }

    /**
     * Parse a single CSV line, handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} Parsed values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Generate column mapping from CSV data
     * @param {Array} csvData - Parsed CSV data
     * @returns {Object} Column mapping (A -> column_name, B -> column_name, etc.)
     */
    generateColumnMapping(csvData) {
        if (!csvData || csvData.length === 0) {
            return {};
        }

        const headers = Object.keys(csvData[0]);
        const mapping = {};
        
        headers.forEach((header, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, etc.
            mapping[letter] = header;
        });
        
        return mapping;
    }

    /**
     * Get conversation ID from config, URL, or use default
     * @returns {string} Conversation ID
     */
    getConversationId() {
        // Try to get from dashboard config first
        if (window.dashboardConfig && window.dashboardConfig.conversation_id) {
            return window.dashboardConfig.conversation_id;
        }
        
        // Try to extract conversation ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversation_id');
        
        if (conversationId) {
            return conversationId;
        }
        
        // Try to get from window object if available
        if (window.conversationId) {
            return window.conversationId;
        }
        
        // Use a default fallback
        return 'default';
    }

    /**
     * Get artifact ID from current URL
     * @returns {string} Artifact ID
     */
    getArtifactId() {
        // Extract artifact ID from URL pattern: /creations/{artifactId}/dashboard.pxml
        const pathParts = window.location.pathname.split('/');
        const creationsIndex = pathParts.indexOf('creations');
        
        if (creationsIndex !== -1 && pathParts[creationsIndex + 1]) {
            return pathParts[creationsIndex + 1];
        }
        
        // Try to get artifact ID from parent window if we're in an iframe
        if (window.parent && window.parent !== window) {
            try {
                const parentPathParts = window.parent.location.pathname.split('/');
                const parentCreationsIndex = parentPathParts.indexOf('creations');
                
                if (parentCreationsIndex !== -1 && parentPathParts[parentCreationsIndex + 1]) {
                    return parentPathParts[parentCreationsIndex + 1];
                }
            } catch (e) {
                // Cannot access parent window, continue to fallback
            }
        }
        
        // Fallback to a default artifact ID
        return 'default';
    }

    /**
     * Get column data from CSV
     * @param {string} columnName - Name of the column
     * @param {number} startRow - Starting row (1-based)
     * @returns {Array} Column data
     */
    getColumnData(columnName, startRow = 1) {
        if (!this.csvData || this.csvData.length === 0) {
            return [];
        }

        // Use filtered data if available, otherwise use raw data
        const data = window.getFilteredData ? window.getFilteredData() : this.csvData;
        if (!data || data.length === 0) {
            return [];
        }

        // Since data doesn't include the header row, adjust startRow accordingly
        const startIndex = Math.max(0, startRow - 2);
        const result = data.slice(startIndex).map(row => row[columnName]);
        return result;
    }

    /**
     * Get cell value from CSV
     * @param {string} columnName - Name of the column
     * @param {number} rowIndex - Row index (0-based)
     * @returns {*} Cell value
     */
    getCellValue(columnName, rowIndex) {
        // Use filtered data if available, otherwise use raw data
        const data = window.getFilteredData ? window.getFilteredData() : this.csvData;
        if (!data || !data[rowIndex]) {
            return null;
        }
        return data[rowIndex][columnName];
    }

    /**
     * Get the current CSV data
     * @returns {Array} Current CSV data
     */
    getData() {
        return this.csvData || [];
    }

    /**
     * Get the current column mapping
     * @returns {Object} Current column mapping
     */
    getColumnMapping() {
        return this.columnMapping || {};
    }

    /**
     * Check if CSV data is loaded
     * @returns {boolean} True if data is loaded
     */
    isLoaded() {
        return this.loaded && this.csvData && this.csvData.length > 0;
    }

    /**
     * Reset the loader state
     */
    reset() {
        this.csvData = null;
        this.columnMapping = {};
        this.loading = false;
        this.loaded = false;
        this.loadPromise = null;
    }

    /**
     * Apply defined columns from transformations
     */
    applyDefinedColumns() {
        if (!this.csvData || !window.dashboardConfig) {
            return;
        }

        // Get transformations from dashboard config
        const transformations = window.dashboardConfig.transformations || [];
        
        for (const transformation of transformations) {
            if (transformation.type === 'define_column' && transformation.name && transformation.formula) {
                try {
                    // Compute the defined column for each row
                    const columnName = transformation.name;
                    const formula = transformation.formula;
                    
                    // Add the new column to each row
                    for (let i = 0; i < this.csvData.length; i++) {
                        const row = this.csvData[i];
                        const computedValue = this.evaluateFormula(formula, row, i);
                        row[columnName] = computedValue;
                        
                    }
                    
                    // Add to column mapping
                    const nextLetter = this.getNextColumnLetter();
                    this.columnMapping[nextLetter] = columnName;
                    
                } catch (error) {
                    console.warn(`Warning: Could not create defined column '${transformation.name}':`, error);
                }
            }
        }
    }

    /**
     * Evaluate a formula for a specific row
     * @param {string} formula - The formula to evaluate
     * @param {Object} row - The data row
     * @param {number} rowIndex - The row index (0-based)
     * @returns {*} The computed value
     */
    evaluateFormula(formula, row, rowIndex) {
        // Remove the = sign if present
        if (formula.startsWith('=')) {
            formula = formula.substring(1);
        }

        // Replace column references with actual values
        // A:A -> row['Month'], B:B -> row['Branch'], etc.
        let processedFormula = formula;
        
        // Handle column references like A:A, B:B, etc.
        const columnRefPattern = /([A-Z]+):([A-Z]+)/g;
        processedFormula = processedFormula.replace(columnRefPattern, (match, startCol, endCol) => {
            // For now, just use the start column
            const columnName = this.columnMapping[startCol];
            if (columnName && row[columnName] !== undefined) {
                return `"${row[columnName]}"`;
            }
            return '""';
        });
        
        // Special handling for month extraction from YYYY-MM format
        // If the formula contains MONTH(LEFT(...)) and we're dealing with Month column,
        // we can optimize this to directly extract the month
        if (processedFormula.includes('MONTH(LEFT(') && row.Month) {
            // Extract month directly from YYYY-MM format
            const monthMatch = row.Month.match(/(\d{4})-(\d{2})/);
            if (monthMatch) {
                const month = parseInt(monthMatch[2]);
                
                // If this is a CHOOSE formula, apply the CHOOSE logic
                if (processedFormula.includes('CHOOSE(')) {
                    // Extract the choices from the CHOOSE formula
                    const chooseMatch = processedFormula.match(/CHOOSE\((.+?),\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/);
                    if (chooseMatch) {
                        const [, , choice1, choice2, choice3] = chooseMatch; // Skip the first group (the index expression)
                        const monthNames = [choice1, choice2, choice3];
                        const result = monthNames[month - 1] || month; // month - 1 because CHOOSE is 1-based
                        return result;
                    } else {
                    }
                } else {
                }
                
                return month;
            }
        }

        // Handle single column references like A2, B3, etc.
        const singleColumnPattern = /([A-Z]+)(\d+)/g;
        processedFormula = processedFormula.replace(singleColumnPattern, (match, col, rowNum) => {
            const columnName = this.columnMapping[col];
            if (columnName && row[columnName] !== undefined) {
                return `"${row[columnName]}"`;
            }
            return '""';
        });

        try {
            // Use the Excel helpers if available
            if (window.ExcelHelpers) {
                // Create a context with Excel functions
                const context = {
                    LEFT: window.ExcelHelpers.excelLeft,
                    MONTH: window.ExcelHelpers.getMonth,
                    CHOOSE: window.ExcelHelpers.excelChoose,
                    // Add other Excel functions as needed
                };
                
                
                // Evaluate the formula with Excel functions
                const result = this.evaluateWithContext(processedFormula, context);
                return result;
            } else {
                console.warn('ExcelHelpers not available, using fallback evaluation');
                // Fallback to basic evaluation
                return this.evaluateWithContext(processedFormula, {});
            }
        } catch (error) {
            console.warn(`Error evaluating formula '${formula}':`, error);
            return null;
        }
    }

    /**
     * Evaluate a formula with a given context
     * @param {string} formula - The formula to evaluate
     * @param {Object} context - The context with available functions
     * @returns {*} The computed value
     */
    evaluateWithContext(formula, context) {
        // Create a safe evaluation context
        
        const safeEval = new Function(...Object.keys(context), `return ${formula}`);
        const result = safeEval(...Object.values(context));
        return result;
    }

    /**
     * Get the next available column letter for defined columns
     * @returns {string} The next column letter
     */
    getNextColumnLetter() {
        const existingLetters = Object.keys(this.columnMapping);
        
        // Single letters A-Z
        for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i); // A-Z
            if (!existingLetters.includes(letter)) {
                return letter;
            }
        }
        
        // Double letters AA-ZZ
        for (let i = 0; i < 26; i++) {
            for (let j = 0; j < 26; j++) {
                const letter = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
                if (!existingLetters.includes(letter)) {
                    return letter;
                }
            }
        }
        
        // Fallback
        return 'ZZ';
    }
}

// Create global instance
window.csvLoader = new CSVLoader();
