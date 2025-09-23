import React, { useMemo, useRef, useEffect } from "react";
import { Chart as ChartJS, TooltipItem, ChartConfiguration } from "chart.js";
import {
  BaseChartProps,
  colors,
  processCSVData,
  getCommonTooltipConfig,
  getCommonScalesConfig,
} from "./base-chart";

const MAX_BAR_ENTRIES = 10;

interface BarDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  borderSkipped: boolean;
  hoverBackgroundColor: string;
  hoverBorderColor: string;
  hoverBorderWidth: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
}

const limitBarData = (
  labels: string[],
  datasets: BarDataset[],
  maxEntries: number
) => {
  if (labels.length <= maxEntries)
    return { labels, datasets, wasLimited: false };

  const indexedLabels = labels.map((label, index) => ({
    label,
    index,
    totalValue: datasets.reduce(
      (sum, dataset) => sum + (dataset.data[index] || 0),
      0
    ),
  }));

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

export const BarChart: React.FC<BaseChartProps> = ({
  chartData,
  csvData,
  chartTypeOverride,
  showAllData = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  onDataLimitedChange,
  barChartLimit = 10,
}) => {
  const { config, wasLimited } = useMemo(() => {
    const { labels, groupedData, seriesData } = processCSVData(chartData, csvData);

    const datasets = seriesData.map((series, index) => {
      const data = labels.map((label) => {
        const groupValues = groupedData.get(label) || [];
        return groupValues[index] || 0;
      });

      const colorScheme = colors[index % colors.length];

      return {
        label: series.name,
        data,
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
        borderWidth: 2,
        borderRadius: 12,
        borderSkipped: false,
        hoverBackgroundColor: colorScheme.hover,
        hoverBorderColor: colorScheme.border,
        hoverBorderWidth: 3,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 4,
        shadowColor: colorScheme.border + "40",
      };
    });

    let finalLabels = labels;
    let finalDatasets = datasets;
    let wasLimited = false;

    // Check if we should limit data based on barChartLimit
    if (barChartLimit !== 'all') {
      const limitEntries = barChartLimit === 5 ? 5 : 10;
      const result = limitBarData(labels, datasets, limitEntries);
      finalLabels = result.labels;
      finalDatasets = result.datasets as BarDataset[];
      wasLimited = result.wasLimited;
    } else {
      // Show all data but still track if it would have been limited
      wasLimited = labels.length >= MAX_BAR_ENTRIES;
    }

    const effectiveType = chartTypeOverride || chartData.type;
    const isHorizontal = effectiveType === "horizontal_bar";

    const config = {
      type: "bar" as const,
      data: {
        labels: finalLabels,
        datasets: finalDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: (isHorizontal ? "y" : "x") as "x" | "y",
        interaction: {
          intersect: false,
          mode: "index" as const,
        },
        animation: {
          duration: finalLabels.length > 10 ? 600 : 1000,
          easing: "easeOutCubic" as const,
          delay: (context: { dataIndex: number }) => {
            const baseDelay = finalLabels.length > 10 ? 20 : 50;
            return context.dataIndex * baseDelay;
          },
          animateRotate: true,
          animateScale: true,
        },
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: chartData.series.length > 1,
            position: "top" as const,
            align: "center" as const,
            labels: {
              usePointStyle: true,
              pointStyle: "rect",
              padding: 20,
              font: {
                size: 13,
                weight: "bold" as const,
                family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              color: "#1e293b",
              boxWidth: 14,
              boxHeight: 14,
            },
          },
          tooltip: {
            ...getCommonTooltipConfig(),
            callbacks: {
              label: function (context: TooltipItem<'bar'>) {
                const value = context.parsed.y || context.parsed.x;
                return `${context.dataset.label}: ${value.toLocaleString()}`;
              },
            },
          },
        },
        scales: isHorizontal ? {
          x: {
            beginAtZero: true,
            grid: {
              display: false,
            },
            ticks: {
              color: "#64748b",
              font: {
                size: 12,
                weight: "bold" as const,
                family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              padding: 12,
              callback: function (value: number | string) {
                return `${value.toLocaleString()}`;
              },
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
                weight: "normal" as const,
                family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              padding: 16,
            },
            border: {
              display: false,
            },
          },
        } : getCommonScalesConfig(),
      },
    };

    return { config, wasLimited };
  }, [chartData, csvData, chartTypeOverride, barChartLimit]);


  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new ChartJS(chartRef.current, config as ChartConfiguration);

    // Notify parent component about data limitation
    if (onDataLimitedChange) {
      onDataLimitedChange(wasLimited);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [config, wasLimited, onDataLimitedChange]);

  return (
    <div className="relative h-64 sm:h-80">
      <canvas ref={chartRef} className="w-full h-full" />
    </div>
  );
};