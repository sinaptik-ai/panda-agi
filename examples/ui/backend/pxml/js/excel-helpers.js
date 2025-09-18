/**
 * Excel Helper Functions Module
 * Provides Excel-compatible functions for formula evaluation
 */

const ExcelHelpers = {
  // Math and statistical functions
  excelSum: function (range) {
    if (!Array.isArray(range)) return 0;
    return range
      .filter((x) => !isNaN(x) && x !== null && x !== "")
      .reduce((sum, val) => sum + Number(val), 0);
  },

  excelAvg: function (range) {
    if (!Array.isArray(range)) return 0;
    const numbers = range.filter((x) => !isNaN(x) && x !== null && x !== "");
    return numbers.length > 0 ? this.excelSum(numbers) / numbers.length : 0;
  },

  excelCount: function (range) {
    if (!Array.isArray(range)) return 0;
    return range.filter((x) => !isNaN(x) && x !== null && x !== "").length;
  },

  excelCountA: function (range) {
    if (!Array.isArray(range)) return 0;
    return range.filter((x) => x !== null && x !== "" && x !== undefined)
      .length;
  },

  excelMax: function (range) {
    if (!Array.isArray(range)) return 0;
    const numbers = range
      .filter((x) => !isNaN(x) && x !== null && x !== "")
      .map(Number);
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  },

  excelMin: function (range) {
    if (!Array.isArray(range)) return 0;
    const numbers = range
      .filter((x) => !isNaN(x) && x !== null && x !== "")
      .map(Number);
    return numbers.length > 0 ? Math.min(...numbers) : 0;
  },

  // Array functions (used internally by formulas)
  arraySum: function (arr) {
    if (!Array.isArray(arr)) return 0;
    const numbers = arr
      .filter((x) => !isNaN(x) && x !== null && x !== "")
      .map(Number);
    const sum = numbers.reduce((sum, val) => sum + val, 0);
    return sum;
  },

  arrayAvg: function (arr) {
    if (!Array.isArray(arr)) return 0;
    const numbers = arr.filter((x) => !isNaN(x) && x !== null && x !== "");
    return numbers.length > 0 ? arraySum(numbers) / numbers.length : 0;
  },

  arrayCount: function (arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.filter((x) => !isNaN(x) && x !== null && x !== "").length;
  },

  arrayCountA: function (arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.filter((x) => x !== null && x !== "" && x !== undefined).length;
  },

  arrayMax: function (arr) {
    if (!Array.isArray(arr)) return 0;
    const numbers = arr
      .filter((x) => !isNaN(x) && x !== null && x !== "")
      .map(Number);
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  },

  arrayMin: function (arr) {
    if (!Array.isArray(arr)) return 0;
    const numbers = arr
      .filter((x) => !isNaN(x) && x !== null && x !== "")
      .map(Number);
    return numbers.length > 0 ? Math.min(...numbers) : 0;
  },

  // Conditional functions
  arraySumIf: function (range, criteria, sumRange) {
    if (!Array.isArray(range)) return 0;

    // If sumRange is not provided, sum the range itself
    let sumArray = sumRange
      ? Array.isArray(sumRange)
        ? sumRange
        : [sumRange]
      : range;

    // If sumRange is a single value, create array of that value
    if (!Array.isArray(sumArray)) {
      // Create array of the literal value with same length as range
      sumArray = new Array(range.length).fill(sumRange);
    }

    let sum = 0;
    for (let i = 0; i < Math.min(range.length, sumArray.length); i++) {
      if (ExcelHelpers.meetsCriteria(range[i], criteria)) {
        sum += Number(sumArray[i]) || 0;
      }
    }
    return sum;
  },

  arrayCountIf: function (range, criteria) {
    if (!Array.isArray(range)) return 0;
    return range.filter((val) => ExcelHelpers.meetsCriteria(val, criteria))
      .length;
  },

  arrayCountIfs: function (range1, criteria1, range2, criteria2) {
    if (!Array.isArray(range1) || !Array.isArray(range2)) return 0;
    let count = 0;
    for (let i = 0; i < Math.min(range1.length, range2.length); i++) {
      if (
        ExcelHelpers.meetsCriteria(range1[i], criteria1) &&
        ExcelHelpers.meetsCriteria(range2[i], criteria2)
      ) {
        count++;
      }
    }
    return count;
  },

  arrayAverageIf: function (range, criteria, averageRange) {
    if (!Array.isArray(range)) return 0;

    // If averageRange is not provided, average the range itself
    let avgArray = averageRange
      ? Array.isArray(averageRange)
        ? averageRange
        : [averageRange]
      : range;

    // If averageRange is a single value, create array of that value
    if (!Array.isArray(avgArray)) {
      avgArray = new Array(range.length).fill(averageRange);
    }

    let sum = 0;
    let count = 0;
    for (let i = 0; i < Math.min(range.length, avgArray.length); i++) {
      if (ExcelHelpers.meetsCriteria(range[i], criteria)) {
        sum += Number(avgArray[i]) || 0;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  },

  arrayIndex: function (array, rowNum, colNum) {
    if (!Array.isArray(array)) {
      return null;
    }

    // For 1D arrays, just return the element at rowNum-1 (Excel is 1-indexed)
    if (typeof array[0] !== "object") {
      const index = (rowNum || 1) - 1;
      return index >= 0 && index < array.length ? array[index] : null;
    }

    // For 2D arrays (array of objects or arrays)
    const row = (rowNum || 1) - 1;
    if (row >= 0 && row < array.length) {
      if (colNum) {
        const col = colNum - 1;
        if (Array.isArray(array[row])) {
          return col >= 0 && col < array[row].length ? array[row][col] : null;
        } else if (typeof array[row] === "object") {
          const keys = Object.keys(array[row]);
          return col >= 0 && col < keys.length ? array[row][keys[col]] : null;
        }
      }
      return array[row];
    }
    return null;
  },

  // Date and time functions
  getYear: function (dateValue) {
    try {
      if (!dateValue) return new Date().getFullYear();

      // Handle different date formats
      if (typeof dateValue === "string") {
        // Handle YYYY-MM-DD format
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          return parseInt(dateValue.substring(0, 4));
        }
        // Handle MM/DD/YYYY or DD/MM/YYYY format
        if (dateValue.includes("/")) {
          const parts = dateValue.split("/");
          if (parts.length === 3) {
            // Assume the year is the longest part or the last part
            const yearPart = parts.find((p) => p.length === 4) || parts[2];
            return parseInt(yearPart);
          }
        }
      }

      const date = new Date(dateValue);
      return !isNaN(date.getTime())
        ? date.getFullYear()
        : new Date().getFullYear();
    } catch (error) {
      return new Date().getFullYear();
    }
  },

  getMonth: function (dateValue) {
    try {
      if (!dateValue) return new Date().getMonth() + 1;

      // Handle YYYY-MM-DD format
      if (
        typeof dateValue === "string" &&
        dateValue.match(/^\d{4}-\d{2}-\d{2}/)
      ) {
        return parseInt(dateValue.substring(5, 7));
      }

      const date = new Date(dateValue);
      return !isNaN(date.getTime())
        ? date.getMonth() + 1
        : new Date().getMonth() + 1;
    } catch (error) {
      return new Date().getMonth() + 1;
    }
  },

  getDay: function (dateValue) {
    try {
      if (!dateValue) return new Date().getDate();

      // Handle YYYY-MM-DD format
      if (
        typeof dateValue === "string" &&
        dateValue.match(/^\d{4}-\d{2}-\d{2}/)
      ) {
        return parseInt(dateValue.substring(8, 10));
      }

      const date = new Date(dateValue);
      return !isNaN(date.getTime()) ? date.getDate() : new Date().getDate();
    } catch (error) {
      return new Date().getDate();
    }
  },

  excelDate: function (year, month, day) {
    return new Date(Number(year), Number(month) - 1, Number(day));
  },

  excelTime: function (hour, minute, second) {
    const date = new Date();
    date.setHours(Number(hour), Number(minute), Number(second), 0);
    return date;
  },

  excelDateValue: function (dateText) {
    return new Date(String(dateText));
  },

  excelTimeValue: function (timeText) {
    return new Date('1900-01-01 ' + String(timeText));
  },

  excelWeekday: function (serialNumber, returnType = 1) {
    const date = new Date(serialNumber);
    const day = date.getDay();
    
    switch (returnType) {
      case 1: return day === 0 ? 7 : day; // Sunday = 7, Monday = 1
      case 2: return day === 0 ? 7 : day; // Monday = 1, Sunday = 7
      case 3: return day === 0 ? 6 : day - 1; // Monday = 0, Sunday = 6
      default: return day;
    }
  },

  excelWorkday: function (startDate, days, holidays = []) {
    let date = new Date(startDate);
    let remainingDays = Math.abs(Number(days));
    const direction = Number(days) >= 0 ? 1 : -1;
    
    while (remainingDays > 0) {
      date.setDate(date.getDate() + direction);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(holiday => 
        new Date(holiday).toDateString() === date.toDateString()
      );
      
      if (!isWeekend && !isHoliday) {
        remainingDays--;
      }
    }
    
    return date;
  },

  excelNetworkDays: function (startDate, endDate, holidays = []) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(holiday => 
        new Date(holiday).toDateString() === date.toDateString()
      );
      
      if (!isWeekend && !isHoliday) {
        days++;
      }
    }
    
    return days;
  },

  excelDateDif: function (startDate, endDate, unit) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    
    switch (unit.toUpperCase()) {
      case 'Y': // Years
        return end.getFullYear() - start.getFullYear();
      case 'M': // Months
        return (end.getFullYear() - start.getFullYear()) * 12 + 
               (end.getMonth() - start.getMonth());
      case 'D': // Days
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      case 'MD': // Days ignoring months and years
        return end.getDate() - start.getDate();
      case 'YM': // Months ignoring years
        return end.getMonth() - start.getMonth();
      case 'YD': // Days ignoring years
        const tempStart = new Date(end.getFullYear(), start.getMonth(), start.getDate());
        return Math.floor((end.getTime() - tempStart.getTime()) / (1000 * 60 * 60 * 24));
      default:
        return '#VALUE!';
    }
  },

  // Text functions
  excelLeft: function (text, numChars) {
    const str = String(text);
    const result = str.slice(0, numChars);
    return result;
  },

  excelRight: function (text, numChars) {
    const str = String(text);
    return str.slice(-numChars);
  },

  excelMid: function (text, startNum, numChars) {
    const str = String(text);
    return str.slice(startNum - 1, startNum - 1 + numChars);
  },

  excelLen: function (text) {
    return String(text).length;
  },

  excelUpper: function (text) {
    return String(text).toUpperCase();
  },

  excelLower: function (text) {
    return String(text).toLowerCase();
  },

  excelProper: function (text) {
    return String(text).toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  },

  excelTrim: function (text) {
    return String(text).trim().replace(/\s+/g, ' ');
  },

  excelClean: function (text) {
    return String(text).replace(/[\x00-\x1F\x7F]/g, '');
  },

  excelConcatenate: function (...texts) {
    return texts.map(text => String(text)).join('');
  },

  excelFind: function (findText, withinText, startNum = 1) {
    const find = String(findText);
    const within = String(withinText);
    const index = within.indexOf(find, startNum - 1);
    return index === -1 ? "#VALUE!" : index + 1;
  },

  excelSearch: function (findText, withinText, startNum = 1) {
    const find = String(findText).toLowerCase();
    const within = String(withinText).toLowerCase();
    const index = within.indexOf(find, startNum - 1);
    return index === -1 ? "#VALUE!" : index + 1;
  },

  excelReplace: function (oldText, startNum, numChars, newText) {
    const text = String(oldText);
    const start = Number(startNum) - 1;
    const chars = Number(numChars);
    const replacement = String(newText);
    return text.substring(0, start) + replacement + text.substring(start + chars);
  },

  excelSubstitute: function (text, oldText, newText, instanceNum) {
    let str = String(text);
    const old = String(oldText);
    const replacement = String(newText);
    
    if (instanceNum) {
      let count = 0;
      let pos = 0;
      while ((pos = str.indexOf(old, pos)) !== -1) {
        count++;
        if (count === instanceNum) {
          str = str.substring(0, pos) + replacement + str.substring(pos + old.length);
          break;
        }
        pos += old.length;
      }
    } else {
      str = str.split(old).join(replacement);
    }
    return str;
  },

  excelRept: function (text, numTimes) {
    return String(text).repeat(Math.max(0, Number(numTimes)));
  },

  excelReverse: function (text) {
    return String(text).split('').reverse().join('');
  },

  // Logical functions
  excelIf: function (condition, valueIfTrue, valueIfFalse = "") {
    return condition ? valueIfTrue : valueIfFalse;
  },

  excelAnd: function (...conditions) {
    return conditions.every(condition => Boolean(condition));
  },

  excelOr: function (...conditions) {
    return conditions.some(condition => Boolean(condition));
  },

  excelNot: function (condition) {
    return !Boolean(condition);
  },

  excelIsNumber: function (value) {
    return !isNaN(value) && !isNaN(parseFloat(value));
  },

  excelIsText: function (value) {
    return typeof value === "string";
  },

  excelIsBlank: function (value) {
    return value === null || value === undefined || value === "";
  },

  excelIsError: function (value) {
    return value instanceof Error || 
           (typeof value === "string" && value.startsWith("#"));
  },

  excelChoose: function (indexNum, ...values) {
    const index = Math.floor(Number(indexNum));
    if (index >= 1 && index <= values.length) {
      return values[index - 1]; // Convert from 1-based to 0-based index
    }
    return ""; // Return empty string if index is out of bounds
  },

  // Mathematical and trigonometric functions
  excelAbs: function (number) {
    return Math.abs(Number(number));
  },

  excelCeiling: function (number, significance = 1) {
    const num = Number(number);
    const sig = Number(significance);
    if (sig === 0) return 0;
    return Math.ceil(num / sig) * sig;
  },

  excelFloor: function (number, significance = 1) {
    const num = Number(number);
    const sig = Number(significance);
    if (sig === 0) return 0;
    return Math.floor(num / sig) * sig;
  },

  excelCos: function (number) {
    return Math.cos(Number(number));
  },

  excelSin: function (number) {
    return Math.sin(Number(number));
  },

  excelTan: function (number) {
    return Math.tan(Number(number));
  },

  excelExp: function (number) {
    return Math.exp(Number(number));
  },

  excelLn: function (number) {
    return Math.log(Number(number));
  },

  excelLog: function (number, base = 10) {
    return Math.log(Number(number)) / Math.log(Number(base));
  },

  excelLog10: function (number) {
    return Math.log10(Number(number));
  },

  excelPower: function (number, power) {
    return Math.pow(Number(number), Number(power));
  },

  excelSqrt: function (number) {
    return Math.sqrt(Number(number));
  },

  excelInt: function (number) {
    return Math.floor(Number(number));
  },

  excelRound: function (number, numDigits = 0) {
    const multiplier = Math.pow(10, Number(numDigits));
    return Math.round(Number(number) * multiplier) / multiplier;
  },

  excelRoundUp: function (number, numDigits = 0) {
    const multiplier = Math.pow(10, Number(numDigits));
    return Math.ceil(Number(number) * multiplier) / multiplier;
  },

  excelRoundDown: function (number, numDigits = 0) {
    const multiplier = Math.pow(10, Number(numDigits));
    return Math.floor(Number(number) * multiplier) / multiplier;
  },

  excelMod: function (number, divisor) {
    return Number(number) % Number(divisor);
  },

  excelPi: function () {
    return Math.PI;
  },

  excelRadians: function (degrees) {
    return Number(degrees) * (Math.PI / 180);
  },

  excelDegrees: function (radians) {
    return Number(radians) * (180 / Math.PI);
  },

  // Utility functions
  arrayPercentageGrowth: function (oldValues, newValues) {
    if (!Array.isArray(oldValues) || !Array.isArray(newValues)) return [];

    const result = [];
    const minLength = Math.min(oldValues.length, newValues.length);

    for (let i = 0; i < minLength; i++) {
      const oldVal = Number(oldValues[i]) || 0;
      const newVal = Number(newValues[i]) || 0;

      if (oldVal === 0) {
        result.push(newVal === 0 ? 0 : 100); // If old is 0, growth is either 0% or 100%
      } else {
        result.push(((newVal - oldVal) / oldVal) * 100);
      }
    }

    return result;
  },

  // Helper function for criteria matching
  meetsCriteria: function (value, criteria) {
    // Handle boolean/string comparison for true/false values
    if (typeof value === "boolean" && typeof criteria === "string") {
      if (criteria === "true") return value === true;
      if (criteria === "false") return value === false;
    }

    if (typeof criteria === "string") {
      // Handle string patterns like ">100", "=text", etc.
      const match = criteria.match(/^([><=!]+)(.*)$/);
      if (match) {
        const operator = match[1];
        const compareValue = isNaN(match[2]) ? match[2] : Number(match[2]);
        const numValue = isNaN(value) ? value : Number(value);

        switch (operator) {
          case ">":
            return numValue > compareValue;
          case ">=":
            return numValue >= compareValue;
          case "<":
            return numValue < compareValue;
          case "<=":
            return numValue <= compareValue;
          case "=":
            return value == compareValue;
          case "!=":
            return value != compareValue;
          default:
            return value == criteria;
        }
      }
    }
    return value == criteria;
  },

  // Array utility functions
  arrayUnique: function (arr) {
    if (!Array.isArray(arr)) {
      return [];
    }
    return [
      ...new Set(arr.filter((item) => item !== null && item !== undefined)),
    ];
  },

  // Date functions
  getMonth: function (dateString) {
    if (!dateString || typeof dateString !== "string") return 0;

    // Handle various date formats
    let date;
    if (dateString.includes("-")) {
      // Handle YYYY-MM or YYYY-MM-DD format
      const parts = dateString.split("-");
      if (parts.length >= 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        if (!isNaN(year) && !isNaN(month)) {
          date = new Date(year, month - 1, 1); // month - 1 because JS months are 0-based
        } else {
          // Handle partial date like "2019-" - try to extract month from the original string
          // If we have "2019-", we need to get the full date from the original data
          // For now, return 0 as fallback
          return 0;
        }
      }
    } else if (dateString.includes("/")) {
      // Handle MM/DD/YYYY or DD/MM/YYYY format
      date = new Date(dateString);
    } else {
      // Try to parse as-is
      date = new Date(dateString);
    }

    if (!date || isNaN(date.getTime())) {
      return 0;
    }

    const result = date.getMonth() + 1; // JavaScript months are 0-based, Excel is 1-based
    return result;
  },

  // Row and reference functions
  excelRow: function (rowIndex) {
    // Return current row number (1-based)
    // In JavaScript context, this would typically be set by the evaluation context
    if (
      typeof window !== "undefined" &&
      window._currentRowIndex !== undefined
    ) {
      return window._currentRowIndex + 1; // Convert to 1-based
    }
    return rowIndex !== undefined ? rowIndex : 1; // Default if not set
  },

  excelOffset: function (reference, rows, cols, height = 1, width = 1) {
    // Excel OFFSET function - return value offset from reference
    // This is a simplified implementation for JavaScript context
    try {
      if (
        typeof window !== "undefined" &&
        window._currentData &&
        window._currentRowIndex !== undefined
      ) {
        const currentIndex = window._currentRowIndex;
        const targetIndex = currentIndex + parseInt(rows);

        // Check bounds
        if (targetIndex >= 0 && targetIndex < window._currentData.length) {
          // For basic case where cols=0 (same column), find the matching column
          const currentRow = window._currentData[currentIndex];
          const targetRow = window._currentData[targetIndex];

          // Try to find which column has the reference value
          for (const [key, value] of Object.entries(currentRow)) {
            if (value === reference) {
              return targetRow[key] !== undefined ? targetRow[key] : 0;
            }
          }

          // Fallback: if we can't find the matching column, try to use the same property
          // This assumes the reference is from a known column structure
          const keys = Object.keys(currentRow);
          if (keys.length > 1) {
            // Assuming second column like Excel's B column
            const targetValue = targetRow[keys[1]];
            return targetValue !== undefined ? targetValue : 0;
          }
        }

        return 0;
      }

      return 0; // Fallback
    } catch (error) {
      console.warn("OFFSET function error:", error);
      return 0;
    }
  },

  // Lookup functions
  excelChoose: function (index, ...choices) {
    if (index < 1 || index > choices.length) return null;
    return choices[index - 1]; // Excel CHOOSE is 1-based
  },

  // Additional lookup and reference functions
  excelVlookup: function (lookupValue, tableArray, colIndexNum, rangeLookup = false) {
    if (!Array.isArray(tableArray)) return "#N/A";
    
    for (let i = 0; i < tableArray.length; i++) {
      const row = tableArray[i];
      if (!Array.isArray(row) || row.length < colIndexNum) continue;
      
      const cellValue = row[0];
      const match = rangeLookup 
        ? (cellValue <= lookupValue)
        : (cellValue === lookupValue);
        
      if (match) {
        return row[colIndexNum - 1];
      }
    }
    
    return "#N/A";
  },

  excelHlookup: function (lookupValue, tableArray, rowIndexNum, rangeLookup = false) {
    if (!Array.isArray(tableArray) || tableArray.length === 0) return "#N/A";
    
    const firstRow = tableArray[0];
    if (!Array.isArray(firstRow)) return "#N/A";
    
    for (let j = 0; j < firstRow.length; j++) {
      const cellValue = firstRow[j];
      const match = rangeLookup 
        ? (cellValue <= lookupValue)
        : (cellValue === lookupValue);
        
      if (match && rowIndexNum <= tableArray.length) {
        return tableArray[rowIndexNum - 1][j];
      }
    }
    
    return "#N/A";
  },

  excelMatch: function (lookupValue, lookupArray, matchType = 1) {
    if (!Array.isArray(lookupArray)) {
      return "#N/A";
    }
    
    // For exact match (mode 0), check if we're looking for a number and add tolerance
    if (matchType === 0 && typeof lookupValue === 'number') {
      // First try exact match
      for (let i = 0; i < lookupArray.length; i++) {
        const cellValue = Number(lookupArray[i]);
        if (cellValue === lookupValue) {
          return i + 1;
        }
      }
      
      // If no exact match, try with small tolerance for floating point errors
      const tolerance = 1e-10;
      for (let i = 0; i < lookupArray.length; i++) {
        const cellValue = Number(lookupArray[i]);
        if (Math.abs(cellValue - lookupValue) < tolerance) {
          return i + 1;
        }
      }
    }
    
    for (let i = 0; i < lookupArray.length; i++) {
      const cellValue = lookupArray[i];
      
      switch (matchType) {
        case 1: // Less than or equal
          if (cellValue <= lookupValue) {
            if (i === lookupArray.length - 1 || lookupArray[i + 1] > lookupValue) {
              return i + 1;
            }
          }
          break;
        case 0: // Exact match
          if (cellValue === lookupValue) {
            return i + 1;
          }
          break;
        case -1: // Greater than or equal
          if (cellValue >= lookupValue) {
            if (i === lookupArray.length - 1 || lookupArray[i + 1] < lookupValue) {
              return i + 1;
            }
          }
          break;
      }
    }
    
    return "#N/A";
  },

  // Statistical functions
  excelStdev: function (range) {
    if (!Array.isArray(range)) return 0;
    const numbers = range.filter(x => !isNaN(x) && x !== null && x !== "").map(Number);
    if (numbers.length <= 1) return 0;
    
    const mean = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
    const variance = numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (numbers.length - 1);
    return Math.sqrt(variance);
  },

  excelVar: function (range) {
    if (!Array.isArray(range)) return 0;
    const numbers = range.filter(x => !isNaN(x) && x !== null && x !== "").map(Number);
    if (numbers.length <= 1) return 0;
    
    const mean = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
    return numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (numbers.length - 1);
  },

  excelMedian: function (range) {
    if (!Array.isArray(range)) return 0;
    const numbers = range.filter(x => !isNaN(x) && x !== null && x !== "").map(Number).sort((a, b) => a - b);
    if (numbers.length === 0) return 0;
    
    const mid = Math.floor(numbers.length / 2);
    return numbers.length % 2 === 0 
      ? (numbers[mid - 1] + numbers[mid]) / 2 
      : numbers[mid];
  },

  excelMode: function (range) {
    if (!Array.isArray(range)) return "#N/A";
    const numbers = range.filter(x => !isNaN(x) && x !== null && x !== "").map(Number);
    if (numbers.length === 0) return "#N/A";
    
    const frequency = {};
    let maxFreq = 0;
    let mode = null;
    
    numbers.forEach(num => {
      frequency[num] = (frequency[num] || 0) + 1;
      if (frequency[num] > maxFreq) {
        maxFreq = frequency[num];
        mode = num;
      }
    });
    
    return maxFreq > 1 ? mode : "#N/A";
  },

  // Financial functions
  excelPmt: function (rate, nper, pv, fv = 0, type = 0) {
    const r = Number(rate);
    const n = Number(nper);
    const present = Number(pv);
    const future = Number(fv);
    
    if (r === 0) {
      return -(present + future) / n;
    }
    
    const pvif = Math.pow(1 + r, n);
    const pmt = -((present * pvif + future) / ((pvif - 1) / r));
    
    return type === 1 ? pmt / (1 + r) : pmt;
  },

  excelPv: function (rate, nper, pmt, fv = 0, type = 0) {
    const r = Number(rate);
    const n = Number(nper);
    const payment = Number(pmt);
    const future = Number(fv);
    
    if (r === 0) {
      return -(payment * n + future);
    }
    
    const pvif = Math.pow(1 + r, n);
    const pv = -(payment * (pvif - 1) / r + future) / pvif;
    
    return type === 1 ? pv * (1 + r) : pv;
  },

  excelFv: function (rate, nper, pmt, pv = 0, type = 0) {
    const r = Number(rate);
    const n = Number(nper);
    const payment = Number(pmt);
    const present = Number(pv);
    
    if (r === 0) {
      return -(present + payment * n);
    }
    
    const pvif = Math.pow(1 + r, n);
    const fv = -(present * pvif + payment * ((pvif - 1) / r));
    
    return type === 1 ? fv / (1 + r) : fv;
  },

  excelNpv: function (rate, ...values) {
    const r = Number(rate);
    return values.reduce((npv, value, index) => {
      return npv + Number(value) / Math.pow(1 + r, index + 1);
    }, 0);
  },

  excelIrr: function (values, guess = 0.1) {
    const vals = values.map(Number);
    let rate = Number(guess);
    
    for (let i = 0; i < 100; i++) {
      let npv = 0;
      let dnpv = 0;
      
      for (let j = 0; j < vals.length; j++) {
        npv += vals[j] / Math.pow(1 + rate, j);
        dnpv -= j * vals[j] / Math.pow(1 + rate, j + 1);
      }
      
      if (Math.abs(npv) < 0.000001) return rate;
      
      const newRate = rate - npv / dnpv;
      if (Math.abs(newRate - rate) < 0.000001) return newRate;
      
      rate = newRate;
    }
    
    return "#NUM!";
  },

  // Advanced conditional functions
  excelMaxifs: function (maxRange, ...criteriaArgs) {
    if (!Array.isArray(maxRange)) return "#VALUE!";
    
    // Handle special case where criteriaRange === criteriaValue (same array reference)
    // OR when they have the same content (which happens with function calls)
    if (criteriaArgs.length === 2 && 
        Array.isArray(criteriaArgs[0]) && 
        Array.isArray(criteriaArgs[1])) {
      
      // Check if arrays are the same reference or have identical content
      const sameReference = criteriaArgs[0] === criteriaArgs[1];
      const sameContent = !sameReference && 
        criteriaArgs[0].length === criteriaArgs[1].length &&
        criteriaArgs[0].every((val, index) => val === criteriaArgs[1][index]);
      
      if (sameReference || sameContent) {
        // This means we're looking for max where each element equals itself (always true)
        // So this should just return the maximum value in maxRange
        const validValues = maxRange.map(Number).filter(x => !isNaN(x));
        return validValues.length > 0 ? Math.max(...validValues) : 0;
      }
    }
    
    // Parse criteria arguments (range1, criteria1, range2, criteria2, ...)
    const criteriaRanges = [];
    const criteriaValues = [];
    
    for (let i = 0; i < criteriaArgs.length; i += 2) {
      if (i + 1 < criteriaArgs.length) {
        criteriaRanges.push(criteriaArgs[i]);
        criteriaValues.push(criteriaArgs[i + 1]);
      }
    }
    
    let maxValue = -Infinity;
    let hasValidValue = false;
    
    for (let i = 0; i < maxRange.length; i++) {
      let meetsAllCriteria = true;
      
      // Check all criteria
      for (let j = 0; j < criteriaRanges.length; j++) {
        const criteriaRange = criteriaRanges[j];
        const criteria = criteriaValues[j];
        
        if (!Array.isArray(criteriaRange) || i >= criteriaRange.length) {
          meetsAllCriteria = false;
          break;
        }
        
        // Fix: If criteria is an array, compare with the corresponding element
        const criteriaValue = Array.isArray(criteria) ? criteria[i] : criteria;
        if (!ExcelHelpers.meetsCriteria(criteriaRange[i], criteriaValue)) {
          meetsAllCriteria = false;
          break;
        }
      }
      
      if (meetsAllCriteria) {
        const value = Number(maxRange[i]);
        if (!isNaN(value)) {
          maxValue = Math.max(maxValue, value);
          hasValidValue = true;
        }
      }
    }
    
    return hasValidValue ? maxValue : 0;
  },

  excelMinifs: function (minRange, ...criteriaArgs) {
    if (!Array.isArray(minRange)) return "#VALUE!";
    
    // Parse criteria arguments (range1, criteria1, range2, criteria2, ...)
    const criteriaRanges = [];
    const criteriaValues = [];
    
    for (let i = 0; i < criteriaArgs.length; i += 2) {
      if (i + 1 < criteriaArgs.length) {
        criteriaRanges.push(criteriaArgs[i]);
        criteriaValues.push(criteriaArgs[i + 1]);
      }
    }
    
    let minValue = Infinity;
    let hasValidValue = false;
    
    for (let i = 0; i < minRange.length; i++) {
      let meetsAllCriteria = true;
      
      // Check all criteria
      for (let j = 0; j < criteriaRanges.length; j++) {
        const criteriaRange = criteriaRanges[j];
        const criteria = criteriaValues[j];
        
        if (!Array.isArray(criteriaRange) || i >= criteriaRange.length) {
          meetsAllCriteria = false;
          break;
        }
        
        if (!ExcelHelpers.meetsCriteria(criteriaRange[i], criteria)) {
          meetsAllCriteria = false;
          break;
        }
      }
      
      if (meetsAllCriteria) {
        const value = Number(minRange[i]);
        if (!isNaN(value)) {
          minValue = Math.min(minValue, value);
          hasValidValue = true;
        }
      }
    }
    
    return hasValidValue ? minValue : 0;
  },

  excelSumifs: function (sumRange, ...criteriaArgs) {
    if (!Array.isArray(sumRange)) return 0;
    
    // Parse criteria arguments (range1, criteria1, range2, criteria2, ...)
    const criteriaRanges = [];
    const criteriaValues = [];
    
    for (let i = 0; i < criteriaArgs.length; i += 2) {
      if (i + 1 < criteriaArgs.length) {
        criteriaRanges.push(criteriaArgs[i]);
        criteriaValues.push(criteriaArgs[i + 1]);
      }
    }
    
    let sum = 0;
    
    for (let i = 0; i < sumRange.length; i++) {
      let meetsAllCriteria = true;
      
      // Check all criteria
      for (let j = 0; j < criteriaRanges.length; j++) {
        const criteriaRange = criteriaRanges[j];
        const criteria = criteriaValues[j];
        
        if (!Array.isArray(criteriaRange) || i >= criteriaRange.length) {
          meetsAllCriteria = false;
          break;
        }
        
        if (!ExcelHelpers.meetsCriteria(criteriaRange[i], criteria)) {
          meetsAllCriteria = false;
          break;
        }
      }
      
      if (meetsAllCriteria) {
        const value = Number(sumRange[i]);
        if (!isNaN(value)) {
          sum += value;
        }
      }
    }
    
    return sum;
  },

  excelAverageifs: function (averageRange, ...criteriaArgs) {
    if (!Array.isArray(averageRange)) return 0;
    
    // Parse criteria arguments (range1, criteria1, range2, criteria2, ...)
    const criteriaRanges = [];
    const criteriaValues = [];
    
    for (let i = 0; i < criteriaArgs.length; i += 2) {
      if (i + 1 < criteriaArgs.length) {
        criteriaRanges.push(criteriaArgs[i]);
        criteriaValues.push(criteriaArgs[i + 1]);
      }
    }
    
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < averageRange.length; i++) {
      let meetsAllCriteria = true;
      
      // Check all criteria
      for (let j = 0; j < criteriaRanges.length; j++) {
        const criteriaRange = criteriaRanges[j];
        const criteria = criteriaValues[j];
        
        if (!Array.isArray(criteriaRange) || i >= criteriaRange.length) {
          meetsAllCriteria = false;
          break;
        }
        
        if (!ExcelHelpers.meetsCriteria(criteriaRange[i], criteria)) {
          meetsAllCriteria = false;
          break;
        }
      }
      
      if (meetsAllCriteria) {
        const value = Number(averageRange[i]);
        if (!isNaN(value)) {
          sum += value;
          count++;
        }
      }
    }
    
    return count > 0 ? sum / count : 0;
  },

  // Advanced logical functions
  excelIfs: function (...args) {
    // IFS(condition1, value1, condition2, value2, ..., [else_value])
    for (let i = 0; i < args.length - 1; i += 2) {
      if (args[i]) {
        return args[i + 1];
      }
    }
    // If no conditions are met and there's an else value
    if (args.length % 2 === 1) {
      return args[args.length - 1];
    }
    return "#N/A";
  },

  // Modern lookup functions
  excelXlookup: function (lookupValue, lookupArray, returnArray, ifNotFound = "#N/A", matchMode = 0, searchMode = 1) {
    if (!Array.isArray(lookupArray) || !Array.isArray(returnArray)) return ifNotFound;
    
    const findIndex = (exact = true) => {
      for (let i = 0; i < lookupArray.length; i++) {
        if (exact && lookupArray[i] === lookupValue) return i;
        if (!exact && String(lookupArray[i]).toLowerCase().includes(String(lookupValue).toLowerCase())) return i;
      }
      return -1;
    };
    
    let index = -1;
    switch (matchMode) {
      case 0: // Exact match
        index = findIndex(true);
        break;
      case 1: // Exact match or next smallest
        for (let i = lookupArray.length - 1; i >= 0; i--) {
          if (lookupArray[i] <= lookupValue) {
            index = i;
            break;
          }
        }
        break;
      case -1: // Exact match or next largest
        for (let i = 0; i < lookupArray.length; i++) {
          if (lookupArray[i] >= lookupValue) {
            index = i;
            break;
          }
        }
        break;
      case 2: // Wildcard match
        index = findIndex(false);
        break;
    }
    
    return index !== -1 && index < returnArray.length ? returnArray[index] : ifNotFound;
  },

  excelXmatch: function (lookupValue, lookupArray, matchMode = 0, searchMode = 1) {
    if (!Array.isArray(lookupArray)) return "#N/A";
    
    const findIndex = (exact = true) => {
      for (let i = 0; i < lookupArray.length; i++) {
        if (exact && lookupArray[i] === lookupValue) return i + 1; // 1-based
        if (!exact && String(lookupArray[i]).toLowerCase().includes(String(lookupValue).toLowerCase())) return i + 1;
      }
      return "#N/A";
    };
    
    switch (matchMode) {
      case 0: // Exact match
        return findIndex(true);
      case 1: // Exact match or next smallest
        for (let i = lookupArray.length - 1; i >= 0; i--) {
          if (lookupArray[i] <= lookupValue) return i + 1;
        }
        return "#N/A";
      case -1: // Exact match or next largest
        for (let i = 0; i < lookupArray.length; i++) {
          if (lookupArray[i] >= lookupValue) return i + 1;
        }
        return "#N/A";
      case 2: // Wildcard match
        return findIndex(false);
      default:
        return "#N/A";
    }
  },

  // Advanced text functions
  excelTextjoin: function (delimiter, ignoreEmpty, ...textArray) {
    const texts = textArray.flat();
    const filtered = ignoreEmpty ? 
      texts.filter(text => text !== null && text !== undefined && text !== "") :
      texts;
    return filtered.map(text => String(text)).join(String(delimiter));
  },

  excelConcat: function (...values) {
    return values.flat().map(val => String(val)).join('');
  },

  excelExact: function (text1, text2) {
    return String(text1) === String(text2);
  },

  excelText: function (value, formatText) {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    
    // Basic number formatting
    if (formatText.includes('%')) {
      return (num * 100).toFixed(2) + '%';
    }
    if (formatText.includes('$')) {
      return '$' + num.toFixed(2);
    }
    if (formatText.includes('#,##0')) {
      return num.toLocaleString();
    }
    if (formatText.includes('0.00')) {
      return num.toFixed(2);
    }
    return String(num);
  },

  // Statistical ranking functions
  excelRank: function (number, array, order = 0) {
    if (!Array.isArray(array)) return "#N/A";
    
    const numbers = array.filter(x => !isNaN(x)).map(Number);
    const targetNum = Number(number);
    
    if (order === 0) { // Descending
      numbers.sort((a, b) => b - a);
    } else { // Ascending
      numbers.sort((a, b) => a - b);
    }
    
    const rank = numbers.indexOf(targetNum) + 1;
    return rank > 0 ? rank : "#N/A";
  },

  excelLarge: function (array, k) {
    if (!Array.isArray(array)) return "#NUM!";
    
    const numbers = array.filter(x => !isNaN(x)).map(Number).sort((a, b) => b - a);
    const index = Number(k) - 1;
    
    return index >= 0 && index < numbers.length ? numbers[index] : "#NUM!";
  },

  excelSmall: function (array, k) {
    if (!Array.isArray(array)) return "#NUM!";
    
    const numbers = array.filter(x => !isNaN(x)).map(Number).sort((a, b) => a - b);
    const index = Number(k) - 1;
    
    return index >= 0 && index < numbers.length ? numbers[index] : "#NUM!";
  },

  // Math functions
  excelTrunc: function (number, numDigits = 0) {
    const num = Number(number);
    const multiplier = Math.pow(10, Number(numDigits));
    return Math.trunc(num * multiplier) / multiplier;
  },

  excelMround: function (number, multiple) {
    const num = Number(number);
    const mult = Number(multiple);
    if (mult === 0) return 0;
    return Math.round(num / mult) * mult;
  },

  // Date functions
  excelEdate: function (startDate, months) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + Number(months));
    return date;
  },

  excelEomonth: function (startDate, months) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + Number(months) + 1);
    date.setDate(0); // Last day of previous month
    return date;
  },

  // Dynamic array functions
  excelFilter: function (array, criteria, ifEmpty = "#N/A") {
    if (!Array.isArray(array) || !Array.isArray(criteria)) return [ifEmpty];
    
    const filtered = [];
    for (let i = 0; i < Math.min(array.length, criteria.length); i++) {
      if (criteria[i]) {
        filtered.push(array[i]);
      }
    }
    
    return filtered.length > 0 ? filtered : [ifEmpty];
  },

  excelSort: function (array, sortIndex = 1, sortOrder = 1, byCol = false) {
    if (!Array.isArray(array)) return array;
    
    const sorted = [...array];
    
    if (byCol) {
      // Sort by column - complex 2D array sorting
      return sorted.sort((a, b) => {
        const aVal = Array.isArray(a) ? a[sortIndex - 1] : a;
        const bVal = Array.isArray(b) ? b[sortIndex - 1] : b;
        return sortOrder === 1 ? 
          (aVal > bVal ? 1 : -1) : 
          (aVal < bVal ? 1 : -1);
      });
    } else {
      // Simple array sort
      return sorted.sort((a, b) => {
        return sortOrder === 1 ? 
          (a > b ? 1 : -1) : 
          (a < b ? 1 : -1);
      });
    }
  },

  excelSequence: function (rows, columns = 1, start = 1, step = 1) {
    const result = [];
    let current = Number(start);
    const stepVal = Number(step);
    const rowCount = Number(rows);
    const colCount = Number(columns);
    
    for (let r = 0; r < rowCount; r++) {
      if (colCount === 1) {
        result.push(current);
        current += stepVal;
      } else {
        const row = [];
        for (let c = 0; c < colCount; c++) {
          row.push(current);
          current += stepVal;
        }
        result.push(row);
      }
    }
    
    return result;
  },

  // Aggregate function
  excelAggregate: function (functionNum, options, array, ...args) {
    if (!Array.isArray(array)) return "#VALUE!";
    
    // Filter array based on options (simplified)
    let filteredArray = [...array];
    if (options & 1) { // Ignore nested SUBTOTAL and AGGREGATE functions
      // This would be complex to implement fully
    }
    if (options & 2) { // Ignore error values
      filteredArray = filteredArray.filter(x => !ExcelHelpers.excelIsError(x));
    }
    if (options & 4) { // Ignore hidden rows (not applicable in our context)
      // Skip
    }
    
    // Apply function based on functionNum
    switch (functionNum) {
      case 1: return ExcelHelpers.excelAvg(filteredArray);
      case 2: return ExcelHelpers.excelCount(filteredArray);
      case 3: return ExcelHelpers.excelCountA(filteredArray);
      case 4: return ExcelHelpers.excelMax(filteredArray);
      case 5: return ExcelHelpers.excelMin(filteredArray);
      case 6: // PRODUCT - not implemented
        return filteredArray.reduce((prod, val) => prod * Number(val), 1);
      case 7: return ExcelHelpers.excelStdev(filteredArray);
      case 9: return ExcelHelpers.excelSum(filteredArray);
      case 10: return ExcelHelpers.excelVar(filteredArray);
      case 11: return ExcelHelpers.excelMedian(filteredArray);
      case 12: return ExcelHelpers.excelMode(filteredArray);
      case 13: // LARGE
        return ExcelHelpers.excelLarge(filteredArray, args[0] || 1);
      case 14: // SMALL
        return ExcelHelpers.excelSmall(filteredArray, args[0] || 1);
      default:
        return "#VALUE!";
    }
  },
};

// Make all functions available globally
Object.assign(window, ExcelHelpers);

// Also expose specific functions with Excel naming convention
window.ROW = ExcelHelpers.excelRow;
window.OFFSET = ExcelHelpers.excelOffset;

// Expose all Excel functions with their standard names
window.SUM = ExcelHelpers.excelSum;
window.AVERAGE = ExcelHelpers.excelAvg;
window.COUNT = ExcelHelpers.excelCount;
window.COUNTA = ExcelHelpers.excelCountA;
window.MAX = ExcelHelpers.excelMax;
window.MIN = ExcelHelpers.excelMin;
window.IF = ExcelHelpers.excelIf;
window.AND = ExcelHelpers.excelAnd;
window.OR = ExcelHelpers.excelOr;
window.NOT = ExcelHelpers.excelNot;
window.ABS = ExcelHelpers.excelAbs;
window.CEILING = ExcelHelpers.excelCeiling;
window.FLOOR = ExcelHelpers.excelFloor;
window.COS = ExcelHelpers.excelCos;
window.SIN = ExcelHelpers.excelSin;
window.TAN = ExcelHelpers.excelTan;
window.EXP = ExcelHelpers.excelExp;
window.LN = ExcelHelpers.excelLn;
window.LOG = ExcelHelpers.excelLog;
window.LOG10 = ExcelHelpers.excelLog10;
window.POWER = ExcelHelpers.excelPower;
window.SQRT = ExcelHelpers.excelSqrt;
window.INT = ExcelHelpers.excelInt;
window.ROUND = ExcelHelpers.excelRound;
window.ROUNDUP = ExcelHelpers.excelRoundUp;
window.ROUNDDOWN = ExcelHelpers.excelRoundDown;
window.MOD = ExcelHelpers.excelMod;
window.PI = ExcelHelpers.excelPi;
window.RADIANS = ExcelHelpers.excelRadians;
window.DEGREES = ExcelHelpers.excelDegrees;
window.LEFT = ExcelHelpers.excelLeft;
window.RIGHT = ExcelHelpers.excelRight;
window.MID = ExcelHelpers.excelMid;
window.LEN = ExcelHelpers.excelLen;
window.UPPER = ExcelHelpers.excelUpper;
window.LOWER = ExcelHelpers.excelLower;
window.PROPER = ExcelHelpers.excelProper;
window.TRIM = ExcelHelpers.excelTrim;
window.CLEAN = ExcelHelpers.excelClean;
window.CONCATENATE = ExcelHelpers.excelConcatenate;
window.FIND = ExcelHelpers.excelFind;
window.SEARCH = ExcelHelpers.excelSearch;
window.REPLACE = ExcelHelpers.excelReplace;
window.SUBSTITUTE = ExcelHelpers.excelSubstitute;
window.REPT = ExcelHelpers.excelRept;
window.REVERSE = ExcelHelpers.excelReverse;
window.YEAR = ExcelHelpers.getYear;
window.MONTH = ExcelHelpers.getMonth;
window.DAY = ExcelHelpers.getDay;
window.DATE = ExcelHelpers.excelDate;
window.TIME = ExcelHelpers.excelTime;
window.TODAY = () => new Date();
window.NOW = () => new Date();
window.DATEVALUE = ExcelHelpers.excelDateValue;
window.TIMEVALUE = ExcelHelpers.excelTimeValue;
window.WEEKDAY = ExcelHelpers.excelWeekday;
window.WORKDAY = ExcelHelpers.excelWorkday;
window.NETWORKDAYS = ExcelHelpers.excelNetworkDays;
window.DATEDIF = ExcelHelpers.excelDateDif;
window.ISNUMBER = ExcelHelpers.excelIsNumber;
window.ISTEXT = ExcelHelpers.excelIsText;
window.ISBLANK = ExcelHelpers.excelIsBlank;
window.ISERROR = ExcelHelpers.excelIsError;
window.CHOOSE = ExcelHelpers.excelChoose;
window.VLOOKUP = ExcelHelpers.excelVlookup;
window.HLOOKUP = ExcelHelpers.excelHlookup;
window.MATCH = ExcelHelpers.excelMatch;
window.INDEX = ExcelHelpers.arrayIndex;
window.STDEV = ExcelHelpers.excelStdev;
window.VAR = ExcelHelpers.excelVar;
window.MEDIAN = ExcelHelpers.excelMedian;
window.MODE = ExcelHelpers.excelMode;
window.PMT = ExcelHelpers.excelPmt;
window.PV = ExcelHelpers.excelPv;
window.FV = ExcelHelpers.excelFv;
window.NPV = ExcelHelpers.excelNpv;
window.IRR = ExcelHelpers.excelIrr;
window.MAXIFS = ExcelHelpers.excelMaxifs;
window.MINIFS = ExcelHelpers.excelMinifs;
window.SUMIFS = ExcelHelpers.excelSumifs;
window.AVERAGEIFS = ExcelHelpers.excelAverageifs;
window.IFS = ExcelHelpers.excelIfs;
window.XLOOKUP = ExcelHelpers.excelXlookup;
window.XMATCH = ExcelHelpers.excelXmatch;
window.TEXTJOIN = ExcelHelpers.excelTextjoin;
window.CONCAT = ExcelHelpers.excelConcat;
window.EXACT = ExcelHelpers.excelExact;
window.TEXT = ExcelHelpers.excelText;
window.RANK = ExcelHelpers.excelRank;
window.LARGE = ExcelHelpers.excelLarge;
window.SMALL = ExcelHelpers.excelSmall;
window.TRUNC = ExcelHelpers.excelTrunc;
window.MROUND = ExcelHelpers.excelMround;
window.EDATE = ExcelHelpers.excelEdate;
window.EOMONTH = ExcelHelpers.excelEomonth;
window.FILTER = ExcelHelpers.excelFilter;
window.SORT = ExcelHelpers.excelSort;
window.SEQUENCE = ExcelHelpers.excelSequence;
window.AGGREGATE = ExcelHelpers.excelAggregate;

// Also expose the ExcelHelpers object itself for internal function calls
window.ExcelHelpers = ExcelHelpers;

// Create a mapped version with standard Excel function names for easy consumption
window.ExcelHelpers.getFunctionMappings = function() {
  return {
    // Math functions
    ABS: this.excelAbs,
    CEILING: this.excelCeiling,
    FLOOR: this.excelFloor,
    COS: this.excelCos,
    SIN: this.excelSin,
    TAN: this.excelTan,
    EXP: this.excelExp,
    LN: this.excelLn,
    LOG: this.excelLog,
    LOG10: this.excelLog10,
    POWER: this.excelPower,
    SQRT: this.excelSqrt,
    INT: this.excelInt,
    ROUND: this.excelRound,
    ROUNDUP: this.excelRoundUp,
    ROUNDDOWN: this.excelRoundDown,
    MOD: this.excelMod,
    PI: this.excelPi,
    RADIANS: this.excelRadians,
    DEGREES: this.excelDegrees,
    TRUNC: this.excelTrunc,
    MROUND: this.excelMround,
    
    // Statistical functions
    SUM: this.excelSum,
    AVERAGE: this.excelAvg,
    AVG: this.excelAvg, // Alias for AVERAGE
    COUNT: this.excelCount,
    COUNTA: this.excelCountA,
    MAX: this.excelMax,
    MIN: this.excelMin,
    STDEV: this.excelStdev,
    VAR: this.excelVar,
    MEDIAN: this.excelMedian,
    MODE: this.excelMode,
    RANK: this.excelRank,
    LARGE: this.excelLarge,
    SMALL: this.excelSmall,
    
    // Logical functions
    IF: this.excelIf,
    IFS: this.excelIfs,
    AND: this.excelAnd,
    OR: this.excelOr,
    NOT: this.excelNot,
    ISNUMBER: this.excelIsNumber,
    ISTEXT: this.excelIsText,
    ISBLANK: this.excelIsBlank,
    ISERROR: this.excelIsError,
    
    // Text functions
    LEFT: this.excelLeft,
    RIGHT: this.excelRight,
    MID: this.excelMid,
    LEN: this.excelLen,
    LENGTH: this.excelLen, // Alias for LEN
    UPPER: this.excelUpper,
    LOWER: this.excelLower,
    PROPER: this.excelProper,
    TRIM: this.excelTrim,
    CLEAN: this.excelClean,
    CONCATENATE: this.excelConcatenate,
    CONCAT: this.excelConcat,
    TEXTJOIN: this.excelTextjoin,
    EXACT: this.excelExact,
    TEXT: this.excelText,
    FIND: this.excelFind,
    SEARCH: this.excelSearch,
    REPLACE: this.excelReplace,
    SUBSTITUTE: this.excelSubstitute,
    REPT: this.excelRept,
    REPEAT: this.excelRept, // Alias for REPT
    REVERSE: this.excelReverse,
    
    // Date and time functions
    YEAR: this.getYear,
    MONTH: this.getMonth,
    DAY: this.getDay,
    DATE: this.excelDate,
    TIME: this.excelTime,
    TODAY: () => new Date(),
    NOW: () => new Date(),
    DATEVALUE: this.excelDateValue,
    TIMEVALUE: this.excelTimeValue,
    WEEKDAY: this.excelWeekday,
    WORKDAY: this.excelWorkday,
    NETWORKDAYS: this.excelNetworkDays,
    DATEDIF: this.excelDateDif,
    EDATE: this.excelEdate,
    EOMONTH: this.excelEomonth,
    
    // Lookup and reference functions
    CHOOSE: this.excelChoose,
    VLOOKUP: this.excelVlookup,
    XLOOKUP: this.excelXlookup,
    HLOOKUP: this.excelHlookup,
    MATCH: this.excelMatch,
    XMATCH: this.excelXmatch,
    INDEX: this.arrayIndex,
    ROW: this.excelRow,
    OFFSET: this.excelOffset,
    
    // Conditional functions
    COUNTIF: this.arrayCountIf,
    COUNTIFS: this.arrayCountIfs,
    SUMIF: this.arraySumIf,
    SUMIFS: this.excelSumifs,
    AVERAGEIF: this.arrayAverageIf,
    AVERAGEIFS: this.excelAverageifs,
    MAXIFS: this.excelMaxifs,
    MINIFS: this.excelMinifs,
    
    // Dynamic array functions
    FILTER: this.excelFilter,
    SORT: this.excelSort,
    SEQUENCE: this.excelSequence,
    UNIQUE: this.arrayUnique,
    
    // Financial functions
    PMT: this.excelPmt,
    PV: this.excelPv,
    FV: this.excelFv,
    NPV: this.excelNpv,
    IRR: this.excelIrr,
    
    // Advanced functions
    AGGREGATE: this.excelAggregate,
    
    // Legacy and compatibility functions
    VALUE: parseFloat,
    HOUR: (dateValue) => new Date(dateValue).getHours()
  };
};
