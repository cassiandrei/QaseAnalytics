/**
 * Tests for generate_chart tool
 *
 * @see US-017: Preview de Gráficos no Chat
 */

import { describe, it, expect } from "vitest";
import { generateChart, type GenerateChartInput } from "../../tools/generate-chart.tool";

describe("generate_chart tool", () => {
  describe("generateChart", () => {
    it("should generate a pie chart configuration", () => {
      const input: GenerateChartInput = {
        type: "pie",
        title: "Test Results",
        data: [
          { name: "Passed", value: 85 },
          { name: "Failed", value: 10 },
          { name: "Blocked", value: 5 },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart).toBeDefined();
      expect(result.chart?.type).toBe("pie");
      expect(result.chart?.title).toBe("Test Results");
      expect(result.chart?.data).toHaveLength(3);
      expect(result.chart?.id).toMatch(/^chart-/);
      expect(result.markdown).toContain(":::chart");
      expect(result.markdown).toContain(":::");
    });

    it("should generate a donut chart configuration", () => {
      const input: GenerateChartInput = {
        type: "donut",
        title: "Status Distribution",
        data: [
          { name: "Active", value: 30 },
          { name: "Complete", value: 60 },
          { name: "Abort", value: 10 },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.type).toBe("donut");
    });

    it("should generate a bar chart configuration", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Tests per Project",
        xAxisLabel: "Project",
        yAxisLabel: "Tests",
        data: [
          { name: "Project A", value: 100 },
          { name: "Project B", value: 75 },
          { name: "Project C", value: 50 },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.type).toBe("bar");
      expect(result.chart?.xAxisLabel).toBe("Project");
      expect(result.chart?.yAxisLabel).toBe("Tests");
    });

    it("should generate a line chart configuration", () => {
      const input: GenerateChartInput = {
        type: "line",
        title: "Pass Rate Evolution",
        xAxisLabel: "Month",
        yAxisLabel: "Pass Rate (%)",
        data: [
          { name: "Jan", value: 75 },
          { name: "Feb", value: 80 },
          { name: "Mar", value: 85 },
          { name: "Apr", value: 82 },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.type).toBe("line");
      expect(result.chart?.data).toHaveLength(4);
    });

    it("should generate an area chart configuration", () => {
      const input: GenerateChartInput = {
        type: "area",
        title: "Test Growth",
        data: [
          { name: "Q1", value: 100 },
          { name: "Q2", value: 150 },
          { name: "Q3", value: 200 },
          { name: "Q4", value: 280 },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.type).toBe("area");
    });

    it("should apply semantic colors for test statuses", () => {
      const input: GenerateChartInput = {
        type: "pie",
        title: "Test Results",
        data: [
          { name: "Passed", value: 85 },
          { name: "Failed", value: 10 },
          { name: "Blocked", value: 5 },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.colors).toBeDefined();
      expect(result.chart?.colors[0]).toBe("#10b981"); // passed - emerald
      expect(result.chart?.colors[1]).toBe("#ef4444"); // failed - red
      expect(result.chart?.colors[2]).toBe("#f59e0b"); // blocked - amber
    });

    it("should use custom colors when provided", () => {
      const customColors = ["#ff0000", "#00ff00", "#0000ff"];
      const input: GenerateChartInput = {
        type: "pie",
        title: "Custom Colors",
        data: [
          { name: "A", value: 33 },
          { name: "B", value: 33 },
          { name: "C", value: 34 },
        ],
        colors: customColors,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.colors).toEqual(customColors);
    });

    it("should support multi-series charts", () => {
      const input: GenerateChartInput = {
        type: "line",
        title: "Multi-Series Chart",
        data: [
          { name: "Jan", value: 10, value2: 20 },
          { name: "Feb", value: 15, value2: 25 },
          { name: "Mar", value: 20, value2: 30 },
        ],
        series: [
          { dataKey: "value", name: "Series 1", color: "#10b981" },
          { dataKey: "value2", name: "Series 2", color: "#6366f1" },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.series).toHaveLength(2);
      expect(result.chart?.series?.[0].dataKey).toBe("value");
      expect(result.chart?.series?.[1].dataKey).toBe("value2");
    });

    it("should fail when no data is provided", () => {
      const input: GenerateChartInput = {
        type: "pie",
        title: "Empty Chart",
        data: [],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No data provided for chart");
    });

    it("should include description when provided", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Chart with Description",
        description: "This is a test description",
        data: [{ name: "A", value: 100 }],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.description).toBe("This is a test description");
    });

    it("should set createdAt timestamp", () => {
      const before = new Date().toISOString();

      const input: GenerateChartInput = {
        type: "pie",
        title: "Timestamped Chart",
        data: [{ name: "A", value: 100 }],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);
      const after = new Date().toISOString();

      expect(result.success).toBe(true);
      expect(result.chart?.createdAt).toBeDefined();
      expect(result.chart?.createdAt >= before).toBe(true);
      expect(result.chart?.createdAt <= after).toBe(true);
    });

    it("should generate valid markdown format", () => {
      const input: GenerateChartInput = {
        type: "pie",
        title: "Markdown Test",
        data: [{ name: "A", value: 100 }],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.markdown).toBeDefined();
      expect(result.markdown).toMatch(/^[\n\s]*:::chart\n/);
      expect(result.markdown).toMatch(/\n:::[\n\s]*$/);

      // Extract JSON from markdown and validate
      const jsonMatch = result.markdown?.match(/:::chart\n([\s\S]*?)\n:::/);
      expect(jsonMatch).toBeDefined();

      const parsed = JSON.parse(jsonMatch![1]);
      expect(parsed.type).toBe("pie");
      expect(parsed.title).toBe("Markdown Test");
    });

    it("should handle skipped status color", () => {
      const input: GenerateChartInput = {
        type: "pie",
        title: "With Skipped",
        data: [
          { name: "Passed", value: 70 },
          { name: "Skipped", value: 30 },
        ],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.colors[0]).toBe("#10b981"); // passed
      expect(result.chart?.colors[1]).toBe("#6b7280"); // skipped - gray
    });

    it("should default showLegend and showTooltip to true", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Defaults Test",
        data: [{ name: "A", value: 100 }],
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.showLegend).toBe(true);
      expect(result.chart?.showTooltip).toBe(true);
    });
  });
});
