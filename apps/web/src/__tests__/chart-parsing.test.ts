/**
 * Tests for chart parsing utilities
 *
 * @see US-017: Preview de Gráficos no Chat
 */

import { describe, it, expect } from "vitest";
import {
  parseChartFromMarkdown,
  extractChartsFromContent,
} from "../components/charts/ChartPreview";
import type { ChartConfig } from "../components/charts/types";

describe("Chart Parsing Utilities", () => {
  describe("parseChartFromMarkdown", () => {
    it("should parse a valid chart block from markdown", () => {
      const chartConfig: ChartConfig = {
        id: "chart-123",
        type: "pie",
        title: "Test Chart",
        data: [{ name: "A", value: 100 }],
        showLegend: true,
        showTooltip: true,
        colors: ["#10b981"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const markdown = `Here is the chart:

:::chart
${JSON.stringify(chartConfig)}
:::

That's the result.`;

      const result = parseChartFromMarkdown(markdown);

      expect(result.chartConfig).not.toBeNull();
      expect(result.chartConfig?.id).toBe("chart-123");
      expect(result.chartConfig?.type).toBe("pie");
      expect(result.beforeChart).toBe("Here is the chart:\n\n");
      expect(result.afterChart).toBe("\n\nThat's the result.");
    });

    it("should return null chart when no chart block exists", () => {
      const markdown = "This is just plain text without any chart.";

      const result = parseChartFromMarkdown(markdown);

      expect(result.chartConfig).toBeNull();
      expect(result.beforeChart).toBe(markdown);
      expect(result.afterChart).toBe("");
    });

    it("should handle invalid JSON gracefully", () => {
      const markdown = `Some text

:::chart
{invalid json}
:::

More text`;

      const result = parseChartFromMarkdown(markdown);

      expect(result.chartConfig).toBeNull();
      expect(result.beforeChart).toBe(markdown);
    });

    it("should reject chart without required fields", () => {
      const invalidChart = {
        // Missing id, type, data
        title: "Missing Fields",
      };

      const markdown = `:::chart
${JSON.stringify(invalidChart)}
:::`;

      const result = parseChartFromMarkdown(markdown);

      expect(result.chartConfig).toBeNull();
    });

    it("should parse chart at beginning of content", () => {
      const chartConfig: ChartConfig = {
        id: "chart-start",
        type: "bar",
        title: "Start Chart",
        data: [{ name: "A", value: 50 }],
        showLegend: true,
        showTooltip: true,
        colors: ["#6366f1"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const markdown = `:::chart
${JSON.stringify(chartConfig)}
:::

Following text.`;

      const result = parseChartFromMarkdown(markdown);

      expect(result.chartConfig).not.toBeNull();
      expect(result.beforeChart).toBe("");
      expect(result.afterChart).toBe("\n\nFollowing text.");
    });

    it("should parse chart at end of content", () => {
      const chartConfig: ChartConfig = {
        id: "chart-end",
        type: "line",
        title: "End Chart",
        data: [{ name: "A", value: 75 }],
        showLegend: true,
        showTooltip: true,
        colors: ["#10b981"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const markdown = `Here is the data:

:::chart
${JSON.stringify(chartConfig)}
:::`;

      const result = parseChartFromMarkdown(markdown);

      expect(result.chartConfig).not.toBeNull();
      expect(result.beforeChart).toBe("Here is the data:\n\n");
      expect(result.afterChart).toBe("");
    });
  });

  describe("extractChartsFromContent", () => {
    it("should extract single chart with surrounding text", () => {
      const chartConfig: ChartConfig = {
        id: "chart-single",
        type: "pie",
        title: "Single Chart",
        data: [{ name: "A", value: 100 }],
        showLegend: true,
        showTooltip: true,
        colors: ["#10b981"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const content = `Introduction text.

:::chart
${JSON.stringify(chartConfig)}
:::

Conclusion text.`;

      const segments = extractChartsFromContent(content);

      expect(segments).toHaveLength(3);
      expect(segments[0].type).toBe("text");
      expect((segments[0] as { type: "text"; content: string }).content).toBe("Introduction text.\n\n");
      expect(segments[1].type).toBe("chart");
      expect((segments[1] as { type: "chart"; config: ChartConfig }).config.id).toBe("chart-single");
      expect(segments[2].type).toBe("text");
      expect((segments[2] as { type: "text"; content: string }).content).toBe("\n\nConclusion text.");
    });

    it("should extract multiple charts from content", () => {
      const chart1: ChartConfig = {
        id: "chart-1",
        type: "pie",
        title: "Chart 1",
        data: [{ name: "A", value: 50 }],
        showLegend: true,
        showTooltip: true,
        colors: ["#10b981"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const chart2: ChartConfig = {
        id: "chart-2",
        type: "bar",
        title: "Chart 2",
        data: [{ name: "B", value: 75 }],
        showLegend: true,
        showTooltip: true,
        colors: ["#6366f1"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const content = `First chart:

:::chart
${JSON.stringify(chart1)}
:::

Second chart:

:::chart
${JSON.stringify(chart2)}
:::

End.`;

      const segments = extractChartsFromContent(content);

      // text, chart, text, chart, text
      const chartSegments = segments.filter((s) => s.type === "chart");
      expect(chartSegments).toHaveLength(2);
      expect((chartSegments[0] as { type: "chart"; config: ChartConfig }).config.id).toBe("chart-1");
      expect((chartSegments[1] as { type: "chart"; config: ChartConfig }).config.id).toBe("chart-2");
    });

    it("should handle content without charts", () => {
      const content = "This is plain text without any charts.";

      const segments = extractChartsFromContent(content);

      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe("text");
      expect((segments[0] as { type: "text"; content: string }).content).toBe(content);
    });

    it("should handle only chart content", () => {
      const chartConfig: ChartConfig = {
        id: "chart-only",
        type: "donut",
        title: "Only Chart",
        data: [{ name: "A", value: 100 }],
        showLegend: true,
        showTooltip: true,
        colors: ["#10b981"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const content = `:::chart
${JSON.stringify(chartConfig)}
:::`;

      const segments = extractChartsFromContent(content);

      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe("chart");
    });

    it("should handle empty content", () => {
      const segments = extractChartsFromContent("");

      expect(segments).toHaveLength(0);
    });
  });
});
