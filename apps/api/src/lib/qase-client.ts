/**
 * Qase API Client
 *
 * Cliente HTTP para interação com a API do Qase.io.
 * Implementa retry com exponential backoff para resiliência.
 *
 * @see https://developers.qase.io/reference/introduction-to-the-qase-api
 * @see US-004: Conexão com Qase API
 * @see US-059: Retry com Backoff
 */

import { z } from "zod";

const QASE_API_BASE_URL = "https://api.qase.io/v1";

/** Configuração padrão de retry */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/** Schema de erro da Qase API */
const QaseErrorSchema = z.object({
  status: z.boolean(),
  errorMessage: z.string().optional(),
  errorFields: z.record(z.array(z.string())).optional(),
});

/** Schema de resposta de sucesso da Qase API */
const QaseSuccessSchema = z.object({
  status: z.boolean(),
  result: z.unknown(),
});

/** Schema de projeto do Qase */
export const QaseProjectSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  counts: z
    .object({
      cases: z.number(),
      suites: z.number(),
      milestones: z.number(),
      runs: z
        .object({
          total: z.number(),
          active: z.number(),
        })
        .optional(),
      defects: z
        .object({
          total: z.number(),
          open: z.number(),
        })
        .optional(),
    })
    .optional(),
});

export type QaseProject = z.infer<typeof QaseProjectSchema>;

/** Schema de lista de projetos */
export const QaseProjectListSchema = z.object({
  total: z.number(),
  filtered: z.number(),
  count: z.number(),
  entities: z.array(QaseProjectSchema),
});

export type QaseProjectList = z.infer<typeof QaseProjectListSchema>;

/** Schema de caso de teste do Qase */
export const QaseTestCaseSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  preconditions: z.string().nullable().optional(),
  postconditions: z.string().nullable().optional(),
  severity: z.number().optional(), // 0=undefined, 1=blocker, 2=critical, 3=major, 4=normal, 5=minor, 6=trivial
  priority: z.number().optional(), // 0=undefined, 1=high, 2=medium, 3=low
  type: z.number().optional(), // 0=other, 1=functional, 2=smoke, etc.
  layer: z.number().optional(),
  is_flaky: z.number().optional(), // 0=no, 1=yes
  behavior: z.number().optional(), // 0=undefined, 1=positive, 2=negative, 3=destructive
  automation: z.number().optional(), // 0=is-not-automated, 1=automated, 2=to-be-automated
  status: z.number().optional(), // 0=actual, 1=draft, 2=deprecated
  suite_id: z.number().nullable().optional(),
  milestone_id: z.number().nullable().optional(),
  member_id: z.number().optional(), // author
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  tags: z.array(z.object({
    id: z.number(),
    title: z.string(),
  })).optional(),
  custom_fields: z.array(z.object({
    id: z.number(),
    title: z.string(),
    value: z.string().nullable(),
  })).optional(),
});

export type QaseTestCase = z.infer<typeof QaseTestCaseSchema>;

/** Schema de lista de casos de teste */
export const QaseTestCaseListSchema = z.object({
  total: z.number(),
  filtered: z.number(),
  count: z.number(),
  entities: z.array(QaseTestCaseSchema),
});

export type QaseTestCaseList = z.infer<typeof QaseTestCaseListSchema>;

/** Filtros para busca de test cases */
export interface QaseTestCasesFilter {
  search?: string;
  milestoneId?: number;
  suiteId?: number;
  severity?: string; // comma-separated: undefined,blocker,critical,major,normal,minor,trivial
  priority?: string; // comma-separated: undefined,high,medium,low
  type?: string; // comma-separated: other,functional,smoke,regression,security,usability,performance,acceptance
  behavior?: string; // comma-separated: undefined,positive,negative,destructive
  automation?: string; // comma-separated: is-not-automated,automated,to-be-automated
  status?: string; // comma-separated: actual,draft,deprecated
  limit?: number;
  offset?: number;
}

/** Schema de estatísticas de execução */
export const QaseRunStatsSchema = z.object({
  total: z.number(),
  untested: z.number().optional(),
  passed: z.number(),
  failed: z.number(),
  blocked: z.number(),
  skipped: z.number().optional(),
  retest: z.number().optional(),
  in_progress: z.number().optional(),
  invalid: z.number().optional(),
});

export type QaseRunStats = z.infer<typeof QaseRunStatsSchema>;

/** Schema de test run do Qase */
export const QaseTestRunSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.number(), // 0=active, 1=complete, 2=abort
  status_text: z.string().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  public: z.boolean().optional(),
  stats: QaseRunStatsSchema,
  time_spent: z.number().optional(), // milliseconds
  environment_id: z.number().nullable().optional(),
  milestone_id: z.number().nullable().optional(),
  plan_id: z.number().nullable().optional(),
  user_id: z.number().optional(),
  cases: z.array(z.number()).optional(),
  cases_count: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  tags: z.array(z.object({
    id: z.number(),
    title: z.string(),
  })).optional(),
  custom_fields: z.array(z.object({
    id: z.number(),
    title: z.string(),
    value: z.string().nullable(),
  })).optional(),
});

export type QaseTestRun = z.infer<typeof QaseTestRunSchema>;

/** Schema de lista de test runs */
export const QaseTestRunListSchema = z.object({
  total: z.number(),
  filtered: z.number(),
  count: z.number(),
  entities: z.array(QaseTestRunSchema),
});

export type QaseTestRunList = z.infer<typeof QaseTestRunListSchema>;

/** Filtros para busca de test runs */
export interface QaseTestRunsFilter {
  search?: string;
  status?: string; // comma-separated: active,complete,abort
  milestone?: number;
  environment?: number;
  fromStartTime?: string; // ISO date
  toStartTime?: string; // ISO date
  limit?: number;
  offset?: number;
}

/** Schema de resultado de execução de teste */
export const QaseTestResultSchema = z.object({
  hash: z.string(),
  comment: z.string().nullable().optional(),
  stacktrace: z.string().nullable().optional(),
  run_id: z.number(),
  case_id: z.number(),
  case: z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    preconditions: z.string().nullable().optional(),
    postconditions: z.string().nullable().optional(),
    layer: z.number().optional(),
    severity: z.number().optional(),
    priority: z.number().optional(),
    type: z.number().optional(),
    automation: z.number().optional(),
    behavior: z.number().optional(),
    status: z.number().optional(),
    suite_id: z.number().nullable().optional(),
  }).optional(),
  status: z.string(), // passed, failed, blocked, skipped, invalid, in_progress, etc.
  time_spent_ms: z.number().nullable().optional(),
  end_time: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  is_api_result: z.boolean().optional(),
  author_id: z.number().nullable().optional(),
  member_id: z.number().nullable().optional(), // deprecated, use author_id
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  attachments: z.array(z.object({
    id: z.string().optional(),
    filename: z.string(),
    url: z.string(),
    mime: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  steps: z.array(z.object({
    position: z.number(),
    status: z.string(),
    comment: z.string().nullable().optional(),
    attachments: z.array(z.unknown()).optional(),
  })).optional(),
  param: z.record(z.string()).nullable().optional(),
  custom_fields: z.array(z.object({
    id: z.number(),
    value: z.string().nullable(),
  })).optional(),
});

export type QaseTestResult = z.infer<typeof QaseTestResultSchema>;

/** Schema de lista de resultados de teste */
export const QaseTestResultListSchema = z.object({
  total: z.number(),
  filtered: z.number(),
  count: z.number(),
  entities: z.array(QaseTestResultSchema),
});

export type QaseTestResultList = z.infer<typeof QaseTestResultListSchema>;

/** Filtros para busca de resultados de teste */
export interface QaseTestResultsFilter {
  status?: string; // comma-separated: passed,failed,blocked,skipped,invalid,in_progress
  run?: number; // filter by run_id
  caseId?: number; // filter by case_id
  member?: number; // filter by author_id (deprecated: member_id)
  fromEndTime?: string; // ISO date
  toEndTime?: string; // ISO date
  limit?: number;
  offset?: number;
}

/** Erro customizado para erros da Qase API */
export class QaseApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorFields?: Record<string, string[]>
  ) {
    super(message);
    this.name = "QaseApiError";
  }
}

/** Erro de autenticação da Qase API */
export class QaseAuthError extends QaseApiError {
  constructor(message: string = "Invalid or expired Qase API token") {
    super(message, 401);
    this.name = "QaseAuthError";
  }
}

/** Erro de rate limiting da Qase API */
export class QaseRateLimitError extends QaseApiError {
  constructor(
    public readonly retryAfter?: number
  ) {
    super("Rate limit exceeded", 429);
    this.name = "QaseRateLimitError";
  }
}

/** Opções para requisições do cliente */
interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  retryConfig?: Partial<typeof DEFAULT_RETRY_CONFIG>;
}

/**
 * Aguarda um tempo especificado.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula o delay para retry com exponential backoff.
 */
function calculateBackoff(attempt: number, config: typeof DEFAULT_RETRY_CONFIG): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  // Adiciona jitter (variação aleatória) para evitar thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Verifica se o erro é retentável.
 */
function isRetryableError(statusCode: number): boolean {
  // Retry em erros 5xx e timeout, não em 4xx (incluindo 429)
  // 429 (rate limit) não faz retry automático - deixamos o chamador decidir
  return statusCode >= 500 || statusCode === 408;
}

/**
 * Cliente para a API do Qase.io.
 *
 * @example
 * ```typescript
 * const client = new QaseClient("qase_api_token");
 *
 * // Validar token
 * const isValid = await client.validateToken();
 *
 * // Listar projetos
 * const projects = await client.getProjects();
 * ```
 */
export class QaseClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(token: string, baseUrl: string = QASE_API_BASE_URL) {
    if (!token) {
      throw new Error("Qase API token is required");
    }
    this.token = token;
    this.baseUrl = baseUrl;
  }

  /**
   * Faz uma requisição para a Qase API com retry automático.
   */
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, params, retryConfig = {} } = options;
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    // Constrói a URL com query params
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers: {
            Token: this.token,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Verifica erros de autenticação
        if (response.status === 401 || response.status === 403) {
          throw new QaseAuthError();
        }

        // Verifica rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          throw new QaseRateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
        }

        // Verifica erros do servidor
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const parsed = QaseErrorSchema.safeParse(errorBody);

          if (parsed.success) {
            throw new QaseApiError(
              parsed.data.errorMessage || `HTTP ${response.status}`,
              response.status,
              parsed.data.errorFields
            );
          }

          throw new QaseApiError(`HTTP ${response.status}`, response.status);
        }

        // Parse da resposta de sucesso
        const data = await response.json();
        const parsed = QaseSuccessSchema.safeParse(data);

        if (!parsed.success || !parsed.data.status) {
          throw new QaseApiError("Invalid response format from Qase API", 500);
        }

        return parsed.data.result as T;
      } catch (error) {
        lastError = error as Error;

        // Não faz retry em erros de autenticação ou rate limit
        if (error instanceof QaseAuthError || error instanceof QaseRateLimitError) {
          throw error;
        }

        // Verifica se deve fazer retry
        const statusCode = error instanceof QaseApiError ? error.statusCode : 0;
        const shouldRetry = attempt < config.maxRetries && isRetryableError(statusCode);

        if (!shouldRetry) {
          // Não é retentável, lança o erro imediatamente
          throw error;
        }

        const delay = calculateBackoff(attempt, config);
        console.warn(
          `Qase API request failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${Math.round(delay)}ms...`
        );
        await sleep(delay);
      }
    }

    throw lastError || new Error("Unknown error during Qase API request");
  }

  /**
   * Valida o token fazendo uma requisição para listar projetos.
   *
   * @returns true se o token é válido, false caso contrário
   *
   * @example
   * ```typescript
   * const isValid = await client.validateToken();
   * if (!isValid) {
   *   console.error("Invalid token");
   * }
   * ```
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProjects({ limit: 1 });
      return true;
    } catch (error) {
      if (error instanceof QaseAuthError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Lista todos os projetos disponíveis.
   *
   * @param options - Opções de paginação
   * @returns Lista de projetos
   *
   * @example
   * ```typescript
   * const projects = await client.getProjects({ limit: 10, offset: 0 });
   * console.log(`Found ${projects.total} projects`);
   * ```
   */
  async getProjects(options: { limit?: number; offset?: number } = {}): Promise<QaseProjectList> {
    const { limit = 100, offset = 0 } = options;

    const result = await this.request<unknown>("/project", {
      params: { limit, offset },
    });

    const parsed = QaseProjectListSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid project list response from Qase API", 500);
    }

    return parsed.data;
  }

  /**
   * Obtém detalhes de um projeto específico.
   *
   * @param code - Código do projeto
   * @returns Detalhes do projeto
   */
  async getProject(code: string): Promise<QaseProject> {
    const result = await this.request<unknown>(`/project/${code}`);

    const parsed = QaseProjectSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid project response from Qase API", 500);
    }

    return parsed.data;
  }

  /**
   * Obtém informações da conta atual (útil para validação).
   * Retorna informações básicas sobre a autenticação.
   */
  async getCurrentUser(): Promise<{ email: string; name: string } | null> {
    try {
      // A Qase API não tem um endpoint /me, então usamos projetos
      // para validar o token
      await this.getProjects({ limit: 1 });
      return null; // Token válido mas sem info do usuário
    } catch (error) {
      if (error instanceof QaseAuthError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Lista casos de teste de um projeto.
   *
   * @param projectCode - Código do projeto
   * @param filters - Filtros de busca
   * @returns Lista de casos de teste
   *
   * @see US-006: Obter Casos de Teste
   *
   * @example
   * ```typescript
   * const cases = await client.getTestCases("GV", {
   *   priority: "high",
   *   automation: "automated",
   *   limit: 50
   * });
   * console.log(`Found ${cases.total} test cases`);
   * ```
   */
  async getTestCases(
    projectCode: string,
    filters: QaseTestCasesFilter = {}
  ): Promise<QaseTestCaseList> {
    const {
      search,
      milestoneId,
      suiteId,
      severity,
      priority,
      type,
      behavior,
      automation,
      status,
      limit = 100,
      offset = 0,
    } = filters;

    const params: Record<string, string | number | undefined> = {
      limit,
      offset,
    };

    // Adiciona filtros opcionais
    if (search) params.search = search;
    if (milestoneId !== undefined) params.milestone_id = milestoneId;
    if (suiteId !== undefined) params.suite_id = suiteId;
    if (severity) params.severity = severity;
    if (priority) params.priority = priority;
    if (type) params.type = type;
    if (behavior) params.behavior = behavior;
    if (automation) params.automation = automation;
    if (status) params.status = status;

    const result = await this.request<unknown>(`/case/${projectCode}`, {
      params,
    });

    const parsed = QaseTestCaseListSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid test cases response from Qase API", 500);
    }

    return parsed.data;
  }

  /**
   * Obtém um caso de teste específico.
   *
   * @param projectCode - Código do projeto
   * @param caseId - ID do caso de teste
   * @returns Detalhes do caso de teste
   */
  async getTestCase(projectCode: string, caseId: number): Promise<QaseTestCase> {
    const result = await this.request<unknown>(`/case/${projectCode}/${caseId}`);

    const parsed = QaseTestCaseSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid test case response from Qase API", 500);
    }

    return parsed.data;
  }

  /**
   * Lista test runs de um projeto.
   *
   * @param projectCode - Código do projeto
   * @param filters - Filtros de busca
   * @returns Lista de test runs
   *
   * @see US-007: Obter Execuções de Teste
   *
   * @example
   * ```typescript
   * const runs = await client.getTestRuns("GV", {
   *   status: "complete",
   *   fromStartTime: "2024-01-01",
   *   limit: 50
   * });
   * console.log(`Found ${runs.total} test runs`);
   * ```
   */
  async getTestRuns(
    projectCode: string,
    filters: QaseTestRunsFilter = {}
  ): Promise<QaseTestRunList> {
    const {
      search,
      status,
      milestone,
      environment,
      fromStartTime,
      toStartTime,
      limit = 100,
      offset = 0,
    } = filters;

    const params: Record<string, string | number | undefined> = {
      limit,
      offset,
    };

    // Adiciona filtros opcionais
    if (search) params.search = search;
    if (status) params.status = status;
    if (milestone !== undefined) params.milestone = milestone;
    if (environment !== undefined) params.environment = environment;
    if (fromStartTime) params.from_start_time = fromStartTime;
    if (toStartTime) params.to_start_time = toStartTime;

    const result = await this.request<unknown>(`/run/${projectCode}`, {
      params,
    });

    const parsed = QaseTestRunListSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid test runs response from Qase API", 500);
    }

    return parsed.data;
  }

  /**
   * Obtém um test run específico.
   *
   * @param projectCode - Código do projeto
   * @param runId - ID do test run
   * @returns Detalhes do test run
   *
   * @see US-007: Obter Execuções de Teste
   */
  async getTestRun(projectCode: string, runId: number): Promise<QaseTestRun> {
    const result = await this.request<unknown>(`/run/${projectCode}/${runId}`);

    const parsed = QaseTestRunSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid test run response from Qase API", 500);
    }

    return parsed.data;
  }

  /**
   * Lista resultados de teste de um projeto.
   * Pode ser filtrado por run_id para obter resultados de uma execução específica.
   *
   * @param projectCode - Código do projeto
   * @param filters - Filtros de busca
   * @returns Lista de resultados de teste
   *
   * @see US-008: Obter Resultados Detalhados
   *
   * @example
   * ```typescript
   * const results = await client.getTestResults("GV", {
   *   run: 123,
   *   status: "failed",
   *   limit: 50
   * });
   * console.log(`Found ${results.total} test results`);
   * ```
   */
  async getTestResults(
    projectCode: string,
    filters: QaseTestResultsFilter = {}
  ): Promise<QaseTestResultList> {
    const {
      status,
      run,
      caseId,
      member,
      fromEndTime,
      toEndTime,
      limit = 100,
      offset = 0,
    } = filters;

    const params: Record<string, string | number | undefined> = {
      limit,
      offset,
    };

    // Adiciona filtros opcionais
    if (status) params.status = status;
    if (run !== undefined) params.run = run;
    if (caseId !== undefined) params.case_id = caseId;
    if (member !== undefined) params.member = member;
    if (fromEndTime) params.from_end_time = fromEndTime;
    if (toEndTime) params.to_end_time = toEndTime;

    const result = await this.request<unknown>(`/result/${projectCode}`, {
      params,
    });

    const parsed = QaseTestResultListSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid test results response from Qase API", 500);
    }

    return parsed.data;
  }

  /**
   * Obtém um resultado de teste específico pelo hash.
   *
   * @param projectCode - Código do projeto
   * @param hash - Hash do resultado
   * @returns Detalhes do resultado de teste
   *
   * @see US-008: Obter Resultados Detalhados
   */
  async getTestResult(projectCode: string, hash: string): Promise<QaseTestResult> {
    const result = await this.request<unknown>(`/result/${projectCode}/${hash}`);

    const parsed = QaseTestResultSchema.safeParse(result);
    if (!parsed.success) {
      throw new QaseApiError("Invalid test result response from Qase API", 500);
    }

    return parsed.data;
  }
}

/**
 * Cria uma instância do cliente Qase.
 *
 * @param token - Token de API do Qase
 * @returns Instância do cliente
 */
export function createQaseClient(token: string): QaseClient {
  return new QaseClient(token);
}
