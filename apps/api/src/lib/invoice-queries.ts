/**
 * Invoice Database Queries
 * Raw SQL queries for invoice analytics from ERP database
 */

import { queryInvoiceDb } from './invoice-db-client.js';
import type {
  RevenueByPeriod,
  TaxBreakdown,
  InvoiceStatusMetrics,
  TopClientByRevenue,
  ItemAnalytics,
  PaginatedInvoices,
  InvoiceSearchResult,
  InvoiceStatus,
  InvoiceSeries,
  InvoiceNote,
  InvoiceNoteItem,
  InvoiceNoteEvent,
} from '@qase-analytics/types';

/**
 * Get revenue aggregated by period
 * Optimized query using indexes: idx_invoice_notes_issue_date, idx_invoice_notes_status
 */
export async function getRevenueByPeriod(params: {
  startDate: Date;
  endDate: Date;
  seriesId?: number;
  status?: InvoiceStatus[];
  groupBy?: 'day' | 'month' | 'year';
  companyId?: number;
}): Promise<RevenueByPeriod[]> {
  const { startDate, endDate, seriesId, status, groupBy = 'month', companyId } = params;

  // Date format based on groupBy
  const dateFormat =
    groupBy === 'day' ? 'YYYY-MM-DD' : groupBy === 'month' ? 'YYYY-MM' : 'YYYY';

  const queryParams: unknown[] = [startDate, endDate];
  let paramIndex = 3;

  let whereConditions = 'WHERE issue_date >= $1 AND issue_date <= $2';

  if (companyId) {
    whereConditions += ` AND company_id = $${paramIndex}`;
    queryParams.push(companyId);
    paramIndex++;
  }

  if (seriesId) {
    whereConditions += ` AND series_id = $${paramIndex}`;
    queryParams.push(seriesId);
    paramIndex++;
  }

  if (status && status.length > 0) {
    whereConditions += ` AND status = ANY($${paramIndex}::int[])`;
    queryParams.push(status);
    paramIndex++;
  }

  const query = `
    SELECT
      TO_CHAR(issue_date, '${dateFormat}') as period,
      COUNT(*)::int as total_invoices,
      COALESCE(SUM(total_value), 0)::numeric as total_revenue,
      COALESCE(SUM(
        COALESCE(icms_value, 0) +
        COALESCE(ipi_value, 0) +
        COALESCE(issqn_value, 0) +
        COALESCE(pis_value, 0) +
        COALESCE(cofins_value, 0) +
        COALESCE(inss_value, 0) +
        COALESCE(irrf_value, 0) +
        COALESCE(csll_value, 0) +
        COALESCE(fcp_value, 0) +
        COALESCE(fust_value, 0) +
        COALESCE(funttel_value, 0) +
        COALESCE(ibs_value, 0) +
        COALESCE(cbs_value, 0)
      ), 0)::numeric as total_taxes,
      COALESCE(AVG(total_value), 0)::numeric as average_value,
      status,
      status_description
    FROM erp.invoice_notes
    ${whereConditions}
    GROUP BY TO_CHAR(issue_date, '${dateFormat}'), status, status_description
    ORDER BY period DESC, status
  `;

  const result = await queryInvoiceDb<RevenueByPeriod>(query, queryParams);

  // Group results by period and aggregate status breakdown
  const periodMap = new Map<string, RevenueByPeriod>();

  for (const row of result.rows) {
    const period = row.period;

    if (!periodMap.has(period)) {
      periodMap.set(period, {
        period,
        total_invoices: 0,
        total_revenue: 0,
        total_taxes: 0,
        average_value: 0,
        status_breakdown: [],
      });
    }

    const periodData = periodMap.get(period)!;
    periodData.total_invoices += row.total_invoices;
    periodData.total_revenue += Number(row.total_revenue);
    periodData.total_taxes += Number(row.total_taxes);

    periodData.status_breakdown.push({
      status: (row as unknown as { status: InvoiceStatus }).status,
      count: row.total_invoices,
      total_value: Number(row.total_revenue),
    });
  }

  // Calculate average_value for each period
  for (const periodData of periodMap.values()) {
    periodData.average_value = periodData.total_revenue / periodData.total_invoices;
  }

  return Array.from(periodMap.values());
}

/**
 * Get tax breakdown by type
 * Aggregates all 12+ Brazilian tax types
 */
export async function getTaxBreakdown(params: {
  startDate: Date;
  endDate: Date;
  taxTypes?: string[];
  companyId?: number;
}): Promise<TaxBreakdown[]> {
  const { startDate, endDate, taxTypes, companyId } = params;

  const queryParams: unknown[] = [startDate, endDate];
  let paramIndex = 3;

  let whereConditions = 'WHERE issue_date >= $1 AND issue_date <= $2';

  if (companyId) {
    whereConditions += ` AND company_id = $${paramIndex}`;
    queryParams.push(companyId);
    paramIndex++;
  }

  // Define all tax types to query
  const allTaxTypes = [
    'ICMS', 'IPI', 'ISSQN', 'PIS', 'COFINS',
    'INSS', 'IRRF', 'CSLL', 'FCP', 'FUST',
    'FUNTTEL', 'IBS', 'CBS'
  ];

  const taxesToQuery = taxTypes && taxTypes.length > 0 ? taxTypes : allTaxTypes;

  // Build UNION ALL query for each tax type
  const taxQueries = taxesToQuery.map(taxType => {
    const column = `${taxType.toLowerCase()}_value`;
    return `
      SELECT
        '${taxType}' as tax_type,
        COALESCE(SUM(${column}), 0)::numeric as total_amount,
        COUNT(CASE WHEN ${column} > 0 THEN 1 END)::int as invoice_count,
        COALESCE(AVG(CASE WHEN ${column} > 0 THEN ${column} END), 0)::numeric as average_rate,
        COALESCE(MIN(CASE WHEN ${column} > 0 THEN ${column} END), 0)::numeric as min_value,
        COALESCE(MAX(${column}), 0)::numeric as max_value
      FROM erp.invoice_notes
      ${whereConditions}
    `;
  });

  const query = taxQueries.join(' UNION ALL ') + ' ORDER BY total_amount DESC';

  const result = await queryInvoiceDb<TaxBreakdown>(query, queryParams);

  return result.rows.map(row => ({
    ...row,
    total_amount: Number(row.total_amount),
    average_rate: Number(row.average_rate),
    min_value: Number(row.min_value),
    max_value: Number(row.max_value),
  }));
}

/**
 * Get invoice status metrics
 * Count and value by status
 */
export async function getInvoiceStatusMetrics(params: {
  startDate?: Date;
  endDate?: Date;
  companyId?: number;
}): Promise<InvoiceStatusMetrics[]> {
  const { startDate, endDate, companyId } = params;

  const queryParams: unknown[] = [];
  let paramIndex = 1;
  let whereConditions = '';

  if (startDate && endDate) {
    whereConditions = `WHERE issue_date >= $${paramIndex} AND issue_date <= $${paramIndex + 1}`;
    queryParams.push(startDate, endDate);
    paramIndex += 2;
  }

  if (companyId) {
    whereConditions += whereConditions ? ' AND' : 'WHERE';
    whereConditions += ` company_id = $${paramIndex}`;
    queryParams.push(companyId);
    paramIndex++;
  }

  const query = `
    WITH totals AS (
      SELECT COALESCE(SUM(total_value), 0) as grand_total
      FROM erp.invoice_notes
      ${whereConditions}
    )
    SELECT
      status,
      status_description,
      COUNT(*)::int as count,
      COALESCE(SUM(total_value), 0)::numeric as total_value,
      (COALESCE(SUM(total_value), 0) / NULLIF((SELECT grand_total FROM totals), 0) * 100)::numeric as percentage
    FROM erp.invoice_notes
    ${whereConditions}
    GROUP BY status, status_description
    ORDER BY total_value DESC
  `;

  const result = await queryInvoiceDb<InvoiceStatusMetrics>(query, queryParams);

  return result.rows.map(row => ({
    ...row,
    total_value: Number(row.total_value),
    percentage: Number(row.percentage || 0),
  }));
}

/**
 * Get top clients by revenue
 * Uses index: idx_invoice_notes_customer_id
 */
export async function getTopClientsByRevenue(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  minInvoices?: number;
  companyId?: number;
}): Promise<TopClientByRevenue[]> {
  const { startDate, endDate, limit = 10, minInvoices = 1, companyId } = params;

  const queryParams: unknown[] = [];
  let paramIndex = 1;
  let whereConditions = '';

  if (startDate && endDate) {
    whereConditions = `WHERE issue_date >= $${paramIndex} AND issue_date <= $${paramIndex + 1}`;
    queryParams.push(startDate, endDate);
    paramIndex += 2;
  }

  if (companyId) {
    whereConditions += whereConditions ? ' AND' : 'WHERE';
    whereConditions += ` company_id = $${paramIndex}`;
    queryParams.push(companyId);
    paramIndex++;
  }

  const query = `
    SELECT
      customer_id,
      MAX(customer_name) as customer_name,
      MAX(customer_document) as customer_document,
      COUNT(*)::int as total_invoices,
      COALESCE(SUM(total_value), 0)::numeric as total_revenue,
      COALESCE(AVG(total_value), 0)::numeric as average_invoice_value,
      MIN(issue_date) as first_purchase,
      MAX(issue_date) as last_purchase
    FROM erp.invoice_notes
    ${whereConditions}
    GROUP BY customer_id
    HAVING COUNT(*) >= $${paramIndex}
    ORDER BY total_revenue DESC
    LIMIT $${paramIndex + 1}
  `;

  queryParams.push(minInvoices, limit);

  const result = await queryInvoiceDb<TopClientByRevenue>(query, queryParams);

  return result.rows.map(row => ({
    ...row,
    total_revenue: Number(row.total_revenue),
    average_invoice_value: Number(row.average_invoice_value),
  }));
}

/**
 * Get item/product analytics
 * Aggregates data from invoice_note_items
 */
export async function getItemAnalytics(params: {
  startDate?: Date;
  endDate?: Date;
  productIds?: number[];
  limit?: number;
  sortBy?: 'quantity' | 'revenue' | 'invoice_count';
  companyId?: number;
}): Promise<ItemAnalytics[]> {
  const { startDate, endDate, productIds, limit = 20, sortBy = 'revenue', companyId } = params;

  const queryParams: unknown[] = [];
  let paramIndex = 1;
  let joinConditions = '';
  let whereConditions = '';

  if (startDate && endDate) {
    joinConditions = `AND n.issue_date >= $${paramIndex} AND n.issue_date <= $${paramIndex + 1}`;
    queryParams.push(startDate, endDate);
    paramIndex += 2;
  }

  if (companyId) {
    joinConditions += ` AND n.company_id = $${paramIndex}`;
    queryParams.push(companyId);
    paramIndex++;
  }

  if (productIds && productIds.length > 0) {
    whereConditions = `WHERE i.product_id = ANY($${paramIndex}::int[])`;
    queryParams.push(productIds);
    paramIndex++;
  }

  const sortColumn = sortBy === 'quantity'
    ? 'total_quantity'
    : sortBy === 'invoice_count'
    ? 'invoice_count'
    : 'total_revenue';

  const query = `
    SELECT
      i.product_id,
      MAX(i.product_code) as product_code,
      MAX(i.product_name) as product_name,
      COALESCE(SUM(i.quantity), 0)::numeric as total_quantity,
      COALESCE(SUM(i.total_value), 0)::numeric as total_revenue,
      COUNT(DISTINCT i.invoice_note_id)::int as invoice_count,
      COALESCE(AVG(i.unit_value), 0)::numeric as average_price,
      COALESCE(SUM(i.discount_value), 0)::numeric as total_discount
    FROM erp.invoice_note_items i
    INNER JOIN erp.invoice_notes n ON n.id = i.invoice_note_id
      ${joinConditions}
    ${whereConditions}
    GROUP BY i.product_id
    ORDER BY ${sortColumn} DESC
    LIMIT $${paramIndex}
  `;

  queryParams.push(limit);

  const result = await queryInvoiceDb<ItemAnalytics>(query, queryParams);

  return result.rows.map(row => ({
    ...row,
    total_quantity: Number(row.total_quantity),
    total_revenue: Number(row.total_revenue),
    average_price: Number(row.average_price),
    total_discount: Number(row.total_discount),
  }));
}

/**
 * Search invoices with dynamic filters and pagination
 * Uses multiple indexes for optimal performance
 */
export async function getPaginatedInvoices(params: {
  startDate?: Date;
  endDate?: Date;
  customerId?: number;
  seriesId?: number;
  status?: InvoiceStatus[];
  minValue?: number;
  maxValue?: number;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  companyId?: number;
}): Promise<PaginatedInvoices> {
  const {
    startDate,
    endDate,
    customerId,
    seriesId,
    status,
    minValue,
    maxValue,
    searchTerm,
    limit = 20,
    offset = 0,
    companyId,
  } = params;

  const queryParams: unknown[] = [];
  let paramIndex = 1;
  const whereConditions: string[] = [];

  if (startDate && endDate) {
    whereConditions.push(`issue_date >= $${paramIndex} AND issue_date <= $${paramIndex + 1}`);
    queryParams.push(startDate, endDate);
    paramIndex += 2;
  }

  if (companyId) {
    whereConditions.push(`company_id = $${paramIndex}`);
    queryParams.push(companyId);
    paramIndex++;
  }

  if (customerId) {
    whereConditions.push(`customer_id = $${paramIndex}`);
    queryParams.push(customerId);
    paramIndex++;
  }

  if (seriesId) {
    whereConditions.push(`series_id = $${paramIndex}`);
    queryParams.push(seriesId);
    paramIndex++;
  }

  if (status && status.length > 0) {
    whereConditions.push(`status = ANY($${paramIndex}::int[])`);
    queryParams.push(status);
    paramIndex++;
  }

  if (minValue !== undefined) {
    whereConditions.push(`total_value >= $${paramIndex}`);
    queryParams.push(minValue);
    paramIndex++;
  }

  if (maxValue !== undefined) {
    whereConditions.push(`total_value <= $${paramIndex}`);
    queryParams.push(maxValue);
    paramIndex++;
  }

  if (searchTerm) {
    whereConditions.push(
      `(customer_name ILIKE $${paramIndex} OR invoice_number ILIKE $${paramIndex} OR nfe_number ILIKE $${paramIndex})`
    );
    queryParams.push(`%${searchTerm}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Count total matching records
  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM erp.invoice_notes
    ${whereClause}
  `;

  const countResult = await queryInvoiceDb<{ total: number }>(countQuery, queryParams);
  const total = countResult.rows[0]?.total || 0;

  // Get paginated results
  const dataQuery = `
    SELECT
      n.id,
      n.invoice_number,
      n.issue_date,
      n.customer_id,
      n.customer_name,
      n.customer_document,
      n.total_value,
      n.status,
      n.status_description,
      n.nfe_key,
      n.nfe_number,
      s.name as series_name
    FROM erp.invoice_notes n
    LEFT JOIN erp.invoice_series s ON s.id = n.series_id
    ${whereClause}
    ORDER BY n.issue_date DESC, n.id DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  queryParams.push(limit, offset);

  const dataResult = await queryInvoiceDb<InvoiceSearchResult>(dataQuery, queryParams);

  return {
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    invoices: dataResult.rows.map(row => ({
      ...row,
      total_value: Number(row.total_value),
    })),
  };
}

/**
 * Get invoice series list
 */
export async function getInvoiceSeries(params: {
  active?: boolean;
  companyId?: number;
}): Promise<InvoiceSeries[]> {
  const { active, companyId } = params;

  const queryParams: unknown[] = [];
  let paramIndex = 1;
  const whereConditions: string[] = [];

  if (active !== undefined) {
    whereConditions.push(`is_active = $${paramIndex}`);
    queryParams.push(active);
    paramIndex++;
  }

  if (companyId) {
    whereConditions.push(`company_id = $${paramIndex}`);
    queryParams.push(companyId);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT
      id,
      code,
      initials,
      title,
      type,
      active,
      created
    FROM erp.invoice_series
    ${whereClause}
    AND deleted = false
    ORDER BY title
  `;

  const result = await queryInvoiceDb<InvoiceSeries>(query, queryParams);
  return result.rows;
}

/**
 * Get invoice details with items
 */
export async function getInvoiceDetails(params: {
  invoiceId: number;
  includeItems?: boolean;
}): Promise<InvoiceNote & { items?: InvoiceNoteItem[] }> {
  const { invoiceId, includeItems = false } = params;

  const invoiceQuery = `
    SELECT * FROM erp.invoice_notes WHERE id = $1
  `;

  const invoiceResult = await queryInvoiceDb<InvoiceNote>(invoiceQuery, [invoiceId]);

  if (invoiceResult.rows.length === 0) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const invoice = invoiceResult.rows[0];

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  if (includeItems) {
    const itemsQuery = `
      SELECT * FROM erp.invoice_note_items WHERE invoice_note_id = $1 ORDER BY item_number
    `;

    const itemsResult = await queryInvoiceDb<InvoiceNoteItem>(itemsQuery, [invoiceId]);

    return {
      ...invoice,
      items: itemsResult.rows,
    };
  }

  return invoice;
}

/**
 * Get invoice events (audit trail)
 */
export async function getInvoiceEvents(params: {
  invoiceId: number;
  limit?: number;
}): Promise<InvoiceNoteEvent[]> {
  const { invoiceId, limit = 50 } = params;

  const query = `
    SELECT *
    FROM erp.invoice_note_events
    WHERE invoice_note_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const result = await queryInvoiceDb<InvoiceNoteEvent>(query, [invoiceId, limit]);
  return result.rows;
}
