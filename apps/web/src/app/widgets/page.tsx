"use client";

/**
 * Widgets Page
 *
 * Displays all widgets saved by the user.
 *
 * @see US-027: Listar Meus Widgets
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useWidgets } from "../../hooks/use-widgets";
import { WidgetList, WidgetViewModal } from "../../components/widgets";
import type { Widget, CreateWidgetRequest } from "../../lib/api";

export default function WidgetsPage() {
  // For demo purposes, use a fixed user ID
  // In production, this would come from authentication
  const [userId, setUserId] = useState<string | null>(null);

  const {
    widgets,
    isLoading,
    error,
    deleteWidget,
    refreshWidget,
    createWidget,
    refreshWidgets,
  } = useWidgets({ userId, autoFetch: true });

  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [isRefreshingWidget, setIsRefreshingWidget] = useState(false);

  // Set userId on mount (client-side only)
  useEffect(() => {
    // In production, get from auth context
    setUserId("test-user");
  }, []);

  // Handle view widget
  const handleView = useCallback((widget: Widget) => {
    setSelectedWidget(widget);
  }, []);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    setSelectedWidget(null);
  }, []);

  // Handle edit widget (placeholder - US-028 will implement full editing)
  const handleEdit = useCallback((widget: Widget) => {
    // For now, just show an alert
    // US-028 will implement the full edit modal
    alert(`Edição do widget "${widget.name}" será implementada na US-028`);
  }, []);

  // Handle duplicate widget
  const handleDuplicate = useCallback(
    async (widget: Widget) => {
      try {
        const duplicateData: CreateWidgetRequest = {
          name: `${widget.name} (cópia)`,
          description: widget.description ?? undefined,
          query: widget.query,
          chartType: widget.chartType,
          chartConfig: {
            title: widget.chartConfig.title,
            xAxis: widget.chartConfig.xAxis,
            yAxis: widget.chartConfig.yAxis,
            colors: widget.chartConfig.colors,
            legend: widget.chartConfig.legend,
            data: widget.chartConfig.data,
          },
          refreshInterval: widget.refreshInterval ?? undefined,
          cachedData: widget.cachedData,
        };

        await createWidget(duplicateData);
        alert(`Widget "${widget.name}" duplicado com sucesso!`);
      } catch (err) {
        console.error("Error duplicating widget:", err);
        alert("Erro ao duplicar widget. Tente novamente.");
      }
    },
    [createWidget]
  );

  // Handle delete widget
  const handleDelete = useCallback(
    async (widget: Widget) => {
      try {
        await deleteWidget(widget.id);
      } catch (err) {
        console.error("Error deleting widget:", err);
        alert("Erro ao excluir widget. Tente novamente.");
      }
    },
    [deleteWidget]
  );

  // Handle refresh widget data
  const handleRefreshWidget = useCallback(
    async (widget: Widget) => {
      setIsRefreshingWidget(true);
      try {
        const refreshed = await refreshWidget(widget.id);
        setSelectedWidget(refreshed);
      } catch (err) {
        console.error("Error refreshing widget:", err);
        alert("Erro ao atualizar dados do widget. Tente novamente.");
      } finally {
        setIsRefreshingWidget(false);
      }
    },
    [refreshWidget]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link
                href="/"
                className="flex-shrink-0 flex items-center gap-2 text-gray-600 hover:text-gray-900 p-1 -ml-1"
              >
                <HomeIcon className="w-5 h-5" />
                <span className="sr-only">Voltar ao Chat</span>
              </Link>
              <div className="h-5 sm:h-6 w-px bg-gray-300 flex-shrink-0" />
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                Meus Widgets
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Link
                href="/"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden xs:inline">Criar</span>
                  <span className="hidden sm:inline">Widget</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page description */}
        <div className="mb-6">
          <p className="text-gray-600">
            Gerencie seus widgets salvos. Você pode visualizar, editar, duplicar
            ou excluir widgets, além de adicioná-los aos seus dashboards.
          </p>
        </div>

        {/* Widget List */}
        <WidgetList
          widgets={widgets}
          isLoading={isLoading}
          error={error}
          onView={handleView}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onRefresh={refreshWidgets}
        />
      </main>

      {/* Widget View Modal */}
      <WidgetViewModal
        widget={selectedWidget}
        isOpen={!!selectedWidget}
        onClose={handleCloseModal}
        onEdit={handleEdit}
        onRefresh={handleRefreshWidget}
        isRefreshing={isRefreshingWidget}
      />
    </div>
  );
}

// Icons
function HomeIcon({ className = "w-5 h-5" }: { className?: string }) {
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
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}
