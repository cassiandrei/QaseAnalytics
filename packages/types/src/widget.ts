/**
 * Widget Types
 */

import type { ChartType, ChartConfig } from "./chat";

export interface Widget {
  id: string;
  name: string;
  description?: string;
  type: ChartType;
  query: string;
  config: ChartConfig;
  filters?: WidgetFilters;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetFilters {
  projectCode?: string;
  dateRange?: DateRange;
  environment?: string;
  customFilters?: Record<string, unknown>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CreateWidgetRequest {
  name: string;
  description?: string;
  type: ChartType;
  query: string;
  config: ChartConfig;
  filters?: WidgetFilters;
}

export interface UpdateWidgetRequest {
  name?: string;
  description?: string;
  config?: Partial<ChartConfig>;
  filters?: WidgetFilters;
}

export interface WidgetData {
  widgetId: string;
  data: unknown;
  lastUpdated: Date;
  nextRefresh?: Date;
}
