"use client";

/**
 * LineChart Component
 *
 * Renders line and area charts using Recharts.
 * Supports zoom/pan via Brush component for large time series.
 *
 * @see US-017: Preview de Gráficos no Chat
 * @see US-020: Gráfico de Linhas
 */

import {
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
} from "recharts";
import { useState, useCallback } from "react";
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

/** Threshold for auto-enabling brush */
const BRUSH_AUTO_THRESHOLD = 10;

export function LineChartComponent({
  config,
  width,
  height = 250,
  className = "",
}: BaseChartProps) {
  const {
    type,
    data,
    series,
    colors,
    xAxisLabel,
    yAxisLabel,
    showLegend,
    showTooltip,
    enableBrush,
  } = config;

  // State for zoom selection
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [zoomDomain, setZoomDomain] = useState<{ left: number; right: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Default series if not provided
  const chartSeries = series || [{ dataKey: "value", name: "Valor" }];

  const isArea = type === "area";

  // Auto-enable brush for large datasets
  const shouldShowBrush = enableBrush ?? data.length > BRUSH_AUTO_THRESHOLD;

  // Calculate brush height for spacing
  const brushHeight = shouldShowBrush ? 30 : 0;

  const ChartContainer = isArea ? RechartsAreaChart : RechartsLineChart;

  // Get visible data based on zoom
  const visibleData = zoomDomain
    ? data.slice(zoomDomain.left, zoomDomain.right + 1)
    : data;

  // Handle mouse down for zoom selection
  const handleMouseDown = useCallback((e: { activeLabel?: string }) => {
    if (e.activeLabel && !shouldShowBrush) {
      setRefAreaLeft(e.activeLabel);
      setIsSelecting(true);
    }
  }, [shouldShowBrush]);

  // Handle mouse move during zoom selection
  const handleMouseMove = useCallback((e: { activeLabel?: string }) => {
    if (isSelecting && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  }, [isSelecting]);

  // Handle mouse up to complete zoom selection
  const handleMouseUp = useCallback(() => {
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      const leftIndex = data.findIndex((d) => d.name === refAreaLeft);
      const rightIndex = data.findIndex((d) => d.name === refAreaRight);

      if (leftIndex !== -1 && rightIndex !== -1) {
        const left = Math.min(leftIndex, rightIndex);
        const right = Math.max(leftIndex, rightIndex);
        setZoomDomain({ left, right });
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  }, [data, refAreaLeft, refAreaRight]);

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    setZoomDomain(null);
  }, []);

  return (
    <div className={`w-full relative ${className}`} style={{ height }}>
      {/* Zoom reset button */}
      {zoomDomain && (
        <button
          onClick={handleResetZoom}
          className="absolute top-0 right-0 z-10 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
          title="Resetar zoom"
        >
          Resetar Zoom
        </button>
      )}

      <ResponsiveContainer width={width || "100%"} height="100%">
        <ChartContainer
          data={shouldShowBrush ? data : visibleData}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: xAxisLabel ? 30 : shouldShowBrush ? 40 : 10,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
            allowDataOverflow={!shouldShowBrush}
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
            domain={["auto", "auto"]}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && chartSeries.length > 1 && (
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              formatter={(value) => (
                <span className="text-gray-700 text-sm">{value}</span>
              )}
            />
          )}

          {/* Brush for zoom/pan on large datasets */}
          {shouldShowBrush && (
            <Brush
              dataKey="name"
              height={brushHeight}
              stroke="#6366f1"
              fill="#f3f4f6"
              tickFormatter={(value) => value}
            />
          )}

          {/* Reference area for zoom selection */}
          {refAreaLeft && refAreaRight && (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fill="#6366f1"
              fillOpacity={0.1}
            />
          )}

          {chartSeries.map((s, index) => {
            const color = s.color || colors[index % colors.length];

            if (isArea) {
              return (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: color }}
                />
              );
            }

            return (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: color }}
              />
            );
          })}
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
