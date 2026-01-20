"use client";

/**
 * WidgetCard Component
 *
 * Displays a single widget with miniature preview and action buttons.
 *
 * @see US-027: Listar Meus Widgets
 */

import { useState, useCallback, useMemo } from "react";
import { PieChartComponent } from "../charts/PieChart";
import { BarChartComponent } from "../charts/BarChart";
import { LineChartComponent } from "../charts/LineChart";
import type { ChartConfig, ChartType, ChartDataPoint } from "../charts/types";
import type { Widget } from "../../lib/api";

export interface WidgetCardProps {
  widget: Widget;
  onEdit?: (widget: Widget) => void;
  onDuplicate?: (widget: Widget) => void;
  onDelete?: (widget: Widget) => void;
  onView?: (widget: Widget) => void;
}

/**
 * Converts Widget to ChartConfig for rendering preview.
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
 * Renders a miniature chart preview.
 */
function MiniChartRenderer({ config }: { config: ChartConfig }) {
  const chartType = config.type.toLowerCase();
  const height = 120;

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
        <div className="flex items-center justify-center h-full text-gray-400 text-xs">
          Tipo não suportado
        </div>
      );
  }
}

/**
 * Formats a date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a relative time (e.g., "há 2 horas").
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return formatDate(dateString);
}

/**
 * Refresh interval display.
 */
function formatRefreshInterval(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}min`;
  if (minutes === 60) return "1h";
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export function WidgetCard({
  widget,
  onEdit,
  onDuplicate,
  onDelete,
  onView,
}: WidgetCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const chartConfig = useMemo(() => widgetToChartConfig(widget), [widget]);
  const refreshLabel = formatRefreshInterval(widget.refreshInterval);

  const handleEdit = useCallback(() => {
    onEdit?.(widget);
  }, [widget, onEdit]);

  const handleDuplicate = useCallback(() => {
    onDuplicate?.(widget);
  }, [widget, onDuplicate]);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;

    if (window.confirm(`Tem certeza que deseja excluir "${widget.name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete?.(widget);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [widget, onDelete, isDeleting]);

  const handleView = useCallback(() => {
    onView?.(widget);
  }, [widget, onView]);

  return (
    <div
      className="relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm truncate">
              {widget.name}
            </h3>
            {widget.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {widget.description}
              </p>
            )}
          </div>

          {/* Chart type badge */}
          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
            {widget.chartType.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Chart Preview */}
      <div
        className="p-2 bg-gray-50 cursor-pointer"
        onClick={handleView}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleView()}
        aria-label={`Ver widget ${widget.name}`}
      >
        <div className="h-[120px] pointer-events-none">
          <MiniChartRenderer config={chartConfig} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span title={`Criado em ${formatDate(widget.createdAt)}`}>
              <CalendarIcon className="w-3 h-3 inline mr-1" />
              {formatDate(widget.createdAt)}
            </span>
            {widget.cachedAt && (
              <span title={`Última atualização: ${new Date(widget.cachedAt).toLocaleString("pt-BR")}`}>
                <RefreshIcon className="w-3 h-3 inline mr-1" />
                {formatRelativeTime(widget.cachedAt)}
              </span>
            )}
          </div>

          {refreshLabel && (
            <span className="flex items-center gap-1 text-primary-600" title="Atualização automática">
              <ClockIcon className="w-3 h-3" />
              {refreshLabel}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons (shown on hover) */}
      {showActions && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {onView && (
            <ActionButton
              icon={<EyeIcon />}
              title="Visualizar"
              onClick={handleView}
            />
          )}
          {onEdit && (
            <ActionButton
              icon={<EditIcon />}
              title="Editar"
              onClick={handleEdit}
            />
          )}
          {onDuplicate && (
            <ActionButton
              icon={<DuplicateIcon />}
              title="Duplicar"
              onClick={handleDuplicate}
            />
          )}
          {onDelete && (
            <ActionButton
              icon={<TrashIcon />}
              title="Excluir"
              onClick={handleDelete}
              variant="danger"
              disabled={isDeleting}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Action button component.
 */
function ActionButton({
  icon,
  title,
  onClick,
  variant = "default",
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-1.5 rounded-md shadow-sm border transition-colors
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${
          variant === "danger"
            ? "bg-white border-red-200 hover:bg-red-50 text-red-600"
            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"
        }
      `}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );
}

// Icons
function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function DuplicateIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
