/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  BubbleController,
  ScatterController,
  RadarController,
} from "chart.js";
import { BarChart3, TrendingUp, ChevronDown } from "lucide-react";
import Papa from "papaparse";
import { getFileUrl } from "@/lib/utils";
import { getApiHeaders } from "@/lib/api/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart, LineChart, PieChart } from "./charts";
import type { ChartData, Transformation } from "./charts";
import { ExcelHelpers } from "@/lib/excel-helpers";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  BubbleController,
  ScatterController,
  RadarController
);

interface ChartRendererProps {
  pxmlContent: string;
  conversationId?: string;
}


const ChartRenderer: React.FC<ChartRendererProps> = React.memo(({
  pxmlContent,
  conversationId,
}) => {
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartTypeOverride, setChartTypeOverride] = useState<string | null>(
    null
  );
  const [showAllData, setShowAllData] = useState(false);
  const [shouldShowPieDropdown, setShouldShowPieDropdown] = useState(false);
  const [shouldShowLineDropdown, setShouldShowLineDropdown] = useState(false);
  const [shouldShowBarDropdown, setShouldShowBarDropdown] = useState(false);
  const [barChartLimit, setBarChartLimit] = useState<5 | 10 | 'all'>(10);

  // Set up Excel helpers in global context for formula evaluation (only once)
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).__excelHelpersInitialized) {
      // Make ExcelHelpers available
      (window as any).ExcelHelpers = ExcelHelpers;
      
      // Create a comprehensive mapping of Excel function names to their implementations
      const excelFunctionMap = {
        // Core functions
        IF: ExcelHelpers.excelIf,
        INT: ExcelHelpers.excelInt,
        SUM: ExcelHelpers.excelSum,
        AVERAGE: ExcelHelpers.excelAvg,
        AVG: ExcelHelpers.excelAvg, // Alias
        // Map COUNT to COUNTA semantics (non-empty)
        COUNT: ExcelHelpers.excelCountA,
        COUNTA: ExcelHelpers.excelCountA,
        MAX: ExcelHelpers.excelMax,
        MIN: ExcelHelpers.excelMin,
        
        // Logical functions
        AND: ExcelHelpers.excelAnd,
        OR: ExcelHelpers.excelOr,
        NOT: ExcelHelpers.excelNot,
        IFS: ExcelHelpers.excelIfs,
        
        // Math functions
        ABS: ExcelHelpers.excelAbs,
        CEILING: ExcelHelpers.excelCeiling,
        FLOOR: ExcelHelpers.excelFloor,
        ROUND: ExcelHelpers.excelRound,
        ROUNDUP: ExcelHelpers.excelRoundUp,
        ROUNDDOWN: ExcelHelpers.excelRoundDown,
        MOD: ExcelHelpers.excelMod,
        POWER: ExcelHelpers.excelPower,
        SQRT: ExcelHelpers.excelSqrt,
        
        // Text functions
        LEFT: ExcelHelpers.excelLeft,
        RIGHT: ExcelHelpers.excelRight,
        MID: ExcelHelpers.excelMid,
        LEN: ExcelHelpers.excelLen,
        SPLIT: ExcelHelpers.excelSplit,
        UPPER: ExcelHelpers.excelUpper,
        LOWER: ExcelHelpers.excelLower,
        TRIM: ExcelHelpers.excelTrim,
        CONCATENATE: ExcelHelpers.excelConcatenate,
        CONCAT: ExcelHelpers.excelConcat,
        
        // Date functions
        YEAR: ExcelHelpers.getYear,
        MONTH: ExcelHelpers.getMonth,
        DAY: ExcelHelpers.getDay,
        DATE: ExcelHelpers.excelDate,
        TODAY: () => new Date(),
        NOW: () => new Date(),
        
        // Lookup functions
        VLOOKUP: ExcelHelpers.excelVlookup,
        HLOOKUP: ExcelHelpers.excelHlookup,
        INDEX: ExcelHelpers.arrayIndex,
        MATCH: ExcelHelpers.excelMatch,
        
        // Statistical functions
        STDEV: ExcelHelpers.excelStdev,
        VAR: ExcelHelpers.excelVar,
        MEDIAN: ExcelHelpers.excelMedian,
        
        // Conditional functions
        SUMIF: ExcelHelpers.arraySumIf,
        SUMIFS: ExcelHelpers.excelSumifs,
        COUNTIF: ExcelHelpers.arrayCountIf,
        COUNTIFS: ExcelHelpers.arrayCountIfs,
        AVERAGEIF: ExcelHelpers.arrayAverageIf,
        AVERAGEIFS: ExcelHelpers.excelAverageifs,
        
        // Information functions
        ISNUMBER: ExcelHelpers.excelIsNumber,
        ISTEXT: ExcelHelpers.excelIsText,
        ISBLANK: ExcelHelpers.excelIsBlank,
        ISERROR: ExcelHelpers.excelIsError,
        
        // Reference functions
        ROW: ExcelHelpers.excelRow,
        OFFSET: ExcelHelpers.excelOffset,
        
        // Financial functions
        PMT: ExcelHelpers.excelPmt,
        PV: ExcelHelpers.excelPv,
        FV: ExcelHelpers.excelFv,
        
        // Additional functions
        CHOOSE: ExcelHelpers.excelChoose,
        RANK: ExcelHelpers.excelRank,
        LARGE: ExcelHelpers.excelLarge,
        SMALL: ExcelHelpers.excelSmall,
        TEXT: ExcelHelpers.excelText,
        VALUE: parseFloat,
      };
      
      // Make all Excel functions available globally
      Object.entries(excelFunctionMap).forEach(([name, func]) => {
        (window as any)[name] = func;
      });
      
      // Mark as initialized to prevent re-initialization
      (window as any).__excelHelpersInitialized = true;
    }
  }, []);
  
  const renderPieDataLimitDropdown = useCallback((isDataLimited: boolean, showAllData: boolean, onToggle: (showAll: boolean) => void) => {
    const MAX_PIE_ENTRIES = 15;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <span>
              {showAllData ? "All data" : `Top ${MAX_PIE_ENTRIES - 1} + Others`}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-0 shadow-xl bg-white rounded-xl p-1"
          sideOffset={8}
        >
          <DropdownMenuItem
            onClick={() => onToggle(false)}
            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
              !showAllData
                ? "bg-blue-50 text-blue-700"
                : "text-slate-900"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                !showAllData
                  ? "text-blue-600"
                  : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l6 6-6 6z"
              />
            </svg>
            <span className="font-medium">
              Top {MAX_PIE_ENTRIES - 1} + Others
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onToggle(true)}
            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
              showAllData
                ? "bg-blue-50 text-blue-700"
                : "text-slate-900"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                showAllData ? "text-blue-600" : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span className="font-medium">Show all data</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, []);

  const renderLineDataLimitDropdown = useCallback((isDataLimited: boolean, showAllData: boolean, onToggle: (showAll: boolean) => void) => {
    const MAX_LINE_ENTRIES = 25;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <span>
              {showAllData ? "All data" : `${MAX_LINE_ENTRIES} points`}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-0 shadow-xl bg-white rounded-xl p-1"
          sideOffset={8}
        >
          <DropdownMenuItem
            onClick={() => onToggle(false)}
            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
              !showAllData
                ? "bg-blue-50 text-blue-700"
                : "text-slate-900"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                !showAllData
                  ? "text-blue-600"
                  : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l6 6-6 6z"
              />
            </svg>
            <span className="font-medium">
              {MAX_LINE_ENTRIES} points
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onToggle(true)}
            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
              showAllData
                ? "bg-blue-50 text-blue-700"
                : "text-slate-900"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                showAllData ? "text-blue-600" : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span className="font-medium">Show all data</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, []);

  const renderBarDataLimitDropdown = useCallback((isDataLimited: boolean, barChartLimit: 5 | 10 | 'all', onLimitChange: (limit: 5 | 10 | 'all') => void) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <span>
              {barChartLimit === 'all' ? 'All data' : `Top ${barChartLimit}`}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-0 shadow-xl bg-white rounded-xl p-1"
          sideOffset={8}
        >
          <DropdownMenuItem
            onClick={() => onLimitChange(5)}
            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
              barChartLimit === 5
                ? "bg-blue-50 text-blue-700"
                : "text-slate-900"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                barChartLimit === 5
                  ? "text-blue-600"
                  : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l6 6-6 6z"
              />
            </svg>
            <span className="font-medium">Top 5</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onLimitChange(10)}
            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
              barChartLimit === 10
                ? "bg-blue-50 text-blue-700"
                : "text-slate-900"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                barChartLimit === 10
                  ? "text-blue-600"
                  : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l6 6-6 6z"
              />
            </svg>
            <span className="font-medium">Top 10</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onLimitChange('all')}
            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
              barChartLimit === 'all'
                ? "bg-blue-50 text-blue-700"
                : "text-slate-900"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                barChartLimit === 'all' ? "text-blue-600" : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span className="font-medium">All data</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, []);

  // Configuration for maximum entries before limiting
  const MAX_BAR_ENTRIES = 10;
  const MAX_PIE_ENTRIES = 15;
  const MAX_LINE_ENTRIES = 30;

  // Helper function to determine if chart type can be switched between bar and line
  const canSwitchChartType = (chartType: string) => {
    return chartType === "bar" || chartType === "horizontal_bar" || chartType === "line";
  };

  // Helper function to get available chart types for switching
  const getAvailableChartTypes = (originalType: string) => {
    if (!canSwitchChartType(originalType)) return [];

    const types = [
      { value: "bar", label: "Bar Chart", icon: BarChart3 },
      { value: "horizontal_bar", label: "Horizontal Bar Chart", icon: BarChart3 },
      { value: "line", label: "Line Chart", icon: TrendingUp },
    ];

    return types;
  };


  // Formula evaluator for transformations using Excel helpers
  const evaluateFormula = (formula: string, row: string[], headers: string[], rowIndex: number): any => {
    if (!formula.startsWith("=")) {
      return formula;
    }

    // Decode HTML entities in the formula
    const decodedFormula = formula
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove the = sign
    let jsExpression = decodedFormula.slice(1);

    // Create a mapping of column references to values
    const columnMap: { [key: string]: string } = {};
    headers.forEach((header, index) => {
      columnMap[header] = row[index] || "";
      // Also support Excel-style column references (A, B, C, etc.)
      const columnLetter = String.fromCharCode(65 + index);
      columnMap[columnLetter] = row[index] || "";
    });

    // Handle Excel range references (e.g., B2:B, K2:K, I2:I)
    // These should be replaced with the current row's value for that column
    const rangePattern = /([A-Z]+)(\d+):([A-Z]+)/g;
    jsExpression = jsExpression.replace(rangePattern, (match, startCol) => {
      // For range references like B2:B, we want the current row's value for column B
      const columnIndex = startCol.charCodeAt(0) - 65;
      if (columnIndex >= 0 && columnIndex < headers.length) {
        const value = row[columnIndex] || "";
        return isNaN(Number(value)) ? `"${value}"` : value;
      }
      return '""';
    });

    // Replace single column references with values
    Object.keys(columnMap).forEach((columnRef) => {
      const value = columnMap[columnRef];
      const numericValue = isNaN(Number(value)) ? `"${value}"` : value;
      // Handle both single column references (C) and full column references (C:C)
      jsExpression = jsExpression.replace(new RegExp(`\\b${columnRef}:${columnRef}\\b`, 'g'), numericValue);
      jsExpression = jsExpression.replace(new RegExp(`\\b${columnRef}\\b`, 'g'), numericValue);
    });

    // Handle Excel comparison operators
    jsExpression = jsExpression.replace(/<=/g, '<=');
    jsExpression = jsExpression.replace(/>=/g, '>=');
    jsExpression = jsExpression.replace(/<>/g, '!=');

    try {
      // Set up context for Excel functions that need row information
      const originalCurrentRowIndex = (window as any)._currentRowIndex;
      const originalCurrentData = (window as any)._currentData;
      
      (window as any)._currentRowIndex = rowIndex;
      (window as any)._currentData = [row];

      // Create a safe evaluation environment with Excel functions
      const safeEval = new Function('return ' + jsExpression);
      const result = safeEval();

      // Restore original context
      (window as any)._currentRowIndex = originalCurrentRowIndex;
      (window as any)._currentData = originalCurrentData;

      return result;
    } catch (error) {
      console.warn(`Error evaluating formula: ${formula}`, error);
      return null;
    }
  };

  // Apply transformations to CSV data
  const applyTransformations = useCallback((csvData: string[][], transformations: Transformation[]): string[][] => {
    if (!transformations || transformations.length === 0 || csvData.length === 0) {
      return csvData;
    }

    const headers = csvData[0];
    const dataRows = csvData.slice(1);
    const transformedData = [...dataRows];

    // Apply each transformation
    transformations.forEach((transformation) => {
      const { name: columnName, formula } = transformation;
      
      // Add the new column to headers if it doesn't exist
      if (!headers.includes(columnName)) {
        headers.push(columnName);
      }

      // Calculate the column index for the new column
      const columnIndex = headers.indexOf(columnName);

      // Apply the transformation to each row
      transformedData.forEach((row, rowIndex) => {
        // Ensure the row has enough columns
        while (row.length <= columnIndex) {
          row.push("");
        }
        
        const transformedValue = evaluateFormula(formula, row, headers, rowIndex);
        row[columnIndex] = transformedValue !== null ? String(transformedValue) : "";
      });
    });

    return [headers, ...transformedData];
  }, []);

  const parseChartFromPXML = useCallback((content: string): ChartData | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/xml");

      const chartElement = doc.querySelector("chart");
      if (!chartElement) return null;

      const type = chartElement.getAttribute("type") || "bar";
      const name = chartElement.querySelector("name")?.textContent || "Chart";
      const filePath =
        chartElement.querySelector("file_path")?.textContent || "";

      const xAxisElement = chartElement.querySelector("x_axis");
      const xAxis = {
        name: xAxisElement?.querySelector("name")?.textContent || "",
        column: xAxisElement?.querySelector("column")?.textContent || "",
      };

      const seriesElements = chartElement.querySelectorAll("series");
      const series = Array.from(seriesElements).map((seriesEl) => ({
        name: seriesEl.querySelector("name")?.textContent || "",
        column: seriesEl.querySelector("column")?.textContent || "",
        aggregation: seriesEl.querySelector("aggregation")?.textContent || "sum",
      }));

      // Parse transformations
      const transformationsElement = chartElement.querySelector("transformations");
      const transformations: Transformation[] = [];
      
      if (transformationsElement) {
        const defineColumnElements = transformationsElement.querySelectorAll("define_column");
        defineColumnElements.forEach((defineColEl) => {
          const columnName = defineColEl.getAttribute("name");
          const formulaElement = defineColEl.querySelector("formula");
          const formula = formulaElement?.textContent || "";
          
          if (columnName && formula) {
            transformations.push({
              name: columnName,
              formula: formula,
            });
          }
        });
      }

      return {
        type,
        name,
        filePath,
        xAxis,
        series,
        transformations: transformations.length > 0 ? transformations : undefined,
      };
    } catch (error) {
      console.error("Error parsing chart from PXML:", error);
      return null;
    }
  }, []);

  const loadCSVData = useCallback(
    async (filePath: string) => {
      if (!conversationId || !filePath) return;

      setIsLoading(true);
      setError(null);

      try {
        const fileUrl = getFileUrl(filePath, conversationId, true);
        const apiHeaders = await getApiHeaders();

        const response = await fetch(fileUrl, { headers: apiHeaders });

        if (!response.ok) {
          throw new Error(`Failed to fetch CSV file: ${response.status}`);
        }

        const csvText = await response.text();

        // Parse CSV using PapaParse
        Papa.parse(csvText, {
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn("CSV parsing warnings:", results.errors);
            }
            
            // Apply transformations if they exist
            const chartData = parseChartFromPXML(pxmlContent);
            let processedData = results.data as string[][];
            
            if (chartData?.transformations && chartData.transformations.length > 0) {
              processedData = applyTransformations(processedData, chartData.transformations);
            }
            
            setCsvData(processedData);
            setIsLoading(false);
          },
          error: (error: Error) => {
            console.error("CSV parsing error:", error);
            setError("Failed to parse CSV data");
            setIsLoading(false);
          },
          skipEmptyLines: true,
        });
      } catch (err) {
        console.error("Error loading CSV data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load CSV data"
        );
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, pxmlContent]
  );


  // Load CSV data when component mounts or pxmlContent changes
  useEffect(() => {
    const chartData = parseChartFromPXML(pxmlContent);
    if (chartData && chartData.filePath) {
      loadCSVData(chartData.filePath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pxmlContent, conversationId, loadCSVData]);




  // Reset dropdown states when chart type changes
  useEffect(() => {
    const chartData = parseChartFromPXML(pxmlContent);
    if (chartData) {
      const effectiveType = chartTypeOverride || chartData.type;
      if (effectiveType !== "pie" && effectiveType !== "donut") {
        setShouldShowPieDropdown(false);
      }
      if (effectiveType !== "line") {
        setShouldShowLineDropdown(false);
      }
      if (effectiveType !== "bar" && effectiveType !== "horizontal_bar") {
        setShouldShowBarDropdown(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pxmlContent, chartTypeOverride]);

  const renderChart = (chartData: ChartData) => {
    const effectiveType = chartTypeOverride || chartData.type;
    
    switch (effectiveType) {
      case "bar":
      case "horizontal_bar":
        return (
          <BarChart
            chartData={chartData}
            csvData={csvData}
            chartTypeOverride={chartTypeOverride}
            showAllData={barChartLimit === 'all'}
            onDataLimitedChange={setShouldShowBarDropdown}
            barChartLimit={barChartLimit}
          />
        );
      case "line":
        return (
          <LineChart
            chartData={chartData}
            csvData={csvData}
            chartTypeOverride={chartTypeOverride}
            showAllData={showAllData}
            onDataLimitedChange={setShouldShowLineDropdown}
          />
        );
      case "pie":
        return (
          <PieChart
            chartData={chartData}
            csvData={csvData}
            chartTypeOverride={chartTypeOverride}
            showAllData={showAllData}
            onDataLimitedChange={setShouldShowPieDropdown}
            isDoughnut={false}
          />
        );
      case "donut":
        return (
          <PieChart
            chartData={chartData}
            csvData={csvData}
            chartTypeOverride={chartTypeOverride}
            showAllData={showAllData}
            onDataLimitedChange={setShouldShowPieDropdown}
            isDoughnut={true}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-64 sm:h-80 bg-slate-50/50 rounded-lg border border-slate-200/60">
            <div className="text-slate-500 text-sm font-medium">
              Chart type temporarily not supported
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mt-4" style={{ width: "600px", maxWidth: "100%" }}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center h-80 space-y-4 bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300/80 rounded-2xl p-6 shadow-lg">
          <div className="relative">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
          <div className="text-sm font-medium text-slate-600">
            Loading chart data...
          </div>
          <div className="text-xs text-slate-400">Processing CSV file</div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center h-80 space-y-4 bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300/80 rounded-2xl p-6 shadow-lg">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="text-sm font-medium text-orange-600">
            Failed to load data
          </div>
          <div className="text-xs text-orange-400 max-w-xs text-center">
            {error}
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white border border-gray-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          {(() => {
            const chartData = parseChartFromPXML(pxmlContent);
            const availableTypes = chartData
              ? getAvailableChartTypes(chartData.type)
              : [];
            const currentType = chartTypeOverride || chartData?.type || "";
            const currentTypeData = availableTypes.find(
              (type) => type.value === currentType
            );

            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {chartData?.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    {shouldShowPieDropdown && renderPieDataLimitDropdown(true, showAllData, setShowAllData)}
                    {shouldShowLineDropdown && renderLineDataLimitDropdown(true, showAllData, setShowAllData)}
                    {shouldShowBarDropdown && renderBarDataLimitDropdown(true, barChartLimit, setBarChartLimit)}
                    {false && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <span>
                              {(() => {
                                const type = currentType;
                                if (showAllData) {
                                  return "All data";
                                } else if (type === "line") {
                                  return `Top ${MAX_LINE_ENTRIES}`;
                                } else if (type === "bar" || type === "horizontal_bar") {
                                  return `Top ${MAX_BAR_ENTRIES}`;
                                } else {
                                  return `Top ${
                                    MAX_PIE_ENTRIES - 1
                                  } + Others`;
                                }
                              })()}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 border-0 shadow-xl bg-white rounded-xl p-1"
                          sideOffset={8}
                        >
                          <DropdownMenuItem
                            onClick={() => setShowAllData(false)}
                            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
                              !showAllData
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-900"
                            }`}
                          >
                            <svg
                              className={`w-4 h-4 ${
                                !showAllData
                                  ? "text-blue-600"
                                  : "text-slate-600"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19V6l6 6-6 6z"
                              />
                            </svg>
                            <span className="font-medium">
                              {(() => {
                                const type = currentType;
                                if (type === "line") {
                                  return `Top ${MAX_LINE_ENTRIES} Points`;
                                } else if (type === "bar" || type === "horizontal_bar") {
                                  return `Top ${MAX_BAR_ENTRIES} Entries`;
                                } else {
                                  return `Top ${
                                    MAX_PIE_ENTRIES - 1
                                  } + Others`;
                                }
                              })()}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setShowAllData(true)}
                            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
                              showAllData
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-900"
                            }`}
                          >
                            <svg
                              className={`w-4 h-4 ${
                                showAllData ? "text-blue-600" : "text-slate-600"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 10h16M4 14h16M4 18h16"
                              />
                            </svg>
                            <span className="font-medium">Show all data</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {availableTypes.length > 0 && !shouldShowLineDropdown && !shouldShowBarDropdown && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          {currentTypeData && (
                            <currentTypeData.icon className="w-4 h-4 text-slate-600" />
                          )}
                          <span>{currentTypeData?.label || "Chart Type"}</span>
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 border-0 shadow-xl bg-white rounded-xl p-1"
                        sideOffset={8}
                      >
                        {availableTypes.map((type) => (
                          <DropdownMenuItem
                            key={type.value}
                            onClick={() => setChartTypeOverride(type.value)}
                            className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
                              currentType === type.value
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-900"
                            }`}
                          >
                            <type.icon
                              className={`w-4 h-4 ${
                                currentType === type.value
                                  ? "text-blue-600"
                                  : "text-slate-600"
                              }`}
                            />
                            <span className="font-medium">{type.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  </div>
                </div>
                {chartData && renderChart(chartData)}
                
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
});

ChartRenderer.displayName = 'ChartRenderer';

export default ChartRenderer;
