"use client";

/**
 * ChartModal Component
 *
 * Fullscreen modal for expanded chart view.
 *
 * @see US-017: Preview de Gráficos no Chat
 */

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { PieChartComponent } from "./PieChart";
import { BarChartComponent } from "./BarChart";
import { LineChartComponent } from "./LineChart";
import type { ChartConfig } from "./types";

export interface ChartModalProps {
  config: ChartConfig;
  isOpen: boolean;
  onClose: () => void;
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

export function ChartModal({
  config,
  isOpen,
  onClose,
  onSaveAsWidget,
}: ChartModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
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

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2
              id="chart-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {config.title}
            </h2>
            {config.description && (
              <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSaveAsWidget && (
              <button
                onClick={() => onSaveAsWidget(config)}
                className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Salvar como Widget
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fechar modal"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chart content */}
        <div className="p-6">
          <ChartRenderer config={config} height={500} />
        </div>

        {/* Footer with chart info */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Tipo: <span className="font-medium">{config.type}</span>
            </span>
            <span>
              Pontos de dados: <span className="font-medium">{config.data.length}</span>
            </span>
            {config.createdAt && (
              <span>
                Criado em:{" "}
                <span className="font-medium">
                  {new Date(config.createdAt).toLocaleString("pt-BR")}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render in portal to escape any overflow:hidden containers
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
