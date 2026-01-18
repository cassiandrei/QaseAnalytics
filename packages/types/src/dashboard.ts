/**
 * Dashboard Types
 */

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  userId: string;
  isPublic: boolean;
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  widgets: DashboardWidgetPosition[];
}

export interface DashboardWidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  layout?: DashboardLayout;
  isPublic?: boolean;
}

export interface AddWidgetToDashboardRequest {
  widgetId: string;
  position?: Partial<DashboardWidgetPosition>;
}

export interface DashboardGlobalFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  projectCodes?: string[];
  environment?: string;
}
