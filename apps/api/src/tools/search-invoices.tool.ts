/**
 * LangChain Tool: Search Invoices
 * Searches invoices with dynamic filters and pagination
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getPaginatedInvoices } from '../lib/invoice-queries.js';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '../lib/redis.js';
import type { PaginatedInvoices, InvoiceStatus } from '@qase-analytics/types';
import { createHash } from 'crypto';

const SearchInvoicesInputSchema = z.object({
  startDate: z.string().optional().describe('Start date filter (ISO format)'),
  endDate: z.string().optional().describe('End date filter (ISO format)'),
  customerId: z.number().optional().describe('Customer ID filter'),
  seriesId: z.number().optional().describe('Invoice series ID filter'),
  status: z.array(z.number()).optional().describe('Array of status codes to filter'),
  minValue: z.number().optional().describe('Minimum invoice value filter'),
  maxValue: z.number().optional().describe('Maximum invoice value filter'),
  searchTerm: z.string().optional().describe('Search term for customer name or invoice number'),
  limit: z.number().optional().default(20).describe('Maximum results to return (default: 20)'),
  offset: z.number().optional().default(0).describe('Pagination offset (default: 0)'),
});

export type SearchInvoicesInput = z.infer<typeof SearchInvoicesInputSchema>;

export interface SearchInvoicesResult {
  success: boolean;
  data?: PaginatedInvoices;
  error?: string;
  cached?: boolean;
}

export async function searchInvoicesWithCache(
  userId: string,
  companyId: number | undefined,
  input: SearchInvoicesInput
): Promise<SearchInvoicesResult> {
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
  } = input;

  // Generate cache key based on filters
  const filterHash = createHash('md5')
    .update(
      JSON.stringify({
        startDate,
        endDate,
        customerId,
        seriesId,
        status,
        minValue,
        maxValue,
        searchTerm,
        limit,
        offset,
      })
    )
    .digest('hex')
    .substring(0, 8);

  const cacheKey = CACHE_KEYS.invoiceSearch?.(userId, filterHash);

  if (cacheKey) {
    const cached = await cacheGet<PaginatedInvoices>(cacheKey);
    if (cached) {
      return { success: true, data: cached, cached: true };
    }
  }

  try {
    const data = await getPaginatedInvoices({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      customerId,
      seriesId,
      status: status as InvoiceStatus[],
      minValue,
      maxValue,
      searchTerm,
      limit,
      offset,
      companyId,
    });

    if (cacheKey) {
      await cacheSet(cacheKey, data, CACHE_TTL.INVOICE_SEARCH);
    }

    return { success: true, data, cached: false };
  } catch (error) {
    console.error('Error searching invoices:', error);
    return {
      success: false,
      error: 'Failed to search invoices. Please try again.',
    };
  }
}

export function createSearchInvoicesTool(
  getUserId: () => string | Promise<string>,
  getCompanyId: () => number | undefined | Promise<number | undefined>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'search_invoices',
    description: `Searches and filters invoices (notas fiscais) with various criteria.
Supports filtering by date range, customer, series, status, value range, and text search.
Returns paginated results with invoice details.
Use this tool when the user wants to search, filter, or list specific invoices.
Results are cached for 2 minutes.`,
    schema: SearchInvoicesInputSchema,
    func: async (input: SearchInvoicesInput): Promise<string> => {
      const userId = await getUserId();
      const companyId = await getCompanyId();
      const result = await searchInvoicesWithCache(userId, companyId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

export function createSearchInvoicesToolWithContext(
  userId: string,
  companyId?: number
): DynamicStructuredTool {
  return createSearchInvoicesTool(
    () => userId,
    () => companyId
  );
}
