import React, { useRef, useEffect } from "react";
import { Chart as ChartJS } from "chart.js";

export interface ChartData {
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

export interface BaseChartProps {
  chartData: ChartData;
  csvData: string[][];
  chartTypeOverride?: string | null;
  showAllData?: boolean;
  onDataLimitedChange?: (isLimited: boolean) => void;
  barChartLimit?: 5 | 10 | 'all';
}

export const colors = [
  {
    bg: "rgba(59, 130, 246, 0.8)",
    border: "rgb(59, 130, 246)",
    hover: "rgba(59, 130, 246, 0.9)",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.8) 100%)",
  },
  {
    bg: "rgba(34, 197, 94, 0.8)",
    border: "rgb(34, 197, 94)",
    hover: "rgba(34, 197, 94, 0.9)",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)",
  },
  {
    bg: "rgba(251, 146, 60, 0.8)",
    border: "rgb(251, 146, 60)",
    hover: "rgba(251, 146, 60, 0.9)",
    gradient: "linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.8) 100%)",
  },
  {
    bg: "rgba(244, 63, 94, 0.8)",
    border: "rgb(244, 63, 94)",
    hover: "rgba(244, 63, 94, 0.9)",
    gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.8) 0%, rgba(225, 29, 72, 0.8) 100%)",
  },
  {
    bg: "rgba(14, 165, 233, 0.8)",
    border: "rgb(14, 165, 233)",
    hover: "rgba(14, 165, 233, 0.9)",
    gradient: "linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(2, 132, 199, 0.8) 100%)",
  },
  {
    bg: "rgba(236, 72, 153, 0.8)",
    border: "rgb(236, 72, 153)",
    hover: "rgba(236, 72, 153, 0.9)",
    gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.8) 0%, rgba(219, 39, 119, 0.8) 100%)",
  },
  {
    bg: "rgba(16, 185, 129, 0.8)",
    border: "rgb(16, 185, 129)",
    hover: "rgba(16, 185, 129, 0.9)",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, rgba(15, 118, 110, 0.8) 100%)",
  },
  {
    bg: "rgba(245, 158, 11, 0.8)",
    border: "rgb(245, 158, 11)",
    hover: "rgba(245, 158, 11, 0.9)",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(217, 119, 6, 0.8) 100%)",
  },
];

export const getColumnIndex = (columnRef: string, headers: string[]): number => {
  if (columnRef.length === 1 && /[A-Z]/.test(columnRef)) {
    return columnRef.charCodeAt(0) - "A".charCodeAt(0);
  }
  return headers.findIndex(
    (header) =>
      header.toLowerCase().includes(columnRef.toLowerCase()) ||
      header === columnRef
  );
};

export const processCSVData = (chartData: ChartData, csvData: string[][]) => {
  if (csvData.length === 0) {
    return generateMockData(chartData);
  }

  const headers = csvData[0];
  const dataRows = csvData.slice(1);

  const xAxisColumnIndex = getColumnIndex(chartData.xAxis.column, headers);
  const seriesData = chartData.series.map((series) => ({
    ...series,
    columnIndex: getColumnIndex(series.column, headers),
  }));

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
        groupValues[seriesIndex] += value;
      }
    });
  });

  const labels = Array.from(groupedData.keys());
  return { labels, groupedData, seriesData };
};

const generateMockData = (chartData: ChartData) => {
  const categories = ["Branch A", "Branch B", "Branch C", "Branch D"];
  const groupedData = new Map<string, number[]>();
  
  categories.forEach(category => {
    const values = chartData.series.map(() => Math.floor(Math.random() * 100000) + 10000);
    groupedData.set(category, values);
  });

  return {
    labels: categories,
    groupedData,
    seriesData: chartData.series.map((series, index) => ({ ...series, columnIndex: index }))
  };
};

export const getCommonTooltipConfig = () => ({
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
});

export const getCommonScalesConfig = () => ({
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
        family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
        family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      },
      padding: 16,
      callback: function (value: any) {
        return `${value.toLocaleString()}`;
      },
    },
    border: {
      display: false,
    },
  },
});

export const useBaseChart = (
  chartData: ChartData,
  csvData: string[][],
  config: any
) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new ChartJS(chartRef.current, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [JSON.stringify(config)]);

  return { chartRef, chartInstanceRef };
};