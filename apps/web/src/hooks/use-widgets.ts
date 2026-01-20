/**
 * Custom Hook for Widget Management
 *
 * Provides a clean interface for creating, managing, and refreshing widgets.
 *
 * @see US-026: Salvar Gráfico como Widget
 */

import { useState, useCallback, useEffect } from "react";
import {
  createWidget as apiCreateWidget,
  getWidgets as apiGetWidgets,
  getWidgetById as apiGetWidgetById,
  updateWidget as apiUpdateWidget,
  deleteWidget as apiDeleteWidget,
  refreshWidgetData as apiRefreshWidget,
  type Widget,
  type CreateWidgetRequest,
} from "../lib/api";

export interface UseWidgetsOptions {
  userId: string | null;
  autoFetch?: boolean;
}

export interface UseWidgetsReturn {
  widgets: Widget[];
  isLoading: boolean;
  error: string | null;
  createWidget: (data: CreateWidgetRequest) => Promise<Widget>;
  updateWidget: (widgetId: string, data: Partial<CreateWidgetRequest>) => Promise<Widget>;
  deleteWidget: (widgetId: string) => Promise<void>;
  refreshWidget: (widgetId: string) => Promise<Widget>;
  refreshWidgets: () => Promise<void>;
  getWidget: (widgetId: string) => Promise<Widget | null>;
}

/**
 * Hook for managing widgets with automatic fetching and CRUD operations.
 *
 * @param options - Configuration options
 * @returns Widget management functions and state
 *
 * @example
 * ```tsx
 * const { widgets, createWidget, isLoading } = useWidgets({ userId: "user-123" });
 *
 * const handleSave = async (data) => {
 *   await createWidget(data);
 *   console.log("Widget saved!");
 * };
 * ```
 */
export function useWidgets({
  userId,
  autoFetch = true,
}: UseWidgetsOptions): UseWidgetsReturn {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all widgets for the user.
   */
  const refreshWidgets = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedWidgets = await apiGetWidgets(userId);
      setWidgets(fetchedWidgets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch widgets";
      setError(message);
      console.error("Error fetching widgets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Create a new widget.
   */
  const createWidget = useCallback(
    async (data: CreateWidgetRequest): Promise<Widget> => {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        const newWidget = await apiCreateWidget(userId, data);
        setWidgets((prev) => [newWidget, ...prev]);
        return newWidget;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create widget";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  /**
   * Update an existing widget.
   */
  const updateWidget = useCallback(
    async (widgetId: string, data: Partial<CreateWidgetRequest>): Promise<Widget> => {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        const updatedWidget = await apiUpdateWidget(userId, widgetId, data);
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? updatedWidget : w))
        );
        return updatedWidget;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update widget";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  /**
   * Delete a widget.
   */
  const deleteWidget = useCallback(
    async (widgetId: string): Promise<void> => {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        await apiDeleteWidget(userId, widgetId);
        setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete widget";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  /**
   * Refresh a widget's data manually.
   */
  const refreshWidget = useCallback(
    async (widgetId: string): Promise<Widget> => {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        const refreshedWidget = await apiRefreshWidget(userId, widgetId);
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? refreshedWidget : w))
        );
        return refreshedWidget;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to refresh widget";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  /**
   * Get a specific widget by ID.
   */
  const getWidget = useCallback(
    async (widgetId: string): Promise<Widget | null> => {
      if (!userId) {
        return null;
      }

      try {
        return await apiGetWidgetById(userId, widgetId);
      } catch (err) {
        console.error("Error getting widget:", err);
        return null;
      }
    },
    [userId]
  );

  // Auto-fetch widgets when userId changes
  useEffect(() => {
    if (userId && autoFetch) {
      refreshWidgets();
    }
  }, [userId, autoFetch, refreshWidgets]);

  return {
    widgets,
    isLoading,
    error,
    createWidget,
    updateWidget,
    deleteWidget,
    refreshWidget,
    refreshWidgets,
    getWidget,
  };
}
