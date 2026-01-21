/**
 * LangChain Tool: Get Tax Breakdown
 * Analyzes tax distribution across invoices
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTaxBreakdown } from '../lib/invoice-queries.js';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '../lib/redis.js';
import type { TaxBreakdown } from '@qase-analytics/types';

const GetTaxBreakdownInputSchema = z.object({
  startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
  endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
  taxTypes: z
    .array(z.string())
    .optional()
    .describe('Optional array of tax types to filter (ICMS, IPI, PIS, COFINS, etc)'),
});

export type GetTaxBreakdownInput = z.infer<typeof GetTaxBreakdownInputSchema>;

export interface GetTaxBreakdownResult {
  success: boolean;
  breakdown?: TaxBreakdown[];
  error?: string;
  cached?: boolean;
}

export async function getTaxBreakdownWithCache(
  userId: string,
  companyId: number | undefined,
  input: GetTaxBreakdownInput
): Promise<GetTaxBreakdownResult> {
  const { startDate, endDate, taxTypes } = input;

  const cacheKey = CACHE_KEYS.invoiceTax?.(userId, startDate, endDate);

  if (cacheKey && !taxTypes) {
    const cached = await cacheGet<TaxBreakdown[]>(cacheKey);
    if (cached) {
      return { success: true, breakdown: cached, cached: true };
    }
  }

  try {
    const breakdown = await getTaxBreakdown({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      taxTypes,
      companyId,
    });

    if (cacheKey && !taxTypes) {
      await cacheSet(cacheKey, breakdown, CACHE_TTL.INVOICE_TAX);
    }

    return { success: true, breakdown, cached: false };
  } catch (error) {
    console.error('Error getting tax breakdown:', error);
    return {
      success: false,
      error: 'Failed to get tax breakdown. Please try again.',
    };
  }
}

export function createGetTaxBreakdownTool(
  getUserId: () => string | Promise<string>,
  getCompanyId: () => number | undefined | Promise<number | undefined>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_tax_breakdown',
    description: `Gets a breakdown of taxes (impostos) across invoices.
Analyzes all Brazilian tax types: ICMS, IPI, ISSQN, PIS, COFINS, INSS, IRRF, CSLL, FCP, FUST, FUNTTEL, IBS, CBS.
Returns total amount, invoice count, average rate, min and max values for each tax type.
Use this tool when the user asks about taxes, impostos, or tax analysis.
Results are cached for 15 minutes.`,
    schema: GetTaxBreakdownInputSchema,
    func: async (input: GetTaxBreakdownInput): Promise<string> => {
      const userId = await getUserId();
      const companyId = await getCompanyId();
      const result = await getTaxBreakdownWithCache(userId, companyId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

export function createGetTaxBreakdownToolWithContext(
  userId: string,
  companyId?: number
): DynamicStructuredTool {
  return createGetTaxBreakdownTool(
    () => userId,
    () => companyId
  );
}
