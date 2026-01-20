/**
 * Tests for WidgetCard Component
 *
 * @see US-027: Listar Meus Widgets
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WidgetCard } from "../../../components/widgets/WidgetCard";
import type { Widget } from "../../../lib/api";

// Mock widget data
function createMockWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: "widget-123",
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
    filters: { projectCode: "DEMO" },
    cachedData: { data: [{ name: "A", value: 100 }] },
    cachedAt: new Date().toISOString(),
    refreshInterval: 60,
    userId: "user-123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("WidgetCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render widget name and description", () => {
      const widget = createMockWidget();
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("Test Widget")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should render chart type badge", () => {
      const widget = createMockWidget({ chartType: "BAR" });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("bar")).toBeInTheDocument();
    });

    it("should render creation date", () => {
      const widget = createMockWidget({
        createdAt: "2026-01-15T10:00:00Z",
      });
      render(<WidgetCard widget={widget} />);

      // Date should be formatted in pt-BR
      expect(screen.getByText(/jan/i)).toBeInTheDocument();
    });

    it("should render refresh interval badge when set", () => {
      const widget = createMockWidget({ refreshInterval: 60 });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("1h")).toBeInTheDocument();
    });

    it("should not render refresh interval when null", () => {
      const widget = createMockWidget({ refreshInterval: null });
      render(<WidgetCard widget={widget} />);

      // Should not have the clock icon / refresh interval text
      expect(screen.queryByText("1h")).not.toBeInTheDocument();
    });

    it("should handle widget without description", () => {
      const widget = createMockWidget({ description: null });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("Test Widget")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onView when chart area is clicked", () => {
      const onView = vi.fn();
      const widget = createMockWidget();

      render(<WidgetCard widget={widget} onView={onView} />);

      // Click the chart preview area
      const viewButton = screen.getByRole("button", {
        name: /ver widget test widget/i,
      });
      fireEvent.click(viewButton);

      expect(onView).toHaveBeenCalledWith(widget);
    });

    it("should call onDelete with confirmation", async () => {
      const onDelete = vi.fn();
      const widget = createMockWidget();

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<WidgetCard widget={widget} onDelete={onDelete} />);

      // Hover to show action buttons - simulate mouseEnter
      const card = screen.getByText("Test Widget").closest("div");
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
      expect(onDelete).toHaveBeenCalledWith(widget);

      confirmSpy.mockRestore();
    });

    it("should not call onDelete when confirmation is cancelled", async () => {
      const onDelete = vi.fn();
      const widget = createMockWidget();

      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<WidgetCard widget={widget} onDelete={onDelete} />);

      const card = screen.getByText("Test Widget").closest("div");
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
  });

  describe("Chart Type Rendering", () => {
    it("should render line chart for LINE type", () => {
      const widget = createMockWidget({ chartType: "LINE" });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("line")).toBeInTheDocument();
    });

    it("should render bar chart for BAR type", () => {
      const widget = createMockWidget({ chartType: "BAR" });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("bar")).toBeInTheDocument();
    });

    it("should render pie chart for PIE type", () => {
      const widget = createMockWidget({ chartType: "PIE" });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("pie")).toBeInTheDocument();
    });

    it("should render donut chart for DONUT type", () => {
      const widget = createMockWidget({ chartType: "DONUT" });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("donut")).toBeInTheDocument();
    });
  });

  describe("Refresh Interval Formatting", () => {
    it("should format minutes correctly", () => {
      const widget = createMockWidget({ refreshInterval: 15 });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("15min")).toBeInTheDocument();
    });

    it("should format 30 minutes correctly", () => {
      const widget = createMockWidget({ refreshInterval: 30 });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("30min")).toBeInTheDocument();
    });

    it("should format hours correctly", () => {
      const widget = createMockWidget({ refreshInterval: 360 });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("6h")).toBeInTheDocument();
    });

    it("should format 24 hours as days", () => {
      const widget = createMockWidget({ refreshInterval: 1440 });
      render(<WidgetCard widget={widget} />);

      expect(screen.getByText("1d")).toBeInTheDocument();
    });
  });
});
