/**
 * Chat Routes
 *
 * Endpoints para processamento de mensagens do chat com linguagem natural.
 * Integra com o QaseAgent para responder consultas sobre métricas de QA.
 *
 * @see US-012: Consultas em Linguagem Natural
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import {
  sendMessage,
  getChatHistory,
  clearChatHistory,
  getChatSessionStatus,
  setProjectForChat,
} from "../services/chat.service.js";

/** Tipo de variáveis de contexto para o Hono */
type AppVariables = {
  userId?: string;
};

export const chatRoutes = new Hono<{ Variables: AppVariables }>();

/**
 * Schema de validação para mensagem
 */
const sendMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message is too long"),
  projectCode: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

/**
 * Schema de validação para troca de projeto
 */
const setProjectSchema = z.object({
  projectCode: z.string().min(1, "Project code is required"),
});

/**
 * POST /api/chat/message
 *
 * Envia uma mensagem para o agente e recebe a resposta.
 * Suporta streaming via SSE quando stream=true.
 *
 * Request Body:
 * - message: string - A mensagem do usuário
 * - projectCode?: string - Código do projeto (opcional)
 * - stream?: boolean - Se true, usa Server-Sent Events
 *
 * Response (normal):
 * - success: boolean
 * - message: { id, role, content, timestamp, toolsUsed?, durationMs? }
 * - toolsUsed?: string[]
 * - durationMs?: number
 *
 * Response (stream):
 * - SSE events com chunks da resposta
 */
chatRoutes.post("/message", zValidator("json", sendMessageSchema), async (c) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
      },
      401
    );
  }

  const { message, projectCode, stream } = c.req.valid("json");

  // Se streaming não for solicitado, processa normalmente
  if (!stream) {
    const result = await sendMessage({
      userId,
      message,
      projectCode,
    });

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        400
      );
    }

    return c.json({
      success: true,
      message: result.message,
      toolsUsed: result.toolsUsed,
      durationMs: result.durationMs,
    });
  }

  // Streaming via SSE
  return streamSSE(c, async (stream) => {
    try {
      // Envia evento de início
      await stream.writeSSE({
        event: "start",
        data: JSON.stringify({ timestamp: new Date().toISOString() }),
      });

      // Processa a mensagem
      const result = await sendMessage({
        userId,
        message,
        projectCode,
      });

      if (!result.success) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ error: result.error }),
        });
        return;
      }

      // Simula streaming da resposta (chunks de texto)
      // Em produção, isso seria feito com OpenAI streaming
      const content = result.message?.content ?? "";
      const chunkSize = 50;
      let position = 0;

      while (position < content.length) {
        const chunk = content.slice(position, position + chunkSize);
        await stream.writeSSE({
          event: "chunk",
          data: JSON.stringify({ content: chunk }),
        });
        position += chunkSize;
        // Pequeno delay para simular streaming
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Envia evento de conclusão
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({
          message: result.message,
          toolsUsed: result.toolsUsed,
          durationMs: result.durationMs,
        }),
      });
    } catch (error) {
      console.error("SSE streaming error:", error);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          error: "An error occurred while processing your message",
        }),
      });
    }
  });
});

/**
 * GET /api/chat/history
 *
 * Obtém o histórico de mensagens do chat.
 *
 * Response:
 * - messages: Array<{ id, role, content, timestamp, toolsUsed?, durationMs? }>
 */
chatRoutes.get("/history", async (c) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
      },
      401
    );
  }

  const history = await getChatHistory(userId);

  return c.json({
    success: true,
    ...history,
  });
});

/**
 * DELETE /api/chat/history
 *
 * Limpa o histórico de mensagens do chat.
 *
 * Query params:
 * - projectCode?: string - Código do projeto
 *
 * Response:
 * - success: boolean
 * - message: string
 */
chatRoutes.delete("/history", async (c) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
      },
      401
    );
  }

  const projectCode = c.req.query("projectCode");
  await clearChatHistory(userId, projectCode);

  return c.json({
    success: true,
    message: "Chat history cleared",
  });
});

/**
 * GET /api/chat/status
 *
 * Obtém o status da sessão de chat.
 *
 * Response:
 * - active: boolean
 * - projectCode?: string
 * - messageCount: number
 * - agentInfo?: { model, toolsCount, toolNames }
 */
chatRoutes.get("/status", async (c) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
      },
      401
    );
  }

  const projectCode = c.req.query("projectCode");
  const status = await getChatSessionStatus(userId, projectCode);

  return c.json({
    success: true,
    ...status,
  });
});

/**
 * POST /api/chat/project
 *
 * Define o projeto ativo para o chat.
 *
 * Request Body:
 * - projectCode: string - Código do projeto
 *
 * Response:
 * - success: boolean
 * - message: string
 */
chatRoutes.post("/project", zValidator("json", setProjectSchema), async (c) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
      },
      401
    );
  }

  const { projectCode } = c.req.valid("json");
  const result = await setProjectForChat(userId, projectCode);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.message,
      },
      400
    );
  }

  return c.json(result);
});
