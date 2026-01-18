/**
 * Chat Service
 *
 * Serviço responsável pelo processamento de mensagens do chat.
 * Integra com o QaseAgent para consultas em linguagem natural.
 *
 * @see US-012: Consultas em Linguagem Natural
 */

import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/crypto.js";
import {
  getOrCreateAgent,
  removeAgentFromCache,
  type QaseAgentConfig,
} from "../agents/index.js";
import { globalMemoryStore } from "../agents/memory.js";
import { env } from "../lib/env.js";

/** Mensagem do chat */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
  durationMs?: number;
}

/** Entrada para enviar mensagem */
export interface SendMessageInput {
  userId: string;
  message: string;
  projectCode?: string;
}

/** Resultado de uma mensagem enviada */
export interface SendMessageResult {
  success: boolean;
  message?: ChatMessage;
  error?: string;
  toolsUsed?: string[];
  durationMs?: number;
}

/** Histórico de chat */
export interface ChatHistory {
  messages: ChatMessage[];
  projectCode?: string;
}

/** Status da sessão de chat */
export interface ChatSessionStatus {
  active: boolean;
  projectCode?: string;
  messageCount: number;
  agentInfo?: {
    model: string;
    toolsCount: number;
    toolNames: string[];
  };
}

/**
 * Erro de chat personalizado
 */
export class ChatError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "ChatError";
  }
}

/**
 * Obtém o token do Qase para um usuário.
 *
 * @param userId - ID do usuário
 * @returns Token decriptado ou null se não conectado
 */
async function getQaseTokenForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { qaseApiToken: true, qaseTokenValid: true },
  });

  if (!user || !user.qaseApiToken || !user.qaseTokenValid) {
    return null;
  }

  try {
    return decrypt(user.qaseApiToken);
  } catch {
    return null;
  }
}

/**
 * Envia uma mensagem para o agente e retorna a resposta.
 *
 * @param input - Dados da mensagem
 * @returns Resultado com a resposta do agente
 *
 * @example
 * ```typescript
 * const result = await sendMessage({
 *   userId: "user-123",
 *   message: "Qual a taxa de falha do projeto GV?",
 *   projectCode: "GV"
 * });
 *
 * if (result.success) {
 *   console.log(result.message?.content);
 * }
 * ```
 */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const { userId, message, projectCode } = input;
  const startTime = Date.now();

  // Valida entrada
  if (!message || message.trim().length === 0) {
    return {
      success: false,
      error: "Message is required",
    };
  }

  if (message.length > 2000) {
    return {
      success: false,
      error: "Message is too long (max 2000 characters)",
    };
  }

  // Verifica se usuário está conectado ao Qase
  const qaseToken = await getQaseTokenForUser(userId);
  if (!qaseToken) {
    return {
      success: false,
      error: "Please connect your Qase account first",
    };
  }

  // Verifica se tem API key da OpenAI
  if (!env.OPENAI_API_KEY) {
    return {
      success: false,
      error: "OpenAI API key is not configured",
    };
  }

  try {
    // Obtém ou cria o agente para este usuário/projeto
    const config: QaseAgentConfig = {
      openAIApiKey: env.OPENAI_API_KEY,
      qaseToken,
      userId,
      projectCode,
    };

    const agent = getOrCreateAgent(config);

    // Processa a mensagem
    const response = await agent.chat(message);

    // Verifica timeout (10 segundos - critério de aceitação)
    const totalDuration = Date.now() - startTime;
    if (totalDuration > 10000) {
      console.warn(`Chat response took ${totalDuration}ms (> 10s threshold)`);
    }

    // Cria mensagem de resposta
    const responseMessage: ChatMessage = {
      id: generateMessageId(),
      role: "assistant",
      content: response.output,
      timestamp: new Date(),
      toolsUsed: response.toolsUsed,
      durationMs: response.durationMs,
    };

    return {
      success: true,
      message: responseMessage,
      toolsUsed: response.toolsUsed,
      durationMs: response.durationMs,
    };
  } catch (error) {
    console.error("Error processing chat message:", error);

    // Trata erros específicos
    if (error instanceof Error) {
      // Rate limiting
      if (error.message.includes("429") || error.message.includes("rate_limit")) {
        return {
          success: false,
          error: "Rate limit exceeded. Please wait a moment and try again.",
        };
      }

      // Timeout
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        return {
          success: false,
          error: "Request timed out. Please try a simpler question.",
        };
      }

      // OpenAI API errors
      if (error.message.includes("401") || error.message.includes("invalid_api_key")) {
        return {
          success: false,
          error: "OpenAI API key is invalid. Please contact support.",
        };
      }
    }

    return {
      success: false,
      error: "I encountered an error processing your request. Please try again.",
    };
  }
}

/**
 * Obtém o histórico de chat de um usuário.
 *
 * @param userId - ID do usuário
 * @returns Histórico de mensagens
 */
export async function getChatHistory(userId: string): Promise<ChatHistory> {
  const memory = globalMemoryStore.getSession(userId);
  const messages = await memory.getMessages();

  // Converte mensagens do LangChain para ChatMessage
  const chatMessages: ChatMessage[] = messages.map((msg, index) => ({
    id: `msg-${index}`,
    role: msg._getType() === "human" ? "user" : "assistant",
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    timestamp: new Date(),
  }));

  return {
    messages: chatMessages,
  };
}

/**
 * Limpa o histórico de chat de um usuário.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto (opcional)
 */
export async function clearChatHistory(userId: string, projectCode?: string): Promise<void> {
  // Limpa memória do agente
  const memory = globalMemoryStore.getSession(userId);
  await memory.clear();

  // Remove agente do cache para forçar nova criação
  removeAgentFromCache(userId, projectCode);
}

/**
 * Obtém o status da sessão de chat.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do projeto (opcional)
 * @returns Status da sessão
 */
export async function getChatSessionStatus(
  userId: string,
  projectCode?: string
): Promise<ChatSessionStatus> {
  // Verifica se usuário está conectado ao Qase
  const qaseToken = await getQaseTokenForUser(userId);
  if (!qaseToken || !env.OPENAI_API_KEY) {
    return {
      active: false,
      messageCount: 0,
    };
  }

  // Obtém informações do agente se existir
  const config: QaseAgentConfig = {
    openAIApiKey: env.OPENAI_API_KEY,
    qaseToken,
    userId,
    projectCode,
  };

  const agent = getOrCreateAgent(config);
  const agentInfo = agent.getInfo();

  // Conta mensagens
  const memory = globalMemoryStore.getSession(userId);
  const messages = await memory.getMessages();

  return {
    active: true,
    projectCode: agentInfo.projectCode !== "all" ? agentInfo.projectCode : undefined,
    messageCount: messages.length,
    agentInfo: {
      model: agentInfo.model,
      toolsCount: agentInfo.toolsCount,
      toolNames: agentInfo.toolNames,
    },
  };
}

/**
 * Altera o projeto selecionado para o chat.
 *
 * @param userId - ID do usuário
 * @param projectCode - Código do novo projeto
 */
export async function setProjectForChat(
  userId: string,
  projectCode: string
): Promise<{ success: boolean; message: string }> {
  // Verifica se usuário está conectado ao Qase
  const qaseToken = await getQaseTokenForUser(userId);
  if (!qaseToken) {
    return {
      success: false,
      message: "Please connect your Qase account first",
    };
  }

  if (!env.OPENAI_API_KEY) {
    return {
      success: false,
      message: "OpenAI API key is not configured",
    };
  }

  // Obtém o agente e atualiza o projeto
  const config: QaseAgentConfig = {
    openAIApiKey: env.OPENAI_API_KEY,
    qaseToken,
    userId,
    projectCode,
  };

  // Remove agente anterior e cria novo com projeto atualizado
  removeAgentFromCache(userId);
  getOrCreateAgent(config);

  return {
    success: true,
    message: `Project changed to ${projectCode}`,
  };
}

/**
 * Gera um ID único para mensagem.
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Callbacks para streaming */
export interface StreamCallbacks {
  onToken: (token: string) => void | Promise<void>;
  onToolStart?: (toolName: string) => void | Promise<void>;
  onToolEnd?: (toolName: string) => void | Promise<void>;
  onError?: (error: string) => void | Promise<void>;
  onDone?: (result: { toolsUsed: string[]; durationMs: number }) => void | Promise<void>;
}

/** Resultado da validação de input */
interface ValidationResult {
  valid: boolean;
  error?: string;
  qaseToken?: string;
}

/**
 * Valida o input de uma mensagem de chat.
 */
async function validateMessageInput(input: SendMessageInput): Promise<ValidationResult> {
  const { userId, message } = input;

  if (!message || message.trim().length === 0) {
    return { valid: false, error: "Message is required" };
  }

  if (message.length > 2000) {
    return { valid: false, error: "Message is too long (max 2000 characters)" };
  }

  const qaseToken = await getQaseTokenForUser(userId);
  if (!qaseToken) {
    return { valid: false, error: "Please connect your Qase account first" };
  }

  if (!env.OPENAI_API_KEY) {
    return { valid: false, error: "OpenAI API key is not configured" };
  }

  return { valid: true, qaseToken };
}

/**
 * Envia uma mensagem com streaming real do LLM.
 * Usa callbacks para emitir tokens conforme são gerados.
 *
 * @param input - Dados da mensagem
 * @param callbacks - Callbacks para eventos de streaming
 *
 * @example
 * ```typescript
 * await sendMessageStream(
 *   { userId: "user-123", message: "Qual a taxa de falha?" },
 *   {
 *     onToken: (token) => process.stdout.write(token),
 *     onToolStart: (name) => console.log(`Using tool: ${name}`),
 *     onDone: (result) => console.log(`Done in ${result.durationMs}ms`),
 *   }
 * );
 * ```
 */
export async function sendMessageStream(
  input: SendMessageInput,
  callbacks: StreamCallbacks
): Promise<void> {
  const { userId, message, projectCode } = input;
  const startTime = Date.now();

  // Valida entrada
  const validation = await validateMessageInput(input);
  if (!validation.valid) {
    await callbacks.onError?.(validation.error!);
    return;
  }

  try {
    // Obtém ou cria o agente para este usuário/projeto
    const config: QaseAgentConfig = {
      openAIApiKey: env.OPENAI_API_KEY!,
      qaseToken: validation.qaseToken!,
      userId,
      projectCode,
    };

    const agent = getOrCreateAgent(config);

    // Processa a mensagem com streaming real
    const response = await agent.chatStream(
      message,
      // onToken - emite cada token conforme gerado pelo LLM
      (token: string) => {
        callbacks.onToken(token);
      },
      // onToolStart
      (toolName: string) => {
        callbacks.onToolStart?.(toolName);
      },
      // onToolEnd
      (toolName: string) => {
        callbacks.onToolEnd?.(toolName);
      }
    );

    // Verifica timeout (10 segundos - critério de aceitação)
    const totalDuration = Date.now() - startTime;
    if (totalDuration > 10000) {
      console.warn(`Chat streaming response took ${totalDuration}ms (> 10s threshold)`);
    }

    await callbacks.onDone?.({
      toolsUsed: response.toolsUsed,
      durationMs: response.durationMs,
    });
  } catch (error) {
    console.error("Error in streaming chat message:", error);

    let errorMessage = "I encountered an error processing your request. Please try again.";

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("rate_limit")) {
        errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        errorMessage = "Request timed out. Please try a simpler question.";
      } else if (error.message.includes("401") || error.message.includes("invalid_api_key")) {
        errorMessage = "OpenAI API key is invalid. Please contact support.";
      }
    }

    await callbacks.onError?.(errorMessage);
  }
}
