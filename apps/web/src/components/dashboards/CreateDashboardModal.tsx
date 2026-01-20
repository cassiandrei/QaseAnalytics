"use client";

/**
 * CreateDashboardModal Component
 *
 * Modal for creating a new dashboard with name and description.
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { useState, useCallback, useEffect, useRef } from "react";

export interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string }) => Promise<void>;
  limitInfo?: {
    current: number;
    limit: number;
    remaining: number;
  } | null;
}

export function CreateDashboardModal({
  isOpen,
  onClose,
  onCreate,
  limitInfo,
}: CreateDashboardModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setError("Nome é obrigatório");
        return;
      }

      if (name.length > 100) {
        setError("Nome deve ter no máximo 100 caracteres");
        return;
      }

      if (description && description.length > 500) {
        setError("Descrição deve ter no máximo 500 caracteres");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onCreate({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao criar dashboard";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, description, onCreate, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const canCreate = !limitInfo || limitInfo.remaining > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-dashboard-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2
            id="create-dashboard-title"
            className="text-lg font-semibold text-gray-900"
          >
            Novo Dashboard
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Limit warning */}
            {limitInfo && (
              <div
                className={`px-4 py-3 rounded-lg text-sm ${
                  limitInfo.remaining === 0
                    ? "bg-red-50 text-red-700"
                    : limitInfo.remaining <= 2
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <InfoIcon className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {limitInfo.remaining === 0 ? (
                      <>
                        Você atingiu o limite de {limitInfo.limit} dashboards.
                        Exclua um dashboard existente ou faça upgrade do seu plano.
                      </>
                    ) : (
                      <>
                        {limitInfo.current} de {limitInfo.limit} dashboards usados.
                        Você pode criar mais {limitInfo.remaining}.
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Name field */}
            <div>
              <label
                htmlFor="dashboard-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputRef}
                id="dashboard-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sprint Dashboard"
                disabled={!canCreate || isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {name.length}/100
              </p>
            </div>

            {/* Description field */}
            <div>
              <label
                htmlFor="dashboard-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descrição{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="dashboard-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste dashboard..."
                disabled={!canCreate || isSubmitting}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {description.length}/500
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="px-4 py-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                <ErrorIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canCreate || isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="w-4 h-4" />
                  Criando...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4" />
                  Criar Dashboard
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icons
function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function InfoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function ErrorIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function LoadingSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
