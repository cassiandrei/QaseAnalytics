"use client";

/**
 * Dashboard Detail Page (Placeholder)
 *
 * This page will be fully implemented in US-031.
 * For now, it shows basic dashboard info.
 *
 * @see US-031: Visualizar Dashboard
 */

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { getDashboardById, type Dashboard, type DashboardWithWidgets } from "../../../lib/api";

interface DashboardDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardDetailPage({ params }: DashboardDetailPageProps) {
  const resolvedParams = use(params);
  const [userId] = useState("test-user");
  const [dashboard, setDashboard] = useState<Dashboard | DashboardWithWidgets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        const data = await getDashboardById(userId, resolvedParams.id, true);
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [userId, resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link
                href="/dashboards"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <BackIcon className="w-5 h-5" />
                Voltar
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ErrorIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Dashboard não encontrado
          </h2>
          <p className="text-gray-500 mb-6">{error || "O dashboard solicitado não existe."}</p>
          <Link
            href="/dashboards"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Voltar aos Dashboards
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <BackIcon className="w-5 h-5" />
                <span className="sr-only">Voltar</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {dashboard.name}
                </h1>
                {dashboard.description && (
                  <p className="text-sm text-gray-500">{dashboard.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dashboard.isPublic && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  Público
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Placeholder for US-031 */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <DashboardIcon className="w-8 h-8 text-gray-400" />
          </div>

          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Área de Widgets
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {dashboard.widgetCount > 0
              ? `Este dashboard contém ${dashboard.widgetCount} widget${
                  dashboard.widgetCount !== 1 ? "s" : ""
                }. A visualização completa será implementada na US-031.`
              : "Este dashboard está vazio. Adicione widgets a partir da página de widgets."}
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/widgets"
              className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Ver Widgets
            </Link>
          </div>

          {/* Info cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-gray-900">
                {dashboard.widgetCount}
              </p>
              <p className="text-sm text-gray-500">Widgets</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {new Date(dashboard.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-sm text-gray-500">Criado em</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {new Date(dashboard.updatedAt).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-sm text-gray-500">Atualizado em</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Icons
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-primary-600 mx-auto"
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

function BackIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  );
}

function ErrorIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function DashboardIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z"
      />
    </svg>
  );
}
