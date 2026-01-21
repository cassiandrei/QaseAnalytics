/**
 * Invoice Types
 * Types for invoice database integration (ERP)
 */

// ===========================
// Database Table Types
// ===========================

/**
 * Invoice note status enum
 */
export enum InvoiceStatus {
  DRAFT = 1,
  APPROVED = 2,
  PROCESSING = 3,
  AUTHORIZED = 4,
  CANCELLED = 5,
  REJECTED = 6,
  PENDING = 7,
}

/**
 * Invoice note from erp.invoice_notes table
 */
export interface InvoiceNote {
  id: number;
  company_id: number;
  series_id: number;
  invoice_number: string;
  issue_date: Date;
  customer_id: number;
  customer_name: string;
  customer_document: string;
  total_value: number;
  total_products: number;
  total_services: number;
  status: InvoiceStatus;
  status_description: string;
  nfe_key?: string;
  nfe_number?: string;
  nfse_number?: string;
  xml_path?: string;
  pdf_path?: string;
  created_at: Date;
  updated_at: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  // Tax fields
  icms_value?: number;
  ipi_value?: number;
  issqn_value?: number;
  pis_value?: number;
  cofins_value?: number;
  inss_value?: number;
  irrf_value?: number;
  csll_value?: number;
  fcp_value?: number;
  fust_value?: number;
  funttel_value?: number;
  ibs_value?: number;
  cbs_value?: number;
}

/**
 * Invoice note item from erp.invoice_note_items table
 */
export interface InvoiceNoteItem {
  id: number;
  invoice_note_id: number;
  item_number: number;
  product_id: number;
  product_code: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  discount_value?: number;
  tax_value?: number;
  cfop: string;
  ncm?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Invoice note event from erp.invoice_note_events table
 */
export interface InvoiceNoteEvent {
  id: number;
  invoice_note_id: number;
  event_type: string;
  event_description: string;
  user_id: number;
  user_name: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

/**
 * Invoice series from erp.invoice_series table
 */
export interface InvoiceSeries {
  id: number;
  code: string;
  initials: string;
  title: string;
  type: number; // Tipo de nota (bigint no banco)
  active: boolean;
  created: Date;
}

// ===========================
// Query Result Types
// ===========================

/**
 * Revenue grouped by period
 */
export interface RevenueByPeriod {
  period: string; // YYYY-MM or YYYY-MM-DD
  total_invoices: number;
  total_revenue: number;
  total_taxes: number;
  average_value: number;
  status_breakdown: {
    status: InvoiceStatus;
    count: number;
    total_value: number;
  }[];
}

/**
 * Tax breakdown by type
 */
export interface TaxBreakdown {
  tax_type: string;
  total_amount: number;
  invoice_count: number;
  average_rate: number;
  min_value: number;
  max_value: number;
}

/**
 * Invoice status metrics
 */
export interface InvoiceStatusMetrics {
  status: InvoiceStatus;
  status_description: string;
  count: number;
  total_value: number;
  percentage: number;
}

/**
 * Top client by revenue
 */
export interface TopClientByRevenue {
  customer_id: number;
  customer_name: string;
  customer_document: string;
  total_invoices: number;
  total_revenue: number;
  average_invoice_value: number;
  first_purchase: Date;
  last_purchase: Date;
}

/**
 * Item analytics
 */
export interface ItemAnalytics {
  product_id: number;
  product_code: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  invoice_count: number;
  average_price: number;
  total_discount: number;
}

/**
 * Paginated invoice search result
 */
export interface PaginatedInvoices {
  total: number;
  page: number;
  limit: number;
  invoices: InvoiceSearchResult[];
}

/**
 * Invoice search result item
 */
export interface InvoiceSearchResult {
  id: number;
  invoice_number: string;
  issue_date: Date;
  customer_id: number;
  customer_name: string;
  customer_document: string;
  total_value: number;
  status: InvoiceStatus;
  status_description: string;
  nfe_key?: string;
  nfe_number?: string;
  series_name?: string;
}

// ===========================
// Query Filter Types
// ===========================

/**
 * Revenue query parameters
 */
export interface RevenueQueryParams {
  startDate: Date;
  endDate: Date;
  seriesId?: number;
  status?: InvoiceStatus[];
  groupBy?: 'day' | 'month' | 'year';
}

/**
 * Tax breakdown query parameters
 */
export interface TaxBreakdownParams {
  startDate: Date;
  endDate: Date;
  taxTypes?: string[];
  groupBy?: 'tax_type' | 'month' | 'customer';
}

/**
 * Invoice search filters
 */
export interface InvoiceQueryFilters {
  startDate?: Date;
  endDate?: Date;
  customerId?: number;
  seriesId?: number;
  status?: InvoiceStatus[];
  minValue?: number;
  maxValue?: number;
  searchTerm?: string; // Search in customer name or invoice number
  limit?: number;
  offset?: number;
}

/**
 * Top clients query parameters
 */
export interface TopClientsParams {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  minInvoices?: number;
}

/**
 * Item analytics query parameters
 */
export interface ItemAnalyticsParams {
  startDate?: Date;
  endDate?: Date;
  productIds?: number[];
  limit?: number;
  sortBy?: 'quantity' | 'revenue' | 'invoice_count';
}

// ===========================
// Summary Types
// ===========================

/**
 * Invoice summary aggregation
 */
export interface InvoiceSummary {
  total_invoices: number;
  total_revenue: number;
  total_taxes: Record<string, number>;
  average_value: number;
  by_status: InvoiceStatusMetrics[];
  period_start: Date;
  period_end: Date;
}

/**
 * Tax summary
 */
export interface TaxSummary {
  icms: number;
  ipi: number;
  issqn: number;
  pis: number;
  cofins: number;
  inss: number;
  irrf: number;
  csll: number;
  fcp: number;
  fust: number;
  funttel: number;
  ibs: number;
  cbs: number;
  total: number;
}

// ===========================
// Helper Types
// ===========================

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Invoice database connection config
 */
export interface InvoiceDbConfig {
  connectionString: string;
  companyId?: number;
  userId?: string;
}
