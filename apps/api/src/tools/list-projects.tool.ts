/**
 * LangChain Tool: List Projects
 *
 * Tool para listar projetos do Qase.io através do LangChain Agent.
 * Permite que o assistente de IA liste e busque projetos disponíveis.
 *
 * @see US-005: Listar Projetos do Qase
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { QaseClient, QaseAuthError, QaseApiError, type QaseProjectList } from "../lib/qase-client.js";
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from "../lib/redis.js";

/** Schema de input para a tool */
const ListProjectsInputSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(100)
    .describe("Maximum number of projects to return (1-100, default: 100)"),
  offset: z
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of projects to skip for pagination (default: 0)"),
});

/** Tipo de entrada para a função listProjectsWithCache (limit e offset são opcionais) */
export type ListProjectsInput = {
  limit?: number;
  offset?: number;
};

/** Resultado formatado para o agent */
export interface ListProjectsResult {
  success: boolean;
  total: number;
  count: number;
  projects: Array<{
    code: string;
    title: string;
    description: string | null;
    casesCount?: number;
    suitesCount?: number;
  }>;
  error?: string;
  cached?: boolean;
}

/**
 * Lista projetos do Qase com suporte a cache.
 *
 * @param token - Token da API do Qase
 * @param userId - ID do usuário para cache
 * @param input - Parâmetros de entrada
 * @returns Lista de projetos formatada
 */
export async function listProjectsWithCache(
  token: string,
  userId: string,
  input: ListProjectsInput
): Promise<ListProjectsResult> {
  const { limit = 100, offset = 0 } = input;

  // Tenta obter do cache primeiro (apenas para offset 0 e limit padrão)
  const cacheKey = CACHE_KEYS.projectList(userId);
  if (offset === 0 && limit === 100) {
    const cached = await cacheGet<QaseProjectList>(cacheKey);
    if (cached) {
      return formatProjectList(cached, true);
    }
  }

  try {
    const client = new QaseClient(token);
    const projects = await client.getProjects({ limit, offset });

    // Armazena no cache se for a primeira página
    if (offset === 0 && limit === 100) {
      await cacheSet(cacheKey, projects, CACHE_TTL.PROJECTS);
    }

    return formatProjectList(projects, false);
  } catch (error) {
    if (error instanceof QaseAuthError) {
      return {
        success: false,
        total: 0,
        count: 0,
        projects: [],
        error: "Invalid or expired Qase API token. Please reconnect.",
      };
    }

    if (error instanceof QaseApiError) {
      return {
        success: false,
        total: 0,
        count: 0,
        projects: [],
        error: `Qase API error: ${error.message}`,
      };
    }

    console.error("Error listing projects:", error);
    return {
      success: false,
      total: 0,
      count: 0,
      projects: [],
      error: "Failed to list projects. Please try again.",
    };
  }
}

/**
 * Formata a lista de projetos para o agent.
 */
function formatProjectList(projectList: QaseProjectList, cached: boolean): ListProjectsResult {
  return {
    success: true,
    total: projectList.total,
    count: projectList.entities.length,
    projects: projectList.entities.map((p) => ({
      code: p.code,
      title: p.title,
      description: p.description ?? null,
      casesCount: p.counts?.cases,
      suitesCount: p.counts?.suites,
    })),
    cached,
  };
}

/**
 * Cria a LangChain tool para listar projetos.
 *
 * @param getToken - Função para obter o token do Qase
 * @param getUserId - Função para obter o ID do usuário
 * @returns LangChain DynamicStructuredTool
 *
 * @example
 * ```typescript
 * const listProjectsTool = createListProjectsTool(
 *   () => userToken,
 *   () => userId
 * );
 * ```
 */
export function createListProjectsTool(
  getToken: () => string | Promise<string>,
  getUserId: () => string | Promise<string>
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "list_projects",
    description: `Lists all projects available in the Qase.io account.
Returns project code, name, description, and counts.
Use this tool when the user asks about available projects or wants to select a project.
Supports pagination with limit and offset parameters.
Results are cached for 5 minutes for better performance.`,
    schema: ListProjectsInputSchema,
    func: async (input: ListProjectsInput): Promise<string> => {
      const token = await getToken();
      const userId = await getUserId();
      const result = await listProjectsWithCache(token, userId, input);
      return JSON.stringify(result, null, 2);
    },
  });
}

/**
 * Cria a LangChain tool para listar projetos com token e userId fixos.
 * Versão simplificada para uso direto.
 *
 * @param token - Token da API do Qase
 * @param userId - ID do usuário
 * @returns LangChain DynamicStructuredTool
 */
export function createListProjectsToolWithContext(
  token: string,
  userId: string
): DynamicStructuredTool {
  return createListProjectsTool(
    () => token,
    () => userId
  );
}
