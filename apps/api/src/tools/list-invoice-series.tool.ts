/**
 * LangChain Tool: List Invoice Series
 * Lists available invoice series (tipos de nota fiscal: NF-e, NFSe, etc.)
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getInvoiceSeries } from '../lib/invoice-queries.js';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '../lib/redis.js';
import type { InvoiceSeries } from '@qase-analytics/types';

const ListInvoiceSeriesInputSchema = z.object({
  active: z.boolean().optional().describe('Filter by active status'),
});

export type ListInvoiceSeriesInput = z.infer<typeof ListInvoiceSeriesInputSchema>;

export interface ListInvoiceSeriesResult {
  success: boolean;
  series?: InvoiceSeries[];
  error?: string;
  cached?: boolean;
}

export async function listInvoiceSeriesWithCache(
  userId: string,
  companyId: number | undefined,
  input: ListInvoiceSeriesInput
): Promise<ListInvoiceSeriesResult> {
  const { active } = input;

  const cacheKey = CACHE_KEYS.invoiceSeries?.(userId);

  if (cacheKey && active === undefined) {
    const cached = await cacheGet<InvoiceSeries[]>(cacheKey);
    if (cached) {
      return { success: true, series: cached, cached: true };
    }
  }

  try {
    const series = await getInvoiceSeries({ active, companyId });

    if (cacheKey && active === undefined) {
      await cacheSet(cacheKey, series, CACHE_TTL.INVOICE_SERIES);
    }

    return { success: true, series, cached: false };
  } catch (error) {
    console.error('Error listing invoice series:', error);
    return {
      success: false,
      error: 'Failed to list invoice series. Please try again.',
    };
  }
}

export function createListInvoiceSeriesTool(
  getUserId: () => string | Promise<string>,
  getCompanyId: () => number | undefined | Promise<number | undefined>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'list_invoice_series',
    description: `Lists invoice series (séries de notas fiscais) available.
Returns series ID, code, initials, title, type, and active status.
Use this tool when the user asks about types of invoices or available series.
Results are cached for 15 minutes.`,
    schema: ListInvoiceSeriesInputSchema,
    func: async (input: ListInvoiceSeriesInput): Promise<string> => {
      const userId = await getUserId();
      const companyId = await getCompanyId();
      const result = await listInvoiceSeriesWithCache(userId, companyId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

export function createListInvoiceSeriesToolWithContext(
  userId: string,
  companyId?: number
): DynamicStructuredTool {
  return createListInvoiceSeriesTool(
    () => userId,
    () => companyId
  );
}
