/**
 * Testes unitários para o WidgetService.
 *
 * @see US-026: Salvar Gráfico como Widget
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import type { ChartType } from "@prisma/client";

// Mock do Prisma
vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    widget: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock do crypto
vi.mock("../../../lib/crypto.js", () => ({
  decrypt: vi.fn((token: string) => `decrypted-${token}`),
}));

// Mock do env
vi.mock("../../../lib/env.js", () => ({
  env: {
    OPENAI_API_KEY: "sk-test-key",
    QASE_API_TOKEN: "qase-test-token",
  },
}));

// Mock do orchestrator
vi.mock("../../../agents/orchestrator.js", () => ({
  runOrchestrator: vi.fn().mockResolvedValue({
    response: "Test response with ```json\n{\"data\": [{\"name\": \"Test\", \"value\": 100}]}\n```",
    needsProjectSelection: false,
    toolsUsed: ["generate_chart"],
    durationMs: 500,
  }),
}));

// Import after mocks
import {
  createWidget,
  getWidgets,
  getWidgetById,
  updateWidget,
  deleteWidget,
  refreshWidgetData,
  getWidgetsNeedingRefresh,
  isValidRefreshInterval,
  WidgetError,
  SUPPORTED_REFRESH_INTERVALS,
  type CreateWidgetInput,
  type UpdateWidgetInput,
} from "../../../services/widget.service.js";
import { prisma } from "../../../lib/prisma.js";
import { runOrchestrator } from "../../../agents/orchestrator.js";

// Helper to create mock widget
function createMockWidget(overrides: Partial<{
  id: string;
  name: string;
  description: string | null;
  query: string;
  chartType: ChartType;
  chartConfig: object;
  filters: object | null;
  cachedData: object | null;
  cachedAt: Date | null;
  refreshInterval: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "widget-123",
    name: "Test Widget",
    description: "Test description",
    query: "Show test metrics",
    chartType: "LINE" as ChartType,
    chartConfig: { title: "Test Chart" },
    filters: { projectCode: "DEMO" },
    cachedData: { data: [{ name: "Test", value: 100 }] },
    cachedAt: new Date(),
    refreshInterval: 60,
    userId: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("WidgetService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createWidget", () => {
    const validInput: CreateWidgetInput = {
      name: "Test Widget",
      description: "Test description",
      query: "Show test metrics",
      chartType: "LINE" as ChartType,
      chartConfig: { title: "Test Chart" },
      filters: { projectCode: "DEMO" },
      refreshInterval: 60,
      cachedData: { data: [] },
    };

    it("should create a widget successfully", async () => {
      const mockWidget = createMockWidget();
      (prisma.widget.create as Mock).mockResolvedValue(mockWidget);

      const widget = await createWidget("user-123", validInput);

      expect(widget).toBeDefined();
      expect(widget.name).toBe("Test Widget");
      expect(widget.query).toBe("Show test metrics");
      expect(widget.chartType).toBe("LINE");
      expect(widget.refreshInterval).toBe(60);
      expect(prisma.widget.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: validInput.name,
          description: validInput.description,
          query: validInput.query,
          chartType: validInput.chartType,
          userId: "user-123",
        }),
      });
    });

    it("should create widget without refresh interval", async () => {
      const inputWithoutRefresh = { ...validInput, refreshInterval: undefined };
      const mockWidget = createMockWidget({ refreshInterval: null });
      (prisma.widget.create as Mock).mockResolvedValue(mockWidget);

      const widget = await createWidget("user-123", inputWithoutRefresh);

      expect(widget.refreshInterval).toBeNull();
    });

    it("should reject invalid refresh intervals", async () => {
      const inputWithInvalidInterval = { ...validInput, refreshInterval: 7 };

      await expect(createWidget("user-123", inputWithInvalidInterval))
        .rejects.toThrow(WidgetError);
      await expect(createWidget("user-123", inputWithInvalidInterval))
        .rejects.toThrow("Invalid refresh interval");
    });

    it("should set cachedAt when cachedData is provided", async () => {
      const mockWidget = createMockWidget();
      (prisma.widget.create as Mock).mockResolvedValue(mockWidget);

      await createWidget("user-123", validInput);

      expect(prisma.widget.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cachedAt: expect.any(Date),
        }),
      });
    });
  });

  describe("getWidgets", () => {
    it("should return widgets for user", async () => {
      const mockWidgets = [
        createMockWidget({ id: "widget-1" }),
        createMockWidget({ id: "widget-2" }),
      ];
      (prisma.widget.findMany as Mock).mockResolvedValue(mockWidgets);
      (prisma.widget.count as Mock).mockResolvedValue(2);

      const result = await getWidgets("user-123");

      expect(result.widgets).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.widget.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("should return empty list for user with no widgets", async () => {
      (prisma.widget.findMany as Mock).mockResolvedValue([]);
      (prisma.widget.count as Mock).mockResolvedValue(0);

      const result = await getWidgets("user-123");

      expect(result.widgets).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getWidgetById", () => {
    it("should return widget when found", async () => {
      const mockWidget = createMockWidget();
      (prisma.widget.findFirst as Mock).mockResolvedValue(mockWidget);

      const widget = await getWidgetById("user-123", "widget-123");

      expect(widget).toBeDefined();
      expect(widget?.id).toBe("widget-123");
      expect(prisma.widget.findFirst).toHaveBeenCalledWith({
        where: { id: "widget-123", userId: "user-123" },
      });
    });

    it("should return null when widget not found", async () => {
      (prisma.widget.findFirst as Mock).mockResolvedValue(null);

      const widget = await getWidgetById("user-123", "nonexistent");

      expect(widget).toBeNull();
    });

    it("should not return widget from another user", async () => {
      (prisma.widget.findFirst as Mock).mockResolvedValue(null);

      const widget = await getWidgetById("user-456", "widget-123");

      expect(widget).toBeNull();
    });
  });

  describe("updateWidget", () => {
    const updateInput: UpdateWidgetInput = {
      name: "Updated Widget",
      description: "Updated description",
    };

    it("should update widget successfully", async () => {
      const existingWidget = createMockWidget();
      const updatedWidget = createMockWidget({ name: "Updated Widget" });

      (prisma.widget.findFirst as Mock).mockResolvedValue(existingWidget);
      (prisma.widget.update as Mock).mockResolvedValue(updatedWidget);

      const widget = await updateWidget("user-123", "widget-123", updateInput);

      expect(widget.name).toBe("Updated Widget");
      expect(prisma.widget.update).toHaveBeenCalledWith({
        where: { id: "widget-123" },
        data: expect.objectContaining({
          name: "Updated Widget",
          description: "Updated description",
        }),
      });
    });

    it("should throw error when widget not found", async () => {
      (prisma.widget.findFirst as Mock).mockResolvedValue(null);

      await expect(updateWidget("user-123", "nonexistent", updateInput))
        .rejects.toThrow(WidgetError);
      await expect(updateWidget("user-123", "nonexistent", updateInput))
        .rejects.toThrow("Widget not found");
    });

    it("should update refresh interval", async () => {
      const existingWidget = createMockWidget();
      const updatedWidget = createMockWidget({ refreshInterval: 30 });

      (prisma.widget.findFirst as Mock).mockResolvedValue(existingWidget);
      (prisma.widget.update as Mock).mockResolvedValue(updatedWidget);

      const widget = await updateWidget("user-123", "widget-123", {
        refreshInterval: 30,
      });

      expect(widget.refreshInterval).toBe(30);
    });

    it("should reject invalid refresh interval on update", async () => {
      const existingWidget = createMockWidget();
      (prisma.widget.findFirst as Mock).mockResolvedValue(existingWidget);

      await expect(updateWidget("user-123", "widget-123", {
        refreshInterval: 5,
      })).rejects.toThrow("Invalid refresh interval");
    });

    it("should allow removing refresh interval", async () => {
      const existingWidget = createMockWidget();
      const updatedWidget = createMockWidget({ refreshInterval: null });

      (prisma.widget.findFirst as Mock).mockResolvedValue(existingWidget);
      (prisma.widget.update as Mock).mockResolvedValue(updatedWidget);

      const widget = await updateWidget("user-123", "widget-123", {
        refreshInterval: null,
      });

      expect(widget.refreshInterval).toBeNull();
    });
  });

  describe("deleteWidget", () => {
    it("should delete widget successfully", async () => {
      const existingWidget = createMockWidget();
      (prisma.widget.findFirst as Mock).mockResolvedValue(existingWidget);
      (prisma.widget.delete as Mock).mockResolvedValue(existingWidget);

      await expect(deleteWidget("user-123", "widget-123")).resolves.not.toThrow();

      expect(prisma.widget.delete).toHaveBeenCalledWith({
        where: { id: "widget-123" },
      });
    });

    it("should throw error when widget not found", async () => {
      (prisma.widget.findFirst as Mock).mockResolvedValue(null);

      await expect(deleteWidget("user-123", "nonexistent"))
        .rejects.toThrow(WidgetError);
      await expect(deleteWidget("user-123", "nonexistent"))
        .rejects.toThrow("Widget not found");
    });
  });

  describe("refreshWidgetData", () => {
    it("should refresh widget data successfully", async () => {
      const existingWidget = createMockWidget();
      const widgetWithUser = {
        ...existingWidget,
        user: {
          id: "user-123",
          qaseApiToken: "encrypted-token",
          qaseTokenValid: true,
        },
      };
      const refreshedWidget = createMockWidget({
        cachedData: { data: [{ name: "New", value: 200 }] },
        cachedAt: new Date(),
      });

      (prisma.widget.findUnique as Mock).mockResolvedValue(widgetWithUser);
      (prisma.user.findUnique as Mock).mockResolvedValue({
        qaseApiToken: "encrypted-token",
        qaseTokenValid: true,
      });
      (prisma.widget.update as Mock).mockResolvedValue(refreshedWidget);

      // Ensure mock returns a proper response for this test
      (runOrchestrator as Mock).mockResolvedValueOnce({
        response: "Test response with ```json\n{\"data\": [{\"name\": \"Test\", \"value\": 100}]}\n```",
        needsProjectSelection: false,
        toolsUsed: ["generate_chart"],
        durationMs: 500,
      });

      const widget = await refreshWidgetData("widget-123");

      expect(widget).toBeDefined();
      expect(runOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          projectCode: "DEMO",
        }),
        "Show test metrics"
      );
    });

    it("should throw error when widget not found", async () => {
      (prisma.widget.findUnique as Mock).mockResolvedValue(null);

      await expect(refreshWidgetData("nonexistent"))
        .rejects.toThrow("Widget not found");
    });

    it("should throw error when user token not available", async () => {
      const widgetWithUser = {
        ...createMockWidget(),
        user: {
          id: "user-123",
          qaseApiToken: null,
          qaseTokenValid: false,
        },
      };

      (prisma.widget.findUnique as Mock).mockResolvedValue(widgetWithUser);
      (prisma.user.findUnique as Mock).mockResolvedValue({
        qaseApiToken: null,
        qaseTokenValid: false,
      });

      // Clear the env mock to simulate production without token
      vi.mock("../../../lib/env.js", () => ({
        env: {
          OPENAI_API_KEY: "sk-test-key",
          QASE_API_TOKEN: undefined,
        },
      }));

      await expect(refreshWidgetData("widget-123"))
        .rejects.toThrow("User Qase token not available");
    });
  });

  describe("getWidgetsNeedingRefresh", () => {
    it("should return widgets that need refresh", async () => {
      const oneHourAgo = new Date(Date.now() - 70 * 60 * 1000); // 70 minutes ago
      const widgets = [
        createMockWidget({
          id: "widget-1",
          refreshInterval: 60,
          cachedAt: oneHourAgo,
        }),
        createMockWidget({
          id: "widget-2",
          refreshInterval: 60,
          cachedAt: new Date(), // Recent
        }),
      ];

      (prisma.widget.findMany as Mock).mockResolvedValue(widgets);

      const result = await getWidgetsNeedingRefresh();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("widget-1");
    });

    it("should return widgets that have never been refreshed", async () => {
      const widgets = [
        createMockWidget({
          id: "widget-1",
          refreshInterval: 60,
          cachedAt: null,
        }),
      ];

      (prisma.widget.findMany as Mock).mockResolvedValue(widgets);

      const result = await getWidgetsNeedingRefresh();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("widget-1");
    });

    it("should not return widgets without refresh interval", async () => {
      const widgets = [
        createMockWidget({
          id: "widget-1",
          refreshInterval: null,
        }),
      ];

      (prisma.widget.findMany as Mock).mockResolvedValue(widgets);

      const result = await getWidgetsNeedingRefresh();

      expect(result).toHaveLength(0);
    });
  });

  describe("isValidRefreshInterval", () => {
    it("should return true for valid intervals", () => {
      for (const interval of SUPPORTED_REFRESH_INTERVALS) {
        expect(isValidRefreshInterval(interval)).toBe(true);
      }
    });

    it("should return false for invalid intervals", () => {
      expect(isValidRefreshInterval(5)).toBe(false);
      expect(isValidRefreshInterval(7)).toBe(false);
      expect(isValidRefreshInterval(45)).toBe(false);
      expect(isValidRefreshInterval(100)).toBe(false);
    });
  });

  describe("SUPPORTED_REFRESH_INTERVALS", () => {
    it("should contain expected intervals", () => {
      expect(SUPPORTED_REFRESH_INTERVALS).toContain(15);  // 15 min
      expect(SUPPORTED_REFRESH_INTERVALS).toContain(30);  // 30 min
      expect(SUPPORTED_REFRESH_INTERVALS).toContain(60);  // 1 hour
      expect(SUPPORTED_REFRESH_INTERVALS).toContain(360); // 6 hours
      expect(SUPPORTED_REFRESH_INTERVALS).toContain(1440); // 24 hours
    });
  });
});

describe("WidgetError", () => {
  it("should include code property", () => {
    const error = new WidgetError("Test error", "TEST_CODE");

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.name).toBe("WidgetError");
  });
});
