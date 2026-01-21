/**
 * LangChain Tool: Get Invoice Events
 * Gets audit trail/event history for a specific invoice
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getInvoiceEvents } from '../lib/invoice-queries.js';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '../lib/redis.js';
import type { InvoiceNoteEvent } from '@qase-analytics/types';

const GetInvoiceEventsInputSchema = z.object({
  invoiceId: z.number().describe('Invoice ID'),
  limit: z.number().optional().default(50).describe('Maximum events to return (default: 50)'),
});

export type GetInvoiceEventsInput = z.infer<typeof GetInvoiceEventsInputSchema>;

export interface GetInvoiceEventsResult {
  success: boolean;
  events?: InvoiceNoteEvent[];
  error?: string;
  cached?: boolean;
}

export async function getInvoiceEventsWithCache(
  userId: string,
  input: GetInvoiceEventsInput
): Promise<GetInvoiceEventsResult> {
  const { invoiceId, limit = 50 } = input;

  const cacheKey = CACHE_KEYS.invoiceEvents?.(userId, invoiceId);

  if (cacheKey) {
    const cached = await cacheGet<InvoiceNoteEvent[]>(cacheKey);
    if (cached) {
      return { success: true, events: cached, cached: true };
    }
  }

  try {
    const events = await getInvoiceEvents({ invoiceId, limit });

    if (cacheKey) {
      await cacheSet(cacheKey, events, CACHE_TTL.INVOICE_ITEMS);
    }

    return { success: true, events, cached: false };
  } catch (error) {
    console.error('Error getting invoice events:', error);
    return {
      success: false,
      error: 'Failed to get invoice events. Please try again.',
    };
  }
}

export function createGetInvoiceEventsTool(
  getUserId: () => string | Promise<string>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_invoice_events',
    description: `Gets the audit trail/event history for a specific invoice.
Returns chronological list of events like creation, approval, cancellation, etc.
Each event includes type, description, user, timestamp, and metadata.
Use this tool when the user asks about invoice history or audit trail.
Results are cached for 5 minutes.`,
    schema: GetInvoiceEventsInputSchema,
    func: async (input: GetInvoiceEventsInput): Promise<string> => {
      const userId = await getUserId();
      const result = await getInvoiceEventsWithCache(userId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

export function createGetInvoiceEventsToolWithContext(userId: string): DynamicStructuredTool {
  return createGetInvoiceEventsTool(() => userId);
}
