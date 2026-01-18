/**
 * LangChain Tool: get_test_runs
 *
 * Permite ao agente obter execuções de teste (test runs) do Qase.io.
 *
 * @see US-007: Obter Execuções de Teste
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import crypto from "crypto";
import {
  QaseClient,
  QaseAuthError,
  QaseApiError,
  type QaseTestRunsFilter,
  type QaseTestRunList,
} from "../lib/qase-client.js";
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from "../lib/redis.js";

/** Schema de entrada para a tool */
export const GetTestRunsInputSchema = z.object({
  projectCode: z.string().describe("The project code in Qase (e.g., 'GV', 'DEMO')"),
  status: z
    .enum(["active", "complete", "abort"])
    .optional()
    .describe("Filter by run status"),
  fromStartTime: z
    .string()
    .optional()
    .describe("Filter runs started after this date (ISO 8601 format, e.g., '2024-01-01')"),
  toStartTime: z
    .string()
    .optional()
    .describe("Filter runs started before this date (ISO 8601 format, e.g., '2024-12-31')"),
  environment: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by environment ID"),
  milestone: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by milestone ID"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(100)
    .describe("Maximum number of runs to return (1-100)"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of runs to skip for pagination"),
});

export type GetTestRunsInput = z.infer<typeof GetTestRunsInputSchema>;

/** Mapeamento de status numérico para texto */
const STATUS_MAP: Record<number, string> = {
  0: "active",
  1: "complete",
  2: "abort",
};

/** Tipo de resultado transformado para o agente */
export interface TestRunResult {
  id: number;
  title: string;
  description: string | null;
  status: string;
  startTime: string | null;
  endTime: string | null;
  stats: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    untested: number;
  };
  passRate: number;
  environmentId: number | null;
  milestoneId: number | null;
  timeSpent: number | null;
  casesCount: number;
}

export interface GetTestRunsResult {
  success: boolean;
  error?: string;
  total: number;
  filtered: number;
  count: number;
  runs: TestRunResult[];
  cached: boolean;
}

/**
 * Gera um hash MD5 dos filtros para uso como chave de cache.
 */
function generateFilterHash(filters: Omit<GetTestRunsInput, "projectCode">): string {
  const sortedFilters = JSON.stringify(filters, Object.keys(filters).sort());
  return crypto.createHash("md5").update(sortedFilters).digest("hex").substring(0, 8);
}

/**
 * Transforma um test run da API para o formato do agente.
 */
function transformTestRun(run: QaseTestRunList["entities"][0]): TestRunResult {
  const stats = run.stats;
  const total = stats.total || 0;
  const passed = stats.passed || 0;
  const passRate = total > 0 ? Math.round((passed / total) * 100 * 100) / 100 : 0;

  return {
    id: run.id,
    title: run.title,
    description: run.description ?? null,
    status: STATUS_MAP[run.status] ?? "unknown",
    startTime: run.start_time ?? null,
    endTime: run.end_time ?? null,
    stats: {
      total: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      blocked: stats.blocked,
      skipped: stats.skipped ?? 0,
      untested: stats.untested ?? 0,
    },
    passRate,
    environmentId: run.environment_id ?? null,
    milestoneId: run.milestone_id ?? null,
    timeSpent: run.time_spent ?? null,
    casesCount: run.cases_count ?? run.cases?.length ?? 0,
  };
}

/**
 * Obtém test runs do Qase com cache.
 *
 * @param token - Token de API do Qase
 * @param userId - ID do usuário para namespace do cache
 * @param input - Parâmetros de busca
 * @returns Resultado com lista de test runs
 */
export async function getTestRunsWithCache(
  token: string,
  userId: string,
  input: GetTestRunsInput
): Promise<GetTestRunsResult> {
  const { projectCode, ...filters } = input;

  // Gera hash dos filtros para chave de cache
  const filterHash = generateFilterHash(filters);
  const cacheKey = CACHE_KEYS.testRunList(userId, projectCode, filterHash);

  // Tenta obter do cache
  const cached = await cacheGet<QaseTestRunList>(cacheKey);
  if (cached) {
    return {
      success: true,
      total: cached.total,
      filtered: cached.filtered,
      count: cached.count,
      runs: cached.entities.map(transformTestRun),
      cached: true,
    };
  }

  try {
    const client = new QaseClient(token);

    // Converte filtros para o formato da API
    const apiFilters: QaseTestRunsFilter = {
      limit: filters.limit,
      offset: filters.offset,
    };

    if (filters.status) apiFilters.status = filters.status;
    if (filters.fromStartTime) apiFilters.fromStartTime = filters.fromStartTime;
    if (filters.toStartTime) apiFilters.toStartTime = filters.toStartTime;
    if (filters.environment) apiFilters.environment = filters.environment;
    if (filters.milestone) apiFilters.milestone = filters.milestone;

    const result = await client.getTestRuns(projectCode, apiFilters);

    // Armazena no cache
    await cacheSet(cacheKey, result, CACHE_TTL.TEST_RUNS);

    return {
      success: true,
      total: result.total,
      filtered: result.filtered,
      count: result.count,
      runs: result.entities.map(transformTestRun),
      cached: false,
    };
  } catch (error) {
    if (error instanceof QaseAuthError) {
      return {
        success: false,
        error: "Invalid or expired Qase API token. Please reconnect.",
        total: 0,
        filtered: 0,
        count: 0,
        runs: [],
        cached: false,
      };
    }

    if (error instanceof QaseApiError) {
      return {
        success: false,
        error: error.message,
        total: 0,
        filtered: 0,
        count: 0,
        runs: [],
        cached: false,
      };
    }

    return {
      success: false,
      error: "Failed to get test runs. Please try again.",
      total: 0,
      filtered: 0,
      count: 0,
      runs: [],
      cached: false,
    };
  }
}

/**
 * Cria a LangChain tool para obter test runs.
 *
 * @param getToken - Função para obter o token do Qase
 * @param getUserId - Função para obter o ID do usuário
 * @returns DynamicStructuredTool configurada
 *
 * @example
 * ```typescript
 * const tool = createGetTestRunsTool(
 *   () => userToken,
 *   () => userId
 * );
 *
 * const result = await tool.invoke({
 *   projectCode: "GV",
 *   status: "complete",
 *   limit: 50
 * });
 * ```
 */
export function createGetTestRunsTool(
  getToken: () => string | Promise<string>,
  getUserId: () => string | Promise<string>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_test_runs",
    description: `Gets test runs (test executions) from a Qase.io project.

Use this tool to:
- List all test runs for a project
- Filter runs by status (active, complete, abort)
- Filter runs by date range (fromStartTime, toStartTime)
- Filter runs by environment or milestone
- Get statistics (passed, failed, blocked counts)
- Calculate pass rates for test runs

Returns: id, title, status, stats (passed/failed/blocked/total), passRate, startTime, endTime.
Results are ordered by date (most recent first) and cached for 2 minutes.`,
    schema: GetTestRunsInputSchema,
    func: async (input: GetTestRunsInput): Promise<string> => {
      const token = await getToken();
      const userId = await getUserId();
      const result = await getTestRunsWithCache(token, userId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

/**
 * Cria a LangChain tool com token e userId fixos.
 * Útil para contextos onde o token já é conhecido.
 */
export function createGetTestRunsToolWithContext(
  token: string,
  userId: string
): DynamicStructuredTool {
  return createGetTestRunsTool(
    () => token,
    () => userId
  );
}
