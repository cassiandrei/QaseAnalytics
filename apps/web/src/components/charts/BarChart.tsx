"use client";

/**
 * BarChart Component
 *
 * Renders bar charts using Recharts.
 *
 * @see US-017: Preview de Gráficos no Chat
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
  } = config;

  // Default series if not provided (single value series)
  const chartSeries = series || [{ dataKey: "value", name: "Valor", color: colors[0] }];

  // Check if it's a single series chart (can use individual colors per bar)
  const isSingleSeries = chartSeries.length === 1;

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width={width || "100%"} height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: xAxisLabel ? 30 : 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
              radius={[4, 4, 0, 0]}
            >
              {/* Individual colors per bar for single series */}
              {isSingleSeries &&
                data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
