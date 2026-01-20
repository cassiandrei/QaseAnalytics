/**
 * Widget Service
 *
 * Serviço responsável pelo gerenciamento de widgets salvos.
 * Suporta CRUD completo e refresh automático de dados.
 *
 * @see US-026: Salvar Gráfico como Widget
 */

import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/crypto.js";
import { runOrchestrator, type OrchestratorConfig } from "../agents/orchestrator.js";
import { env } from "../lib/env.js";
import type { ChartType } from "@prisma/client";

/** Configuração de gráfico armazenada no widget */
export interface WidgetChartConfig {
  title: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  legend?: boolean;
  data?: unknown[];
}

/** Input para criar um widget */
export interface CreateWidgetInput {
  name: string;
  description?: string;
  query: string;
  chartType: ChartType;
  chartConfig: WidgetChartConfig;
  filters?: Record<string, unknown>;
  refreshInterval?: number; // minutos
  cachedData?: unknown;
}

/** Input para atualizar um widget */
export interface UpdateWidgetInput {
  name?: string;
  description?: string;
  chartConfig?: Partial<WidgetChartConfig>;
  filters?: Record<string, unknown>;
  refreshInterval?: number | null;
}

/** Widget retornado pelo serviço */
export interface Widget {
  id: string;
  name: string;
  description: string | null;
  query: string;
  chartType: ChartType;
  chartConfig: WidgetChartConfig;
  filters: Record<string, unknown> | null;
  cachedData: unknown;
  cachedAt: Date | null;
  refreshInterval: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Resultado de listagem de widgets */
export interface ListWidgetsResult {
  widgets: Widget[];
  total: number;
}

/** Intervalos de refresh suportados (em minutos) */
export const SUPPORTED_REFRESH_INTERVALS = [
  15,    // 15 minutos
  30,    // 30 minutos
  60,    // 1 hora
  360,   // 6 horas
  1440,  // 24 horas (diário)
] as const;

export type RefreshInterval = typeof SUPPORTED_REFRESH_INTERVALS[number];

/**
 * Erro de widget personalizado
 */
export class WidgetError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "WidgetError";
  }
}

/**
 * Valida se o intervalo de refresh é suportado.
 */
export function isValidRefreshInterval(interval: number): interval is RefreshInterval {
  return SUPPORTED_REFRESH_INTERVALS.includes(interval as RefreshInterval);
}

/**
 * Obtém o token do Qase para um usuário.
 */
async function getQaseTokenForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { qaseApiToken: true, qaseTokenValid: true },
  });

  if (user?.qaseApiToken && user.qaseTokenValid) {
    try {
      return decrypt(user.qaseApiToken);
    } catch {
      // Fall through to env token
    }
  }

  // In development, fall back to QASE_API_TOKEN environment variable
  if (process.env.NODE_ENV !== "production" && env.QASE_API_TOKEN) {
    return env.QASE_API_TOKEN;
  }

  return null;
}

/**
 * Cria um novo widget.
 *
 * @param userId - ID do usuário proprietário
 * @param input - Dados do widget
 * @returns Widget criado
 *
 * @example
 * ```typescript
 * const widget = await createWidget("user-123", {
 *   name: "Taxa de Falha Mensal",
 *   query: "Qual a taxa de falha do projeto GV?",
 *   chartType: "LINE",
 *   chartConfig: { title: "Failure Rate" },
 *   refreshInterval: 60
 * });
 * ```
 */
export async function createWidget(
  userId: string,
  input: CreateWidgetInput
): Promise<Widget> {
  // Valida intervalo de refresh se fornecido
  if (input.refreshInterval !== undefined && !isValidRefreshInterval(input.refreshInterval)) {
    throw new WidgetError(
      `Invalid refresh interval. Supported values: ${SUPPORTED_REFRESH_INTERVALS.join(", ")} minutes`,
      "INVALID_REFRESH_INTERVAL"
    );
  }

  const widget = await prisma.widget.create({
    data: {
      name: input.name,
      description: input.description,
      query: input.query,
      chartType: input.chartType,
      chartConfig: input.chartConfig as object,
      filters: input.filters as object | undefined,
      refreshInterval: input.refreshInterval,
      cachedData: input.cachedData as object | undefined,
      cachedAt: input.cachedData ? new Date() : null,
      userId,
    },
  });

  return formatWidget(widget);
}

/**
 * Lista todos os widgets de um usuário.
 *
 * @param userId - ID do usuário
 * @returns Lista de widgets
 */
export async function getWidgets(userId: string): Promise<ListWidgetsResult> {
  const [widgets, total] = await Promise.all([
    prisma.widget.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.widget.count({ where: { userId } }),
  ]);

  return {
    widgets: widgets.map(formatWidget),
    total,
  };
}

/**
 * Obtém um widget específico por ID.
 * Verifica se o widget pertence ao usuário.
 *
 * @param userId - ID do usuário
 * @param widgetId - ID do widget
 * @returns Widget ou null se não encontrado
 */
export async function getWidgetById(
  userId: string,
  widgetId: string
): Promise<Widget | null> {
  const widget = await prisma.widget.findFirst({
    where: {
      id: widgetId,
      userId,
    },
  });

  if (!widget) {
    return null;
  }

  return formatWidget(widget);
}

/**
 * Atualiza um widget existente.
 *
 * @param userId - ID do usuário
 * @param widgetId - ID do widget
 * @param input - Dados para atualizar
 * @returns Widget atualizado
 * @throws WidgetError se widget não encontrado ou não pertence ao usuário
 */
export async function updateWidget(
  userId: string,
  widgetId: string,
  input: UpdateWidgetInput
): Promise<Widget> {
  // Verifica se widget existe e pertence ao usuário
  const existing = await prisma.widget.findFirst({
    where: {
      id: widgetId,
      userId,
    },
  });

  if (!existing) {
    throw new WidgetError("Widget not found", "WIDGET_NOT_FOUND");
  }

  // Valida intervalo de refresh se fornecido
  if (input.refreshInterval !== undefined && input.refreshInterval !== null) {
    if (!isValidRefreshInterval(input.refreshInterval)) {
      throw new WidgetError(
        `Invalid refresh interval. Supported values: ${SUPPORTED_REFRESH_INTERVALS.join(", ")} minutes`,
        "INVALID_REFRESH_INTERVAL"
      );
    }
  }

  const widget = await prisma.widget.update({
    where: { id: widgetId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.chartConfig !== undefined && {
        chartConfig: { ...existing.chartConfig as object, ...input.chartConfig } as object,
      }),
      ...(input.filters !== undefined && { filters: input.filters as object }),
      ...(input.refreshInterval !== undefined && { refreshInterval: input.refreshInterval }),
    },
  });

  return formatWidget(widget);
}

/**
 * Exclui um widget.
 *
 * @param userId - ID do usuário
 * @param widgetId - ID do widget
 * @throws WidgetError se widget não encontrado ou não pertence ao usuário
 */
export async function deleteWidget(userId: string, widgetId: string): Promise<void> {
  // Verifica se widget existe e pertence ao usuário
  const existing = await prisma.widget.findFirst({
    where: {
      id: widgetId,
      userId,
    },
  });

  if (!existing) {
    throw new WidgetError("Widget not found", "WIDGET_NOT_FOUND");
  }

  await prisma.widget.delete({
    where: { id: widgetId },
  });
}

/**
 * Atualiza os dados do widget re-executando a query original.
 * Usado para refresh automático ou manual.
 *
 * @param widgetId - ID do widget
 * @returns Widget com dados atualizados
 * @throws WidgetError se o refresh falhar
 *
 * @example
 * ```typescript
 * const refreshed = await refreshWidgetData("widget-123");
 * console.log("Last updated:", refreshed.cachedAt);
 * ```
 */
export async function refreshWidgetData(widgetId: string): Promise<Widget> {
  // Busca widget com dados do usuário
  const widget = await prisma.widget.findUnique({
    where: { id: widgetId },
    include: {
      user: {
        select: {
          id: true,
          qaseApiToken: true,
          qaseTokenValid: true,
        },
      },
    },
  });

  if (!widget) {
    throw new WidgetError("Widget not found", "WIDGET_NOT_FOUND");
  }

  // Obtém token do Qase
  const qaseToken = await getQaseTokenForUser(widget.userId);
  if (!qaseToken) {
    throw new WidgetError(
      "User Qase token not available for refresh",
      "QASE_TOKEN_UNAVAILABLE"
    );
  }

  if (!env.OPENAI_API_KEY) {
    throw new WidgetError(
      "OpenAI API key not configured",
      "OPENAI_KEY_UNAVAILABLE"
    );
  }

  try {
    // Re-executa a query original via orchestrator
    const config: OrchestratorConfig = {
      openAIApiKey: env.OPENAI_API_KEY,
      qaseToken,
      userId: widget.userId,
      // Extrai o projeto dos filtros se disponível
      projectCode: (widget.filters as Record<string, unknown>)?.projectCode as string | undefined,
    };

    const result = await runOrchestrator(config, widget.query);

    // Extrai dados do chart da resposta
    // A resposta pode conter um JSON com dados do chart
    const chartData = extractChartDataFromResponse(result.response);

    // Atualiza o widget com novos dados
    const updated = await prisma.widget.update({
      where: { id: widgetId },
      data: {
        cachedData: chartData as object | undefined,
        cachedAt: new Date(),
      },
    });

    console.log(`[WidgetService] Refreshed widget ${widgetId} successfully`);

    return formatWidget(updated);
  } catch (error) {
    console.error(`[WidgetService] Failed to refresh widget ${widgetId}:`, error);

    // Não atualiza dados se falhar, mantém os antigos
    throw new WidgetError(
      `Failed to refresh widget data: ${error instanceof Error ? error.message : "Unknown error"}`,
      "REFRESH_FAILED"
    );
  }
}

/**
 * Obtém widgets que precisam de refresh.
 * Usado pelo job de refresh automático.
 *
 * @returns Lista de widgets que precisam ser atualizados
 */
export async function getWidgetsNeedingRefresh(): Promise<Widget[]> {
  const now = new Date();

  // Busca widgets com refresh configurado
  const widgets = await prisma.widget.findMany({
    where: {
      refreshInterval: { not: null },
    },
  });

  // Filtra widgets que precisam de refresh
  const needsRefresh = widgets.filter((widget) => {
    if (!widget.refreshInterval) return false;

    // Se nunca foi atualizado, precisa de refresh
    if (!widget.cachedAt) return true;

    // Calcula tempo desde última atualização
    const lastUpdate = new Date(widget.cachedAt);
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    // Retorna true se passou o intervalo
    return minutesSinceUpdate >= widget.refreshInterval;
  });

  return needsRefresh.map(formatWidget);
}

/**
 * Extrai dados de gráfico de uma resposta do agente.
 * Procura por JSON embutido na resposta.
 */
function extractChartDataFromResponse(response: string): unknown {
  // Procura por bloco JSON na resposta
  const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.data || parsed.chartData) {
        return parsed.data ?? parsed.chartData;
      }
      return parsed;
    } catch {
      // Não é JSON válido
    }
  }

  // Procura por tag CHART_DATA na resposta
  const chartDataMatch = response.match(/CHART_DATA:\s*(\{[\s\S]*?\})/);
  if (chartDataMatch && chartDataMatch[1]) {
    try {
      return JSON.parse(chartDataMatch[1]);
    } catch {
      // Não é JSON válido
    }
  }

  // Retorna null se não encontrou dados estruturados
  return null;
}

/**
 * Formata um widget do Prisma para o formato de retorno.
 */
function formatWidget(widget: {
  id: string;
  name: string;
  description: string | null;
  query: string;
  chartType: ChartType;
  chartConfig: unknown;
  filters: unknown;
  cachedData: unknown;
  cachedAt: Date | null;
  refreshInterval: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}): Widget {
  return {
    id: widget.id,
    name: widget.name,
    description: widget.description,
    query: widget.query,
    chartType: widget.chartType,
    chartConfig: widget.chartConfig as WidgetChartConfig,
    filters: widget.filters as Record<string, unknown> | null,
    cachedData: widget.cachedData,
    cachedAt: widget.cachedAt,
    refreshInterval: widget.refreshInterval,
    userId: widget.userId,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
  };
}
