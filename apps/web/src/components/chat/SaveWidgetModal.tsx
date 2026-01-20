"use client";

/**
 * SaveWidgetModal Component
 *
 * Modal for configuring and saving a chart as a widget with
 * automatic refresh support.
 *
 * @see US-026: Salvar Gráfico como Widget
 */

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ChartConfig } from "../charts/types";

export interface SaveWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartConfig: ChartConfig;
  userQuery: string;
  onSave: (data: SaveWidgetData) => Promise<void>;
}

export interface SaveWidgetData {
  name: string;
  description?: string;
  query: string;
  chartType: string;
  chartConfig: ChartConfig;
  refreshInterval?: number;
  cachedData?: unknown;
}

/** Intervalos de refresh suportados */
const REFRESH_INTERVALS = [
  { value: 0, label: "Manual (sem atualização automática)" },
  { value: 15, label: "A cada 15 minutos" },
  { value: 30, label: "A cada 30 minutos" },
  { value: 60, label: "A cada 1 hora" },
  { value: 360, label: "A cada 6 horas" },
  { value: 1440, label: "Diariamente" },
] as const;

export function SaveWidgetModal({
  isOpen,
  onClose,
  chartConfig,
  userQuery,
  onSave,
}: SaveWidgetModalProps) {
  const [name, setName] = useState(chartConfig.title || "");
  const [description, setDescription] = useState(chartConfig.description || "");
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(chartConfig.title || "");
      setDescription(chartConfig.description || "");
      setRefreshInterval(60);
      setError(null);
    }
  }, [isOpen, chartConfig]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    },
    [onClose, isSaving]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setError("Nome é obrigatório");
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        await onSave({
          name: name.trim(),
          description: description.trim() || undefined,
          query: userQuery,
          chartType: chartConfig.type.toUpperCase(),
          chartConfig,
          refreshInterval: refreshInterval > 0 ? refreshInterval : undefined,
          cachedData: chartConfig.data,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar widget");
      } finally {
        setIsSaving(false);
      }
    },
    [name, description, userQuery, chartConfig, refreshInterval, onSave, onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-widget-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isSaving ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[90vw] max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2
            id="save-widget-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Salvar como Widget
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Name input */}
            <div>
              <label
                htmlFor="widget-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome do Widget <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="widget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Taxa de Falha Mensal"
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                disabled={isSaving}
                autoFocus
              />
              <div className="mt-1 text-xs text-gray-400 text-right">
                {name.length}/100
              </div>
            </div>

            {/* Description input */}
            <div>
              <label
                htmlFor="widget-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descrição <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                id="widget-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição breve do widget..."
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                disabled={isSaving}
              />
              <div className="mt-1 text-xs text-gray-400 text-right">
                {description.length}/500
              </div>
            </div>

            {/* Refresh interval select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Atualização Automática
              </label>
              <div className="grid grid-cols-3 gap-2">
                {REFRESH_INTERVALS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRefreshInterval(option.value)}
                    disabled={isSaving}
                    className={`
                      px-3 py-2 text-xs font-medium rounded-lg border transition-all
                      ${
                        refreshInterval === option.value
                          ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }
                      ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    {option.value === 0 ? "Manual" : option.value < 60 ? `${option.value}min` : option.value === 60 ? "1h" : option.value < 1440 ? `${option.value / 60}h` : "24h"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {refreshInterval === 0
                  ? "Atualize manualmente quando precisar."
                  : `O widget será atualizado automaticamente a cada ${refreshInterval < 60 ? `${refreshInterval} minutos` : refreshInterval === 60 ? "1 hora" : refreshInterval < 1440 ? `${refreshInterval / 60} horas` : "24 horas"}.`}
              </p>
            </div>

            {/* Preview info */}
            <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="flex items-start gap-3">
                {/* Chart type icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <ChartTypeIcon type={chartConfig.type} className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Gráfico de {chartConfig.type.charAt(0).toUpperCase() + chartConfig.type.slice(1)}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <DataIcon className="w-3.5 h-3.5" />
                      {chartConfig.data.length} pontos
                    </span>
                    {chartConfig.xAxisLabel && (
                      <span className="truncate">X: {chartConfig.xAxisLabel}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Query info */}
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-2">
                <QueryIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-blue-700 mb-1">
                    Query para atualização
                  </h4>
                  <p className="text-sm text-blue-800 line-clamp-2 leading-relaxed">{userQuery}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner className="w-4 h-4" />
                  Salvando...
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4" />
                  Salvar Widget
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render in portal
  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return null;
}

/**
 * Close icon SVG component.
 */
function CloseIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Save icon SVG component.
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
 * Loading spinner SVG component.
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || ""}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Chart type icon based on chart type.
 */
function ChartTypeIcon({ type, className }: { type: string; className?: string }) {
  const chartType = type.toLowerCase();

  if (chartType === "line" || chartType === "area") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    );
  }

  if (chartType === "bar") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  }

  if (chartType === "pie" || chartType === "donut") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    );
  }

  // Default chart icon
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

/**
 * Data icon.
 */
function DataIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

/**
 * Query/search icon.
 */
function QueryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}
