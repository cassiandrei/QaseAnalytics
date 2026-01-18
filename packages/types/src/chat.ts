/**
 * Chat Types
 */

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: ToolCall[];
    chartData?: ChartData;
    suggestions?: string[];
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ChartData {
  type: ChartType;
  data: unknown;
  config: ChartConfig;
}

export type ChartType = "line" | "bar" | "pie" | "donut" | "heatmap" | "treemap" | "area";

export interface ChartConfig {
  title?: string;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
}

export interface AxisConfig {
  label?: string;
  type?: "number" | "category" | "time";
  tickFormatter?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  projectCode?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRequest {
  message: string;
  projectCode?: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}
