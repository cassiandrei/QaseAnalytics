"use client";

/**
 * PieChart Component
 *
 * Renders pie and donut charts using Recharts.
 * Supports center value display and hover effects.
 *
 * @see US-017: Preview de Gráficos no Chat
 * @see US-022: Gráfico de Pizza/Donut
 */

import { useState, useCallback } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";
import type { BaseChartProps } from "./types";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

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
          Valor: <span className="font-semibold">{data.value.toLocaleString()}</span>
          {percent && (
            <span className="text-gray-400 ml-1">({percent}%)</span>
          )}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * Renders the active (hovered) sector with expanded appearance.
 */
function renderActiveShape(props: PieSectorDataItem) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = "#8884d8",
  } = props;

  return (
    <g>
      {/* Expanded outer sector */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius as number) + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      {/* Inner shadow sector for depth effect */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={(innerRadius as number) - 2}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        fillOpacity={0.3}
      />
    </g>
  );
}

export function PieChartComponent({
  config,
  width,
  height = 250,
  className = "",
}: BaseChartProps) {
  const {
    type,
    data,
    colors,
    showLegend,
    showTooltip,
    showCenterValue,
    centerLabel,
    centerValue,
  } = config;

  // State for active (hovered) sector
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Handle mouse enter on sector
  const handleMouseEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  // Donut chart has inner radius
  const isDonut = type === "donut";
  const innerRadius = isDonut ? "50%" : 0;

  // Calculate total for percentages and center value
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const dataWithPercent = data.map((d) => ({
    ...d,
    percent: total > 0 ? d.value / total : 0,
  }));

  // Determine center value to display
  const displayCenterValue = centerValue ?? total;
  const shouldShowCenter = isDonut && showCenterValue !== false;

  // Calculate center position (will be determined by ResponsiveContainer)
  // Using percentages relative to container

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
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                stroke="#fff"
                strokeWidth={2}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                }}
              />
            ))}
          </Pie>

          {/* Center value for donut charts */}
          {shouldShowCenter && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              <tspan
                x="50%"
                dy={centerLabel ? "-0.5em" : "0"}
                className="fill-gray-900 font-bold"
                style={{ fontSize: "1.25rem" }}
              >
                {typeof displayCenterValue === "number"
                  ? displayCenterValue.toLocaleString()
                  : displayCenterValue}
              </tspan>
              {centerLabel && (
                <tspan
                  x="50%"
                  dy="1.5em"
                  className="fill-gray-500"
                  style={{ fontSize: "0.7rem" }}
                >
                  {centerLabel}
                </tspan>
              )}
            </text>
          )}

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
