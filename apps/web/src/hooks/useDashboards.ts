/**
 * useDashboards Hook
 *
 * React hook para gerenciar dashboards.
 *
 * @see US-030: Criar Dashboard (básico)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDashboards,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  duplicateDashboard,
  getDashboardLimitInfo,
  type Dashboard,
  type CreateDashboardRequest,
  type UpdateDashboardRequest,
  type DashboardLimitResponse,
} from "../lib/api";

export interface UseDashboardsOptions {
  userId: string | null;
  autoFetch?: boolean;
}

export interface UseDashboardsReturn {
  dashboards: Dashboard[];
  isLoading: boolean;
  error: string | null;
  limitInfo: DashboardLimitResponse | null;
  createDashboard: (data: CreateDashboardRequest) => Promise<Dashboard | null>;
  updateDashboard: (
    dashboardId: string,
    data: UpdateDashboardRequest
  ) => Promise<Dashboard | null>;
  deleteDashboard: (dashboardId: string) => Promise<boolean>;
  duplicateDashboard: (dashboardId: string, newName?: string) => Promise<Dashboard | null>;
  refreshDashboards: () => Promise<void>;
  refreshLimitInfo: () => Promise<void>;
}

/**
 * Hook para gerenciar dashboards.
 *
 * @param options - Opções do hook
 * @returns Funções e estado de dashboards
 *
 * @example
 * ```tsx
 * const {
 *   dashboards,
 *   isLoading,
 *   error,
 *   limitInfo,
 *   createDashboard,
 *   deleteDashboard,
 * } = useDashboards({ userId: "user-123", autoFetch: true });
 * ```
 */
export function useDashboards({
  userId,
  autoFetch = true,
}: UseDashboardsOptions): UseDashboardsReturn {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<DashboardLimitResponse | null>(null);

  /**
   * Carrega a lista de dashboards do servidor.
   */
  const refreshDashboards = useCallback(async () => {
    if (!userId) {
      setDashboards([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getDashboards(userId);
      setDashboards(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dashboards";
      setError(message);
      console.error("Error fetching dashboards:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Carrega informações de limite de dashboards.
   */
  const refreshLimitInfo = useCallback(async () => {
    if (!userId) {
      setLimitInfo(null);
      return;
    }

    try {
      const data = await getDashboardLimitInfo(userId);
      setLimitInfo(data);
    } catch (err) {
      console.error("Error fetching dashboard limit info:", err);
    }
  }, [userId]);

  /**
   * Cria um novo dashboard.
   */
  const handleCreateDashboard = useCallback(
    async (data: CreateDashboardRequest): Promise<Dashboard | null> => {
      if (!userId) {
        setError("Usuário não autenticado");
        return null;
      }

      try {
        const dashboard = await createDashboard(userId, data);
        setDashboards((prev) => [dashboard, ...prev]);

        // Atualiza info de limite
        if (limitInfo) {
          setLimitInfo({
            ...limitInfo,
            current: limitInfo.current + 1,
            remaining: limitInfo.remaining - 1,
          });
        }

        return dashboard;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao criar dashboard";
        setError(message);
        console.error("Error creating dashboard:", err);
        return null;
      }
    },
    [userId, limitInfo]
  );

  /**
   * Atualiza um dashboard existente.
   */
  const handleUpdateDashboard = useCallback(
    async (
      dashboardId: string,
      data: UpdateDashboardRequest
    ): Promise<Dashboard | null> => {
      if (!userId) {
        setError("Usuário não autenticado");
        return null;
      }

      try {
        const updated = await updateDashboard(userId, dashboardId, data);
        setDashboards((prev) =>
          prev.map((d) => (d.id === dashboardId ? updated : d))
        );
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao atualizar dashboard";
        setError(message);
        console.error("Error updating dashboard:", err);
        return null;
      }
    },
    [userId]
  );

  /**
   * Exclui um dashboard.
   */
  const handleDeleteDashboard = useCallback(
    async (dashboardId: string): Promise<boolean> => {
      if (!userId) {
        setError("Usuário não autenticado");
        return false;
      }

      try {
        await deleteDashboard(userId, dashboardId);
        setDashboards((prev) => prev.filter((d) => d.id !== dashboardId));

        // Atualiza info de limite
        if (limitInfo) {
          setLimitInfo({
            ...limitInfo,
            current: limitInfo.current - 1,
            remaining: limitInfo.remaining + 1,
          });
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao excluir dashboard";
        setError(message);
        console.error("Error deleting dashboard:", err);
        return false;
      }
    },
    [userId, limitInfo]
  );

  /**
   * Duplica um dashboard.
   */
  const handleDuplicateDashboard = useCallback(
    async (dashboardId: string, newName?: string): Promise<Dashboard | null> => {
      if (!userId) {
        setError("Usuário não autenticado");
        return null;
      }

      try {
        const duplicate = await duplicateDashboard(userId, dashboardId, newName);
        setDashboards((prev) => [duplicate, ...prev]);

        // Atualiza info de limite
        if (limitInfo) {
          setLimitInfo({
            ...limitInfo,
            current: limitInfo.current + 1,
            remaining: limitInfo.remaining - 1,
          });
        }

        return duplicate;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao duplicar dashboard";
        setError(message);
        console.error("Error duplicating dashboard:", err);
        return null;
      }
    },
    [userId, limitInfo]
  );

  // Auto-fetch quando userId mudar
  useEffect(() => {
    if (autoFetch && userId) {
      refreshDashboards();
      refreshLimitInfo();
    }
  }, [autoFetch, userId, refreshDashboards, refreshLimitInfo]);

  return {
    dashboards,
    isLoading,
    error,
    limitInfo,
    createDashboard: handleCreateDashboard,
    updateDashboard: handleUpdateDashboard,
    deleteDashboard: handleDeleteDashboard,
    duplicateDashboard: handleDuplicateDashboard,
    refreshDashboards,
    refreshLimitInfo,
  };
}
