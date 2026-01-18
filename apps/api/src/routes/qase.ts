/**
 * Qase API Routes
 *
 * Endpoints para integração com Qase.io.
 *
 * @see US-004: Conexão com Qase API
 * @see US-005: Listar Projetos do Qase
 * @see US-006: Obter Casos de Teste
 * @see US-007: Obter Execuções de Teste
 * @see US-008: Obter Resultados Detalhados
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  validateQaseToken,
  connectQase,
  disconnectQase,
  getQaseConnectionStatus,
  listQaseProjects,
  getQaseProject,
  revalidateQaseToken,
  listQaseTestCases,
  getQaseTestCase,
  listQaseTestRuns,
  getQaseTestRun,
  listQaseTestResults,
  getQaseTestResult,
} from "../services/qase.service.js";

/** Tipo de variáveis do contexto Hono */
type Variables = {
  userId: string;
};

export const qaseRoutes = new Hono<{ Variables: Variables }>();

/** Schema de validação para conexão */
const ConnectSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

/** Schema de paginação */
const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * POST /api/qase/validate
 *
 * Valida um token da Qase API sem salvá-lo.
 * Útil para verificar o token antes de conectar.
 *
 * @body { token: string }
 * @returns { valid: boolean, message: string, projectCount?: number }
 */
qaseRoutes.post("/validate", zValidator("json", ConnectSchema), async (c) => {
  const { token } = c.req.valid("json");

  const result = await validateQaseToken(token);

  return c.json(result, result.valid ? 200 : 400);
});

/**
 * POST /api/qase/connect
 *
 * Conecta o usuário ao Qase.io.
 * Valida o token e o armazena de forma segura (encriptado).
 *
 * @body { token: string }
 * @returns { success: boolean, message: string, projects?: Project[], maskedToken?: string }
 */
qaseRoutes.post("/connect", zValidator("json", ConnectSchema), async (c) => {
  const { token } = c.req.valid("json");

  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  // Por enquanto, usar um ID temporário para desenvolvimento
  const userId = c.get("userId") ?? "temp-user-id";

  const result = await connectQase(userId, token);

  return c.json(result, result.success ? 200 : 400);
});

/**
 * POST /api/qase/disconnect
 *
 * Desconecta o usuário do Qase.io.
 * Remove o token armazenado.
 *
 * @returns { success: boolean, message: string }
 */
qaseRoutes.post("/disconnect", async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";

  const success = await disconnectQase(userId);

  return c.json(
    {
      success,
      message: success ? "Disconnected from Qase.io" : "Failed to disconnect",
    },
    success ? 200 : 500
  );
});

/**
 * GET /api/qase/status
 *
 * Retorna o status da conexão com Qase.io.
 *
 * @returns { connected: boolean, maskedToken?: string }
 */
qaseRoutes.get("/status", async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";

  const status = await getQaseConnectionStatus(userId);

  return c.json(status);
});

/**
 * POST /api/qase/revalidate
 *
 * Revalida o token armazenado.
 * Útil para verificar se o token ainda é válido.
 *
 * @returns { valid: boolean, message: string, projectCount?: number }
 */
qaseRoutes.post("/revalidate", async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";

  const result = await revalidateQaseToken(userId);

  return c.json(result, result.valid ? 200 : 400);
});

/**
 * GET /api/qase/projects
 *
 * Lista todos os projetos do usuário no Qase.
 *
 * @query { limit?: number, offset?: number }
 * @returns { total: number, filtered: number, count: number, entities: Project[] }
 */
qaseRoutes.get("/projects", zValidator("query", PaginationSchema), async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";
  const { limit, offset } = c.req.valid("query");

  const projects = await listQaseProjects(userId, { limit, offset });

  if (!projects) {
    return c.json(
      {
        error: "Not connected to Qase.io",
        message: "Please connect your Qase account first",
      },
      401
    );
  }

  return c.json(projects);
});

/**
 * GET /api/qase/projects/:code
 *
 * Obtém detalhes de um projeto específico.
 *
 * @param code - Código do projeto
 * @returns Project
 */
qaseRoutes.get("/projects/:code", async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";
  const code = c.req.param("code");

  const project = await getQaseProject(userId, code);

  if (!project) {
    return c.json(
      {
        error: "Project not found or not connected",
        message: "Please check the project code and your Qase connection",
      },
      404
    );
  }

  return c.json(project);
});

/** Schema de filtros para test cases */
const TestCasesFilterSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(100),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  suiteId: z.coerce.number().int().positive().optional(),
  severity: z.enum(["undefined", "blocker", "critical", "major", "normal", "minor", "trivial"]).optional(),
  priority: z.enum(["undefined", "high", "medium", "low"]).optional(),
  automation: z.enum(["is-not-automated", "automated", "to-be-automated"]).optional(),
  status: z.enum(["actual", "draft", "deprecated"]).optional(),
});

/**
 * GET /api/qase/projects/:code/cases
 *
 * Lista casos de teste de um projeto.
 *
 * @param code - Código do projeto
 * @query { limit?: number, offset?: number, search?: string, suiteId?: number, severity?: string, priority?: string, automation?: string, status?: string }
 * @returns { total: number, filtered: number, count: number, entities: TestCase[] }
 *
 * @see US-006: Obter Casos de Teste
 */
qaseRoutes.get(
  "/projects/:code/cases",
  zValidator("query", TestCasesFilterSchema),
  async (c) => {
    // TODO: Obter userId do contexto de autenticação (US-038/US-039)
    const userId = c.get("userId") ?? "temp-user-id";
    const code = c.req.param("code");
    const filters = c.req.valid("query");

    const testCases = await listQaseTestCases(userId, code, {
      limit: filters.limit,
      offset: filters.offset,
      search: filters.search,
      suiteId: filters.suiteId,
      severity: filters.severity,
      priority: filters.priority,
      automation: filters.automation,
      status: filters.status,
    });

    if (!testCases) {
      return c.json(
        {
          error: "Not connected to Qase.io",
          message: "Please connect your Qase account first",
        },
        401
      );
    }

    return c.json(testCases);
  }
);

/**
 * GET /api/qase/projects/:code/cases/:caseId
 *
 * Obtém detalhes de um caso de teste específico.
 *
 * @param code - Código do projeto
 * @param caseId - ID do caso de teste
 * @returns TestCase
 *
 * @see US-006: Obter Casos de Teste
 */
qaseRoutes.get("/projects/:code/cases/:caseId", async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";
  const code = c.req.param("code");
  const caseIdParam = c.req.param("caseId");
  const caseId = parseInt(caseIdParam, 10);

  if (isNaN(caseId) || caseId <= 0) {
    return c.json(
      {
        error: "Invalid case ID",
        message: "Case ID must be a positive integer",
      },
      400
    );
  }

  const testCase = await getQaseTestCase(userId, code, caseId);

  if (!testCase) {
    return c.json(
      {
        error: "Test case not found or not connected",
        message: "Please check the case ID and your Qase connection",
      },
      404
    );
  }

  return c.json(testCase);
});

/** Schema de filtros para test runs */
const TestRunsFilterSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(100),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(["active", "complete", "abort"]).optional(),
  milestone: z.coerce.number().int().positive().optional(),
  environment: z.coerce.number().int().positive().optional(),
  fromStartTime: z.string().optional(),
  toStartTime: z.string().optional(),
});

/**
 * GET /api/qase/projects/:code/runs
 *
 * Lista execuções de teste (test runs) de um projeto.
 *
 * @param code - Código do projeto
 * @query { limit?: number, offset?: number, status?: string, milestone?: number, environment?: number, fromStartTime?: string, toStartTime?: string }
 * @returns { total: number, filtered: number, count: number, entities: TestRun[] }
 *
 * @see US-007: Obter Execuções de Teste
 */
qaseRoutes.get(
  "/projects/:code/runs",
  zValidator("query", TestRunsFilterSchema),
  async (c) => {
    // TODO: Obter userId do contexto de autenticação (US-038/US-039)
    const userId = c.get("userId") ?? "temp-user-id";
    const code = c.req.param("code");
    const filters = c.req.valid("query");

    const testRuns = await listQaseTestRuns(userId, code, {
      limit: filters.limit,
      offset: filters.offset,
      status: filters.status,
      milestone: filters.milestone,
      environment: filters.environment,
      fromStartTime: filters.fromStartTime,
      toStartTime: filters.toStartTime,
    });

    if (!testRuns) {
      return c.json(
        {
          error: "Not connected to Qase.io",
          message: "Please connect your Qase account first",
        },
        401
      );
    }

    return c.json(testRuns);
  }
);

/**
 * GET /api/qase/projects/:code/runs/:runId
 *
 * Obtém detalhes de um test run específico.
 *
 * @param code - Código do projeto
 * @param runId - ID do test run
 * @returns TestRun
 *
 * @see US-007: Obter Execuções de Teste
 */
qaseRoutes.get("/projects/:code/runs/:runId", async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";
  const code = c.req.param("code");
  const runIdParam = c.req.param("runId");
  const runId = parseInt(runIdParam, 10);

  if (isNaN(runId) || runId <= 0) {
    return c.json(
      {
        error: "Invalid run ID",
        message: "Run ID must be a positive integer",
      },
      400
    );
  }

  const testRun = await getQaseTestRun(userId, code, runId);

  if (!testRun) {
    return c.json(
      {
        error: "Test run not found or not connected",
        message: "Please check the run ID and your Qase connection",
      },
      404
    );
  }

  return c.json(testRun);
});

/** Schema de filtros para test results */
const TestResultsFilterSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(100),
  offset: z.coerce.number().min(0).default(0),
  status: z.string().optional(), // passed,failed,blocked,skipped,invalid,in_progress (comma-separated)
  run: z.coerce.number().int().positive().optional(),
  caseId: z.coerce.number().int().positive().optional(),
  member: z.coerce.number().int().positive().optional(),
  fromEndTime: z.string().optional(), // ISO date
  toEndTime: z.string().optional(), // ISO date
});

/**
 * GET /api/qase/projects/:code/results
 *
 * Lista resultados de teste de um projeto.
 *
 * @param code - Código do projeto
 * @query { limit?: number, offset?: number, status?: string, run?: number, caseId?: number, member?: number, fromEndTime?: string, toEndTime?: string }
 * @returns { total: number, filtered: number, count: number, entities: TestResult[] }
 *
 * @see US-008: Obter Resultados Detalhados
 */
qaseRoutes.get(
  "/projects/:code/results",
  zValidator("query", TestResultsFilterSchema),
  async (c) => {
    // TODO: Obter userId do contexto de autenticação (US-038/US-039)
    const userId = c.get("userId") ?? "temp-user-id";
    const code = c.req.param("code");
    const filters = c.req.valid("query");

    const testResults = await listQaseTestResults(userId, code, {
      limit: filters.limit,
      offset: filters.offset,
      status: filters.status,
      run: filters.run,
      caseId: filters.caseId,
      member: filters.member,
      fromEndTime: filters.fromEndTime,
      toEndTime: filters.toEndTime,
    });

    if (!testResults) {
      return c.json(
        {
          error: "Not connected to Qase.io",
          message: "Please connect your Qase account first",
        },
        401
      );
    }

    return c.json(testResults);
  }
);

/**
 * GET /api/qase/projects/:code/results/:hash
 *
 * Obtém detalhes de um resultado de teste específico.
 *
 * @param code - Código do projeto
 * @param hash - Hash do resultado
 * @returns TestResult
 *
 * @see US-008: Obter Resultados Detalhados
 */
qaseRoutes.get("/projects/:code/results/:hash", async (c) => {
  // TODO: Obter userId do contexto de autenticação (US-038/US-039)
  const userId = c.get("userId") ?? "temp-user-id";
  const code = c.req.param("code");
  const hash = c.req.param("hash");

  if (!hash || hash.trim().length === 0) {
    return c.json(
      {
        error: "Invalid result hash",
        message: "Result hash is required",
      },
      400
    );
  }

  const testResult = await getQaseTestResult(userId, code, hash);

  if (!testResult) {
    return c.json(
      {
        error: "Test result not found or not connected",
        message: "Please check the result hash and your Qase connection",
      },
      404
    );
  }

  return c.json(testResult);
});

/**
 * GET /api/qase/projects/:code/runs/:runId/results
 *
 * Lista resultados de teste de uma execução específica.
 * Shortcut para GET /projects/:code/results?run=:runId
 *
 * @param code - Código do projeto
 * @param runId - ID do test run
 * @query { limit?: number, offset?: number, status?: string }
 * @returns { total: number, filtered: number, count: number, entities: TestResult[] }
 *
 * @see US-008: Obter Resultados Detalhados
 */
qaseRoutes.get(
  "/projects/:code/runs/:runId/results",
  zValidator("query", TestResultsFilterSchema.omit({ run: true })),
  async (c) => {
    // TODO: Obter userId do contexto de autenticação (US-038/US-039)
    const userId = c.get("userId") ?? "temp-user-id";
    const code = c.req.param("code");
    const runIdParam = c.req.param("runId");
    const runId = parseInt(runIdParam, 10);

    if (isNaN(runId) || runId <= 0) {
      return c.json(
        {
          error: "Invalid run ID",
          message: "Run ID must be a positive integer",
        },
        400
      );
    }

    const filters = c.req.valid("query");

    const testResults = await listQaseTestResults(userId, code, {
      run: runId,
      limit: filters.limit,
      offset: filters.offset,
      status: filters.status,
      caseId: filters.caseId,
      member: filters.member,
      fromEndTime: filters.fromEndTime,
      toEndTime: filters.toEndTime,
    });

    if (!testResults) {
      return c.json(
        {
          error: "Not connected to Qase.io",
          message: "Please connect your Qase account first",
        },
        401
      );
    }

    return c.json(testResults);
  }
);
