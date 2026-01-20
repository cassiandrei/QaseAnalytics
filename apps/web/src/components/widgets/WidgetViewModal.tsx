"use client";

/**
 * WidgetViewModal Component
 *
 * Displays a widget in an expanded modal view.
 *
 * @see US-027: Listar Meus Widgets
 */

import { useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { PieChartComponent } from "../charts/PieChart";
import { BarChartComponent } from "../charts/BarChart";
import { LineChartComponent } from "../charts/LineChart";
import type { ChartConfig, ChartType, ChartDataPoint } from "../charts/types";
import type { Widget } from "../../lib/api";

export interface WidgetViewModalProps {
  widget: Widget | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (widget: Widget) => void;
  onRefresh?: (widget: Widget) => void;
  isRefreshing?: boolean;
}

/**
 * Converts Widget to ChartConfig for rendering.
 */
function widgetToChartConfig(widget: Widget): ChartConfig {
  const chartData = widget.cachedData as { data?: ChartDataPoint[] } | null;

  return {
    id: widget.id,
    type: widget.chartType.toLowerCase() as ChartType,
    title: widget.chartConfig.title || widget.name,
    description: widget.description ?? undefined,
    data: chartData?.data ?? widget.chartConfig.data as ChartDataPoint[] ?? [],
    xAxisLabel: widget.chartConfig.xAxis,
    yAxisLabel: widget.chartConfig.yAxis,
    showLegend: widget.chartConfig.legend ?? true,
    showTooltip: true,
    colors: widget.chartConfig.colors ?? ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"],
    createdAt: widget.createdAt,
  };
}

/**
 * Renders the chart at full size.
 */
function FullChartRenderer({ config }: { config: ChartConfig }) {
  const chartType = config.type.toLowerCase();
  const height = 400;

  switch (chartType) {
    case "pie":
    case "donut":
      return <PieChartComponent config={config} height={height} />;
    case "bar":
      return <BarChartComponent config={config} height={height} />;
    case "line":
    case "area":
      return <LineChartComponent config={config} height={height} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          Tipo de gráfico não suportado: {config.type}
        </div>
      );
  }
}

/**
 * Formats a date for display.
 */
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Refresh interval display.
 */
function formatRefreshInterval(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `a cada ${minutes} minutos`;
  if (minutes === 60) return "a cada 1 hora";
  if (minutes < 1440) return `a cada ${Math.floor(minutes / 60)} horas`;
  if (minutes === 1440) return "a cada 24 horas";
  return `a cada ${Math.floor(minutes / 1440)} dias`;
}

export function WidgetViewModal({
  widget,
  isOpen,
  onClose,
  onEdit,
  onRefresh,
  isRefreshing = false,
}: WidgetViewModalProps) {
  const chartConfig = useMemo(
    () => (widget ? widgetToChartConfig(widget) : null),
    [widget]
  );

  const handleEdit = useCallback(() => {
    if (widget && onEdit) {
      onEdit(widget);
    }
  }, [widget, onEdit]);

  const handleRefresh = useCallback(() => {
    if (widget && onRefresh) {
      onRefresh(widget);
    }
  }, [widget, onRefresh]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !widget || !chartConfig) {
    return null;
  }

  const refreshLabel = formatRefreshInterval(widget.refreshInterval);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="widget-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0 pr-4">
            <h2
              id="widget-modal-title"
              className="text-lg font-semibold text-gray-900 truncate"
            >
              {widget.name}
            </h2>
            {widget.description && (
              <p className="text-sm text-gray-500 mt-1">{widget.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Atualizar dados"
                aria-label="Atualizar dados"
              >
                <RefreshIcon className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Editar widget"
                aria-label="Editar widget"
              >
                <EditIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fechar"
              aria-label="Fechar modal"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chart Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="bg-gray-50 rounded-lg p-4">
            <FullChartRenderer config={chartConfig} />
          </div>
        </div>

        {/* Footer with metadata */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <ChartIcon className="w-4 h-4" />
                {widget.chartType}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                Criado em {formatDateTime(widget.createdAt)}
              </span>
              {widget.cachedAt && (
                <span className="flex items-center gap-1">
                  <RefreshIcon className="w-4 h-4" />
                  Atualizado em {formatDateTime(widget.cachedAt)}
                </span>
              )}
            </div>

            {refreshLabel && (
              <span className="flex items-center gap-1 text-primary-600">
                <ClockIcon className="w-4 h-4" />
                Atualiza {refreshLabel}
              </span>
            )}
          </div>

          {/* Query info */}
          {widget.query && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 mb-1">Consulta original:</p>
              <p className="text-sm text-gray-600 italic">&ldquo;{widget.query}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render to portal
  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(modalContent, document.body);
}

// Icons
function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function RefreshIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function EditIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function ChartIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
