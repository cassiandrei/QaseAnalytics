"use client";

/**
 * Dashboards Page
 *
 * Displays all dashboards created by the user.
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboards } from "../../hooks/useDashboards";
import { DashboardList, CreateDashboardModal } from "../../components/dashboards";
import type { Dashboard } from "../../lib/api";

export default function DashboardsPage() {
  // For demo purposes, use a fixed user ID
  // In production, this would come from authentication
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const {
    dashboards,
    isLoading,
    error,
    limitInfo,
    createDashboard,
    deleteDashboard,
    duplicateDashboard,
    refreshDashboards,
    refreshLimitInfo,
  } = useDashboards({ userId, autoFetch: true });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Set userId on mount (client-side only)
  useEffect(() => {
    // In production, get from auth context
    setUserId("test-user");
  }, []);

  // Handle view dashboard
  const handleView = useCallback(
    (dashboard: Dashboard) => {
      // Navigate to the dashboard detail page (to be implemented in US-031)
      // For now, show a placeholder
      router.push(`/dashboards/${dashboard.id}`);
    },
    [router]
  );

  // Handle edit dashboard (placeholder - US-031 will implement full editing)
  const handleEdit = useCallback((dashboard: Dashboard) => {
    // For now, navigate to the dashboard
    router.push(`/dashboards/${dashboard.id}`);
  }, [router]);

  // Handle duplicate dashboard
  const handleDuplicate = useCallback(
    async (dashboard: Dashboard) => {
      try {
        await duplicateDashboard(dashboard.id);
        await refreshLimitInfo();
      } catch (err) {
        console.error("Error duplicating dashboard:", err);
        alert("Erro ao duplicar dashboard. Tente novamente.");
      }
    },
    [duplicateDashboard, refreshLimitInfo]
  );

  // Handle delete dashboard
  const handleDelete = useCallback(
    async (dashboard: Dashboard) => {
      try {
        await deleteDashboard(dashboard.id);
        await refreshLimitInfo();
      } catch (err) {
        console.error("Error deleting dashboard:", err);
        alert("Erro ao excluir dashboard. Tente novamente.");
      }
    },
    [deleteDashboard, refreshLimitInfo]
  );

  // Handle create dashboard
  const handleCreate = useCallback(
    async (data: { name: string; description?: string }) => {
      await createDashboard(data);
      await refreshLimitInfo();
    },
    [createDashboard, refreshLimitInfo]
  );

  // Open create modal
  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  // Close create modal
  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

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
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                  Meus Dashboards
                </h1>
                {/* Limit info - mobile inline */}
                {limitInfo && (
                  <span className="text-xs sm:text-sm text-gray-500 sm:hidden">
                    {limitInfo.current}/{limitInfo.limit}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Limit info badge - desktop */}
              {limitInfo && (
                <span className="hidden sm:inline-block text-sm text-gray-500 whitespace-nowrap">
                  {limitInfo.current}/{limitInfo.limit} dashboards
                </span>
              )}

              <button
                onClick={openCreateModal}
                disabled={limitInfo?.remaining === 0}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden xs:inline">Novo</span>
                  <span className="hidden sm:inline">Dashboard</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page description */}
        <div className="mb-6">
          <p className="text-gray-600">
            Organize seus widgets em dashboards personalizados. Crie, edite e
            gerencie suas visualizações de métricas em um só lugar.
          </p>
        </div>

        {/* Dashboard List */}
        <DashboardList
          dashboards={dashboards}
          isLoading={isLoading}
          error={error}
          onView={handleView}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onRefresh={refreshDashboards}
          onCreate={openCreateModal}
        />
      </main>

      {/* Create Dashboard Modal */}
      <CreateDashboardModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onCreate={handleCreate}
        limitInfo={limitInfo}
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
