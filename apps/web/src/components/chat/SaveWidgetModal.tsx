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
                Nome do Widget *
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
            </div>

            {/* Description input */}
            <div>
              <label
                htmlFor="widget-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descrição (opcional)
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
            </div>

            {/* Refresh interval select */}
            <div>
              <label
                htmlFor="refresh-interval"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Atualização Automática
              </label>
              <select
                id="refresh-interval"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
                disabled={isSaving}
              >
                {REFRESH_INTERVALS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                O widget será atualizado automaticamente com dados novos.
              </p>
            </div>

            {/* Preview info */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Configuração do Gráfico
              </h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span className="font-medium capitalize">{chartConfig.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pontos de dados:</span>
                  <span className="font-medium">{chartConfig.data.length}</span>
                </div>
              </div>
            </div>

            {/* Query info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
                Query Original
              </h4>
              <p className="text-sm text-blue-800 line-clamp-2">{userQuery}</p>
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
