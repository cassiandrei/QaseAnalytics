/**
 * Tests for DashboardCard Component
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardCard } from "../../../components/dashboards/DashboardCard";
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

describe("DashboardCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render dashboard name and description", () => {
      const dashboard = createMockDashboard();
      render(<DashboardCard dashboard={dashboard} />);

      expect(screen.getByText("Test Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should render widget count", () => {
      const dashboard = createMockDashboard({ widgetCount: 5 });
      render(<DashboardCard dashboard={dashboard} />);

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("widgets")).toBeInTheDocument();
    });

    it("should render singular widget text for 1 widget", () => {
      const dashboard = createMockDashboard({ widgetCount: 1 });
      render(<DashboardCard dashboard={dashboard} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("widget")).toBeInTheDocument();
    });

    it("should render empty state for 0 widgets", () => {
      const dashboard = createMockDashboard({ widgetCount: 0 });
      render(<DashboardCard dashboard={dashboard} />);

      expect(screen.getByText("Dashboard vazio")).toBeInTheDocument();
    });

    it("should render creation date", () => {
      const dashboard = createMockDashboard({
        createdAt: "2026-01-15T10:00:00Z",
      });
      render(<DashboardCard dashboard={dashboard} />);

      // Date should be formatted in pt-BR
      expect(screen.getByText(/jan/i)).toBeInTheDocument();
    });

    it("should render public badge when isPublic is true", () => {
      const dashboard = createMockDashboard({ isPublic: true });
      render(<DashboardCard dashboard={dashboard} />);

      expect(screen.getByText("Público")).toBeInTheDocument();
    });

    it("should not render public badge when isPublic is false", () => {
      const dashboard = createMockDashboard({ isPublic: false });
      render(<DashboardCard dashboard={dashboard} />);

      expect(screen.queryByText("Público")).not.toBeInTheDocument();
    });

    it("should handle dashboard without description", () => {
      const dashboard = createMockDashboard({ description: null });
      render(<DashboardCard dashboard={dashboard} />);

      expect(screen.getByText("Test Dashboard")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onView when preview area is clicked", () => {
      const onView = vi.fn();
      const dashboard = createMockDashboard();

      render(<DashboardCard dashboard={dashboard} onView={onView} />);

      // Click the preview area
      const viewButton = screen.getByRole("button", {
        name: /abrir dashboard test dashboard/i,
      });
      fireEvent.click(viewButton);

      expect(onView).toHaveBeenCalledWith(dashboard);
    });

    it("should call onDelete with confirmation", async () => {
      const onDelete = vi.fn();
      const dashboard = createMockDashboard();

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<DashboardCard dashboard={dashboard} onDelete={onDelete} />);

      // Hover to show action buttons
      const card = screen.getByText("Test Dashboard").closest("div");
      if (card) {
        fireEvent.mouseEnter(card.parentElement as Element);
      }

      // Find and click delete button
      await waitFor(() => {
        const deleteButton = screen.getByTitle("Excluir");
        expect(deleteButton).toBeInTheDocument();
        fireEvent.click(deleteButton);
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalledWith(dashboard);

      confirmSpy.mockRestore();
    });

    it("should not call onDelete when confirmation is cancelled", async () => {
      const onDelete = vi.fn();
      const dashboard = createMockDashboard();

      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<DashboardCard dashboard={dashboard} onDelete={onDelete} />);

      const card = screen.getByText("Test Dashboard").closest("div");
      if (card) {
        fireEvent.mouseEnter(card.parentElement as Element);
      }

      await waitFor(() => {
        const deleteButton = screen.getByTitle("Excluir");
        fireEvent.click(deleteButton);
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it("should call onEdit when edit button is clicked", async () => {
      const onEdit = vi.fn();
      const dashboard = createMockDashboard();

      render(<DashboardCard dashboard={dashboard} onEdit={onEdit} />);

      const card = screen.getByText("Test Dashboard").closest("div");
      if (card) {
        fireEvent.mouseEnter(card.parentElement as Element);
      }

      await waitFor(() => {
        const editButton = screen.getByTitle("Editar");
        fireEvent.click(editButton);
      });

      expect(onEdit).toHaveBeenCalledWith(dashboard);
    });

    it("should call onDuplicate when duplicate button is clicked", async () => {
      const onDuplicate = vi.fn();
      const dashboard = createMockDashboard();

      render(<DashboardCard dashboard={dashboard} onDuplicate={onDuplicate} />);

      const card = screen.getByText("Test Dashboard").closest("div");
      if (card) {
        fireEvent.mouseEnter(card.parentElement as Element);
      }

      await waitFor(() => {
        const duplicateButton = screen.getByTitle("Duplicar");
        fireEvent.click(duplicateButton);
      });

      expect(onDuplicate).toHaveBeenCalledWith(dashboard);
    });
  });

  describe("Action Buttons Visibility", () => {
    it("should show action buttons on hover", async () => {
      const dashboard = createMockDashboard();

      render(
        <DashboardCard
          dashboard={dashboard}
          onView={() => {}}
          onEdit={() => {}}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      );

      // Action buttons should not be visible initially
      expect(screen.queryByTitle("Visualizar")).not.toBeInTheDocument();

      // Hover to show action buttons
      const card = screen.getByText("Test Dashboard").closest("div");
      if (card) {
        fireEvent.mouseEnter(card.parentElement as Element);
      }

      // Action buttons should be visible
      await waitFor(() => {
        expect(screen.getByTitle("Visualizar")).toBeInTheDocument();
        expect(screen.getByTitle("Editar")).toBeInTheDocument();
        expect(screen.getByTitle("Duplicar")).toBeInTheDocument();
        expect(screen.getByTitle("Excluir")).toBeInTheDocument();
      });
    });

    it("should hide action buttons on mouse leave", async () => {
      const dashboard = createMockDashboard();

      render(
        <DashboardCard
          dashboard={dashboard}
          onView={() => {}}
          onEdit={() => {}}
        />
      );

      const card = screen.getByText("Test Dashboard").closest("div");
      if (card) {
        fireEvent.mouseEnter(card.parentElement as Element);
      }

      await waitFor(() => {
        expect(screen.getByTitle("Visualizar")).toBeInTheDocument();
      });

      if (card) {
        fireEvent.mouseLeave(card.parentElement as Element);
      }

      await waitFor(() => {
        expect(screen.queryByTitle("Visualizar")).not.toBeInTheDocument();
      });
    });
  });
});
