/**
 * Dashboard Routes
 *
 * Endpoints para gerenciamento de dashboards personalizados.
 * Suporta CRUD completo para dashboards.
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  createDashboard,
  getDashboards,
  getDashboardById,
  getDashboardWithWidgets,
  updateDashboard,
  deleteDashboard,
  duplicateDashboard,
  getDashboardLimitInfo,
  DashboardError,
} from "../services/dashboard.service.js";

/** Tipo de variáveis de contexto para o Hono */
type DashboardRouteVariables = {
  userId?: string;
};

export const dashboardRoutes = new Hono<{ Variables: DashboardRouteVariables }>();

// Schema de validação para criação de dashboard
const createDashboardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

// Schema de validação para atualização de dashboard
const updateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  layout: z
    .array(
      z.object({
        i: z.string(),
        x: z.number().int().min(0),
        y: z.number().int().min(0),
        w: z.number().int().min(1),
        h: z.number().int().min(1),
        minW: z.number().int().min(1).optional(),
        minH: z.number().int().min(1).optional(),
        maxW: z.number().int().min(1).optional(),
        maxH: z.number().int().min(1).optional(),
      })
    )
    .optional(),
  globalFilters: z
    .object({
      projectCode: z.string().optional(),
      dateRange: z
        .object({
          start: z.string(),
          end: z.string(),
        })
        .optional(),
      environment: z.string().optional(),
    })
    .nullable()
    .optional(),
  isPublic: z.boolean().optional(),
});

// Schema para duplicação
const duplicateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

/**
 * Middleware para verificar autenticação
 */
dashboardRoutes.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  return next();
});

/**
 * POST /api/dashboards - Criar um novo dashboard
 *
 * @body { name: string, description?: string }
 * @returns Dashboard criado
 */
dashboardRoutes.post("/", async (c) => {
  const userId = c.get("userId")!;

  try {
    const body = await c.req.json();
    const parsed = createDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid input",
          details: parsed.error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        400
      );
    }

    const dashboard = await createDashboard(userId, {
      name: parsed.data.name,
      description: parsed.data.description,
    });

    return c.json({ success: true, dashboard }, 201);
  } catch (error) {
    if (error instanceof DashboardError) {
      const status = error.code === "DASHBOARD_LIMIT_REACHED" ? 403 : 400;
      return c.json({ error: error.message, code: error.code }, status);
    }
    console.error("Error creating dashboard:", error);
    return c.json({ error: "Failed to create dashboard" }, 500);
  }
});

/**
 * GET /api/dashboards - Listar todos os dashboards do usuário
 *
 * @returns Lista de dashboards
 */
dashboardRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;

  try {
    const result = await getDashboards(userId);

    return c.json({
      success: true,
      dashboards: result.dashboards,
      total: result.total,
    });
  } catch (error) {
    console.error("Error listing dashboards:", error);
    return c.json({ error: "Failed to list dashboards" }, 500);
  }
});

/**
 * GET /api/dashboards/limit - Obter informações de limite de dashboards
 *
 * @returns { current: number, limit: number, remaining: number }
 */
dashboardRoutes.get("/limit", async (c) => {
  const userId = c.get("userId")!;

  try {
    const limitInfo = await getDashboardLimitInfo(userId);

    return c.json({
      success: true,
      ...limitInfo,
    });
  } catch (error) {
    console.error("Error getting dashboard limit:", error);
    return c.json({ error: "Failed to get dashboard limit" }, 500);
  }
});

/**
 * GET /api/dashboards/:id - Obter um dashboard específico
 *
 * @param id - ID do dashboard
 * @query includeWidgets - Se true, inclui os widgets do dashboard
 * @returns Dashboard (com ou sem widgets)
 */
dashboardRoutes.get("/:id", async (c) => {
  const userId = c.get("userId")!;
  const dashboardId = c.req.param("id");
  const includeWidgets = c.req.query("includeWidgets") === "true";

  try {
    if (includeWidgets) {
      const dashboard = await getDashboardWithWidgets(userId, dashboardId);

      if (!dashboard) {
        return c.json({ error: "Dashboard not found" }, 404);
      }

      return c.json({ success: true, dashboard });
    }

    const dashboard = await getDashboardById(userId, dashboardId);

    if (!dashboard) {
      return c.json({ error: "Dashboard not found" }, 404);
    }

    return c.json({ success: true, dashboard });
  } catch (error) {
    console.error("Error getting dashboard:", error);
    return c.json({ error: "Failed to get dashboard" }, 500);
  }
});

/**
 * PUT /api/dashboards/:id - Atualizar um dashboard
 *
 * @param id - ID do dashboard
 * @body UpdateDashboardInput
 * @returns Dashboard atualizado
 */
dashboardRoutes.put("/:id", async (c) => {
  const userId = c.get("userId")!;
  const dashboardId = c.req.param("id");

  try {
    const body = await c.req.json();
    const parsed = updateDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid input",
          details: parsed.error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        400
      );
    }

    const dashboard = await updateDashboard(userId, dashboardId, {
      name: parsed.data.name,
      description: parsed.data.description,
      layout: parsed.data.layout,
      globalFilters: parsed.data.globalFilters,
      isPublic: parsed.data.isPublic,
    });

    return c.json({ success: true, dashboard });
  } catch (error) {
    if (error instanceof DashboardError) {
      const status = error.code === "DASHBOARD_NOT_FOUND" ? 404 : 400;
      return c.json({ error: error.message, code: error.code }, status);
    }
    console.error("Error updating dashboard:", error);
    return c.json({ error: "Failed to update dashboard" }, 500);
  }
});

/**
 * DELETE /api/dashboards/:id - Excluir um dashboard
 *
 * @param id - ID do dashboard
 * @returns Confirmação
 */
dashboardRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")!;
  const dashboardId = c.req.param("id");

  try {
    await deleteDashboard(userId, dashboardId);

    return c.json({ success: true, message: "Dashboard deleted successfully" });
  } catch (error) {
    if (error instanceof DashboardError) {
      const status = error.code === "DASHBOARD_NOT_FOUND" ? 404 : 400;
      return c.json({ error: error.message, code: error.code }, status);
    }
    console.error("Error deleting dashboard:", error);
    return c.json({ error: "Failed to delete dashboard" }, 500);
  }
});

/**
 * POST /api/dashboards/:id/duplicate - Duplicar um dashboard
 *
 * @param id - ID do dashboard a duplicar
 * @body { name?: string } - Nome opcional para o novo dashboard
 * @returns Dashboard duplicado
 */
dashboardRoutes.post("/:id/duplicate", async (c) => {
  const userId = c.get("userId")!;
  const dashboardId = c.req.param("id");

  try {
    const body = await c.req.json().catch(() => ({}));
    const parsed = duplicateDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid input",
          details: parsed.error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        400
      );
    }

    const dashboard = await duplicateDashboard(userId, dashboardId, parsed.data.name);

    return c.json({
      success: true,
      dashboard,
      message: "Dashboard duplicated successfully",
    }, 201);
  } catch (error) {
    if (error instanceof DashboardError) {
      const status =
        error.code === "DASHBOARD_NOT_FOUND"
          ? 404
          : error.code === "DASHBOARD_LIMIT_REACHED"
          ? 403
          : 400;
      return c.json({ error: error.message, code: error.code }, status);
    }
    console.error("Error duplicating dashboard:", error);
    return c.json({ error: "Failed to duplicate dashboard" }, 500);
  }
});
