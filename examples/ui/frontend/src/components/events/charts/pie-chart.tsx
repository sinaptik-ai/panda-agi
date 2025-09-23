import React, { useMemo, useRef, useEffect, useState } from "react";
import { Chart as ChartJS, TooltipItem, ChartConfiguration } from "chart.js";
import {
  BaseChartProps,
  colors,
  processCSVData,
  getCommonTooltipConfig,
} from "./base-chart";

const MAX_PIE_ENTRIES = 15;

interface PieDataset {
  label: string;
  data: number[];
  backgroundColor: string[];
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  hoverBackgroundColor: string[];
  hoverBorderColor: string;
  hoverBorderWidth: number;
  spacing: number;
}

const limitPieData = (
  labels: string[],
  datasets: PieDataset[],
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

  const sortedEntries = indexedLabels.sort(
    (a, b) => b.totalValue - a.totalValue
  );

  const topEntries = sortedEntries.slice(0, maxEntries - 1);
  const otherEntries = sortedEntries.slice(maxEntries - 1);

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
              (entry) => (dataset.backgroundColor as string[])[entry.index]
            ),
            "#94a3b8",
          ]
        : dataset.backgroundColor,
      borderColor: Array.isArray(dataset.borderColor)
        ? [
            ...topEntries.map((entry) => (dataset.borderColor as unknown as string[])[entry.index]),
            "#64748b",
          ]
        : dataset.borderColor,
      hoverBackgroundColor: Array.isArray(dataset.hoverBackgroundColor)
        ? [
            ...topEntries.map(
              (entry) => (dataset.hoverBackgroundColor as string[])[entry.index]
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

export const PieChart: React.FC<BaseChartProps & { isDoughnut?: boolean }> = ({
  chartData,
  csvData,
  chartTypeOverride,
  showAllData = false,
  onDataLimitedChange,
  isDoughnut = false,
}) => {
  const [legendData, setLegendData] = useState<{
    labels: string[];
    data: number[];
    colors: string[];
  } | null>(null);
  

  const { config, wasLimited } = useMemo(() => {
    const { labels, groupedData, seriesData } = processCSVData(chartData, csvData);

    const datasets = seriesData.map((series, index) => {
      const data = labels.map((label) => {
        const groupValues = groupedData.get(label) || {};
        return groupValues[index.toString()] || 0;
      });

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
    });

    let finalLabels = labels;
    let finalDatasets = datasets;
    let wasLimited = false;

    if (!showAllData) {
      const result = limitPieData(labels, datasets, MAX_PIE_ENTRIES);
      finalLabels = result.labels;
      finalDatasets = result.datasets as PieDataset[];
      wasLimited = result.wasLimited;
    } else {
      wasLimited = labels.length > MAX_PIE_ENTRIES;
    }


    const config = {
      type: isDoughnut ? ("doughnut" as const) : ("pie" as const),
      data: {
        labels: finalLabels,
        datasets: finalDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: isDoughnut ? "60%" : "0%",
        rotation: -90,
        circumference: 360,
        spacing: 2,
        interaction: {
          intersect: true,
          mode: "point" as const,
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
            display: false,
          },
          tooltip: {
            ...getCommonTooltipConfig(),
            callbacks: {
              label: function (context: TooltipItem<'pie'>) {
                const value = context.parsed;
                const total = context.dataset.data.reduce(
                  (a: number, b: number) => a + b,
                  0
                );
                const percentage = ((value / total) * 100).toFixed(1);
                return `${
                  context.label
                }: ${value.toLocaleString()} (${percentage}% of area)`;
              },
            },
          },
        },
      },
    };

    return { config, wasLimited };
  }, [JSON.stringify(chartData), JSON.stringify(csvData), chartTypeOverride, showAllData, isDoughnut]);


  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new ChartJS(chartRef.current, config as ChartConfiguration);

    // Set legend data after chart is created
    if (config.data.datasets.length > 0) {
      const dataset = config.data.datasets[0];
      setLegendData({
        labels: config.data.labels,
        data: dataset.data,
        colors: Array.isArray(dataset.backgroundColor) 
          ? dataset.backgroundColor 
          : [dataset.backgroundColor],
      });
    }
    
    
    // Notify parent component
    if (onDataLimitedChange) {
      onDataLimitedChange(wasLimited);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [config]);


  return (
    <>
      <div className="relative h-64 sm:h-80">
        <canvas ref={chartRef} className="w-full h-full" />
      </div>
      
      {/* Clean Minimal Legend for Pie Charts */}
      {legendData && (
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
};