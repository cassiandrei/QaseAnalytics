/**
 * LangChain Tool: Get Test Cases
 *
 * Tool para obter casos de teste do Qase.io através do LangChain Agent.
 * Permite que o assistente de IA consulte casos de teste com filtros.
 *
 * @see US-006: Obter Casos de Teste
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createHash } from "crypto";
import {
  QaseClient,
  QaseAuthError,
  QaseApiError,
  type QaseTestCaseList,
  type QaseTestCasesFilter,
} from "../lib/qase-client.js";
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from "../lib/redis.js";

/** Mapeamento de severity numérica para texto */
const SEVERITY_MAP: Record<number, string> = {
  0: "undefined",
  1: "blocker",
  2: "critical",
  3: "major",
  4: "normal",
  5: "minor",
  6: "trivial",
};

/** Mapeamento de priority numérica para texto */
const PRIORITY_MAP: Record<number, string> = {
  0: "undefined",
  1: "high",
  2: "medium",
  3: "low",
};

/** Mapeamento de automation numérica para texto */
const AUTOMATION_MAP: Record<number, string> = {
  0: "is-not-automated",
  1: "automated",
  2: "to-be-automated",
};

/** Mapeamento de status numérico para texto */
const STATUS_MAP: Record<number, string> = {
  0: "actual",
  1: "draft",
  2: "deprecated",
};

/** Schema de input para a tool */
const GetTestCasesInputSchema = z.object({
  projectCode: z
    .string()
    .min(2)
    .max(10)
    .describe("The project code (2-10 alphanumeric characters)"),
  search: z
    .string()
    .nullish()
    .describe("Search term to filter test cases by name"),
  suiteId: z
    .number()
    .int()
    .positive()
    .nullish()
    .describe("Filter by test suite ID"),
  severity: z
    .enum(["blocker", "critical", "major", "normal", "minor", "trivial"])
    .nullish()
    .describe("Filter by severity level"),
  priority: z
    .enum(["high", "medium", "low"])
    .nullish()
    .describe("Filter by priority level"),
  automation: z
    .enum(["is-not-automated", "automated", "to-be-automated"])
    .nullish()
    .describe("Filter by automation status"),
  status: z
    .enum(["actual", "draft", "deprecated"])
    .nullish()
    .describe("Filter by test case status"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .nullish()
    .default(100)
    .describe("Maximum number of test cases to return (1-100, default: 100)"),
  offset: z
    .number()
    .min(0)
    .nullish()
    .default(0)
    .describe("Number of test cases to skip for pagination (default: 0)"),
});

/** Tipo de entrada para a função getTestCasesWithCache (limit e offset são opcionais) */
export type GetTestCasesInput = {
  projectCode: string;
  search?: string | null;
  suiteId?: number | null;
  severity?: "blocker" | "critical" | "major" | "normal" | "minor" | "trivial" | null;
  priority?: "high" | "medium" | "low" | null;
  automation?: "is-not-automated" | "automated" | "to-be-automated" | null;
  status?: "actual" | "draft" | "deprecated" | null;
  limit?: number | null;
  offset?: number | null;
};

/** Resultado formatado para o agent */
export interface GetTestCasesResult {
  success: boolean;
  total: number;
  filtered: number;
  count: number;
  cases: Array<{
    id: number;
    title: string;
    severity: string;
    priority: string;
    automation: string;
    status: string;
    suiteId: number | null;
    isFlaky: boolean;
    tags: string[];
  }>;
  error?: string;
  cached?: boolean;
}

/**
 * Gera um hash para os filtros de busca (para cache key).
 */
function generateFilterHash(filters: QaseTestCasesFilter): string {
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce(
      (acc, key) => {
        const value = filters[key as keyof QaseTestCasesFilter];
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>
    );

  return createHash("md5").update(JSON.stringify(sortedFilters)).digest("hex").substring(0, 12);
}

/**
 * Formata a lista de test cases para o agent.
 */
function formatTestCaseList(testCaseList: QaseTestCaseList, cached: boolean): GetTestCasesResult {
  return {
    success: true,
    total: testCaseList.total,
    filtered: testCaseList.filtered,
    count: testCaseList.entities.length,
    cases: testCaseList.entities.map((tc) => ({
      id: tc.id,
      title: tc.title,
      severity: SEVERITY_MAP[tc.severity ?? 0] || "undefined",
      priority: PRIORITY_MAP[tc.priority ?? 0] || "undefined",
      automation: AUTOMATION_MAP[tc.automation ?? 0] || "is-not-automated",
      status: STATUS_MAP[tc.status ?? 0] || "actual",
      suiteId: tc.suite_id ?? null,
      isFlaky: tc.is_flaky === 1,
      tags: tc.tags?.map((t) => t.title) ?? [],
    })),
    cached,
  };
}

/**
 * Obtém test cases do Qase com suporte a cache.
 *
 * @param token - Token da API do Qase
 * @param userId - ID do usuário para cache
 * @param input - Parâmetros de entrada
 * @returns Lista de test cases formatada
 */
export async function getTestCasesWithCache(
  token: string,
  userId: string,
  input: GetTestCasesInput
): Promise<GetTestCasesResult> {
  const {
    projectCode,
    search,
    suiteId,
    severity,
    priority,
    automation,
    status,
    limit = 100,
    offset = 0,
  } = input;

  // Monta os filtros para a API
  const filters: QaseTestCasesFilter = {
    limit,
    offset,
  };

  if (search) filters.search = search;
  if (suiteId !== undefined) filters.suiteId = suiteId;
  if (severity) filters.severity = severity;
  if (priority) filters.priority = priority;
  if (automation) filters.automation = automation;
  if (status) filters.status = status;

  // Gera hash para cache key
  const filterHash = generateFilterHash(filters);
  const cacheKey = CACHE_KEYS.testCaseList(userId, projectCode, filterHash);

  // Tenta obter do cache primeiro
  const cached = await cacheGet<QaseTestCaseList>(cacheKey);
  if (cached) {
    return formatTestCaseList(cached, true);
  }

  try {
    const client = new QaseClient(token);
    const testCases = await client.getTestCases(projectCode, filters);

    // Armazena no cache (2 minutos)
    await cacheSet(cacheKey, testCases, CACHE_TTL.TEST_CASES);

    return formatTestCaseList(testCases, false);
  } catch (error) {
    if (error instanceof QaseAuthError) {
      return {
        success: false,
        total: 0,
        filtered: 0,
        count: 0,
        cases: [],
        error: "Invalid or expired Qase API token. Please reconnect.",
      };
    }

    if (error instanceof QaseApiError) {
      return {
        success: false,
        total: 0,
        filtered: 0,
        count: 0,
        cases: [],
        error: `Qase API error: ${error.message}`,
      };
    }

    console.error("Error getting test cases:", error);
    return {
      success: false,
      total: 0,
      filtered: 0,
      count: 0,
      cases: [],
      error: "Failed to get test cases. Please try again.",
    };
  }
}

/**
 * Cria a LangChain tool para obter casos de teste.
 *
 * @param getToken - Função para obter o token do Qase
 * @param getUserId - Função para obter o ID do usuário
 * @returns LangChain DynamicStructuredTool
 *
 * @example
 * ```typescript
 * const getTestCasesTool = createGetTestCasesTool(
 *   () => userToken,
 *   () => userId
 * );
 * ```
 */
export function createGetTestCasesTool(
  getToken: () => string | Promise<string>,
  getUserId: () => string | Promise<string>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_test_cases",
    description: `Gets test cases from a Qase.io project.
Returns test case id, title, severity, priority, automation status, and tags.
Use this tool when the user asks about test cases, test coverage, or wants to analyze tests.

Supports filtering by:
- search: text search in test case names
- suiteId: filter by test suite ID
- severity: blocker, critical, major, normal, minor, trivial
- priority: high, medium, low
- automation: automated, is-not-automated, to-be-automated
- status: actual, draft, deprecated

Results are cached for 2 minutes for better performance.
Supports pagination with limit (max 100) and offset parameters.`,
    schema: GetTestCasesInputSchema,
    func: async (input: GetTestCasesInput): Promise<string> => {
      const token = await getToken();
      const userId = await getUserId();
      const result = await getTestCasesWithCache(token, userId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

/**
 * Cria a LangChain tool para obter casos de teste com token e userId fixos.
 * Versão simplificada para uso direto.
 *
 * @param token - Token da API do Qase
 * @param userId - ID do usuário
 * @returns LangChain DynamicStructuredTool
 */
export function createGetTestCasesToolWithContext(
  token: string,
  userId: string
): DynamicStructuredTool {
  return createGetTestCasesTool(
    () => token,
    () => userId
  );
}
