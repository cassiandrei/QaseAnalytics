"use client";

/**
 * BarChart Component
 *
 * Renders bar charts using Recharts.
 * Supports vertical/horizontal layout, grouped/stacked bars, and value labels.
 *
 * @see US-017: Preview de Gráficos no Chat
 * @see US-021: Gráfico de Barras
 */

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { BaseChartProps } from "./types";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-gray-600 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function BarChartComponent({
  config,
  width,
  height = 250,
  className = "",
}: BaseChartProps) {
  const {
    data,
    series,
    colors,
    xAxisLabel,
    yAxisLabel,
    showLegend,
    showTooltip,
    barLayout = "vertical",
    barStackMode = "grouped",
    showBarLabels = false,
  } = config;

  // Default series if not provided (single value series)
  const chartSeries = series || [{ dataKey: "value", name: "Valor", color: colors[0] }];

  // Check if it's a single series chart (can use individual colors per bar)
  const isSingleSeries = chartSeries.length === 1;

  // Determine layout orientation
  const isHorizontal = barLayout === "horizontal";

  // Determine stacking mode
  const isStacked = barStackMode === "stacked" || barStackMode === "percent";
  const stackId = isStacked ? "stack" : undefined;

  // For percent mode, normalize data
  const normalizedData = barStackMode === "percent" && chartSeries.length > 1
    ? data.map((item) => {
        const total = chartSeries.reduce((sum, s) => {
          const val = item[s.dataKey];
          return sum + (typeof val === "number" ? val : 0);
        }, 0);

        if (total === 0) return item;

        const normalized = { ...item };
        chartSeries.forEach((s) => {
          const val = item[s.dataKey];
          if (typeof val === "number") {
            normalized[s.dataKey] = Math.round((val / total) * 100);
          }
        });
        return normalized;
      })
    : data;

  // Calculate bar radius based on layout and stacking
  const getBarRadius = (seriesIndex: number): [number, number, number, number] => {
    if (!isStacked) {
      return isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
    }
    // For stacked bars, only round the top/right bar
    const isLastSeries = seriesIndex === chartSeries.length - 1;
    if (!isLastSeries) return [0, 0, 0, 0];
    return isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
  };

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width={width || "100%"} height="100%">
        <RechartsBarChart
          data={normalizedData}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{
            top: 10,
            right: showBarLabels && isHorizontal ? 50 : 10,
            left: 10,
            bottom: xAxisLabel ? 30 : 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                domain={barStackMode === "percent" ? [0, 100] : [0, "auto"]}
                tickFormatter={barStackMode === "percent" ? (v) => `${v}%` : undefined}
                label={
                  yAxisLabel
                    ? { value: yAxisLabel, position: "bottom", fill: "#6b7280" }
                    : undefined
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                width={80}
                label={
                  xAxisLabel
                    ? {
                        value: xAxisLabel,
                        angle: -90,
                        position: "insideLeft",
                        fill: "#6b7280",
                      }
                    : undefined
                }
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                label={
                  xAxisLabel
                    ? { value: xAxisLabel, position: "bottom", fill: "#6b7280" }
                    : undefined
                }
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                domain={barStackMode === "percent" ? [0, 100] : [0, "auto"]}
                tickFormatter={barStackMode === "percent" ? (v) => `${v}%` : undefined}
                label={
                  yAxisLabel
                    ? {
                        value: yAxisLabel,
                        angle: -90,
                        position: "insideLeft",
                        fill: "#6b7280",
                      }
                    : undefined
                }
              />
            </>
          )}

          {showTooltip && <Tooltip content={<CustomTooltip />} />}

          {showLegend && chartSeries.length > 1 && (
            <Legend
              verticalAlign="top"
              height={36}
              iconType="square"
              formatter={(value) => (
                <span className="text-gray-700 text-sm">{value}</span>
              )}
            />
          )}

          {chartSeries.map((s, seriesIndex) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={s.color || colors[seriesIndex % colors.length]}
              radius={getBarRadius(seriesIndex)}
              stackId={stackId}
            >
              {/* Individual colors per bar for single series */}
              {isSingleSeries &&
                normalizedData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}

              {/* Value labels on bars */}
              {showBarLabels && (
                <LabelList
                  dataKey={s.dataKey}
                  position={isHorizontal ? "right" : "top"}
                  fill="#374151"
                  fontSize={11}
                  formatter={(value: number) =>
                    barStackMode === "percent" ? `${value}%` : value.toLocaleString()
                  }
                />
              )}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
