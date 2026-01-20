"use client";

/**
 * DashboardCard Component
 *
 * Displays a single dashboard with preview info and action buttons.
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { useState, useCallback } from "react";
import type { Dashboard } from "../../lib/api";

export interface DashboardCardProps {
  dashboard: Dashboard;
  onEdit?: (dashboard: Dashboard) => void;
  onDuplicate?: (dashboard: Dashboard) => void;
  onDelete?: (dashboard: Dashboard) => void;
  onView?: (dashboard: Dashboard) => void;
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

export function DashboardCard({
  dashboard,
  onEdit,
  onDuplicate,
  onDelete,
  onView,
}: DashboardCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = useCallback(() => {
    onEdit?.(dashboard);
  }, [dashboard, onEdit]);

  const handleDuplicate = useCallback(() => {
    onDuplicate?.(dashboard);
  }, [dashboard, onDuplicate]);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;

    if (window.confirm(`Tem certeza que deseja excluir "${dashboard.name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete?.(dashboard);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [dashboard, onDelete, isDeleting]);

  const handleView = useCallback(() => {
    onView?.(dashboard);
  }, [dashboard, onView]);

  return (
    <div
      className="relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-200 overflow-hidden group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-primary-700 transition-colors">
              {dashboard.name}
            </h3>
            {dashboard.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {dashboard.description}
              </p>
            )}
          </div>

          {/* Status badges */}
          <div className="flex-shrink-0 flex gap-1">
            {dashboard.isPublic && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-200">
                Público
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <button
        className="w-full p-6 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer min-h-[120px] hover:from-primary-50 hover:to-primary-100/50 transition-all duration-200"
        onClick={handleView}
        onKeyDown={(e) => e.key === "Enter" && handleView()}
        aria-label={`Abrir dashboard ${dashboard.name}`}
      >
        <div className="flex items-center justify-center h-full">
          {dashboard.widgetCount > 0 ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
                <GridIcon className="w-7 h-7 text-primary-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{dashboard.widgetCount}</span>
              <p className="text-sm text-gray-500 mt-0.5">
                widget{dashboard.widgetCount !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gray-200/70 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-100 transition-colors">
                <EmptyDashboardIcon className="w-7 h-7 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-500">Dashboard vazio</p>
              <p className="text-xs text-gray-400 mt-1">Clique para adicionar widgets</p>
            </div>
          )}
        </div>
      </button>

      {/* Footer */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5" title={`Criado em ${formatDate(dashboard.createdAt)}`}>
              <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(dashboard.createdAt)}
            </span>
            <span className="flex items-center gap-1.5" title={`Última atualização: ${new Date(dashboard.updatedAt).toLocaleString("pt-BR")}`}>
              <RefreshIcon className="w-3.5 h-3.5 text-gray-400" />
              {formatRelativeTime(dashboard.updatedAt)}
            </span>
          </div>
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

function GridIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function EmptyDashboardIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
    </svg>
  );
}
