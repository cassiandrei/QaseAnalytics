/**
 * Widget Routes
 *
 * Endpoints para gerenciamento de widgets salvos.
 * Suporta CRUD completo e refresh manual/automático.
 *
 * @see US-026: Salvar Gráfico como Widget
 */

import { Hono } from "hono";
import { z } from "zod";
import { ChartType } from "@prisma/client";
import {
  createWidget,
  getWidgets,
  getWidgetById,
  updateWidget,
  deleteWidget,
  refreshWidgetData,
  WidgetError,
  SUPPORTED_REFRESH_INTERVALS,
} from "../services/widget.service.js";

/** Tipo de variáveis de contexto para o Hono */
type WidgetRouteVariables = {
  userId?: string;
};

export const widgetRoutes = new Hono<{ Variables: WidgetRouteVariables }>();

// Schema de validação para criação de widget
const createWidgetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  query: z.string().min(1, "Query is required"),
  chartType: z.nativeEnum(ChartType),
  chartConfig: z.object({
    title: z.string().optional(),
    xAxis: z.string().optional(),
    yAxis: z.string().optional(),
    colors: z.array(z.string()).optional(),
    legend: z.boolean().optional(),
    data: z.array(z.unknown()).optional(),
  }),
  filters: z.record(z.unknown()).optional(),
  refreshInterval: z.number().int().positive().optional(),
  cachedData: z.unknown().optional(),
});

// Schema de validação para atualização de widget
const updateWidgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  chartConfig: z.object({
    title: z.string().optional(),
    xAxis: z.string().optional(),
    yAxis: z.string().optional(),
    colors: z.array(z.string()).optional(),
    legend: z.boolean().optional(),
    data: z.array(z.unknown()).optional(),
  }).partial().optional(),
  filters: z.record(z.unknown()).optional(),
  refreshInterval: z.number().int().positive().nullable().optional(),
});

/**
 * Middleware para verificar autenticação
 */
widgetRoutes.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  return next();
});

/**
 * POST /api/widgets - Criar um novo widget
 *
 * @body CreateWidgetInput
 * @returns Widget criado
 */
widgetRoutes.post("/", async (c) => {
  const userId = c.get("userId")!;

  try {
    const body = await c.req.json();
    const parsed = createWidgetSchema.safeParse(body);

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

    const widget = await createWidget(userId, {
      name: parsed.data.name,
      description: parsed.data.description,
      query: parsed.data.query,
      chartType: parsed.data.chartType,
      chartConfig: {
        title: parsed.data.chartConfig.title ?? parsed.data.name,
        xAxis: parsed.data.chartConfig.xAxis,
        yAxis: parsed.data.chartConfig.yAxis,
        colors: parsed.data.chartConfig.colors,
        legend: parsed.data.chartConfig.legend,
        data: parsed.data.chartConfig.data,
      },
      filters: parsed.data.filters,
      refreshInterval: parsed.data.refreshInterval,
      cachedData: parsed.data.cachedData,
    });

    return c.json({ success: true, widget }, 201);
  } catch (error) {
    if (error instanceof WidgetError) {
      return c.json({ error: error.message, code: error.code }, 400);
    }
    console.error("Error creating widget:", error);
    return c.json({ error: "Failed to create widget" }, 500);
  }
});

/**
 * GET /api/widgets - Listar todos os widgets do usuário
 *
 * @returns Lista de widgets
 */
widgetRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;

  try {
    const result = await getWidgets(userId);

    return c.json({
      success: true,
      widgets: result.widgets,
      total: result.total,
    });
  } catch (error) {
    console.error("Error listing widgets:", error);
    return c.json({ error: "Failed to list widgets" }, 500);
  }
});

/**
 * GET /api/widgets/intervals - Listar intervalos de refresh suportados
 *
 * @returns Lista de intervalos em minutos
 */
widgetRoutes.get("/intervals", (c) => {
  const intervals = SUPPORTED_REFRESH_INTERVALS.map((minutes) => ({
    value: minutes,
    label: formatInterval(minutes),
  }));

  return c.json({ intervals });
});

/**
 * GET /api/widgets/:id - Obter um widget específico
 *
 * @param id - ID do widget
 * @returns Widget
 */
widgetRoutes.get("/:id", async (c) => {
  const userId = c.get("userId")!;
  const widgetId = c.req.param("id");

  try {
    const widget = await getWidgetById(userId, widgetId);

    if (!widget) {
      return c.json({ error: "Widget not found" }, 404);
    }

    return c.json({ success: true, widget });
  } catch (error) {
    console.error("Error getting widget:", error);
    return c.json({ error: "Failed to get widget" }, 500);
  }
});

/**
 * PUT /api/widgets/:id - Atualizar um widget
 *
 * @param id - ID do widget
 * @body UpdateWidgetInput
 * @returns Widget atualizado
 */
widgetRoutes.put("/:id", async (c) => {
  const userId = c.get("userId")!;
  const widgetId = c.req.param("id");

  try {
    const body = await c.req.json();
    const parsed = updateWidgetSchema.safeParse(body);

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

    const widget = await updateWidget(userId, widgetId, {
      name: parsed.data.name,
      description: parsed.data.description ?? undefined,
      chartConfig: parsed.data.chartConfig,
      filters: parsed.data.filters,
      refreshInterval: parsed.data.refreshInterval,
    });

    return c.json({ success: true, widget });
  } catch (error) {
    if (error instanceof WidgetError) {
      const status = error.code === "WIDGET_NOT_FOUND" ? 404 : 400;
      return c.json({ error: error.message, code: error.code }, status);
    }
    console.error("Error updating widget:", error);
    return c.json({ error: "Failed to update widget" }, 500);
  }
});

/**
 * DELETE /api/widgets/:id - Excluir um widget
 *
 * @param id - ID do widget
 * @returns Confirmação
 */
widgetRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")!;
  const widgetId = c.req.param("id");

  try {
    await deleteWidget(userId, widgetId);

    return c.json({ success: true, message: "Widget deleted successfully" });
  } catch (error) {
    if (error instanceof WidgetError) {
      const status = error.code === "WIDGET_NOT_FOUND" ? 404 : 400;
      return c.json({ error: error.message, code: error.code }, status);
    }
    console.error("Error deleting widget:", error);
    return c.json({ error: "Failed to delete widget" }, 500);
  }
});

/**
 * POST /api/widgets/:id/refresh - Forçar refresh manual dos dados
 *
 * @param id - ID do widget
 * @returns Widget com dados atualizados
 */
widgetRoutes.post("/:id/refresh", async (c) => {
  const userId = c.get("userId")!;
  const widgetId = c.req.param("id");

  try {
    // Verifica se o widget pertence ao usuário
    const widget = await getWidgetById(userId, widgetId);
    if (!widget) {
      return c.json({ error: "Widget not found" }, 404);
    }

    // Executa refresh
    const refreshed = await refreshWidgetData(widgetId);

    return c.json({
      success: true,
      widget: refreshed,
      message: "Widget data refreshed successfully",
    });
  } catch (error) {
    if (error instanceof WidgetError) {
      const status = error.code === "WIDGET_NOT_FOUND" ? 404 : 400;
      return c.json({ error: error.message, code: error.code }, status);
    }
    console.error("Error refreshing widget:", error);
    return c.json({ error: "Failed to refresh widget data" }, 500);
  }
});

/**
 * Formata intervalo em minutos para texto legível.
 */
function formatInterval(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutos`;
  }
  if (minutes === 60) {
    return "1 hora";
  }
  if (minutes < 1440) {
    return `${minutes / 60} horas`;
  }
  if (minutes === 1440) {
    return "Diário";
  }
  return `${minutes / 1440} dias`;
}
