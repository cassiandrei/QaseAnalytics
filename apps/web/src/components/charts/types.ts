/**
 * Chart Types
 *
 * Shared types for chart components.
 *
 * @see US-017: Preview de Gráficos no Chat
 */

/** Tipos de gráficos suportados */
export type ChartType = "line" | "bar" | "pie" | "donut" | "area";

/** Ponto de dados para gráficos */
export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
  value3?: number;
}

/** Configuração de série para gráficos multi-séries */
export interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

/** Configuração completa do gráfico (recebida do backend) */
export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  data: ChartDataPoint[];
  series?: ChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend: boolean;
  showTooltip: boolean;
  colors: string[];
  createdAt: string;
}

/** Props comuns para todos os componentes de gráfico */
export interface BaseChartProps {
  config: ChartConfig;
  width?: number;
  height?: number;
  className?: string;
  onExpand?: () => void;
  onSaveAsWidget?: () => void;
}
