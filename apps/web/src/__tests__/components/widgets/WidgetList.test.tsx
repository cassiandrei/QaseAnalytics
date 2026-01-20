/**
 * Tests for WidgetList Component
 *
 * @see US-027: Listar Meus Widgets
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WidgetList } from "../../../components/widgets/WidgetList";
import type { Widget } from "../../../lib/api";

// Mock widget data
function createMockWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: `widget-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Widget",
    description: "Test description",
    query: "Show test metrics",
    chartType: "LINE",
    chartConfig: {
      title: "Test Chart",
      xAxis: "Time",
      yAxis: "Value",
      colors: ["#6366f1"],
      legend: true,
      data: [{ name: "A", value: 100 }],
    },
    filters: null,
    cachedData: { data: [{ name: "A", value: 100 }] },
    cachedAt: new Date().toISOString(),
    refreshInterval: 60,
    userId: "user-123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("WidgetList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty State", () => {
    it("should show empty state when no widgets", () => {
      render(
        <WidgetList
          widgets={[]}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("Nenhum widget salvo")).toBeInTheDocument();
      expect(screen.getByText(/crie gráficos no chat/i)).toBeInTheDocument();
      expect(screen.getByText("Ir para o Chat")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show loading state", () => {
      render(
        <WidgetList
          widgets={[]}
          isLoading={true}
          error={null}
        />
      );

      expect(screen.getByText("Carregando widgets...")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should show error state with retry button", () => {
      const onRefresh = vi.fn();

      render(
        <WidgetList
          widgets={[]}
          isLoading={false}
          error="Erro de conexão"
          onRefresh={onRefresh}
        />
      );

      expect(screen.getByText("Erro ao carregar widgets")).toBeInTheDocument();
      expect(screen.getByText("Erro de conexão")).toBeInTheDocument();

      const retryButton = screen.getByText("Tentar novamente");
      fireEvent.click(retryButton);

      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("Widget Display", () => {
    it("should display widgets in a grid", () => {
      const widgets = [
        createMockWidget({ id: "w1", name: "Widget 1" }),
        createMockWidget({ id: "w2", name: "Widget 2" }),
        createMockWidget({ id: "w3", name: "Widget 3" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("Widget 1")).toBeInTheDocument();
      expect(screen.getByText("Widget 2")).toBeInTheDocument();
      expect(screen.getByText("Widget 3")).toBeInTheDocument();
    });

    it("should show correct widget count", () => {
      const widgets = [
        createMockWidget({ id: "w1" }),
        createMockWidget({ id: "w2" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("2 widgets")).toBeInTheDocument();
    });

    it("should show singular form for one widget", () => {
      const widgets = [createMockWidget()];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText("1 widget")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("should filter widgets by name", async () => {
      const user = userEvent.setup();
      const widgets = [
        createMockWidget({ id: "w1", name: "Sales Dashboard" }),
        createMockWidget({ id: "w2", name: "Revenue Report" }),
        createMockWidget({ id: "w3", name: "Sales Trends" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
      await user.type(searchInput, "Sales");

      expect(screen.getByText("Sales Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Sales Trends")).toBeInTheDocument();
      expect(screen.queryByText("Revenue Report")).not.toBeInTheDocument();
    });

    it("should filter widgets by description", async () => {
      const user = userEvent.setup();
      const widgets = [
        createMockWidget({ id: "w1", name: "Widget 1", description: "Monthly metrics" }),
        createMockWidget({ id: "w2", name: "Widget 2", description: "Weekly report" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
      await user.type(searchInput, "monthly");

      expect(screen.getByText("Widget 1")).toBeInTheDocument();
      expect(screen.queryByText("Widget 2")).not.toBeInTheDocument();
    });

    it("should show no results state when search has no matches", async () => {
      const user = userEvent.setup();
      const widgets = [createMockWidget({ name: "Sales Dashboard" })];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
      await user.type(searchInput, "nonexistent");

      expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
    });

    it("should clear search when clear button is clicked", async () => {
      const user = userEvent.setup();
      const widgets = [
        createMockWidget({ id: "w1", name: "Widget 1" }),
        createMockWidget({ id: "w2", name: "Widget 2" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
      await user.type(searchInput, "Widget 1");

      expect(screen.queryByText("Widget 2")).not.toBeInTheDocument();

      const clearButton = screen.getByLabelText("Limpar busca");
      await user.click(clearButton);

      expect(screen.getByText("Widget 1")).toBeInTheDocument();
      expect(screen.getByText("Widget 2")).toBeInTheDocument();
    });
  });

  describe("Chart Type Filter", () => {
    it("should filter by chart type", async () => {
      const user = userEvent.setup();
      const widgets = [
        createMockWidget({ id: "w1", name: "Line Widget", chartType: "LINE" }),
        createMockWidget({ id: "w2", name: "Bar Widget", chartType: "BAR" }),
        createMockWidget({ id: "w3", name: "Pie Widget", chartType: "PIE" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const typeFilter = screen.getByLabelText(/filtrar por tipo/i);
      await user.selectOptions(typeFilter, "bar");

      expect(screen.queryByText("Line Widget")).not.toBeInTheDocument();
      expect(screen.getByText("Bar Widget")).toBeInTheDocument();
      expect(screen.queryByText("Pie Widget")).not.toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("should sort by newest first by default", () => {
      const oldDate = new Date("2026-01-01").toISOString();
      const newDate = new Date("2026-01-20").toISOString();

      const widgets = [
        createMockWidget({ id: "w1", name: "Old Widget", createdAt: oldDate }),
        createMockWidget({ id: "w2", name: "New Widget", createdAt: newDate }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const widgetNames = screen.getAllByRole("heading", { level: 3 });
      expect(widgetNames[0]).toHaveTextContent("New Widget");
      expect(widgetNames[1]).toHaveTextContent("Old Widget");
    });

    it("should sort by name when selected", async () => {
      const user = userEvent.setup();
      const widgets = [
        createMockWidget({ id: "w1", name: "Zebra Widget" }),
        createMockWidget({ id: "w2", name: "Alpha Widget" }),
        createMockWidget({ id: "w3", name: "Beta Widget" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const sortSelect = screen.getByLabelText(/ordenar por/i);
      await user.selectOptions(sortSelect, "name");

      const widgetNames = screen.getAllByRole("heading", { level: 3 });
      expect(widgetNames[0]).toHaveTextContent("Alpha Widget");
      expect(widgetNames[1]).toHaveTextContent("Beta Widget");
      expect(widgetNames[2]).toHaveTextContent("Zebra Widget");
    });
  });

  describe("Filtered Results Count", () => {
    it("should show filtered count when filters applied", async () => {
      const user = userEvent.setup();
      const widgets = [
        createMockWidget({ id: "w1", name: "Sales" }),
        createMockWidget({ id: "w2", name: "Revenue" }),
        createMockWidget({ id: "w3", name: "Sales Trends" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
      await user.type(searchInput, "Sales");

      expect(screen.getByText("2 de 3 widgets")).toBeInTheDocument();
    });
  });

  describe("Clear Filters", () => {
    it("should clear all filters when button is clicked", async () => {
      const user = userEvent.setup();
      const widgets = [
        createMockWidget({ id: "w1", name: "Widget 1", chartType: "LINE" }),
        createMockWidget({ id: "w2", name: "Widget 2", chartType: "BAR" }),
      ];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
        />
      );

      // Apply filters
      const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
      await user.type(searchInput, "Widget 1");

      // Clear filters
      const clearButton = screen.getByText("Limpar");
      await user.click(clearButton);

      // All widgets should be visible
      expect(screen.getByText("Widget 1")).toBeInTheDocument();
      expect(screen.getByText("Widget 2")).toBeInTheDocument();
    });
  });

  describe("Action Callbacks", () => {
    it("should pass onDelete to WidgetCard", async () => {
      const onDelete = vi.fn();
      const widget = createMockWidget({ name: "Test Widget" });

      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(
        <WidgetList
          widgets={[widget]}
          isLoading={false}
          error={null}
          onDelete={onDelete}
        />
      );

      // Hover to show actions
      const cardContainer = screen.getByText("Test Widget").closest("[class*='relative']");
      if (cardContainer) {
        fireEvent.mouseEnter(cardContainer);
      }

      await waitFor(() => {
        const deleteButton = screen.getByTitle("Excluir");
        fireEvent.click(deleteButton);
      });

      expect(onDelete).toHaveBeenCalledWith(widget);
    });
  });

  describe("Refresh Button", () => {
    it("should show refresh button when onRefresh is provided", () => {
      const onRefresh = vi.fn();
      const widgets = [createMockWidget()];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
          onRefresh={onRefresh}
        />
      );

      expect(screen.getByText("Atualizar")).toBeInTheDocument();
    });

    it("should call onRefresh when clicked", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      const widgets = [createMockWidget()];

      render(
        <WidgetList
          widgets={widgets}
          isLoading={false}
          error={null}
          onRefresh={onRefresh}
        />
      );

      const refreshButton = screen.getByText("Atualizar");
      await user.click(refreshButton);

      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
