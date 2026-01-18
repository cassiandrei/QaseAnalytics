/**
 * Tests for generate_chart tool
 *
 * @see US-017: Preview de Gráficos no Chat
 * @see US-020: Gráfico de Linhas
 * @see US-021: Gráfico de Barras
 * @see US-022: Gráfico de Pizza/Donut
 */

import { describe, it, expect } from "vitest";
import { generateChart, type GenerateChartInput } from "../../tools/generate-chart.tool.js";

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
      expect(result.chart?.series?.[0]?.dataKey).toBe("value");
      expect(result.chart?.series?.[1]?.dataKey).toBe("value2");
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
      const createdAt = result.chart!.createdAt;
      expect(createdAt >= before).toBe(true);
      expect(createdAt <= after).toBe(true);
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
      expect(jsonMatch?.[1]).toBeDefined();

      const parsed = JSON.parse(jsonMatch![1]!);
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

  // US-020: Line chart features
  describe("US-020: Line chart features", () => {
    it("should support enableBrush option for line charts", () => {
      const input: GenerateChartInput = {
        type: "line",
        title: "Line Chart with Brush",
        data: Array.from({ length: 20 }, (_, i) => ({
          name: `Day ${i + 1}`,
          value: Math.floor(Math.random() * 100),
        })),
        enableBrush: true,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.enableBrush).toBe(true);
    });

    it("should support enableBrush option for area charts", () => {
      const input: GenerateChartInput = {
        type: "area",
        title: "Area Chart with Brush",
        data: Array.from({ length: 15 }, (_, i) => ({
          name: `Week ${i + 1}`,
          value: i * 10,
        })),
        enableBrush: true,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.enableBrush).toBe(true);
      expect(result.chart?.type).toBe("area");
    });

    it("should allow disabling brush explicitly", () => {
      const input: GenerateChartInput = {
        type: "line",
        title: "Line Chart without Brush",
        data: Array.from({ length: 20 }, (_, i) => ({
          name: `Day ${i + 1}`,
          value: i,
        })),
        enableBrush: false,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.enableBrush).toBe(false);
    });
  });

  // US-021: Bar chart features
  describe("US-021: Bar chart features", () => {
    it("should support horizontal bar layout", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Horizontal Bar Chart",
        data: [
          { name: "Project A", value: 100 },
          { name: "Project B", value: 75 },
          { name: "Project C", value: 50 },
        ],
        barLayout: "horizontal",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.barLayout).toBe("horizontal");
    });

    it("should support vertical bar layout (default)", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Vertical Bar Chart",
        data: [
          { name: "A", value: 100 },
          { name: "B", value: 200 },
        ],
        barLayout: "vertical",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.barLayout).toBe("vertical");
    });

    it("should support stacked bar mode", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Stacked Bar Chart",
        data: [
          { name: "Q1", value: 100, value2: 50 },
          { name: "Q2", value: 150, value2: 75 },
          { name: "Q3", value: 200, value2: 100 },
        ],
        series: [
          { dataKey: "value", name: "Passed" },
          { dataKey: "value2", name: "Failed" },
        ],
        barStackMode: "stacked",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.barStackMode).toBe("stacked");
    });

    it("should support percent bar mode", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Percent Bar Chart",
        data: [
          { name: "Team A", value: 80, value2: 20 },
          { name: "Team B", value: 60, value2: 40 },
        ],
        series: [
          { dataKey: "value", name: "Pass" },
          { dataKey: "value2", name: "Fail" },
        ],
        barStackMode: "percent",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.barStackMode).toBe("percent");
    });

    it("should support grouped bar mode (default)", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Grouped Bar Chart",
        data: [
          { name: "Jan", value: 100, value2: 80 },
          { name: "Feb", value: 120, value2: 90 },
        ],
        series: [
          { dataKey: "value", name: "Automated" },
          { dataKey: "value2", name: "Manual" },
        ],
        barStackMode: "grouped",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.barStackMode).toBe("grouped");
    });

    it("should support showing bar labels", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Bar Chart with Labels",
        data: [
          { name: "A", value: 100 },
          { name: "B", value: 200 },
          { name: "C", value: 150 },
        ],
        showBarLabels: true,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.showBarLabels).toBe(true);
    });

    it("should support horizontal stacked bar with labels", () => {
      const input: GenerateChartInput = {
        type: "bar",
        title: "Full Featured Bar Chart",
        data: [
          { name: "Sprint 1", value: 50, value2: 30, value3: 20 },
          { name: "Sprint 2", value: 60, value2: 25, value3: 15 },
        ],
        series: [
          { dataKey: "value", name: "Passed" },
          { dataKey: "value2", name: "Failed" },
          { dataKey: "value3", name: "Blocked" },
        ],
        barLayout: "horizontal",
        barStackMode: "stacked",
        showBarLabels: true,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.barLayout).toBe("horizontal");
      expect(result.chart?.barStackMode).toBe("stacked");
      expect(result.chart?.showBarLabels).toBe(true);
    });
  });

  // US-022: Pie/Donut chart features
  describe("US-022: Pie/Donut chart features", () => {
    it("should support showCenterValue for donut charts", () => {
      const input: GenerateChartInput = {
        type: "donut",
        title: "Donut with Center Value",
        data: [
          { name: "Passed", value: 85 },
          { name: "Failed", value: 15 },
        ],
        showCenterValue: true,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.showCenterValue).toBe(true);
    });

    it("should support centerLabel for donut charts", () => {
      const input: GenerateChartInput = {
        type: "donut",
        title: "Donut with Label",
        data: [
          { name: "Active", value: 100 },
          { name: "Inactive", value: 50 },
        ],
        showCenterValue: true,
        centerLabel: "Total Tests",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.centerLabel).toBe("Total Tests");
    });

    it("should support custom centerValue", () => {
      const input: GenerateChartInput = {
        type: "donut",
        title: "Donut with Custom Value",
        data: [
          { name: "Passed", value: 85 },
          { name: "Failed", value: 15 },
        ],
        showCenterValue: true,
        centerValue: "85%",
        centerLabel: "Pass Rate",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.centerValue).toBe("85%");
      expect(result.chart?.centerLabel).toBe("Pass Rate");
    });

    it("should support numeric centerValue", () => {
      const input: GenerateChartInput = {
        type: "donut",
        title: "Donut with Numeric Center",
        data: [
          { name: "A", value: 30 },
          { name: "B", value: 70 },
        ],
        showCenterValue: true,
        centerValue: 1500,
        centerLabel: "Total",
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.centerValue).toBe(1500);
    });

    it("should allow disabling center value explicitly", () => {
      const input: GenerateChartInput = {
        type: "donut",
        title: "Donut without Center",
        data: [
          { name: "X", value: 50 },
          { name: "Y", value: 50 },
        ],
        showCenterValue: false,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.showCenterValue).toBe(false);
    });

    it("should work for pie chart without center value", () => {
      const input: GenerateChartInput = {
        type: "pie",
        title: "Regular Pie Chart",
        data: [
          { name: "A", value: 33 },
          { name: "B", value: 33 },
          { name: "C", value: 34 },
        ],
        showCenterValue: false,
        showLegend: true,
        showTooltip: true,
      };

      const result = generateChart(input);

      expect(result.success).toBe(true);
      expect(result.chart?.type).toBe("pie");
      expect(result.chart?.showCenterValue).toBe(false);
    });
  });
});
