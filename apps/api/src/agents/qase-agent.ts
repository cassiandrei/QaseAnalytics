/**
 * QaseAnalytics LangChain Agent
 *
 * Agente principal que orquestra as interações entre usuário, LLM e tools.
 * Utiliza GPT-5 (gpt-4o ou superior) com LangChain para processar consultas
 * em linguagem natural sobre métricas de QA do Qase.io.
 *
 * @see US-011: Configuração do LangChain Agent
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import type { BaseMessage } from "@langchain/core/messages";

import { createAgentPrompt, FALLBACK_RESPONSE_PROMPT } from "./prompts.js";
import { ConversationMemory, globalMemoryStore } from "./memory.js";
import {
  createListProjectsToolWithContext,
  createGetTestCasesToolWithContext,
  createGetTestRunsToolWithContext,
  createGetRunResultsToolWithContext,
  createGenerateChartTool,
} from "../tools/index.js";

/** Configuração do agente */
export interface QaseAgentConfig {
  /** API Key da OpenAI (BYOK ou pool) */
  openAIApiKey: string;
  /** Token da API do Qase para este usuário */
  qaseToken: string;
  /** ID do usuário para namespace de cache */
  userId: string;
  /** Código do projeto selecionado (opcional) */
  projectCode?: string;
  /** Modelo a usar (default: gpt-4o) */
  model?: string;
  /** Temperatura para geração (default: 0.1) */
  temperature?: number;
  /** Máximo de tokens na resposta */
  maxTokens?: number;
  /** Timeout em ms */
  timeout?: number;
  /** Habilitar verbose logging */
  verbose?: boolean;
}

/** Resultado da execução do agente */
export interface AgentResponse {
  /** Resposta do agente */
  output: string;
  /** Histórico de mensagens atualizado */
  chatHistory: BaseMessage[];
  /** Tools utilizadas na resposta */
  toolsUsed: string[];
  /** Tokens utilizados (se disponível) */
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Duração da execução em ms */
  durationMs: number;
}

/** Contexto do agente para execução */
export interface AgentContext {
  userId: string;
  projectCode: string;
}

/**
 * QaseAgent - Agente principal do QaseAnalytics
 *
 * Responsável por:
 * - Processar consultas em linguagem natural
 * - Selecionar e executar tools apropriadas
 * - Manter contexto de conversa
 * - Retornar respostas formatadas
 */
export class QaseAgent {
  private executor: AgentExecutor | null = null;
  private llm: ChatOpenAI;
  private tools: DynamicStructuredTool[];
  private memory: ConversationMemory;
  private config: Required<
    Pick<QaseAgentConfig, "model" | "temperature" | "maxTokens" | "timeout" | "verbose">
  > &
    QaseAgentConfig;

  constructor(config: QaseAgentConfig) {
    this.config = {
      model: "gpt-4o",
      temperature: 0.1,
      maxTokens: 2048,
      timeout: 60000,
      verbose: false,
      ...config,
    };

    // Inicializa o LLM (ChatGPT) com streaming habilitado
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      openAIApiKey: this.config.openAIApiKey,
      timeout: this.config.timeout,
      streaming: true, // Habilita streaming real do LLM
    });

    // Cria as tools com contexto do usuário
    this.tools = this.createTools();

    // Obtém ou cria memória para este usuário
    this.memory = globalMemoryStore.getSession(config.userId);
  }

  /**
   * Cria as tools do Qase com o contexto do usuário.
   */
  private createTools(): DynamicStructuredTool[] {
    const { qaseToken, userId } = this.config;

    return [
      createListProjectsToolWithContext(qaseToken, userId),
      createGetTestCasesToolWithContext(qaseToken, userId),
      createGetTestRunsToolWithContext(qaseToken, userId),
      createGetRunResultsToolWithContext(qaseToken, userId),
      createGenerateChartTool(),
    ];
  }

  /**
   * Inicializa o AgentExecutor (lazy loading).
   */
  private async getExecutor(): Promise<AgentExecutor> {
    if (this.executor) {
      return this.executor;
    }

    const prompt = createAgentPrompt();

    const agent = await createOpenAIToolsAgent({
      llm: this.llm,
      tools: this.tools,
      prompt,
    });

    this.executor = new AgentExecutor({
      agent,
      tools: this.tools,
      memory: this.memory.createBufferMemory(),
      verbose: this.config.verbose,
      returnIntermediateSteps: true,
      // Increased from 5 to 15 to support complex queries like:
      // - Evolution charts (needs get_run_results for multiple runs)
      // - Multi-step analysis (list projects -> get runs -> get results -> generate chart)
      maxIterations: 15,
      handleParsingErrors: (error) => {
        console.error("Agent parsing error:", error);
        return FALLBACK_RESPONSE_PROMPT;
      },
    });

    return this.executor;
  }

  /**
   * Processa uma mensagem do usuário e retorna a resposta do agente.
   *
   * @param input - Mensagem do usuário
   * @returns Resposta do agente com metadados
   *
   * @example
   * ```typescript
   * const agent = new QaseAgent({
   *   openAIApiKey: "sk-...",
   *   qaseToken: "abc123",
   *   userId: "user-1",
   * });
   *
   * const response = await agent.chat("Quais são meus projetos?");
   * console.log(response.output);
   * ```
   */
  async chat(input: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const executor = await this.getExecutor();

      // Contexto para o prompt
      const context: AgentContext = {
        userId: this.config.userId,
        projectCode: this.config.projectCode ?? "all",
      };

      // Executa o agente
      const result = await executor.invoke({
        input,
        ...context,
      });

      // Extrai tools utilizadas
      const toolsUsed = this.extractToolsUsed(result.intermediateSteps);

      // Obtém histórico atualizado
      const chatHistory = await this.memory.getMessages();

      return {
        output: result.output,
        chatHistory,
        toolsUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = this.handleError(error);

      return {
        output: errorMessage,
        chatHistory: await this.memory.getMessages(),
        toolsUsed: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Processa uma mensagem com streaming real do LLM.
   *
   * @param input - Mensagem do usuário
   * @param onToken - Callback para cada token gerado
   * @param onToolStart - Callback quando uma tool começa a executar
   * @param onToolEnd - Callback quando uma tool termina
   * @returns Resposta final do agente
   */
  async chatStream(
    input: string,
    onToken: (token: string) => void,
    onToolStart?: (toolName: string) => void,
    onToolEnd?: (toolName: string) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const toolsUsed: string[] = [];

    try {
      const executor = await this.getExecutor();

      // Contexto para o prompt
      const context: AgentContext = {
        userId: this.config.userId,
        projectCode: this.config.projectCode ?? "all",
      };

      // Obtém histórico de chat para passar ao prompt
      const chatHistory = await this.memory.getMessages();

      let finalOutput = "";

      // Usa streamEvents para streaming real, incluindo chat_history
      const eventStream = executor.streamEvents(
        { input, chat_history: chatHistory, ...context },
        { version: "v2" }
      );

      for await (const event of eventStream) {
        // Tokens do LLM
        if (event.event === "on_chat_model_stream") {
          const chunk = event.data?.chunk;
          if (chunk?.content) {
            const token = typeof chunk.content === "string"
              ? chunk.content
              : chunk.content[0]?.text || "";
            if (token) {
              onToken(token);
              finalOutput += token;
            }
          }
        }

        // Tool começou a executar
        if (event.event === "on_tool_start") {
          const toolName = event.name;
          if (toolName && !toolsUsed.includes(toolName)) {
            toolsUsed.push(toolName);
            onToolStart?.(toolName);
          }
        }

        // Tool terminou
        if (event.event === "on_tool_end") {
          onToolEnd?.(event.name);
        }

        // Resposta final do agente
        if (event.event === "on_chain_end" && event.name === "AgentExecutor") {
          if (event.data?.output?.output) {
            finalOutput = event.data.output.output;
          }
        }
      }

      // Atualiza a memória com a interação (input + output)
      await this.memory.addHumanMessage(input);
      await this.memory.addAIMessage(finalOutput);

      const updatedHistory = await this.memory.getMessages();

      return {
        output: finalOutput,
        chatHistory: updatedHistory,
        toolsUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = this.handleError(error);

      return {
        output: errorMessage,
        chatHistory: await this.memory.getMessages(),
        toolsUsed,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extrai nomes das tools utilizadas dos passos intermediários.
   */
  private extractToolsUsed(
    intermediateSteps: Array<{ action: { tool: string } }>
  ): string[] {
    if (!intermediateSteps || !Array.isArray(intermediateSteps)) {
      return [];
    }

    return [...new Set(intermediateSteps.map((step) => step.action?.tool).filter(Boolean))];
  }

  /**
   * Trata erros e retorna mensagem amigável.
   */
  private handleError(error: unknown): string {
    console.error("QaseAgent error:", error);

    if (error instanceof Error) {
      // Erros de autenticação OpenAI
      if (error.message.includes("401") || error.message.includes("invalid_api_key")) {
        return "Error: Invalid OpenAI API key. Please check your configuration.";
      }

      // Rate limiting
      if (error.message.includes("429") || error.message.includes("rate_limit")) {
        return "Error: Rate limit exceeded. Please try again in a few moments.";
      }

      // Timeout
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        return "Error: Request timed out. Please try again.";
      }

      // Erros de token Qase
      if (error.message.includes("Qase") || error.message.includes("401")) {
        return "Error: Invalid Qase API token. Please reconnect your Qase account.";
      }
    }

    return "I encountered an error processing your request. Please try again.";
  }

  /**
   * Limpa o histórico de conversa.
   */
  async clearHistory(): Promise<void> {
    await this.memory.clear();
  }

  /**
   * Obtém o histórico de conversa atual.
   */
  async getHistory(): Promise<BaseMessage[]> {
    return this.memory.getMessages();
  }

  /**
   * Atualiza o projeto selecionado.
   */
  setProject(projectCode: string): void {
    this.config.projectCode = projectCode;
  }

  /**
   * Obtém informações sobre o agente.
   */
  getInfo(): {
    model: string;
    userId: string;
    projectCode: string;
    toolsCount: number;
    toolNames: string[];
  } {
    return {
      model: this.config.model,
      userId: this.config.userId,
      projectCode: this.config.projectCode ?? "all",
      toolsCount: this.tools.length,
      toolNames: this.tools.map((t) => t.name),
    };
  }
}

/**
 * Factory function para criar um QaseAgent.
 * Útil para contextos onde não se quer instanciar a classe diretamente.
 *
 * @param config - Configuração do agente
 * @returns Nova instância de QaseAgent
 */
export function createQaseAgent(config: QaseAgentConfig): QaseAgent {
  return new QaseAgent(config);
}

/**
 * Cache de agentes por usuário.
 * Evita recriar agentes para o mesmo usuário.
 */
const agentCache = new Map<string, QaseAgent>();

/**
 * Obtém ou cria um agente para o usuário.
 * Usa cache para reutilizar agentes existentes.
 *
 * @param config - Configuração do agente
 * @param forceNew - Se true, cria novo agente mesmo se existir no cache
 * @returns QaseAgent para o usuário
 */
export function getOrCreateAgent(config: QaseAgentConfig, forceNew = false): QaseAgent {
  const cacheKey = `${config.userId}:${config.projectCode ?? "all"}`;

  if (!forceNew && agentCache.has(cacheKey)) {
    return agentCache.get(cacheKey)!;
  }

  const agent = createQaseAgent(config);
  agentCache.set(cacheKey, agent);

  return agent;
}

/**
 * Remove um agente do cache.
 */
export function removeAgentFromCache(userId: string, projectCode?: string): boolean {
  const cacheKey = `${userId}:${projectCode ?? "all"}`;
  return agentCache.delete(cacheKey);
}

/**
 * Limpa todo o cache de agentes.
 */
export function clearAgentCache(): void {
  agentCache.clear();
}
