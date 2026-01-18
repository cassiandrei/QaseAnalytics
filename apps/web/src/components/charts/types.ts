/**
 * Chart Types
 *
 * Shared types for chart components.
 *
 * @see US-017: Preview de Gráficos no Chat
 * @see US-020: Gráfico de Linhas
 * @see US-021: Gráfico de Barras
 * @see US-022: Gráfico de Pizza/Donut
 */

/** Tipos de gráficos suportados */
export type ChartType = "line" | "bar" | "pie" | "donut" | "area";

/** Layout do gráfico de barras */
export type BarChartLayout = "vertical" | "horizontal";

/** Modo de empilhamento para barras */
export type BarStackMode = "grouped" | "stacked" | "percent";

/** Ponto de dados para gráficos */
export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
  value3?: number;
  [key: string]: string | number | undefined;
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

  // US-020: Line chart options
  /** Enable zoom/pan via brush for large datasets (default: auto for >10 points) */
  enableBrush?: boolean;

  // US-021: Bar chart options
  /** Bar chart layout: vertical (default) or horizontal */
  barLayout?: BarChartLayout;
  /** Bar stacking mode: grouped (default), stacked, or percent */
  barStackMode?: BarStackMode;
  /** Show value labels on bars */
  showBarLabels?: boolean;

  // US-022: Pie/Donut options
  /** Show center value in donut chart (sum or custom) */
  showCenterValue?: boolean;
  /** Custom center label for donut */
  centerLabel?: string;
  /** Custom center value for donut (if not provided, uses sum) */
  centerValue?: number | string;
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
