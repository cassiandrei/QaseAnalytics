/**
 * Qase Service
 *
 * Serviço de integração com Qase.io.
 * Gerencia conexão, validação de tokens e operações com projetos.
 *
 * @see US-004: Conexão com Qase API
 * @see US-005: Listar Projetos do Qase
 */

import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt, maskToken } from "../lib/crypto.js";
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL, CACHE_KEYS } from "../lib/redis.js";
import {
  QaseClient,
  QaseAuthError,
  QaseApiError,
  type QaseProject,
  type QaseProjectList,
  type QaseTestCase,
  type QaseTestCaseList,
  type QaseTestCasesFilter,
  type QaseTestRun,
  type QaseTestRunList,
  type QaseTestRunsFilter,
  type QaseTestResult,
  type QaseTestResultList,
  type QaseTestResultsFilter,
} from "../lib/qase-client.js";
import { createHash } from "crypto";

/** Resultado de conexão com Qase */
export interface QaseConnectionResult {
  success: boolean;
  message: string;
  projects?: QaseProject[];
  maskedToken?: string;
}

/** Resultado de validação de token */
export interface QaseTokenValidation {
  valid: boolean;
  message: string;
  projectCount?: number;
}

/**
 * Valida um token da Qase API.
 *
 * @param token - Token a ser validado
 * @returns Resultado da validação com número de projetos se válido
 *
 * @example
 * ```typescript
 * const result = await validateQaseToken("qase_token");
 * if (result.valid) {
 *   console.log(`Token valid, ${result.projectCount} projects found`);
 * }
 * ```
 */
export async function validateQaseToken(token: string): Promise<QaseTokenValidation> {
  if (!token || token.trim().length === 0) {
    return {
      valid: false,
      message: "Token is required",
    };
  }

  try {
    const client = new QaseClient(token);
    const projects = await client.getProjects({ limit: 1 });

    return {
      valid: true,
      message: "Token is valid",
      projectCount: projects.total,
    };
  } catch (error) {
    if (error instanceof QaseAuthError) {
      return {
        valid: false,
        message: "Invalid or expired token",
      };
    }

    if (error instanceof QaseApiError) {
      return {
        valid: false,
        message: `Qase API error: ${error.message}`,
      };
    }

    console.error("Error validating Qase token:", error);
    return {
      valid: false,
      message: "Failed to validate token. Please try again.",
    };
  }
}

/**
 * Conecta um usuário ao Qase.io salvando o token de forma segura.
 *
 * @param userId - ID do usuário
 * @param token - Token da API do Qase
 * @returns Resultado da conexão com lista de projetos
 *
 * @example
 * ```typescript
 * const result = await connectQase("user123", "qase_token");
 * if (result.success) {
 *   console.log(`Connected! ${result.projects?.length} projects available`);
 * }
 * ```
 */
export async function connectQase(userId: string, token: string): Promise<QaseConnectionResult> {
  // Validar o token primeiro
  const validation = await validateQaseToken(token);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.message,
    };
  }

  try {
    // Buscar projetos para retornar ao usuário
    const client = new QaseClient(token);
    const projectList = await client.getProjects();

    // Encriptar e salvar o token
    const encryptedToken = encrypt(token);

    await prisma.user.update({
      where: { id: userId },
      data: {
        qaseApiToken: encryptedToken,
        qaseTokenValid: true,
      },
    });

    return {
      success: true,
      message: `Successfully connected to Qase.io. Found ${projectList.total} projects.`,
      projects: projectList.entities,
      maskedToken: maskToken(token),
    };
  } catch (error) {
    console.error("Error connecting to Qase:", error);

    if (error instanceof QaseApiError) {
      return {
        success: false,
        message: `Qase API error: ${error.message}`,
      };
    }

    return {
      success: false,
      message: "Failed to connect to Qase. Please try again.",
    };
  }
}

/**
 * Desconecta um usuário do Qase.io removendo o token.
 * Também invalida o cache de projetos.
 *
 * @param userId - ID do usuário
 * @returns true se desconectou com sucesso
 */
export async function disconnectQase(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        qaseApiToken: null,
        qaseTokenValid: false,
      },
    });

    // Invalida cache de projetos
    await cacheDelete(CACHE_KEYS.projectList(userId));

    return true;
  } catch (error) {
    console.error("Error disconnecting from Qase:", error);
    return false;
  }
}

/**
 * Verifica se um usuário está conectado ao Qase.
 *
 * @param userId - ID do usuário
 * @returns Status da conexão
 */
export async function getQaseConnectionStatus(
  userId: string
): Promise<{ connected: boolean; maskedToken?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { qaseApiToken: true, qaseTokenValid: true },
  });

  if (!user || !user.qaseApiToken || !user.qaseTokenValid) {
    return { connected: false };
  }

  try {
    const token = decrypt(user.qaseApiToken);
    return {
      connected: true,
      maskedToken: maskToken(token),
    };
  } catch {
    // Token não pode ser decriptado, considerar como desconectado
    return { connected: false };
  }
}

/**
 * Obtém o cliente Qase para um usuário.
 * Retorna null se o usuário não estiver conectado.
 *
 * @param userId - ID do usuário
 * @returns Cliente Qase ou null
 */
export async function getQaseClientForUser(userId: string): Promise<QaseClient | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { qaseApiToken: true, qaseTokenValid: true },
  });

  if (!user || !user.qaseApiToken || !user.qaseTokenValid) {
    return null;
  }

  try {
    const token = decrypt(user.qaseApiToken);
    return new QaseClient(token);
  } catch {
    return null;
  }
}

/**
 * Lista projetos do Qase para um usuário conectado.
 * Utiliza cache de 5 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param options - Opções de paginação e cache
 * @returns Lista de projetos ou null se não conectado
 *
 * @see US-005: Listar Projetos do Qase
 */
export async function listQaseProjects(
  userId: string,
  options: { limit?: number; offset?: number; skipCache?: boolean } = {}
): Promise<QaseProjectList | null> {
  const { limit = 100, offset = 0, skipCache = false } = options;

  // Tenta obter do cache primeiro (apenas para offset 0 e limit padrão)
  const cacheKey = CACHE_KEYS.projectList(userId);
  if (!skipCache && offset === 0 && limit === 100) {
    const cached = await cacheGet<QaseProjectList>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const projects = await client.getProjects({ limit, offset });

  // Armazena no cache se for a primeira página
  if (offset === 0 && limit === 100) {
    await cacheSet(cacheKey, projects, CACHE_TTL.PROJECTS);
  }

  return projects;
}

/**
 * Obtém detalhes de um projeto específico.
 * Utiliza cache de 5 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 * @param options - Opções de cache
 * @returns Detalhes do projeto ou null
 *
 * @see US-005: Listar Projetos do Qase
 */
export async function getQaseProject(
  userId: string,
  projectCode: string,
  options: { skipCache?: boolean } = {}
): Promise<QaseProject | null> {
  const { skipCache = false } = options;

  // Tenta obter do cache primeiro
  const cacheKey = CACHE_KEYS.project(userId, projectCode);
  if (!skipCache) {
    const cached = await cacheGet<QaseProject>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const project = await client.getProject(projectCode);

  // Armazena no cache
  await cacheSet(cacheKey, project, CACHE_TTL.PROJECTS);

  return project;
}

/**
 * Invalida o cache de projetos de um usuário.
 * Útil após operações que modificam projetos no Qase.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto (opcional, invalida apenas este projeto)
 */
export async function invalidateProjectsCache(
  userId: string,
  projectCode?: string
): Promise<void> {
  if (projectCode) {
    await cacheDelete(CACHE_KEYS.project(userId, projectCode));
  } else {
    await cacheDelete(CACHE_KEYS.projectList(userId));
  }
}

/**
 * Revalida o token do Qase de um usuário.
 * Útil para verificar se o token ainda é válido após algum tempo.
 *
 * @param userId - ID do usuário
 * @returns Resultado da validação
 */
export async function revalidateQaseToken(userId: string): Promise<QaseTokenValidation> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { qaseApiToken: true },
  });

  if (!user || !user.qaseApiToken) {
    return {
      valid: false,
      message: "No token configured",
    };
  }

  try {
    const token = decrypt(user.qaseApiToken);
    const validation = await validateQaseToken(token);

    // Atualiza o status no banco
    await prisma.user.update({
      where: { id: userId },
      data: { qaseTokenValid: validation.valid },
    });

    return validation;
  } catch {
    // Falha ao decriptar, token inválido
    await prisma.user.update({
      where: { id: userId },
      data: { qaseTokenValid: false },
    });

    return {
      valid: false,
      message: "Token could not be decrypted",
    };
  }
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
 * Lista casos de teste de um projeto do Qase.
 * Utiliza cache de 2 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 * @param filters - Filtros de busca
 * @returns Lista de casos de teste ou null se não conectado
 *
 * @see US-006: Obter Casos de Teste
 */
export async function listQaseTestCases(
  userId: string,
  projectCode: string,
  filters: QaseTestCasesFilter = {}
): Promise<QaseTestCaseList | null> {
  const { limit = 100, offset = 0, ...otherFilters } = filters;

  // Gera hash para cache key
  const filterHash = generateFilterHash({ limit, offset, ...otherFilters });
  const cacheKey = CACHE_KEYS.testCaseList(userId, projectCode, filterHash);

  // Tenta obter do cache primeiro
  const cached = await cacheGet<QaseTestCaseList>(cacheKey);
  if (cached) {
    return cached;
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const testCases = await client.getTestCases(projectCode, { limit, offset, ...otherFilters });

  // Armazena no cache (2 minutos)
  await cacheSet(cacheKey, testCases, CACHE_TTL.TEST_CASES);

  return testCases;
}

/**
 * Obtém detalhes de um caso de teste específico.
 * Utiliza cache de 2 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 * @param caseId - ID do caso de teste
 * @param options - Opções de cache
 * @returns Detalhes do caso de teste ou null
 *
 * @see US-006: Obter Casos de Teste
 */
export async function getQaseTestCase(
  userId: string,
  projectCode: string,
  caseId: number,
  options: { skipCache?: boolean } = {}
): Promise<QaseTestCase | null> {
  const { skipCache = false } = options;

  // Tenta obter do cache primeiro
  const cacheKey = CACHE_KEYS.testCase(userId, projectCode, caseId);
  if (!skipCache) {
    const cached = await cacheGet<QaseTestCase>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const testCase = await client.getTestCase(projectCode, caseId);

  // Armazena no cache (2 minutos)
  await cacheSet(cacheKey, testCase, CACHE_TTL.TEST_CASES);

  return testCase;
}

/**
 * Invalida o cache de casos de teste de um usuário.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 */
export async function invalidateTestCasesCache(
  userId: string,
  projectCode: string
): Promise<void> {
  // Remove todas as chaves com o padrão qase:cases:userId:projectCode:*
  const pattern = `qase:cases:${userId}:${projectCode}:*`;
  const redis = await import("../lib/redis.js");
  await redis.cacheDeletePattern(pattern);
}

/**
 * Gera um hash para os filtros de test runs (para cache key).
 */
function generateTestRunsFilterHash(filters: QaseTestRunsFilter): string {
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce(
      (acc, key) => {
        const value = filters[key as keyof QaseTestRunsFilter];
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
 * Lista test runs de um projeto do Qase.
 * Utiliza cache de 2 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 * @param filters - Filtros de busca
 * @returns Lista de test runs ou null se não conectado
 *
 * @see US-007: Obter Execuções de Teste
 */
export async function listQaseTestRuns(
  userId: string,
  projectCode: string,
  filters: QaseTestRunsFilter = {}
): Promise<QaseTestRunList | null> {
  const { limit = 100, offset = 0, ...otherFilters } = filters;

  // Gera hash para cache key
  const filterHash = generateTestRunsFilterHash({ limit, offset, ...otherFilters });
  const cacheKey = CACHE_KEYS.testRunList(userId, projectCode, filterHash);

  // Tenta obter do cache primeiro
  const cached = await cacheGet<QaseTestRunList>(cacheKey);
  if (cached) {
    return cached;
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const testRuns = await client.getTestRuns(projectCode, { limit, offset, ...otherFilters });

  // Armazena no cache (2 minutos)
  await cacheSet(cacheKey, testRuns, CACHE_TTL.TEST_RUNS);

  return testRuns;
}

/**
 * Obtém detalhes de um test run específico.
 * Utiliza cache de 2 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 * @param runId - ID do test run
 * @param options - Opções de cache
 * @returns Detalhes do test run ou null
 *
 * @see US-007: Obter Execuções de Teste
 */
export async function getQaseTestRun(
  userId: string,
  projectCode: string,
  runId: number,
  options: { skipCache?: boolean } = {}
): Promise<QaseTestRun | null> {
  const { skipCache = false } = options;

  // Tenta obter do cache primeiro
  const cacheKey = CACHE_KEYS.testRun(userId, projectCode, runId);
  if (!skipCache) {
    const cached = await cacheGet<QaseTestRun>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const testRun = await client.getTestRun(projectCode, runId);

  // Armazena no cache (2 minutos)
  await cacheSet(cacheKey, testRun, CACHE_TTL.TEST_RUNS);

  return testRun;
}

/**
 * Invalida o cache de test runs de um usuário.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 */
export async function invalidateTestRunsCache(
  userId: string,
  projectCode: string
): Promise<void> {
  // Remove todas as chaves com o padrão qase:runs:userId:projectCode:*
  const pattern = `qase:runs:${userId}:${projectCode}:*`;
  const redis = await import("../lib/redis.js");
  await redis.cacheDeletePattern(pattern);
}

/**
 * Gera um hash para os filtros de test results (para cache key).
 */
function generateTestResultsFilterHash(filters: QaseTestResultsFilter): string {
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce(
      (acc, key) => {
        const value = filters[key as keyof QaseTestResultsFilter];
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
 * Lista resultados de teste de um projeto do Qase.
 * Pode ser filtrado por run_id para obter resultados de uma execução específica.
 * Utiliza cache de 5 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 * @param filters - Filtros de busca (run, status, caseId, etc.)
 * @returns Lista de resultados de teste ou null se não conectado
 *
 * @see US-008: Obter Resultados Detalhados
 *
 * @example
 * ```typescript
 * // Buscar todos os resultados de um test run
 * const results = await listQaseTestResults("user123", "GV", { run: 45 });
 *
 * // Buscar apenas resultados com falha
 * const failed = await listQaseTestResults("user123", "GV", {
 *   run: 45,
 *   status: "failed"
 * });
 * ```
 */
export async function listQaseTestResults(
  userId: string,
  projectCode: string,
  filters: QaseTestResultsFilter = {}
): Promise<QaseTestResultList | null> {
  const { limit = 100, offset = 0, ...otherFilters } = filters;

  // Gera hash para cache key
  const filterHash = generateTestResultsFilterHash({ limit, offset, ...otherFilters });
  const runId = filters.run ?? 0;
  const cacheKey = CACHE_KEYS.testResultList(userId, projectCode, runId, filterHash);

  // Tenta obter do cache primeiro
  const cached = await cacheGet<QaseTestResultList>(cacheKey);
  if (cached) {
    return cached;
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const testResults = await client.getTestResults(projectCode, { limit, offset, ...otherFilters });

  // Armazena no cache (5 minutos - US-008)
  await cacheSet(cacheKey, testResults, CACHE_TTL.RESULTS);

  return testResults;
}

/**
 * Obtém detalhes de um resultado de teste específico pelo hash.
 * Utiliza cache de 5 minutos para melhor performance.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 * @param hash - Hash do resultado
 * @param options - Opções de cache
 * @returns Detalhes do resultado de teste ou null
 *
 * @see US-008: Obter Resultados Detalhados
 */
export async function getQaseTestResult(
  userId: string,
  projectCode: string,
  hash: string,
  options: { skipCache?: boolean } = {}
): Promise<QaseTestResult | null> {
  const { skipCache = false } = options;

  // Tenta obter do cache primeiro
  const cacheKey = CACHE_KEYS.testResult(userId, projectCode, hash);
  if (!skipCache) {
    const cached = await cacheGet<QaseTestResult>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const client = await getQaseClientForUser(userId);
  if (!client) {
    return null;
  }

  const testResult = await client.getTestResult(projectCode, hash);

  // Armazena no cache (5 minutos - US-008)
  await cacheSet(cacheKey, testResult, CACHE_TTL.RESULTS);

  return testResult;
}

/**
 * Invalida o cache de resultados de teste de um usuário.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto
 */
export async function invalidateTestResultsCache(
  userId: string,
  projectCode: string
): Promise<void> {
  // Remove todas as chaves com o padrão qase:results:userId:projectCode:*
  const pattern = `qase:results:${userId}:${projectCode}:*`;
  const redis = await import("../lib/redis.js");
  await redis.cacheDeletePattern(pattern);
}
