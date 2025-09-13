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
  RadarController
} from "chart.js";
import Papa from "papaparse";
import { getFileUrl } from "@/lib/utils";
import { getApiHeaders } from "@/lib/api/common";

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

const ChartRenderer: React.FC<ChartRendererProps> = ({ pxmlContent, conversationId }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseChartFromPXML = (content: string): ChartData | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/xml");
      
      const chartElement = doc.querySelector("chart");
      if (!chartElement) return null;

      const type = chartElement.getAttribute("type") || "bar";
      const name = chartElement.querySelector("name")?.textContent || "Chart";
      const filePath = chartElement.querySelector("file_path")?.textContent || "";
      
      const xAxisElement = chartElement.querySelector("x_axis");
      const xAxis = {
        name: xAxisElement?.querySelector("name")?.textContent || "",
        column: xAxisElement?.querySelector("column")?.textContent || "",
      };

      const seriesElements = chartElement.querySelectorAll("series");
      const series = Array.from(seriesElements).map(seriesEl => ({
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

  const loadCSVData = useCallback(async (filePath: string) => {
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
      setError(err instanceof Error ? err.message : "Failed to load CSV data");
      setIsLoading(false);
    }
  }, [conversationId]);

  const generateChartData = useCallback((chartData: ChartData, csvData: string[][]) => {
    if (csvData.length === 0) {
      // Fallback to mock data if no CSV data
      return generateMockData(chartData);
    }

    const headers = csvData[0];
    const dataRows = csvData.slice(1);
    
    
    // Find column indices - handle both column letters (A, B, C) and column names
    const getColumnIndex = (columnRef: string): number => {
      // If it's a single letter (A, B, C, etc.), treat it as a column index
      if (columnRef.length === 1 && /[A-Z]/.test(columnRef)) {
        return columnRef.charCodeAt(0) - 'A'.charCodeAt(0);
      }
      // Otherwise, try to find by header name
      return headers.findIndex(header => 
        header.toLowerCase().includes(columnRef.toLowerCase()) ||
        header === columnRef
      );
    };

    const xAxisColumnIndex = getColumnIndex(chartData.xAxis.column);
    
    const seriesData = chartData.series.map(series => {
      const columnIndex = getColumnIndex(series.column);
      return { ...series, columnIndex };
    });

    // Group data by x-axis values and aggregate series data
    const groupedData = new Map<string, number[]>();
    
    dataRows.forEach(row => {
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
    
    // Modern, clean, minimal color palette
    const colors = [
      {
        bg: "rgba(59, 130, 246, 0.7)", // Clean blue
        border: "rgba(59, 130, 246, 1)",
        hover: "rgba(59, 130, 246, 0.85)",
        gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.7) 0%, rgba(37, 99, 235, 0.7) 100%)"
      },
      {
        bg: "rgba(16, 185, 129, 0.7)", // Fresh green
        border: "rgba(16, 185, 129, 1)",
        hover: "rgba(16, 185, 129, 0.85)",
        gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.7) 0%, rgba(5, 150, 105, 0.7) 100%)"
      },
      {
        bg: "rgba(245, 158, 11, 0.7)", // Warm amber
        border: "rgba(245, 158, 11, 1)",
        hover: "rgba(245, 158, 11, 0.85)",
        gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.7) 0%, rgba(217, 119, 6, 0.7) 100%)"
      },
      {
        bg: "rgba(239, 68, 68, 0.7)", // Clean red
        border: "rgba(239, 68, 68, 1)",
        hover: "rgba(239, 68, 68, 0.85)",
        gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.7) 0%, rgba(220, 38, 38, 0.7) 100%)"
      },
      {
        bg: "rgba(139, 92, 246, 0.7)", // Soft purple
        border: "rgba(139, 92, 246, 1)",
        hover: "rgba(139, 92, 246, 0.85)",
        gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.7) 0%, rgba(124, 58, 237, 0.7) 100%)"
      },
      {
        bg: "rgba(107, 114, 128, 0.7)", // Neutral gray
        border: "rgba(107, 114, 128, 1)",
        hover: "rgba(107, 114, 128, 0.85)",
        gradient: "linear-gradient(135deg, rgba(107, 114, 128, 0.7) 0%, rgba(75, 85, 99, 0.7) 100%)"
      },
      {
        bg: "rgba(236, 72, 153, 0.7)", // Soft pink
        border: "rgba(236, 72, 153, 1)",
        hover: "rgba(236, 72, 153, 0.85)",
        gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.7) 0%, rgba(219, 39, 119, 0.7) 100%)"
      },
      {
        bg: "rgba(34, 197, 94, 0.7)", // Mint green
        border: "rgba(34, 197, 94, 1)",
        hover: "rgba(34, 197, 94, 0.85)",
        gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.7) 0%, rgba(22, 163, 74, 0.7) 100%)"
      }
    ];

    const datasets = seriesData.map((series, index) => {
      const data = labels.map(label => {
        const groupValues = groupedData.get(label) || [];
        return groupValues[index] || 0;
      });
      
      // For pie/doughnut charts, we need to assign different colors to each data point
      if (chartData.type === "pie" || chartData.type === "donut") {
        return {
          label: series.name,
          data,
          backgroundColor: labels.map((_, i) => colors[i % colors.length].bg),
          borderColor: labels.map((_, i) => colors[i % colors.length].border),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: labels.map((_, i) => colors[i % colors.length].hover),
          hoverBorderColor: labels.map((_, i) => colors[i % colors.length].border),
          hoverBorderWidth: 3,
          // Add subtle shadow effect
          shadowOffsetX: 0,
          shadowOffsetY: 2,
          shadowBlur: 4,
          shadowColor: labels.map((_, i) => colors[i % colors.length].border + '40'),
        };
      }
      
      // For other chart types, use the original logic
      const colorScheme = colors[index % colors.length];
      return {
        label: series.name,
        data,
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: colorScheme.hover,
        hoverBorderColor: colorScheme.border,
        hoverBorderWidth: 3,
        // Add subtle shadow effect
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 4,
        shadowColor: colorScheme.border + '40',
      };
    });

    return {
      labels,
      datasets,
    };
  }, []);

  const generateMockData = (chartData: ChartData) => {
    // Generate mock data for demonstration
    const categories = ["Branch A", "Branch B", "Branch C", "Branch D"];
    
    // Modern, clean, minimal color palette
    const colors = [
      {
        bg: "rgba(59, 130, 246, 0.7)", // Clean blue
        border: "rgba(59, 130, 246, 1)",
        hover: "rgba(59, 130, 246, 0.85)",
        gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.7) 0%, rgba(37, 99, 235, 0.7) 100%)"
      },
      {
        bg: "rgba(16, 185, 129, 0.7)", // Fresh green
        border: "rgba(16, 185, 129, 1)",
        hover: "rgba(16, 185, 129, 0.85)",
        gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.7) 0%, rgba(5, 150, 105, 0.7) 100%)"
      },
      {
        bg: "rgba(245, 158, 11, 0.7)", // Warm amber
        border: "rgba(245, 158, 11, 1)",
        hover: "rgba(245, 158, 11, 0.85)",
        gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.7) 0%, rgba(217, 119, 6, 0.7) 100%)"
      },
      {
        bg: "rgba(239, 68, 68, 0.7)", // Clean red
        border: "rgba(239, 68, 68, 1)",
        hover: "rgba(239, 68, 68, 0.85)",
        gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.7) 0%, rgba(220, 38, 38, 0.7) 100%)"
      },
      {
        bg: "rgba(139, 92, 246, 0.7)", // Soft purple
        border: "rgba(139, 92, 246, 1)",
        hover: "rgba(139, 92, 246, 0.85)",
        gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.7) 0%, rgba(124, 58, 237, 0.7) 100%)"
      },
      {
        bg: "rgba(107, 114, 128, 0.7)", // Neutral gray
        border: "rgba(107, 114, 128, 1)",
        hover: "rgba(107, 114, 128, 0.85)",
        gradient: "linear-gradient(135deg, rgba(107, 114, 128, 0.7) 0%, rgba(75, 85, 99, 0.7) 100%)"
      },
      {
        bg: "rgba(236, 72, 153, 0.7)", // Soft pink
        border: "rgba(236, 72, 153, 1)",
        hover: "rgba(236, 72, 153, 0.85)",
        gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.7) 0%, rgba(219, 39, 119, 0.7) 100%)"
      },
      {
        bg: "rgba(34, 197, 94, 0.7)", // Mint green
        border: "rgba(34, 197, 94, 1)",
        hover: "rgba(34, 197, 94, 0.85)",
        gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.7) 0%, rgba(22, 163, 74, 0.7) 100%)"
      }
    ];
    
    const datasets = chartData.series.map((series, index) => {
      const data = categories.map(() => Math.floor(Math.random() * 100000) + 10000);
      
      // For pie/doughnut charts, we need to assign different colors to each data point
      if (chartData.type === "pie" || chartData.type === "donut") {
        return {
          label: series.name,
          data,
          backgroundColor: categories.map((_, i) => colors[i % colors.length].bg),
          borderColor: categories.map((_, i) => colors[i % colors.length].border),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: categories.map((_, i) => colors[i % colors.length].hover),
          hoverBorderColor: categories.map((_, i) => colors[i % colors.length].border),
          hoverBorderWidth: 3,
          // Add subtle shadow effect
          shadowOffsetX: 0,
          shadowOffsetY: 2,
          shadowBlur: 4,
          shadowColor: categories.map((_, i) => colors[i % colors.length].border + '40'),
        };
      }
      
      // For other chart types, use the original logic
      const colorScheme = colors[index % colors.length];
      return {
        label: series.name,
        data,
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: colorScheme.hover,
        hoverBorderColor: colorScheme.border,
        hoverBorderWidth: 3,
        // Add subtle shadow effect
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 4,
        shadowColor: colorScheme.border + '40',
      };
    });

    return {
      labels: categories,
      datasets,
    };
  };

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
          return "donut";
        case "combo_chart":
          return "bar"; // Default to bar for combo charts
        default:
          return type;
      }
    };

    const chartType = getChartType(chartData.type);
    
    const config = {
      type: chartType,
      data: chartDataForRender,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: chartData.type === "horizontal_bar" ? "y" : "x",
        interaction: {
          intersect: false,
          mode: 'index' as const,
        },
        animation: {
          duration: 1200,
          easing: 'easeOutCubic' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delay: (context: any) => context.dataIndex * 100,
          animateRotate: true,
          animateScale: true,
        },
        plugins: {
          title: {
            display: true,
            text: chartData.name,
            font: {
              size: 20,
              weight: "600" as const,
              family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            color: "#1f2937",
            padding: {
              top: 20,
              bottom: 30,
            },
          },
          legend: {
            display: chartData.series.length > 1,
            position: (chartType === "pie" || chartType === "doughnut") ? "bottom" as const : "top" as const,
            align: "center" as const,
            labels: {
              usePointStyle: true,
              pointStyle: (chartType === "pie" || chartType === "doughnut") ? "circle" : "rect",
              padding: (chartType === "pie" || chartType === "doughnut") ? 15 : 20,
              font: {
                size: (chartType === "pie" || chartType === "doughnut") ? 13 : 12,
                weight: "600" as const,
                family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              color: "#374151",
              generateLabels: (chartType === "pie" || chartType === "doughnut") ? function(chart: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label: string, i: number) => {
                    const dataset = data.datasets[0];
                    const value = dataset.data[i];
                    const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return {
                      text: `${label}: ${percentage}%`,
                      fillStyle: dataset.backgroundColor[i],
                      strokeStyle: dataset.borderColor[i],
                      lineWidth: dataset.borderWidth,
                      pointStyle: 'circle',
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              } : undefined,
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
              family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            bodyFont: {
              size: 12,
              weight: "500" as const,
              family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: function(context: any) {
                const value = context.parsed.y || context.parsed;
                if (chartType === "pie" || chartType === "doughnut") {
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
                }
                return `${context.dataset.label}: $${value.toLocaleString()}`;
              }
            }
          },
        },
        // Special configuration for pie and doughnut charts
        ...(chartType === "pie" || chartType === "donut" ? {
          cutout: chartType === "donut" ? "60%" : "0%",
          rotation: -90,
          circumference: 360,
          spacing: 2,
        } : {}),
        scales: (chartType === "pie" || chartType === "donut") ? {} : {
          x: {
            beginAtZero: true,
            grid: {
              display: false,
            },
            ticks: {
              color: "#6b7280",
              font: {
                size: 11,
                weight: "500" as const,
                family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              padding: 8,
            },
            border: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(203, 213, 225, 0.8)",
              drawBorder: false,
              drawTicks: false,
              lineWidth: 1,
            },
            ticks: {
              color: "#6b7280",
              font: {
                size: 11,
                weight: "500" as const,
                family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              padding: 12,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              callback: function(value: any) {
                return `$${value.toLocaleString()}`;
              }
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

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [pxmlContent, csvData, generateChartData]);

  return (
    <div className="mt-4" style={{ width: '600px', maxWidth: '100%' }}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center h-80 space-y-4 bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300/80 rounded-2xl p-6 shadow-lg">
          <div className="relative">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
          <div className="text-sm font-medium text-slate-600">Loading chart data...</div>
          <div className="text-xs text-slate-400">Processing CSV file</div>
        </div>
      )}
      
      {error && (
        <div className="flex flex-col items-center justify-center h-80 space-y-4 bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300/80 rounded-2xl p-6 shadow-lg">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-sm font-medium text-red-600">Failed to load data</div>
          <div className="text-xs text-red-400 max-w-xs text-center">{error}</div>
        </div>
      )}
      
           {!isLoading && !error && (
             <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-200/60 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 backdrop-blur-sm">
               <div className="relative h-96">
                 <canvas ref={chartRef} className="w-full h-full" />
               </div>
             </div>
           )}
    </div>
  );
};

export default ChartRenderer;
