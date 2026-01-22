/**
 * LangChain Tool: Get Invoice Errors Analysis
 *
 * Tool para analisar erros de emissão de notas fiscais.
 * Fornece breakdown dos tipos de erros mais comuns.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getInvoiceErrorAnalysis, type InvoiceErrorAnalysis } from '../lib/invoice-queries.js';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '../lib/redis.js';

/** Schema de input para a tool */
const GetInvoiceErrorsInputSchema = z.object({
  startDate: z.string().optional().describe('Start date in ISO format (YYYY-MM-DD). Defaults to 1 year ago.'),
  endDate: z.string().optional().describe('End date in ISO format (YYYY-MM-DD). Defaults to today.'),
});

export type GetInvoiceErrorsInput = z.infer<typeof GetInvoiceErrorsInputSchema>;

export interface GetInvoiceErrorsResult {
  success: boolean;
  analysis?: InvoiceErrorAnalysis;
  error?: string;
  cached?: boolean;
}

/**
 * Get invoice error analysis with cache support
 */
export async function getInvoiceErrorsWithCache(
  userId: string,
  companyId: number | undefined,
  input: GetInvoiceErrorsInput
): Promise<GetInvoiceErrorsResult> {
  // Default dates: last year
  const endDate = input.endDate ? new Date(input.endDate) : new Date();
  const startDate = input.startDate
    ? new Date(input.startDate)
    : new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Generate cache key
  const cacheKey = `invoice:errors:${userId}:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}`;

  // Try cache first
  const cached = await cacheGet<InvoiceErrorAnalysis>(cacheKey);
  if (cached) {
    return { success: true, analysis: cached, cached: true };
  }

  try {
    const analysis = await getInvoiceErrorAnalysis({
      startDate,
      endDate,
      companyId,
    });

    // Cache the result for 30 minutes
    await cacheSet(cacheKey, analysis, 1800);

    return { success: true, analysis, cached: false };
  } catch (error) {
    console.error('Error getting invoice error analysis:', error);
    return {
      success: false,
      error: 'Failed to analyze invoice errors. Please try again.',
    };
  }
}

/**
 * Creates the LangChain tool for getting invoice error analysis
 */
export function createGetInvoiceErrorsTool(
  getUserId: () => string | Promise<string>,
  getCompanyId: () => number | undefined | Promise<number | undefined>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_invoice_errors',
    description: `Analyzes invoice emission errors and failures.
Returns:
- Total invoices with errors vs without errors
- Error rate percentage
- Breakdown of error types with descriptions and counts

Use this tool when the user asks about:
- Invoice errors, failures, or problems
- Error rates in invoice emission
- Types of issues when emitting invoices (NF-e, NFSe)
- Quality metrics for invoice emission
- "Falhas ao emitir nota", "erros de emissão", "problemas com notas fiscais"

Results are cached for 30 minutes for better performance.`,
    schema: GetInvoiceErrorsInputSchema,
    func: async (input: GetInvoiceErrorsInput): Promise<string> => {
      const userId = await getUserId();
      const companyId = await getCompanyId();
      const result = await getInvoiceErrorsWithCache(userId, companyId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

/**
 * Creates the tool with fixed context
 */
export function createGetInvoiceErrorsToolWithContext(
  userId: string,
  companyId?: number
): DynamicStructuredTool {
  return createGetInvoiceErrorsTool(
    () => userId,
    () => companyId
  );
}
