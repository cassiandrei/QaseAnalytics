/**
 * LangChain Tool: Get Invoice Details
 * Gets detailed information about a specific invoice
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getInvoiceDetails } from '../lib/invoice-queries.js';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '../lib/redis.js';
import type { InvoiceNote, InvoiceNoteItem } from '@qase-analytics/types';

const GetInvoiceDetailsInputSchema = z.object({
  invoiceId: z.number().describe('Invoice ID'),
  includeItems: z.boolean().optional().default(false).describe('Include invoice items/products'),
});

export type GetInvoiceDetailsInput = z.infer<typeof GetInvoiceDetailsInputSchema>;

export interface GetInvoiceDetailsResult {
  success: boolean;
  invoice?: InvoiceNote & { items?: InvoiceNoteItem[] };
  error?: string;
  cached?: boolean;
}

export async function getInvoiceDetailsWithCache(
  userId: string,
  input: GetInvoiceDetailsInput
): Promise<GetInvoiceDetailsResult> {
  const { invoiceId, includeItems = false } = input;

  const cacheKey = CACHE_KEYS.invoiceDetails?.(userId, invoiceId, includeItems);

  if (cacheKey) {
    const cached = await cacheGet<InvoiceNote & { items?: InvoiceNoteItem[] }>(cacheKey);
    if (cached) {
      return { success: true, invoice: cached, cached: true };
    }
  }

  try {
    const invoice = await getInvoiceDetails({ invoiceId, includeItems });

    if (cacheKey) {
      await cacheSet(cacheKey, invoice, CACHE_TTL.INVOICE_ITEMS);
    }

    return { success: true, invoice, cached: false };
  } catch (error) {
    console.error('Error getting invoice details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invoice details.',
    };
  }
}

export function createGetInvoiceDetailsTool(
  getUserId: () => string | Promise<string>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_invoice_details',
    description: `Gets detailed information about a specific invoice by ID.
Returns invoice number, date, customer info, total value, status, tax values, and optionally items.
Use this tool when the user asks for details about a specific invoice.
Results are cached for 5 minutes.`,
    schema: GetInvoiceDetailsInputSchema,
    func: async (input: GetInvoiceDetailsInput): Promise<string> => {
      const userId = await getUserId();
      const result = await getInvoiceDetailsWithCache(userId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

export function createGetInvoiceDetailsToolWithContext(userId: string): DynamicStructuredTool {
  return createGetInvoiceDetailsTool(() => userId);
}
