"use client";

/**
 * ChartPreview Component
 *
 * Renders a chart inline in chat messages with expand and save options.
 *
 * @see US-017: Preview de Gráficos no Chat
 */

import { useState, useCallback } from "react";
import { PieChartComponent } from "./PieChart";
import { BarChartComponent } from "./BarChart";
import { LineChartComponent } from "./LineChart";
import type { ChartConfig } from "./types";

export interface ChartPreviewProps {
  config: ChartConfig;
  onExpand?: (config: ChartConfig) => void;
  onSaveAsWidget?: (config: ChartConfig) => void;
}

/**
 * Renders the appropriate chart component based on type.
 */
function ChartRenderer({
  config,
  height,
}: {
  config: ChartConfig;
  height: number;
}) {
  const props = { config, height };

  switch (config.type) {
    case "pie":
    case "donut":
      return <PieChartComponent {...props} />;
    case "bar":
      return <BarChartComponent {...props} />;
    case "line":
    case "area":
      return <LineChartComponent {...props} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          Tipo de gráfico não suportado: {config.type}
        </div>
      );
  }
}

export function ChartPreview({
  config,
  onExpand,
  onSaveAsWidget,
}: ChartPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleExpand = useCallback(() => {
    onExpand?.(config);
  }, [config, onExpand]);

  const handleSaveAsWidget = useCallback(() => {
    onSaveAsWidget?.(config);
  }, [config, onSaveAsWidget]);

  return (
    <div
      className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden my-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chart header */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white">
        <h4 className="font-medium text-gray-900 text-sm">{config.title}</h4>
        {config.description && (
          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
        )}
      </div>

      {/* Chart content */}
      <div className="p-3">
        <ChartRenderer config={config} height={200} />
      </div>

      {/* Action buttons (shown on hover) */}
      {isHovered && (
        <div className="absolute top-2 right-2 flex gap-1">
          {onExpand && (
            <button
              onClick={handleExpand}
              className="p-1.5 bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Expandir gráfico"
              aria-label="Expandir gráfico"
            >
              <ExpandIcon className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {onSaveAsWidget && (
            <button
              onClick={handleSaveAsWidget}
              className="p-1.5 bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Salvar como Widget"
              aria-label="Salvar como Widget"
            >
              <SaveIcon className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Expand icon SVG component.
 */
function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
      />
    </svg>
  );
}

/**
 * Save/bookmark icon SVG component.
 */
function SaveIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
      />
    </svg>
  );
}

/**
 * Parses chart config from markdown content.
 * Looks for :::chart\n{json}\n::: blocks.
 */
export function parseChartFromMarkdown(content: string): {
  beforeChart: string;
  chartConfig: ChartConfig | null;
  afterChart: string;
} {
  const chartRegex = /:::chart\n([\s\S]*?)\n:::/;
  const match = content.match(chartRegex);

  if (!match || !match[1]) {
    return {
      beforeChart: content,
      chartConfig: null,
      afterChart: "",
    };
  }

  try {
    const chartConfig = JSON.parse(match[1]) as ChartConfig;

    // Validate required fields
    if (!chartConfig.id || !chartConfig.type || !chartConfig.data) {
      return {
        beforeChart: content,
        chartConfig: null,
        afterChart: "",
      };
    }

    const beforeChart = content.slice(0, match.index);
    const afterChart = content.slice((match.index ?? 0) + match[0].length);

    return {
      beforeChart,
      chartConfig,
      afterChart,
    };
  } catch {
    // Invalid JSON, return original content
    return {
      beforeChart: content,
      chartConfig: null,
      afterChart: "",
    };
  }
}

/**
 * Extracts all charts from markdown content.
 * Returns an array of segments (text or chart).
 */
export function extractChartsFromContent(
  content: string
): Array<{ type: "text"; content: string } | { type: "chart"; config: ChartConfig }> {
  const segments: Array<
    { type: "text"; content: string } | { type: "chart"; config: ChartConfig }
  > = [];

  let remaining = content;

  while (remaining.length > 0) {
    const { beforeChart, chartConfig, afterChart } = parseChartFromMarkdown(remaining);

    if (beforeChart.trim()) {
      segments.push({ type: "text", content: beforeChart });
    }

    if (chartConfig) {
      segments.push({ type: "chart", config: chartConfig });
      remaining = afterChart;
    } else {
      // No more charts found
      break;
    }
  }

  return segments;
}
