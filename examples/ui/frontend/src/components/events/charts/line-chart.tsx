import React, { useMemo, useRef, useEffect } from "react";
import { Chart as ChartJS, TooltipItem, ChartConfiguration } from "chart.js";
import {
  BaseChartProps,
  colors,
  processCSVData,
  getCommonTooltipConfig,
  getCommonScalesConfig,
  useBaseChart,
} from "./base-chart";

const MAX_LINE_ENTRIES = 25;

interface LineDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  hoverBorderColor: string;
  hoverBorderWidth: number;
  fill: boolean;
  tension: number;
  pointBackgroundColor: string;
  pointBorderColor: string;
  pointBorderWidth: number;
  pointHoverBackgroundColor: string;
  pointHoverBorderColor: string;
  pointHoverBorderWidth: number;
  pointRadius: number;
  pointHoverRadius: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
}

const sampleLineData = (
  labels: string[],
  datasets: LineDataset[],
  maxEntries: number
) => {
  if (labels.length <= maxEntries)
    return { labels, datasets, wasLimited: false };

  const sampledIndices = [0];

  if (maxEntries > 2) {
    const step = Math.floor((labels.length - 2) / (maxEntries - 2));
    for (let i = 1; i < maxEntries - 1; i++) {
      const index = Math.min(step * i, labels.length - 2);
      if (!sampledIndices.includes(index)) {
        sampledIndices.push(index);
      }
    }
  }

  sampledIndices.push(labels.length - 1);

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

export const LineChart: React.FC<BaseChartProps> = React.memo(({
  chartData,
  csvData,
  chartTypeOverride,
  showAllData = false,
  onDataLimitedChange,
}) => {
  const { config, wasLimited } = useMemo(() => {
    const { labels, groupedData, seriesData } = processCSVData(chartData, csvData);

    const datasets = seriesData.map((series, index) => {
      const data = labels.map((label) => {
        const groupValues = groupedData.get(label) || {};
        return groupValues[index.toString()] || 0;
      });

      const colorScheme = colors[index % colors.length];

      return {
        label: series.name,
        data,
        backgroundColor: "transparent",
        borderColor: colorScheme.border,
        borderWidth: 3,
        hoverBorderColor: colorScheme.border,
        hoverBorderWidth: 4,
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
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 4,
        shadowColor: colorScheme.border + "40",
      };
    });

    let finalLabels = labels;
    let finalDatasets = datasets;
    let wasLimited = false;

    if (!showAllData) {
      const result = sampleLineData(labels, datasets, MAX_LINE_ENTRIES);
      finalLabels = result.labels;
      finalDatasets = result.datasets;
      wasLimited = result.wasLimited;
    } else {
      wasLimited = labels.length > MAX_LINE_ENTRIES;
    }


    const config = {
      type: "line" as const,
      data: {
        labels: finalLabels,
        datasets: finalDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
              label: function (context: TooltipItem<'line'>) {
                const value = context.parsed.y;
                return `${context.dataset.label}: ${value.toLocaleString()}`;
              },
            },
          },
        },
        scales: getCommonScalesConfig(),
      },
    };

    return { config, wasLimited };
  }, [chartData, csvData, chartTypeOverride, showAllData]);

  const { chartRef, chartInstanceRef } = useBaseChart(chartData, csvData, config as ChartConfiguration);

  // Notify parent component about data limitation
  useEffect(() => {
    if (onDataLimitedChange) {
      onDataLimitedChange(wasLimited);
    }
  }, [wasLimited, onDataLimitedChange]);

  return (
    <div className="relative h-64 sm:h-80">
      <canvas ref={chartRef} className="w-full h-full" />
    </div>
  );
});

LineChart.displayName = 'LineChart';