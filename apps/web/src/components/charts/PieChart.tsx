"use client";

/**
 * PieChart Component
 *
 * Renders pie and donut charts using Recharts.
 *
 * @see US-017: Preview de Gráficos no Chat
 */

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BaseChartProps } from "./types";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      percent?: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    if (!data) return null;

    const percent = data.payload.percent
      ? (data.payload.percent * 100).toFixed(1)
      : null;

    return (
      <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-gray-600">
          Valor: <span className="font-semibold">{data.value}</span>
          {percent && (
            <span className="text-gray-400 ml-1">({percent}%)</span>
          )}
        </p>
      </div>
    );
  }
  return null;
}

export function PieChartComponent({
  config,
  width,
  height = 250,
  className = "",
}: BaseChartProps) {
  const { type, data, colors, showLegend, showTooltip } = config;

  // Donut chart has inner radius
  const innerRadius = type === "donut" ? "50%" : 0;

  // Calculate total for percentages
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const dataWithPercent = data.map((d) => ({
    ...d,
    percent: total > 0 ? d.value / total : 0,
  }));

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width={width || "100%"} height="100%">
        <RechartsPieChart>
          <Pie
            data={dataWithPercent}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""
            }
            innerRadius={innerRadius}
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-gray-700 text-sm">{value}</span>
              )}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
