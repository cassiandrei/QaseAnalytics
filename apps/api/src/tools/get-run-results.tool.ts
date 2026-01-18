/**
 * LangChain Tool: get_run_results
 *
 * Permite ao agente obter resultados detalhados de execuções de teste do Qase.io.
 *
 * @see US-008: Obter Resultados Detalhados
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import crypto from "crypto";
import {
  QaseClient,
  QaseAuthError,
  QaseApiError,
  type QaseTestResultsFilter,
  type QaseTestResultList,
} from "../lib/qase-client.js";
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from "../lib/redis.js";

/** Schema de entrada para a tool */
export const GetRunResultsInputSchema = z.object({
  projectCode: z.string().describe("The project code in Qase (e.g., 'GV', 'DEMO')"),
  runId: z
    .number()
    .int()
    .positive()
    .describe("The test run ID to get results for"),
  status: z
    .enum(["passed", "failed", "blocked", "skipped", "invalid", "in_progress"])
    .optional()
    .describe("Filter results by status"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(100)
    .describe("Maximum number of results to return (1-100)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of results to skip for pagination"),
});

/** Tipo de entrada para a função getRunResultsWithCache (limit e offset são opcionais) */
export type GetRunResultsInput = {
  projectCode: string;
  runId: number;
  status?: "passed" | "failed" | "blocked" | "skipped" | "invalid" | "in_progress";
  limit?: number;
  offset?: number;
};

/** Tipo de resultado de teste case transformado */
export interface TestCaseInfo {
  title: string;
  description: string | null;
  severity: string | null;
  priority: string | null;
  automation: string | null;
}

/** Tipo de anexo transformado */
export interface AttachmentInfo {
  filename: string;
  url: string;
  mime: string | null;
  size: number | null;
}

/** Tipo de step transformado */
export interface StepResult {
  position: number;
  status: string;
  comment: string | null;
}

/** Tipo de resultado transformado para o agente */
export interface TestResultItem {
  hash: string;
  caseId: number;
  caseTitle: string;
  status: string;
  duration: number | null;
  startTime: string | null;
  endTime: string | null;
  comment: string | null;
  stacktrace: string | null;
  steps: StepResult[];
  attachments: AttachmentInfo[];
  case: TestCaseInfo | null;
}

/** Agrupamento por status */
export interface ResultsByStatus {
  passed: TestResultItem[];
  failed: TestResultItem[];
  blocked: TestResultItem[];
  skipped: TestResultItem[];
  invalid: TestResultItem[];
  in_progress: TestResultItem[];
  other: TestResultItem[];
}

export interface GetRunResultsResult {
  success: boolean;
  error?: string;
  runId: number;
  total: number;
  filtered: number;
  count: number;
  results: TestResultItem[];
  byStatus: ResultsByStatus;
  summary: {
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    invalid: number;
    in_progress: number;
    other: number;
    passRate: number;
  };
  cached: boolean;
}

/** Mapeamento de severity numérico para texto */
const SEVERITY_MAP: Record<number, string> = {
  0: "undefined",
  1: "blocker",
  2: "critical",
  3: "major",
  4: "normal",
  5: "minor",
  6: "trivial",
};

/** Mapeamento de priority numérico para texto */
const PRIORITY_MAP: Record<number, string> = {
  0: "undefined",
  1: "high",
  2: "medium",
  3: "low",
};

/** Mapeamento de automation numérico para texto */
const AUTOMATION_MAP: Record<number, string> = {
  0: "is-not-automated",
  1: "automated",
  2: "to-be-automated",
};

/**
 * Gera um hash MD5 dos filtros para uso como chave de cache.
 */
function generateFilterHash(filters: Omit<GetRunResultsInput, "projectCode" | "runId">): string {
  const sortedFilters = JSON.stringify(filters, Object.keys(filters).sort());
  return crypto.createHash("md5").update(sortedFilters).digest("hex").substring(0, 8);
}

/**
 * Transforma um resultado da API para o formato do agente.
 */
function transformTestResult(result: QaseTestResultList["entities"][0]): TestResultItem {
  const caseInfo = result.case;

  return {
    hash: result.hash,
    caseId: result.case_id,
    caseTitle: caseInfo?.title ?? `Case #${result.case_id}`,
    status: result.status,
    duration: result.time_spent_ms ?? null,
    startTime: result.start_time ?? null,
    endTime: result.end_time ?? null,
    comment: result.comment ?? null,
    stacktrace: result.stacktrace ?? null,
    steps: (result.steps ?? []).map((step) => ({
      position: step.position,
      status: step.status,
      comment: step.comment ?? null,
    })),
    attachments: (result.attachments ?? []).map((att) => ({
      filename: att.filename,
      url: att.url,
      mime: att.mime ?? null,
      size: att.size ?? null,
    })),
    case: caseInfo ? {
      title: caseInfo.title,
      description: caseInfo.description ?? null,
      severity: caseInfo.severity !== undefined ? SEVERITY_MAP[caseInfo.severity] ?? null : null,
      priority: caseInfo.priority !== undefined ? PRIORITY_MAP[caseInfo.priority] ?? null : null,
      automation: caseInfo.automation !== undefined ? AUTOMATION_MAP[caseInfo.automation] ?? null : null,
    } : null,
  };
}

/**
 * Agrupa resultados por status.
 */
function groupByStatus(results: TestResultItem[]): ResultsByStatus {
  const groups: ResultsByStatus = {
    passed: [],
    failed: [],
    blocked: [],
    skipped: [],
    invalid: [],
    in_progress: [],
    other: [],
  };

  for (const result of results) {
    const status = result.status.toLowerCase().replace(" ", "_");
    if (status in groups) {
      groups[status as keyof ResultsByStatus].push(result);
    } else {
      groups.other.push(result);
    }
  }

  return groups;
}

/**
 * Calcula o sumário de resultados.
 */
function calculateSummary(byStatus: ResultsByStatus): GetRunResultsResult["summary"] {
  const passed = byStatus.passed.length;
  const failed = byStatus.failed.length;
  const blocked = byStatus.blocked.length;
  const skipped = byStatus.skipped.length;
  const invalid = byStatus.invalid.length;
  const in_progress = byStatus.in_progress.length;
  const other = byStatus.other.length;

  const total = passed + failed + blocked + skipped + invalid + in_progress + other;
  const passRate = total > 0 ? Math.round((passed / total) * 100 * 100) / 100 : 0;

  return {
    passed,
    failed,
    blocked,
    skipped,
    invalid,
    in_progress,
    other,
    passRate,
  };
}

/**
 * Obtém resultados de um test run do Qase com cache.
 *
 * @param token - Token de API do Qase
 * @param userId - ID do usuário para namespace do cache
 * @param input - Parâmetros de busca
 * @returns Resultado com lista de resultados de teste
 */
export async function getRunResultsWithCache(
  token: string,
  userId: string,
  input: GetRunResultsInput
): Promise<GetRunResultsResult> {
  const { projectCode, runId, ...filters } = input;

  // Gera hash dos filtros para chave de cache
  const filterHash = generateFilterHash(filters);
  const cacheKey = CACHE_KEYS.testResultList(userId, projectCode, runId, filterHash);

  // Tenta obter do cache
  const cached = await cacheGet<QaseTestResultList>(cacheKey);
  if (cached) {
    const transformedResults = cached.entities.map(transformTestResult);
    const byStatus = groupByStatus(transformedResults);
    const summary = calculateSummary(byStatus);

    return {
      success: true,
      runId,
      total: cached.total,
      filtered: cached.filtered,
      count: cached.count,
      results: transformedResults,
      byStatus,
      summary,
      cached: true,
    };
  }

  try {
    const client = new QaseClient(token);

    // Converte filtros para o formato da API (com valores default)
    const apiFilters: QaseTestResultsFilter = {
      run: runId,
      limit: filters.limit ?? 100,
      offset: filters.offset ?? 0,
    };

    if (filters.status) apiFilters.status = filters.status;

    const result = await client.getTestResults(projectCode, apiFilters);

    // Armazena no cache
    await cacheSet(cacheKey, result, CACHE_TTL.RESULTS);

    const transformedResults = result.entities.map(transformTestResult);
    const byStatus = groupByStatus(transformedResults);
    const summary = calculateSummary(byStatus);

    return {
      success: true,
      runId,
      total: result.total,
      filtered: result.filtered,
      count: result.count,
      results: transformedResults,
      byStatus,
      summary,
      cached: false,
    };
  } catch (error) {
    if (error instanceof QaseAuthError) {
      return {
        success: false,
        error: "Invalid or expired Qase API token. Please reconnect.",
        runId,
        total: 0,
        filtered: 0,
        count: 0,
        results: [],
        byStatus: {
          passed: [],
          failed: [],
          blocked: [],
          skipped: [],
          invalid: [],
          in_progress: [],
          other: [],
        },
        summary: {
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          invalid: 0,
          in_progress: 0,
          other: 0,
          passRate: 0,
        },
        cached: false,
      };
    }

    if (error instanceof QaseApiError) {
      return {
        success: false,
        error: error.message,
        runId,
        total: 0,
        filtered: 0,
        count: 0,
        results: [],
        byStatus: {
          passed: [],
          failed: [],
          blocked: [],
          skipped: [],
          invalid: [],
          in_progress: [],
          other: [],
        },
        summary: {
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          invalid: 0,
          in_progress: 0,
          other: 0,
          passRate: 0,
        },
        cached: false,
      };
    }

    return {
      success: false,
      error: "Failed to get run results. Please try again.",
      runId,
      total: 0,
      filtered: 0,
      count: 0,
      results: [],
      byStatus: {
        passed: [],
        failed: [],
        blocked: [],
        skipped: [],
        invalid: [],
        in_progress: [],
        other: [],
      },
      summary: {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        invalid: 0,
        in_progress: 0,
        other: 0,
        passRate: 0,
      },
      cached: false,
    };
  }
}

/**
 * Cria a LangChain tool para obter resultados de um test run.
 *
 * @param getToken - Função para obter o token do Qase
 * @param getUserId - Função para obter o ID do usuário
 * @returns DynamicStructuredTool configurada
 *
 * @example
 * ```typescript
 * const tool = createGetRunResultsTool(
 *   () => userToken,
 *   () => userId
 * );
 *
 * const result = await tool.invoke({
 *   projectCode: "GV",
 *   runId: 123,
 *   status: "failed"
 * });
 * ```
 */
export function createGetRunResultsTool(
  getToken: () => string | Promise<string>,
  getUserId: () => string | Promise<string>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_run_results",
    description: `Gets detailed test results from a specific test run in Qase.io.

Use this tool to:
- Get all results from a test run execution
- See which test cases passed, failed, blocked, or were skipped
- View failure details including stack traces and comments
- Analyze test execution duration
- Get results grouped by status for easy analysis

Returns: For each result: caseTitle, status, duration, comment, stacktrace, attachments.
Also returns a summary with counts by status and pass rate.
Results are cached for 5 minutes.

Always provide projectCode and runId. Use status filter to get only failed/blocked tests.`,
    schema: GetRunResultsInputSchema,
    func: async (input: GetRunResultsInput): Promise<string> => {
      const token = await getToken();
      const userId = await getUserId();
      const result = await getRunResultsWithCache(token, userId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

/**
 * Cria a LangChain tool com token e userId fixos.
 * Útil para contextos onde o token já é conhecido.
 */
export function createGetRunResultsToolWithContext(
  token: string,
  userId: string
): DynamicStructuredTool {
  return createGetRunResultsTool(
    () => token,
    () => userId
  );
}
