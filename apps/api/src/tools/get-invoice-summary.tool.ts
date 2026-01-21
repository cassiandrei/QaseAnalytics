/**
 * LangChain Tool: Get Invoice Summary
 *
 * Tool para obter resumo de faturamento de invoices (notas fiscais).
 * Fornece métricas agregadas de receita, impostos e status de invoices.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getRevenueByPeriod } from '../lib/invoice-queries.js';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '../lib/redis.js';
import type { InvoiceSummary, InvoiceStatus } from '@qase-analytics/types';
import { createHash } from 'crypto';

/** Schema de input para a tool */
const GetInvoiceSummaryInputSchema = z.object({
  startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
  endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
  seriesId: z.number().optional().describe('Optional invoice series ID filter'),
  status: z
    .array(z.number())
    .optional()
    .describe('Optional array of invoice status codes to filter'),
  groupBy: z
    .enum(['day', 'month', 'year'])
    .optional()
    .default('month')
    .describe('Group results by period (day, month, or year)'),
});

export type GetInvoiceSummaryInput = z.infer<typeof GetInvoiceSummaryInputSchema>;

export interface GetInvoiceSummaryResult {
  success: boolean;
  summary?: InvoiceSummary;
  error?: string;
  cached?: boolean;
}

/**
 * Get invoice summary with cache support
 */
export async function getInvoiceSummaryWithCache(
  userId: string,
  companyId: number | undefined,
  input: GetInvoiceSummaryInput
): Promise<GetInvoiceSummaryResult> {
  const { startDate, endDate, seriesId, status, groupBy = 'month' } = input;

  // Generate cache key
  const filterHash = createHash('md5')
    .update(JSON.stringify({ seriesId, status }))
    .digest('hex')
    .substring(0, 8);

  const cacheKey = CACHE_KEYS.invoiceRevenue?.(userId, startDate, endDate, `${groupBy}:${filterHash}`);

  // Try cache first
  if (cacheKey) {
    const cached = await cacheGet<InvoiceSummary>(cacheKey);
    if (cached) {
      return { success: true, summary: cached, cached: true };
    }
  }

  try {
    const revenueData = await getRevenueByPeriod({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      seriesId,
      status: status as InvoiceStatus[],
      groupBy,
      companyId,
    });

    // Aggregate into summary
    const summary: InvoiceSummary = {
      total_invoices: revenueData.reduce((sum, r) => sum + r.total_invoices, 0),
      total_revenue: revenueData.reduce((sum, r) => sum + r.total_revenue, 0),
      total_taxes: {},
      average_value: 0,
      by_status: [],
      period_start: new Date(startDate),
      period_end: new Date(endDate),
    };

    summary.average_value = summary.total_revenue / summary.total_invoices || 0;

    // Aggregate taxes from all periods
    const totalTaxes = revenueData.reduce((sum, r) => sum + r.total_taxes, 0);
    summary.total_taxes = {
      total: totalTaxes,
    };

    // Aggregate status breakdown
    const statusMap = new Map<InvoiceStatus, { count: number; total_value: number }>();
    revenueData.forEach(period => {
      period.status_breakdown.forEach(sb => {
        const existing = statusMap.get(sb.status) || { count: 0, total_value: 0 };
        statusMap.set(sb.status, {
          count: existing.count + sb.count,
          total_value: existing.total_value + sb.total_value,
        });
      });
    });

    summary.by_status = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      status_description: '', // Will be filled from DB
      count: data.count,
      total_value: data.total_value,
      percentage: (data.total_value / summary.total_revenue) * 100,
    }));

    // Cache the result
    if (cacheKey) {
      await cacheSet(cacheKey, summary, CACHE_TTL.INVOICE_REVENUE);
    }

    return { success: true, summary, cached: false };
  } catch (error) {
    console.error('Error getting invoice summary:', error);
    return {
      success: false,
      error: 'Failed to get invoice summary. Please try again.',
    };
  }
}

/**
 * Creates the LangChain tool for getting invoice summary
 */
export function createGetInvoiceSummaryTool(
  getUserId: () => string | Promise<string>,
  getCompanyId: () => number | undefined | Promise<number | undefined>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_invoice_summary',
    description: `Gets a summary of invoices (notas fiscais) for a specific period.
Returns total invoices, total revenue (faturamento), total taxes (impostos), average value, and breakdown by status.
Use this tool when the user asks about revenue, billing, or invoice totals.
Supports filtering by series and status, and grouping by day, month, or year.
Results are cached for 10 minutes for better performance.`,
    schema: GetInvoiceSummaryInputSchema,
    func: async (input: GetInvoiceSummaryInput): Promise<string> => {
      const userId = await getUserId();
      const companyId = await getCompanyId();
      const result = await getInvoiceSummaryWithCache(userId, companyId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

/**
 * Creates the tool with fixed context
 */
export function createGetInvoiceSummaryToolWithContext(
  userId: string,
  companyId?: number
): DynamicStructuredTool {
  return createGetInvoiceSummaryTool(
    () => userId,
    () => companyId
  );
}
