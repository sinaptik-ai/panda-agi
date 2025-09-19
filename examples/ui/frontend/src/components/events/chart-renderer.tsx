/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState, useCallback } from "react";
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

interface ChartData {
  type: string;
  name: string;
  filePath: string;
  xAxis: {
    name: string;
    column: string;
  };
  series: Array<{
    name: string;
    column: string;
  }>;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  pxmlContent,
  conversationId,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartTypeOverride, setChartTypeOverride] = useState<string | null>(
    null
  );
  const [isDataLimited, setIsDataLimited] = useState(false);
  const [showAllData, setShowAllData] = useState(false);
  const [legendData, setLegendData] = useState<{
    labels: string[];
    data: number[];
    colors: string[];
    chartType: string;
  } | null>(null);

  // Configuration for maximum entries before limiting
  const MAX_BAR_ENTRIES = 10; // Cap bar charts at 10 entries (no grouping)
  const MAX_PIE_ENTRIES = 15; // Cap pie charts at 15 entries (with Others grouping)
  const MAX_LINE_ENTRIES = 30; // For line charts, sample down to 30 points

  // Helper function to determine if chart type can be switched between bar and line
  const canSwitchChartType = (chartType: string) => {
    return chartType === "bar" || chartType === "line";
  };

  // Helper function to get available chart types for switching
  const getAvailableChartTypes = (originalType: string) => {
    if (!canSwitchChartType(originalType)) return [];

    const types = [
      { value: "bar", label: "Bar Chart", icon: BarChart3 },
      { value: "line", label: "Line Chart", icon: TrendingUp },
    ];

    return types;
  };

  // Helper function to limit data for bar charts (take top N entries, no grouping)
  const limitBarData = (
    labels: string[],
    datasets: any[],
    maxEntries: number
  ) => {
    if (labels.length <= maxEntries)
      return { labels, datasets, wasLimited: false };

    // For bar charts, take the top entries by value (highest values)
    const indexedLabels = labels.map((label, index) => ({
      label,
      index,
      totalValue: datasets.reduce(
        (sum, dataset) => sum + (dataset.data[index] || 0),
        0
      ),
    }));

    // Sort by total value descending and take top entries
    const topEntries = indexedLabels
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, maxEntries);

    const limitedLabels = topEntries.map((entry) => entry.label);
    const limitedDatasets = datasets.map((dataset) => ({
      ...dataset,
      data: topEntries.map((entry) => dataset.data[entry.index]),
      backgroundColor: Array.isArray(dataset.backgroundColor)
        ? topEntries.map((entry) => dataset.backgroundColor[entry.index])
        : dataset.backgroundColor,
      borderColor: Array.isArray(dataset.borderColor)
        ? topEntries.map((entry) => dataset.borderColor[entry.index])
        : dataset.borderColor,
      hoverBackgroundColor: Array.isArray(dataset.hoverBackgroundColor)
        ? topEntries.map((entry) => dataset.hoverBackgroundColor[entry.index])
        : dataset.hoverBackgroundColor,
    }));

    return { labels: limitedLabels, datasets: limitedDatasets, wasLimited: true };
  };

  // Helper function to limit data for pie charts (take top N entries and group others)
  const limitPieData = (
    labels: string[],
    datasets: any[],
    maxEntries: number
  ) => {
    if (labels.length <= maxEntries)
      return { labels, datasets, wasLimited: false };

    // For pie charts, take the top entries by value (highest values)
    const indexedLabels = labels.map((label, index) => ({
      label,
      index,
      totalValue: datasets.reduce(
        (sum, dataset) => sum + (dataset.data[index] || 0),
        0
      ),
    }));

    // Sort by total value descending
    const sortedEntries = indexedLabels.sort(
      (a, b) => b.totalValue - a.totalValue
    );

    // Take top entries and group the rest as "Others"
    const topEntries = sortedEntries.slice(0, maxEntries - 1);
    const otherEntries = sortedEntries.slice(maxEntries - 1);

    // Calculate "Others" total for each dataset
    const limitedLabels = [...topEntries.map((entry) => entry.label), "Others"];
    const limitedDatasets = datasets.map((dataset) => {
      const topData = topEntries.map((entry) => dataset.data[entry.index]);
      const othersTotal = otherEntries.reduce(
        (sum, entry) => sum + (dataset.data[entry.index] || 0),
        0
      );

      return {
        ...dataset,
        data: [...topData, othersTotal],
        backgroundColor: Array.isArray(dataset.backgroundColor)
          ? [
              ...topEntries.map(
                (entry) => dataset.backgroundColor[entry.index]
              ),
              "#94a3b8",
            ] // Gray for "Others"
          : dataset.backgroundColor,
        borderColor: Array.isArray(dataset.borderColor)
          ? [
              ...topEntries.map((entry) => dataset.borderColor[entry.index]),
              "#64748b",
            ]
          : dataset.borderColor,
        hoverBackgroundColor: Array.isArray(dataset.hoverBackgroundColor)
          ? [
              ...topEntries.map(
                (entry) => dataset.hoverBackgroundColor[entry.index]
              ),
              "#a1a1aa",
            ]
          : dataset.hoverBackgroundColor,
      };
    });

    return {
      labels: limitedLabels,
      datasets: limitedDatasets,
      wasLimited: true,
    };
  };

  // Helper function to sample data for line charts (keep first, last, and evenly distributed points)
  const sampleLineData = (
    labels: string[],
    datasets: any[],
    maxEntries: number
  ) => {
    if (labels.length <= maxEntries)
      return { labels, datasets, wasLimited: false };

    // Keep first and last points, then evenly distribute the remaining points
    const sampledIndices = [0]; // Always keep first point

    if (maxEntries > 2) {
      const step = Math.floor((labels.length - 2) / (maxEntries - 2));
      for (let i = 1; i < maxEntries - 1; i++) {
        const index = Math.min(step * i, labels.length - 2);
        if (!sampledIndices.includes(index)) {
          sampledIndices.push(index);
        }
      }
    }

    sampledIndices.push(labels.length - 1); // Always keep last point

    // Remove duplicates and sort
    const uniqueIndices = [...new Set(sampledIndices)].sort((a, b) => a - b);

    const sampledLabels = uniqueIndices.map((i) => labels[i]);
    const sampledDatasets = datasets.map((dataset) => ({
      ...dataset,
      data: uniqueIndices.map((i) => dataset.data[i]),
    }));

    return {
      labels: sampledLabels,
      datasets: sampledDatasets,
      wasLimited: true,
    };
  };

  const parseChartFromPXML = (content: string): ChartData | null => {
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
      }));

      return {
        type,
        name,
        filePath,
        xAxis,
        series,
      };
    } catch (error) {
      console.error("Error parsing chart from PXML:", error);
      return null;
    }
  };

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
            setCsvData(results.data as string[][]);
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
    [conversationId]
  );

  const generateChartData = useCallback(
    (chartData: ChartData, csvData: string[][]) => {
      if (csvData.length === 0) {
        // Fallback to mock data if no CSV data
        // Generate mock data inline to avoid circular dependency
        const categories = ["Branch A", "Branch B", "Branch C", "Branch D"];

        // Expanded, vibrant color palette with better contrast
        const colors = [
          {
            bg: "rgba(59, 130, 246, 0.8)", // Blue
            border: "rgb(59, 130, 246)",
            hover: "rgba(59, 130, 246, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.8) 100%)",
          },
          {
            bg: "rgba(34, 197, 94, 0.8)", // Emerald
            border: "rgb(34, 197, 94)",
            hover: "rgba(34, 197, 94, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)",
          },
          {
            bg: "rgba(251, 146, 60, 0.8)", // Orange
            border: "rgb(251, 146, 60)",
            hover: "rgba(251, 146, 60, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.8) 100%)",
          },
          {
            bg: "rgba(244, 63, 94, 0.8)", // Rose
            border: "rgb(244, 63, 94)",
            hover: "rgba(244, 63, 94, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(244, 63, 94, 0.8) 0%, rgba(225, 29, 72, 0.8) 100%)",
          },
          {
            bg: "rgba(14, 165, 233, 0.8)", // Sky
            border: "rgb(14, 165, 233)",
            hover: "rgba(14, 165, 233, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(2, 132, 199, 0.8) 100%)",
          },
          {
            bg: "rgba(236, 72, 153, 0.8)", // Pink
            border: "rgb(236, 72, 153)",
            hover: "rgba(236, 72, 153, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(236, 72, 153, 0.8) 0%, rgba(219, 39, 119, 0.8) 100%)",
          },
          {
            bg: "rgba(16, 185, 129, 0.8)", // Teal
            border: "rgb(16, 185, 129)",
            hover: "rgba(16, 185, 129, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, rgba(15, 118, 110, 0.8) 100%)",
          },
          {
            bg: "rgba(245, 158, 11, 0.8)", // Amber
            border: "rgb(245, 158, 11)",
            hover: "rgba(245, 158, 11, 0.9)",
            gradient:
              "linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(217, 119, 6, 0.8) 100%)",
          },
        ];

        const datasets = chartData.series.map((series, index) => {
          const data = categories.map(
            () => Math.floor(Math.random() * 100000) + 10000
          );

          // For pie/doughnut charts, we need to assign different colors to each data point
          const effectiveType = chartTypeOverride || chartData.type;
          if (effectiveType === "pie" || effectiveType === "donut") {
            return {
              label: series.name,
              data,
              backgroundColor: categories.map(
                (_, i) => colors[i % colors.length].bg
              ),
              borderColor: "#ffffff",
              borderWidth: 3,
              borderRadius: 4,
              hoverBackgroundColor: categories.map(
                (_, i) => colors[i % colors.length].hover
              ),
              hoverBorderColor: "#ffffff",
              hoverBorderWidth: 4,
              spacing: 4,
            };
          }

          // For other chart types, use the original logic
          const colorScheme = colors[index % colors.length];
          const isLineChart = effectiveType === "line";

          return {
            label: series.name,
            data,
            backgroundColor: isLineChart ? "transparent" : colorScheme.bg,
            borderColor: colorScheme.border,
            borderWidth: isLineChart ? 3 : 2,
            borderRadius: isLineChart ? 0 : 12,
            borderSkipped: false,
            hoverBackgroundColor: isLineChart
              ? "transparent"
              : colorScheme.hover,
            hoverBorderColor: colorScheme.border,
            hoverBorderWidth: isLineChart ? 4 : 3,
            // Line chart specific properties
            ...(isLineChart && {
              fill: false,
              tension: 0.3,
              pointBackgroundColor: "#ffffff",
              pointBorderColor: colorScheme.border,
              pointBorderWidth: 3,
              pointHoverBackgroundColor: "#ffffff",
              pointHoverBorderColor: colorScheme.border,
              pointHoverBorderWidth: 4,
              pointRadius: 5,
              pointHoverRadius: 7,
            }),
            // Add subtle shadow effect
            shadowOffsetX: 0,
            shadowOffsetY: 2,
            shadowBlur: 4,
            shadowColor: colorScheme.border + "40",
          };
        });

        return {
          labels: categories,
          datasets,
        };
      }

      const headers = csvData[0];
      const dataRows = csvData.slice(1);

      // Find column indices - handle both column letters (A, B, C) and column names
      const getColumnIndex = (columnRef: string): number => {
        // If it's a single letter (A, B, C, etc.), treat it as a column index
        if (columnRef.length === 1 && /[A-Z]/.test(columnRef)) {
          return columnRef.charCodeAt(0) - "A".charCodeAt(0);
        }
        // Otherwise, try to find by header name
        return headers.findIndex(
          (header) =>
            header.toLowerCase().includes(columnRef.toLowerCase()) ||
            header === columnRef
        );
      };

      const xAxisColumnIndex = getColumnIndex(chartData.xAxis.column);

      const seriesData = chartData.series.map((series) => {
        const columnIndex = getColumnIndex(series.column);
        return { ...series, columnIndex };
      });

      // Group data by x-axis values and aggregate series data
      const groupedData = new Map<string, number[]>();

      dataRows.forEach((row) => {
        const xValue = row[xAxisColumnIndex] || "";
        if (!xValue) return;

        if (!groupedData.has(xValue)) {
          groupedData.set(xValue, new Array(seriesData.length).fill(0));
        }

        const groupValues = groupedData.get(xValue)!;
        seriesData.forEach((series, seriesIndex) => {
          const value = parseFloat(row[series.columnIndex] || "0");
          if (!isNaN(value)) {
            groupValues[seriesIndex] += value; // Sum aggregation
          }
        });
      });

      // Extract labels and data
      const labels = Array.from(groupedData.keys());

      // Expanded, vibrant color palette with better contrast
      const colors = [
        {
          bg: "rgba(59, 130, 246, 0.8)", // Blue
          border: "rgb(59, 130, 246)",
          hover: "rgba(59, 130, 246, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.8) 100%)",
        },
        {
          bg: "rgba(34, 197, 94, 0.8)", // Emerald
          border: "rgb(34, 197, 94)",
          hover: "rgba(34, 197, 94, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)",
        },
        {
          bg: "rgba(251, 146, 60, 0.8)", // Orange
          border: "rgb(251, 146, 60)",
          hover: "rgba(251, 146, 60, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.8) 100%)",
        },
        {
          bg: "rgba(244, 63, 94, 0.8)", // Rose
          border: "rgb(244, 63, 94)",
          hover: "rgba(244, 63, 94, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(244, 63, 94, 0.8) 0%, rgba(225, 29, 72, 0.8) 100%)",
        },
        {
          bg: "rgba(14, 165, 233, 0.8)", // Sky
          border: "rgb(14, 165, 233)",
          hover: "rgba(14, 165, 233, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(2, 132, 199, 0.8) 100%)",
        },
        {
          bg: "rgba(236, 72, 153, 0.8)", // Pink
          border: "rgb(236, 72, 153)",
          hover: "rgba(236, 72, 153, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(236, 72, 153, 0.8) 0%, rgba(219, 39, 119, 0.8) 100%)",
        },
        {
          bg: "rgba(16, 185, 129, 0.8)", // Teal
          border: "rgb(16, 185, 129)",
          hover: "rgba(16, 185, 129, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, rgba(15, 118, 110, 0.8) 100%)",
        },
        {
          bg: "rgba(245, 158, 11, 0.8)", // Amber
          border: "rgb(245, 158, 11)",
          hover: "rgba(245, 158, 11, 0.9)",
          gradient:
            "linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(217, 119, 6, 0.8) 100%)",
        },
      ];

      const datasets = seriesData.map((series, index) => {
        const data = labels.map((label) => {
          const groupValues = groupedData.get(label) || [];
          return groupValues[index] || 0;
        });

        // For pie/doughnut charts, we need to assign different colors to each data point
        const effectiveType = chartTypeOverride || chartData.type;
        if (effectiveType === "pie" || effectiveType === "donut") {
          return {
            label: series.name,
            data,
            backgroundColor: labels.map((_, i) => colors[i % colors.length].bg),
            borderColor: "#ffffff",
            borderWidth: 3,
            borderRadius: 4,
            hoverBackgroundColor: labels.map(
              (_, i) => colors[i % colors.length].hover
            ),
            hoverBorderColor: "#ffffff",
            hoverBorderWidth: 4,
            spacing: 4,
          };
        }

        // For other chart types, use the original logic
        const colorScheme = colors[index % colors.length];
        const isLineChart = effectiveType === "line";

        return {
          label: series.name,
          data,
          backgroundColor: isLineChart ? "transparent" : colorScheme.bg,
          borderColor: colorScheme.border,
          borderWidth: isLineChart ? 3 : 2,
          borderRadius: isLineChart ? 0 : 12,
          borderSkipped: false,
          hoverBackgroundColor: isLineChart ? "transparent" : colorScheme.hover,
          hoverBorderColor: colorScheme.border,
          hoverBorderWidth: isLineChart ? 4 : 3,
          // Line chart specific properties
          ...(isLineChart && {
            fill: false,
            tension: 0.3,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: colorScheme.border,
            pointBorderWidth: 3,
            pointHoverBackgroundColor: "#ffffff",
            pointHoverBorderColor: colorScheme.border,
            pointHoverBorderWidth: 4,
            pointRadius: 5,
            pointHoverRadius: 7,
          }),
          // Add subtle shadow effect
          shadowOffsetX: 0,
          shadowOffsetY: 2,
          shadowBlur: 4,
          shadowColor: colorScheme.border + "40",
        };
      });

      // Apply data limiting based on chart type and user preference
      const effectiveType = chartTypeOverride || chartData.type;
      let finalLabels = labels;
      let finalDatasets = datasets;
      let wasLimited = false;

      // Only apply limiting if showAllData is false
      if (!showAllData) {
        if (effectiveType === "line") {
          const result = sampleLineData(labels, datasets, MAX_LINE_ENTRIES);
          finalLabels = result.labels;
          finalDatasets = result.datasets;
          wasLimited = result.wasLimited;
        } else if (
          effectiveType === "bar" ||
          effectiveType === "horizontal_bar"
        ) {
          // Bar charts: limit to top 10 without grouping
          const result = limitBarData(labels, datasets, MAX_BAR_ENTRIES);
          finalLabels = result.labels;
          finalDatasets = result.datasets;
          wasLimited = result.wasLimited;
        } else if (
          effectiveType === "pie" ||
          effectiveType === "donut"
        ) {
          // Pie charts: limit to top 14 + Others grouping
          const result = limitPieData(labels, datasets, MAX_PIE_ENTRIES);
          finalLabels = result.labels;
          finalDatasets = result.datasets;
          wasLimited = result.wasLimited;
        }
      } else {
        // Check if data would have been limited (for UI purposes)
        if (effectiveType === "line") {
          wasLimited = labels.length > MAX_LINE_ENTRIES;
        } else if (
          effectiveType === "bar" ||
          effectiveType === "horizontal_bar"
        ) {
          wasLimited = labels.length > MAX_BAR_ENTRIES;
        } else if (
          effectiveType === "pie" ||
          effectiveType === "donut"
        ) {
          wasLimited = labels.length > MAX_PIE_ENTRIES;
        }
      }

      // Update the state to track if data was/would be limited
      setIsDataLimited(wasLimited);

      return {
        labels: finalLabels,
        datasets: finalDatasets,
      };
    },
    [chartTypeOverride, showAllData]
  );

  // Load CSV data when component mounts or pxmlContent changes
  useEffect(() => {
    const chartData = parseChartFromPXML(pxmlContent);
    if (chartData && chartData.filePath) {
      loadCSVData(chartData.filePath);
    }
  }, [pxmlContent, conversationId, loadCSVData]);

  // Render chart when CSV data is loaded
  useEffect(() => {
    if (!chartRef.current) return;

    const chartData = parseChartFromPXML(pxmlContent);
    if (!chartData) return;

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const chartDataForRender = generateChartData(chartData, csvData);

    // Map chart types to Chart.js types
    const getChartType = (type: string) => {
      switch (type) {
        case "horizontal_bar":
          return "bar";
        case "donut":
          return "doughnut";
        case "combo_chart":
          return "bar"; // Default to bar for combo charts
        default:
          return type;
      }
    };

    // Use override if available, otherwise use original chart type
    const effectiveChartType = chartTypeOverride || chartData.type;
    const chartType = getChartType(effectiveChartType);

    const config = {
      type: chartType,
      data: chartDataForRender,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: chartData.type === "horizontal_bar" ? "y" : "x",
        interaction: {
          intersect:
            chartType === "pie" || chartType === "doughnut" ? true : false,
          mode:
            chartType === "pie" || chartType === "doughnut"
              ? ("point" as const)
              : ("index" as const),
        },
        animation: (() => {
          const dataCount = chartDataForRender.labels.length;
          const isManyDataPoints = dataCount > 10;
          
          return {
            duration: isManyDataPoints ? 600 : 1000,
            easing: "easeOutCubic" as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delay: (context: any) => {
              const baseDelay = isManyDataPoints ? 20 : 50;
              return context.dataIndex * baseDelay;
            },
            animateRotate: true,
            animateScale: true,
          };
        })(),
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: chartType === "pie" || chartType === "doughnut" ? false : chartData.series.length > 1,
            position: "top" as const,
            align: "center" as const,
            labels: {
              usePointStyle: true,
              pointStyle: "rect",
              padding: 20,
              font: {
                size: 13,
                weight: "600" as const,
                family:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              color: "#1e293b",
              boxWidth: 14,
              boxHeight: 14,
            },
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            titleColor: "#f9fafb",
            bodyColor: "#f9fafb",
            borderColor: "rgba(99, 102, 241, 0.3)",
            borderWidth: 1,
            cornerRadius: 12,
            displayColors: true,
            padding: 12,
            titleFont: {
              size: 13,
              weight: "600" as const,
              family:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            bodyFont: {
              size: 12,
              weight: "500" as const,
              family:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: function (context: any) {
                const value = context.parsed.y || context.parsed;
                if (chartType === "pie" || chartType === "doughnut") {
                  const total = context.dataset.data.reduce(
                    (a: number, b: number) => a + b,
                    0
                  );
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${
                    context.label
                  }: ${value.toLocaleString()} (${percentage}% of area)`;
                }
                return `${context.dataset.label}: ${value.toLocaleString()}`;
              },
            },
          },
        },
        // Special configuration for pie and doughnut charts
        ...(chartType === "pie" || chartType === "donut"
          ? {
              cutout: chartType === "donut" ? "60%" : "0%",
              rotation: -90,
              circumference: 360,
              spacing: 2,
            }
          : {}),
        scales:
          chartType === "pie" || chartType === "donut"
            ? {}
            : {
                x: {
                  beginAtZero: true,
                  grid: {
                    display: false,
                  },
                  ticks: {
                    color: "#64748b",
                    font: {
                      size: 12,
                      weight: "600" as const,
                      family:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    },
                    padding: 12,
                  },
                  border: {
                    display: false,
                  },
                },
                y: {
                  beginAtZero: true,
                  grid: {
                    color: "rgba(148, 163, 184, 0.3)",
                    drawBorder: false,
                    drawTicks: false,
                    lineWidth: 1,
                  },
                  ticks: {
                    color: "#64748b",
                    font: {
                      size: 12,
                      weight: "500" as const,
                      family:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    },
                    padding: 16,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    callback: function (value: any) {
                      return `${value.toLocaleString()}`;
                    },
                  },
                  border: {
                    display: false,
                  },
                },
              },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    chartInstanceRef.current = new ChartJS(chartRef.current, config);

    // Set legend data for custom legend
    if (chartType === "pie" || chartType === "doughnut") {
      const dataset = chartDataForRender.datasets[0];
      setLegendData({
        labels: chartDataForRender.labels,
        data: dataset.data as number[],
        colors: Array.isArray(dataset.backgroundColor) 
          ? dataset.backgroundColor as string[]
          : [dataset.backgroundColor as string],
        chartType
      });
    } else {
      setLegendData(null);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [pxmlContent, csvData, generateChartData, chartTypeOverride]);

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
                    {isDataLimited && (
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
                    {availableTypes.length > 0 && (() => {
                      // Hide chart type switching when data is limited
                      const shouldHideChartTypeSwitch = isDataLimited;
                      return !shouldHideChartTypeSwitch;
                    })() && (
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
                <div className="relative h-80">
                  <canvas ref={chartRef} className="w-full h-full" />
                </div>
                
                {/* Clean Minimal Legend for Pie Charts */}
                {legendData && (legendData.chartType === "pie" || legendData.chartType === "doughnut") && (
                  <div className="mt-6 flex flex-wrap justify-center gap-4">
                    {legendData.labels.map((label: string, index: number) => {
                      const value = legendData.data[index];
                      const total = legendData.data.reduce((a: number, b: number) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      const color = legendData.colors[index] || legendData.colors[0];
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div 
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-slate-700 font-medium">
                            {label} {percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ChartRenderer;
