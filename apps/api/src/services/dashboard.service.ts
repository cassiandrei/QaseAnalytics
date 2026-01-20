/**
 * Dashboard Service
 *
 * Serviço responsável pelo gerenciamento de dashboards.
 * Suporta CRUD completo para dashboards personalizados.
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { prisma } from "../lib/prisma.js";

/** Limite padrão de dashboards por usuário */
export const DEFAULT_DASHBOARD_LIMIT = 10;

/** Configuração de limite de dashboards (pode ser ajustado por tier no futuro) */
const DASHBOARD_LIMITS: Record<string, number> = {
  FREE: 5,
  PRO: 20,
  ENTERPRISE: 100,
  BYOK: 50,
};

/** Layout de um widget no dashboard (react-grid-layout format) */
export interface DashboardLayoutItem {
  i: string; // Widget ID
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

/** Filtros globais do dashboard */
export interface GlobalFilters {
  projectCode?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  environment?: string;
}

/** Input para criar um dashboard */
export interface CreateDashboardInput {
  name: string;
  description?: string;
}

/** Input para atualizar um dashboard */
export interface UpdateDashboardInput {
  name?: string;
  description?: string | null;
  layout?: DashboardLayoutItem[];
  globalFilters?: GlobalFilters | null;
  isPublic?: boolean;
}

/** Dashboard retornado pelo serviço */
export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  layout: DashboardLayoutItem[];
  globalFilters: GlobalFilters | null;
  isPublic: boolean;
  shareToken: string | null;
  shareExpiresAt: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  widgetCount: number;
}

/** Dashboard com widgets incluídos */
export interface DashboardWithWidgets extends Dashboard {
  widgets: {
    id: string;
    widgetId: string;
    position: DashboardLayoutItem | null;
    widget: {
      id: string;
      name: string;
      description: string | null;
      chartType: string;
      chartConfig: unknown;
      cachedData: unknown;
      cachedAt: Date | null;
    };
  }[];
}

/** Resultado de listagem de dashboards */
export interface ListDashboardsResult {
  dashboards: Dashboard[];
  total: number;
}

/**
 * Erro de dashboard personalizado
 */
export class DashboardError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "DashboardError";
  }
}

/**
 * Obtém o limite de dashboards para um usuário baseado no tier.
 *
 * @param userId - ID do usuário
 * @returns Limite de dashboards permitido
 */
async function getDashboardLimit(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  if (!user) {
    return DEFAULT_DASHBOARD_LIMIT;
  }

  return DASHBOARD_LIMITS[user.tier] ?? DEFAULT_DASHBOARD_LIMIT;
}

/**
 * Verifica se o usuário pode criar mais dashboards.
 *
 * @param userId - ID do usuário
 * @returns True se pode criar, false caso contrário
 */
async function canCreateDashboard(userId: string): Promise<boolean> {
  const [count, limit] = await Promise.all([
    prisma.dashboard.count({ where: { userId } }),
    getDashboardLimit(userId),
  ]);

  return count < limit;
}

/**
 * Cria um novo dashboard vazio.
 *
 * @param userId - ID do usuário proprietário
 * @param input - Dados do dashboard
 * @returns Dashboard criado
 * @throws DashboardError se limite de dashboards atingido
 *
 * @example
 * ```typescript
 * const dashboard = await createDashboard("user-123", {
 *   name: "Sprint Dashboard",
 *   description: "Métricas do sprint atual"
 * });
 * ```
 */
export async function createDashboard(
  userId: string,
  input: CreateDashboardInput
): Promise<Dashboard> {
  // Verifica limite de dashboards
  const canCreate = await canCreateDashboard(userId);
  if (!canCreate) {
    const limit = await getDashboardLimit(userId);
    throw new DashboardError(
      `Dashboard limit reached (${limit}). Upgrade your plan to create more dashboards.`,
      "DASHBOARD_LIMIT_REACHED"
    );
  }

  const dashboard = await prisma.dashboard.create({
    data: {
      name: input.name,
      description: input.description,
      layout: [],
      userId,
    },
    include: {
      _count: {
        select: { widgets: true },
      },
    },
  });

  return formatDashboard(dashboard);
}

/**
 * Lista todos os dashboards de um usuário.
 *
 * @param userId - ID do usuário
 * @returns Lista de dashboards
 */
export async function getDashboards(userId: string): Promise<ListDashboardsResult> {
  const [dashboards, total] = await Promise.all([
    prisma.dashboard.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { widgets: true },
        },
      },
    }),
    prisma.dashboard.count({ where: { userId } }),
  ]);

  return {
    dashboards: dashboards.map(formatDashboard),
    total,
  };
}

/**
 * Obtém um dashboard específico por ID.
 * Verifica se o dashboard pertence ao usuário.
 *
 * @param userId - ID do usuário
 * @param dashboardId - ID do dashboard
 * @returns Dashboard ou null se não encontrado
 */
export async function getDashboardById(
  userId: string,
  dashboardId: string
): Promise<Dashboard | null> {
  const dashboard = await prisma.dashboard.findFirst({
    where: {
      id: dashboardId,
      userId,
    },
    include: {
      _count: {
        select: { widgets: true },
      },
    },
  });

  if (!dashboard) {
    return null;
  }

  return formatDashboard(dashboard);
}

/**
 * Obtém um dashboard com todos os seus widgets.
 *
 * @param userId - ID do usuário
 * @param dashboardId - ID do dashboard
 * @returns Dashboard com widgets ou null se não encontrado
 */
export async function getDashboardWithWidgets(
  userId: string,
  dashboardId: string
): Promise<DashboardWithWidgets | null> {
  const dashboard = await prisma.dashboard.findFirst({
    where: {
      id: dashboardId,
      userId,
    },
    include: {
      _count: {
        select: { widgets: true },
      },
      widgets: {
        include: {
          widget: {
            select: {
              id: true,
              name: true,
              description: true,
              chartType: true,
              chartConfig: true,
              cachedData: true,
              cachedAt: true,
            },
          },
        },
      },
    },
  });

  if (!dashboard) {
    return null;
  }

  const base = formatDashboard(dashboard);

  return {
    ...base,
    widgets: dashboard.widgets.map((dw) => ({
      id: dw.id,
      widgetId: dw.widgetId,
      position: dw.position as DashboardLayoutItem | null,
      widget: {
        id: dw.widget.id,
        name: dw.widget.name,
        description: dw.widget.description,
        chartType: dw.widget.chartType,
        chartConfig: dw.widget.chartConfig,
        cachedData: dw.widget.cachedData,
        cachedAt: dw.widget.cachedAt,
      },
    })),
  };
}

/**
 * Atualiza um dashboard existente.
 *
 * @param userId - ID do usuário
 * @param dashboardId - ID do dashboard
 * @param input - Dados para atualizar
 * @returns Dashboard atualizado
 * @throws DashboardError se dashboard não encontrado ou não pertence ao usuário
 */
export async function updateDashboard(
  userId: string,
  dashboardId: string,
  input: UpdateDashboardInput
): Promise<Dashboard> {
  // Verifica se dashboard existe e pertence ao usuário
  const existing = await prisma.dashboard.findFirst({
    where: {
      id: dashboardId,
      userId,
    },
  });

  if (!existing) {
    throw new DashboardError("Dashboard not found", "DASHBOARD_NOT_FOUND");
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.layout !== undefined) updateData.layout = input.layout;
  if (input.globalFilters !== undefined) updateData.globalFilters = input.globalFilters;
  if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;

  const dashboard = await prisma.dashboard.update({
    where: { id: dashboardId },
    data: updateData,
    include: {
      _count: {
        select: { widgets: true },
      },
    },
  });

  return formatDashboard(dashboard);
}

/**
 * Exclui um dashboard e todas as suas associações com widgets.
 *
 * @param userId - ID do usuário
 * @param dashboardId - ID do dashboard
 * @throws DashboardError se dashboard não encontrado ou não pertence ao usuário
 */
export async function deleteDashboard(userId: string, dashboardId: string): Promise<void> {
  // Verifica se dashboard existe e pertence ao usuário
  const existing = await prisma.dashboard.findFirst({
    where: {
      id: dashboardId,
      userId,
    },
  });

  if (!existing) {
    throw new DashboardError("Dashboard not found", "DASHBOARD_NOT_FOUND");
  }

  // O Prisma cascade delete vai remover os DashboardWidgets automaticamente
  await prisma.dashboard.delete({
    where: { id: dashboardId },
  });
}

/**
 * Duplica um dashboard existente.
 *
 * @param userId - ID do usuário
 * @param dashboardId - ID do dashboard a duplicar
 * @param newName - Nome para o novo dashboard (opcional)
 * @returns Dashboard duplicado
 * @throws DashboardError se dashboard não encontrado ou limite atingido
 */
export async function duplicateDashboard(
  userId: string,
  dashboardId: string,
  newName?: string
): Promise<Dashboard> {
  // Verifica limite de dashboards
  const canCreate = await canCreateDashboard(userId);
  if (!canCreate) {
    const limit = await getDashboardLimit(userId);
    throw new DashboardError(
      `Dashboard limit reached (${limit}). Upgrade your plan to create more dashboards.`,
      "DASHBOARD_LIMIT_REACHED"
    );
  }

  // Obtém o dashboard original com widgets
  const original = await prisma.dashboard.findFirst({
    where: {
      id: dashboardId,
      userId,
    },
    include: {
      widgets: true,
    },
  });

  if (!original) {
    throw new DashboardError("Dashboard not found", "DASHBOARD_NOT_FOUND");
  }

  // Cria o novo dashboard
  const duplicate = await prisma.dashboard.create({
    data: {
      name: newName ?? `${original.name} (Cópia)`,
      description: original.description,
      layout: original.layout as object[],
      globalFilters: original.globalFilters as object | undefined,
      isPublic: false, // Duplicado nunca é público por padrão
      userId,
      // Cria associações com os mesmos widgets
      widgets: {
        create: original.widgets.map((dw) => ({
          widgetId: dw.widgetId,
          position: dw.position as object | undefined,
        })),
      },
    },
    include: {
      _count: {
        select: { widgets: true },
      },
    },
  });

  return formatDashboard(duplicate);
}

/**
 * Obtém informações de limite de dashboards para o usuário.
 *
 * @param userId - ID do usuário
 * @returns Informações de limite
 */
export async function getDashboardLimitInfo(userId: string): Promise<{
  current: number;
  limit: number;
  remaining: number;
}> {
  const [count, limit] = await Promise.all([
    prisma.dashboard.count({ where: { userId } }),
    getDashboardLimit(userId),
  ]);

  return {
    current: count,
    limit,
    remaining: Math.max(0, limit - count),
  };
}

/**
 * Formata um dashboard do Prisma para o formato de retorno.
 */
function formatDashboard(dashboard: {
  id: string;
  name: string;
  description: string | null;
  layout: unknown;
  globalFilters: unknown;
  isPublic: boolean;
  shareToken: string | null;
  shareExpiresAt: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { widgets: number };
}): Dashboard {
  return {
    id: dashboard.id,
    name: dashboard.name,
    description: dashboard.description,
    layout: (dashboard.layout as DashboardLayoutItem[]) ?? [],
    globalFilters: dashboard.globalFilters as GlobalFilters | null,
    isPublic: dashboard.isPublic,
    shareToken: dashboard.shareToken,
    shareExpiresAt: dashboard.shareExpiresAt,
    userId: dashboard.userId,
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt,
    widgetCount: dashboard._count.widgets,
  };
}
