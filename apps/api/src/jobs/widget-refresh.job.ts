/**
 * Widget Refresh Job
 *
 * Job de background para atualização automática de widgets.
 * Verifica periodicamente quais widgets precisam de refresh
 * e re-executa suas queries via QaseAgent.
 *
 * @see US-026: Salvar Gráfico como Widget
 */

import {
  getWidgetsNeedingRefresh,
  refreshWidgetData,
  SUPPORTED_REFRESH_INTERVALS,
} from "../services/widget.service.js";

/** Intervalo mínimo de verificação (em ms) */
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minuto

/** Flag para controlar o job */
let isRunning = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

/** Estatísticas do job */
interface JobStats {
  totalRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  lastRunAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
}

const stats: JobStats = {
  totalRefreshes: 0,
  successfulRefreshes: 0,
  failedRefreshes: 0,
  lastRunAt: null,
  lastErrorAt: null,
  lastError: null,
};

/**
 * Executa o ciclo de refresh de widgets.
 * Busca widgets que precisam ser atualizados e executa o refresh.
 */
async function runRefreshCycle(): Promise<void> {
  if (isRunning) {
    console.log("[WidgetRefreshJob] Skip: Previous cycle still running");
    return;
  }

  isRunning = true;
  stats.lastRunAt = new Date();

  try {
    // Busca widgets que precisam de refresh
    const widgetsToRefresh = await getWidgetsNeedingRefresh();

    if (widgetsToRefresh.length === 0) {
      isRunning = false;
      return;
    }

    console.log(
      `[WidgetRefreshJob] Found ${widgetsToRefresh.length} widget(s) needing refresh`
    );

    // Processa widgets em paralelo com limite de concorrência
    const CONCURRENCY_LIMIT = 3;
    const batches = chunkArray(widgetsToRefresh, CONCURRENCY_LIMIT);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (widget) => {
          try {
            stats.totalRefreshes++;
            await refreshWidgetData(widget.id);
            stats.successfulRefreshes++;
            console.log(`[WidgetRefreshJob] Refreshed widget ${widget.id} (${widget.name})`);
          } catch (error) {
            stats.failedRefreshes++;
            stats.lastErrorAt = new Date();
            stats.lastError = error instanceof Error ? error.message : "Unknown error";
            console.error(
              `[WidgetRefreshJob] Failed to refresh widget ${widget.id}:`,
              error
            );
            // Continua processando outros widgets
          }
        })
      );
    }
  } catch (error) {
    stats.lastErrorAt = new Date();
    stats.lastError = error instanceof Error ? error.message : "Unknown error";
    console.error("[WidgetRefreshJob] Error in refresh cycle:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Divide array em chunks para processamento em batches.
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Inicia o job de refresh automático.
 * O job verifica a cada minuto quais widgets precisam de atualização.
 *
 * @example
 * ```typescript
 * // No index.ts da API:
 * import { startWidgetRefreshJob } from "./jobs/widget-refresh.job.js";
 *
 * startWidgetRefreshJob();
 * ```
 */
export function startWidgetRefreshJob(): void {
  if (intervalId !== null) {
    console.log("[WidgetRefreshJob] Already running");
    return;
  }

  console.log("[WidgetRefreshJob] Starting widget refresh job");
  console.log(
    `[WidgetRefreshJob] Supported intervals: ${SUPPORTED_REFRESH_INTERVALS.join(", ")} minutes`
  );
  console.log(`[WidgetRefreshJob] Check interval: ${CHECK_INTERVAL_MS / 1000}s`);

  // Executa primeira vez após um delay para permitir startup
  setTimeout(() => {
    runRefreshCycle();
  }, 10 * 1000); // 10 segundos de delay inicial

  // Inicia intervalo de verificação
  intervalId = setInterval(runRefreshCycle, CHECK_INTERVAL_MS);

  console.log("[WidgetRefreshJob] Started successfully");
}

/**
 * Para o job de refresh automático.
 *
 * @example
 * ```typescript
 * // Para shutdown graceful:
 * stopWidgetRefreshJob();
 * ```
 */
export function stopWidgetRefreshJob(): void {
  if (intervalId === null) {
    console.log("[WidgetRefreshJob] Not running");
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
  isRunning = false;

  console.log("[WidgetRefreshJob] Stopped");
}

/**
 * Retorna estatísticas do job.
 *
 * @returns Estatísticas de execução
 */
export function getWidgetRefreshJobStats(): JobStats {
  return { ...stats };
}

/**
 * Verifica se o job está em execução.
 *
 * @returns true se o job está ativo
 */
export function isWidgetRefreshJobRunning(): boolean {
  return intervalId !== null;
}

/**
 * Força execução imediata do ciclo de refresh.
 * Útil para testes ou triggering manual.
 */
export async function forceRefreshCycle(): Promise<void> {
  console.log("[WidgetRefreshJob] Force running refresh cycle");
  await runRefreshCycle();
}
