/**
 * Tests for WidgetViewModal Component
 *
 * @see US-027: Listar Meus Widgets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WidgetViewModal } from "../../../components/widgets/WidgetViewModal";
import type { Widget } from "../../../lib/api";

// Mock createPortal to render in the document
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

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
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-20T15:30:00Z",
    ...overrides,
  };
}

describe("WidgetViewModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      const widget = createMockWidget();
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={false}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should not render when widget is null", () => {
      render(
        <WidgetViewModal
          widget={null}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render modal when isOpen is true and widget is provided", () => {
      const widget = createMockWidget();
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Test Widget")).toBeInTheDocument();
    });

    it("should display widget name and description", () => {
      const widget = createMockWidget();
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Test Widget")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should display chart type", () => {
      const widget = createMockWidget({ chartType: "BAR" });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("BAR")).toBeInTheDocument();
    });

    it("should display creation date", () => {
      const widget = createMockWidget();
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/criado em/i)).toBeInTheDocument();
    });

    it("should display last update date when cachedAt is set", () => {
      const widget = createMockWidget({
        cachedAt: "2026-01-20T15:30:00Z",
      });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/atualizado em/i)).toBeInTheDocument();
    });

    it("should display refresh interval when set", () => {
      const widget = createMockWidget({ refreshInterval: 60 });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/atualiza a cada 1 hora/i)).toBeInTheDocument();
    });

    it("should display original query", () => {
      const widget = createMockWidget({ query: "Show test metrics" });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/consulta original/i)).toBeInTheDocument();
      expect(screen.getByText(/Show test metrics/)).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();
      const widget = createMockWidget();

      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByLabelText("Fechar modal");
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when backdrop is clicked", () => {
      const onClose = vi.fn();
      const widget = createMockWidget();

      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={onClose}
        />
      );

      const backdrop = screen.getByRole("dialog").querySelector('[aria-hidden="true"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      const onClose = vi.fn();
      const widget = createMockWidget();

      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onEdit when edit button is clicked", () => {
      const onEdit = vi.fn();
      const widget = createMockWidget();

      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
          onEdit={onEdit}
        />
      );

      const editButton = screen.getByLabelText("Editar widget");
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(widget);
    });

    it("should call onRefresh when refresh button is clicked", () => {
      const onRefresh = vi.fn();
      const widget = createMockWidget();

      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
          onRefresh={onRefresh}
        />
      );

      const refreshButton = screen.getByLabelText("Atualizar dados");
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledWith(widget);
    });

    it("should disable refresh button when isRefreshing is true", () => {
      const onRefresh = vi.fn();
      const widget = createMockWidget();

      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
          onRefresh={onRefresh}
          isRefreshing={true}
        />
      );

      const refreshButton = screen.getByLabelText("Atualizar dados");
      expect(refreshButton).toBeDisabled();
    });
  });

  describe("Body Scroll Lock", () => {
    it("should lock body scroll when modal is open", () => {
      const widget = createMockWidget();

      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should unlock body scroll when modal is closed", () => {
      const widget = createMockWidget();

      const { rerender } = render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      rerender(
        <WidgetViewModal
          widget={widget}
          isOpen={false}
          onClose={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Refresh Interval Display", () => {
    it("should display minutes for intervals under 60", () => {
      const widget = createMockWidget({ refreshInterval: 15 });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/atualiza a cada 15 minutos/i)).toBeInTheDocument();
    });

    it("should display hours for intervals of 360", () => {
      const widget = createMockWidget({ refreshInterval: 360 });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/atualiza a cada 6 horas/i)).toBeInTheDocument();
    });

    it("should display 24 hours for daily intervals", () => {
      const widget = createMockWidget({ refreshInterval: 1440 });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/atualiza a cada 24 horas/i)).toBeInTheDocument();
    });

    it("should not display refresh interval when null", () => {
      const widget = createMockWidget({ refreshInterval: null });
      render(
        <WidgetViewModal
          widget={widget}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText(/atualiza a cada/i)).not.toBeInTheDocument();
    });
  });
});
