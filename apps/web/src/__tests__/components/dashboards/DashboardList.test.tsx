/**
 * Tests for DashboardList Component
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardList } from "../../../components/dashboards/DashboardList";
import type { Dashboard } from "../../../lib/api";

// Mock dashboard data
function createMockDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: "dashboard-123",
    name: "Test Dashboard",
    description: "Test description",
    layout: [],
    globalFilters: null,
    isPublic: false,
    shareToken: null,
    shareExpiresAt: null,
    userId: "user-123",
    widgetCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("DashboardList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should render loading state when isLoading is true and no dashboards", () => {
      render(
        <DashboardList
          dashboards={[]}
          isLoading={true}
          error={null}
        />
      );

      expect(screen.getByText("Carregando dashboards...")).toBeInTheDocument();
    });

    it("should not show loading state when there are dashboards", () => {
      const dashboards = [createMockDashboard()];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={true}
          error={null}
        />
      );

      expect(screen.queryByText("Carregando dashboards...")).not.toBeInTheDocument();
      expect(screen.getByText("Test Dashboard")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should render error state with message", () => {
      render(
        <DashboardList
          dashboards={[]}
          isLoading={false}
          error="Failed to load dashboards"
        />
      );

      expect(screen.getByText("Erro ao carregar dashboards")).toBeInTheDocument();
      expect(screen.getByText("Failed to load dashboards")).toBeInTheDocument();
    });

    it("should show retry button when onRefresh is provided", () => {
      const onRefresh = vi.fn();

      render(
        <DashboardList
          dashboards={[]}
          isLoading={false}
          error="Error"
          onRefresh={onRefresh}
        />
      );

      const retryButton = screen.getByText("Tentar novamente");
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("Empty State", () => {
    it("should render empty state when no dashboards", () => {
      render(
        <DashboardList
          dashboards={[]}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("Nenhum dashboard criado")).toBeInTheDocument();
    });

    it("should show create button in empty state when onCreate provided", () => {
      const onCreate = vi.fn();

      render(
        <DashboardList
          dashboards={[]}
          isLoading={false}
          error={null}
          onCreate={onCreate}
        />
      );

      const createButton = screen.getByText("Criar Dashboard");
      expect(createButton).toBeInTheDocument();

      fireEvent.click(createButton);
      expect(onCreate).toHaveBeenCalled();
    });
  });

  describe("Dashboard Rendering", () => {
    it("should render list of dashboards", () => {
      const dashboards = [
        createMockDashboard({ id: "1", name: "Dashboard 1" }),
        createMockDashboard({ id: "2", name: "Dashboard 2" }),
        createMockDashboard({ id: "3", name: "Dashboard 3" }),
      ];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("Dashboard 1")).toBeInTheDocument();
      expect(screen.getByText("Dashboard 2")).toBeInTheDocument();
      expect(screen.getByText("Dashboard 3")).toBeInTheDocument();
    });

    it("should show correct dashboard count", () => {
      const dashboards = [
        createMockDashboard({ id: "1" }),
        createMockDashboard({ id: "2" }),
      ];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("2 dashboards")).toBeInTheDocument();
    });

    it("should show singular form for 1 dashboard", () => {
      const dashboards = [createMockDashboard()];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("1 dashboard")).toBeInTheDocument();
    });
  });

  describe("Search", () => {
    it("should filter dashboards by name", async () => {
      const dashboards = [
        createMockDashboard({ id: "1", name: "Sprint Dashboard" }),
        createMockDashboard({ id: "2", name: "KPI Overview" }),
        createMockDashboard({ id: "3", name: "Bug Tracker" }),
      ];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar/i);
      fireEvent.change(searchInput, { target: { value: "sprint" } });

      await waitFor(() => {
        expect(screen.getByText("Sprint Dashboard")).toBeInTheDocument();
        expect(screen.queryByText("KPI Overview")).not.toBeInTheDocument();
        expect(screen.queryByText("Bug Tracker")).not.toBeInTheDocument();
      });
    });

    it("should filter dashboards by description", async () => {
      const dashboards = [
        createMockDashboard({ id: "1", name: "Dashboard 1", description: "Sprint metrics" }),
        createMockDashboard({ id: "2", name: "Dashboard 2", description: "QA overview" }),
      ];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar/i);
      fireEvent.change(searchInput, { target: { value: "QA" } });

      await waitFor(() => {
        expect(screen.queryByText("Dashboard 1")).not.toBeInTheDocument();
        expect(screen.getByText("Dashboard 2")).toBeInTheDocument();
      });
    });

    it("should show no results state when search has no matches", async () => {
      const dashboards = [createMockDashboard({ name: "Test Dashboard" })];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar/i);
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
      });
    });

    it("should show filtered count when search is active", async () => {
      const dashboards = [
        createMockDashboard({ id: "1", name: "Sprint Dashboard" }),
        createMockDashboard({ id: "2", name: "KPI Dashboard" }),
        createMockDashboard({ id: "3", name: "Bug Tracker" }),
      ];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar/i);
      fireEvent.change(searchInput, { target: { value: "dashboard" } });

      await waitFor(() => {
        expect(screen.getByText("2 de 3 dashboards")).toBeInTheDocument();
      });
    });
  });

  describe("Sorting", () => {
    it("should sort by newest by default", () => {
      const dashboards = [
        createMockDashboard({ id: "1", name: "Old Dashboard", createdAt: "2026-01-01T00:00:00Z" }),
        createMockDashboard({ id: "2", name: "New Dashboard", createdAt: "2026-01-15T00:00:00Z" }),
      ];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      const cards = screen.getAllByRole("button", { name: /abrir dashboard/i });
      // Newest should be first
      expect(cards[0]).toHaveAttribute("aria-label", "Abrir dashboard New Dashboard");
    });

    it("should sort by name when selected", async () => {
      const dashboards = [
        createMockDashboard({ id: "1", name: "Zebra Dashboard" }),
        createMockDashboard({ id: "2", name: "Alpha Dashboard" }),
      ];

      render(
        <DashboardList
          dashboards={dashboards}
          isLoading={false}
          error={null}
        />
      );

      const sortSelect = screen.getByRole("combobox", { name: /ordenar por/i });
      fireEvent.change(sortSelect, { target: { value: "name" } });

      await waitFor(() => {
        const cards = screen.getAllByRole("button", { name: /abrir dashboard/i });
        expect(cards[0]).toHaveAttribute("aria-label", "Abrir dashboard Alpha Dashboard");
      });
    });
  });

  describe("Callbacks", () => {
    it("should call onView when dashboard is clicked", () => {
      const onView = vi.fn();
      const dashboard = createMockDashboard();

      render(
        <DashboardList
          dashboards={[dashboard]}
          isLoading={false}
          error={null}
          onView={onView}
        />
      );

      const viewButton = screen.getByRole("button", { name: /abrir dashboard/i });
      fireEvent.click(viewButton);

      expect(onView).toHaveBeenCalledWith(dashboard);
    });

    it("should call onRefresh when refresh button is clicked", () => {
      const onRefresh = vi.fn();

      render(
        <DashboardList
          dashboards={[createMockDashboard()]}
          isLoading={false}
          error={null}
          onRefresh={onRefresh}
        />
      );

      const refreshButton = screen.getByText("Atualizar");
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
