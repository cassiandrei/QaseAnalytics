/**
 * Chart Components Index
 *
 * Exports all chart components for use in the application.
 *
 * @see US-017: Preview de Gráficos no Chat
 */

export { PieChartComponent } from "./PieChart";
export { BarChartComponent } from "./BarChart";
export { LineChartComponent } from "./LineChart";
export { ChartPreview, parseChartFromMarkdown, extractChartsFromContent } from "./ChartPreview";
export { ChartModal } from "./ChartModal";

export type {
  ChartType,
  ChartConfig,
  ChartDataPoint,
  ChartSeries,
  BaseChartProps,
} from "./types";

export type { ChartPreviewProps } from "./ChartPreview";
export type { ChartModalProps } from "./ChartModal";
