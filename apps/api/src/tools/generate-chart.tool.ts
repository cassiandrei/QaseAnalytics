/**
 * LangChain Tool: generate_chart
 *
 * Permite ao agente gerar configurações de gráficos para visualização no chat.
 * Os gráficos são renderizados no frontend usando Recharts.
 *
 * @see US-017: Preview de Gráficos no Chat
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/** Tipos de gráficos suportados */
export type ChartType = "line" | "bar" | "pie" | "donut" | "area";

/** Schema para um ponto de dados */
const DataPointSchema = z.object({
  name: z.string().describe("Label for this data point (e.g., date, status name)"),
  value: z.number().describe("Primary numeric value"),
  value2: z.number().nullish().describe("Secondary numeric value (for multi-series)"),
  value3: z.number().nullish().describe("Tertiary numeric value (for multi-series)"),
});

/** Schema para configuração de série */
const SeriesConfigSchema = z.object({
  dataKey: z.string().describe("Key in data object for this series (e.g., 'value', 'value2')"),
  name: z.string().describe("Display name for this series in legend"),
  color: z.string().nullish().describe("Color for this series (hex code, e.g., '#10b981')"),
});

/** Schema de entrada para a tool */
export const GenerateChartInputSchema = z.object({
  type: z
    .enum(["line", "bar", "pie", "donut", "area"])
    .describe("Type of chart to generate"),
  title: z.string().describe("Title of the chart"),
  description: z.string().nullish().describe("Optional description or subtitle"),
  data: z
    .array(DataPointSchema)
    .min(1)
    .describe("Data points for the chart"),
  series: z
    .array(SeriesConfigSchema)
    .nullish()
    .describe("Series configuration for multi-series charts (line, bar, area)"),
  xAxisLabel: z.string().nullish().describe("Label for X axis"),
  yAxisLabel: z.string().nullish().describe("Label for Y axis"),
  showLegend: z.boolean().nullish().default(true).describe("Whether to show legend"),
  showTooltip: z.boolean().nullish().default(true).describe("Whether to show tooltip on hover"),
  colors: z
    .array(z.string())
    .nullish()
    .describe("Custom color palette (array of hex codes)"),
});

/** Tipo de entrada para a função generateChart */
export type GenerateChartInput = z.infer<typeof GenerateChartInputSchema>;

/** Configuração de gráfico gerada */
export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  data: Array<{
    name: string;
    value: number;
    value2?: number;
    value3?: number;
  }>;
  series?: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend: boolean;
  showTooltip: boolean;
  colors: string[];
  createdAt: string;
}

/** Resultado da geração de gráfico */
export interface GenerateChartResult {
  success: boolean;
  chart?: ChartConfig;
  error?: string;
  markdown?: string;
}

/** Paleta de cores padrão para gráficos */
const DEFAULT_COLORS = [
  "#10b981", // emerald-500 (passed/success)
  "#ef4444", // red-500 (failed/error)
  "#f59e0b", // amber-500 (blocked/warning)
  "#6366f1", // indigo-500 (primary)
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

/** Cores semânticas para status de teste */
const STATUS_COLORS: Record<string, string> = {
  passed: "#10b981",
  failed: "#ef4444",
  blocked: "#f59e0b",
  skipped: "#6b7280",
  untested: "#9ca3af",
  in_progress: "#3b82f6",
  active: "#3b82f6",
  complete: "#10b981",
  abort: "#ef4444",
};

/**
 * Gera um ID único para o gráfico.
 */
function generateChartId(): string {
  return `chart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Aplica cores semânticas aos dados baseado no nome.
 */
function applySemanticColors(data: GenerateChartInput["data"], customColors?: string[]): string[] {
  if (customColors && customColors.length > 0) {
    return customColors;
  }

  // Tenta aplicar cores semânticas baseado no nome do ponto
  const colors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const dataPoint = data[i];
    const defaultColor = DEFAULT_COLORS[i % DEFAULT_COLORS.length] ?? "#6b7280";

    if (!dataPoint) {
      colors.push(defaultColor);
      continue;
    }

    const name = dataPoint.name.toLowerCase().replace(/\s+/g, "_");

    // Verifica se há uma cor semântica para este nome
    const semanticColor = STATUS_COLORS[name];
    if (semanticColor) {
      colors.push(semanticColor);
    } else {
      // Usa cor da paleta padrão
      colors.push(defaultColor);
    }
  }

  return colors;
}

/**
 * Gera a configuração de um gráfico.
 *
 * @param input - Parâmetros de entrada
 * @returns Configuração do gráfico
 */
export function generateChart(input: GenerateChartInput): GenerateChartResult {
  try {
    // Valida dados
    if (input.data.length === 0) {
      return {
        success: false,
        error: "No data provided for chart",
      };
    }

    // Aplica cores
    const colors = applySemanticColors(input.data, input.colors);

    // Cria configuração do gráfico
    const chart: ChartConfig = {
      id: generateChartId(),
      type: input.type,
      title: input.title,
      description: input.description,
      data: input.data,
      series: input.series,
      xAxisLabel: input.xAxisLabel,
      yAxisLabel: input.yAxisLabel,
      showLegend: input.showLegend ?? true,
      showTooltip: input.showTooltip ?? true,
      colors,
      createdAt: new Date().toISOString(),
    };

    // Gera markdown especial para indicar o gráfico
    // O frontend vai detectar este padrão e renderizar o gráfico
    const markdown = `\n\n:::chart\n${JSON.stringify(chart)}\n:::\n\n`;

    return {
      success: true,
      chart,
      markdown,
    };
  } catch (error) {
    console.error("Error generating chart:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate chart",
    };
  }
}

/**
 * Cria a LangChain tool para gerar gráficos.
 *
 * @returns DynamicStructuredTool configurada
 *
 * @example
 * ```typescript
 * const tool = createGenerateChartTool();
 *
 * // Gráfico de pizza para status de testes
 * const result = await tool.invoke({
 *   type: "pie",
 *   title: "Test Results Distribution",
 *   data: [
 *     { name: "Passed", value: 85 },
 *     { name: "Failed", value: 10 },
 *     { name: "Blocked", value: 5 }
 *   ]
 * });
 *
 * // Gráfico de linha para evolução de pass rate
 * const result2 = await tool.invoke({
 *   type: "line",
 *   title: "Pass Rate Evolution",
 *   xAxisLabel: "Date",
 *   yAxisLabel: "Pass Rate (%)",
 *   data: [
 *     { name: "Jan", value: 75 },
 *     { name: "Feb", value: 80 },
 *     { name: "Mar", value: 85 }
 *   ]
 * });
 * ```
 */
export function createGenerateChartTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "generate_chart",
    description: `Generates a chart configuration for visual display in the chat.
Use this tool when the user asks for visualizations, graphs, or charts.

Supported chart types:
- pie/donut: For showing distribution (e.g., test status distribution)
- bar: For comparing categories (e.g., tests per project)
- line/area: For showing trends over time (e.g., pass rate evolution)

Best practices:
- Use pie/donut for showing proportions of a whole
- Use bar for comparing discrete categories
- Use line for time series or trends
- Use area for cumulative trends

Color semantics (automatically applied):
- passed/success: green (#10b981)
- failed/error: red (#ef4444)
- blocked/warning: amber (#f59e0b)
- skipped: gray (#6b7280)

IMPORTANT: Always include the returned markdown in your response so the chart is displayed.
The markdown format is: :::chart\\n{json}\\n:::

Example response:
"Here's the test distribution:

:::chart
{"type":"pie","title":"Test Results",...}
:::

The chart shows that 85% of tests passed."`,
    schema: GenerateChartInputSchema,
    func: async (input: GenerateChartInput): Promise<string> => {
      const result = generateChart(input);

      if (result.success && result.markdown) {
        // Retorna o markdown diretamente para ser incluído na resposta
        return result.markdown;
      }

      return JSON.stringify(result, null, 2);
    },
  });
}
