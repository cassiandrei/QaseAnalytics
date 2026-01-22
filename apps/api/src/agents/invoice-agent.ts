/**
 * Invoice Agent
 *
 * Agent specialized in invoice/billing analysis from ERP database.
 * Handles queries about revenue, taxes, invoices, and Brazilian fiscal data.
 */

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { BaseMessage } from '@langchain/core/messages';

import { createInvoiceAgentPrompt } from './prompts.js';
import { ConversationMemory, globalMemoryStore } from './memory.js';
import {
  createGetInvoiceSummaryToolWithContext,
  createListInvoiceSeriesToolWithContext,
  createGetInvoiceDetailsToolWithContext,
  createGetTaxBreakdownToolWithContext,
  createSearchInvoicesToolWithContext,
  createGetInvoiceEventsToolWithContext,
  createGetInvoiceErrorsToolWithContext,
  createGenerateChartTool,
} from '../tools/index.js';

/** Invoice Agent configuration */
export interface InvoiceAgentConfig {
  /** OpenAI API Key */
  openAIApiKey: string;
  /** User ID for cache namespace */
  userId: string;
  /** Invoice database connection string (fallback to env if not provided) */
  invoiceDbUrl?: string;
  /** Company ID filter (optional) */
  companyId?: number;
  /** Model to use (default: gpt-4o) */
  model?: string;
  /** Temperature for generation (default: 0.1) */
  temperature?: number;
  /** Max tokens in response */
  maxTokens?: number;
  /** Timeout in ms */
  timeout?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/** Agent response */
export interface AgentResponse {
  output: string;
  chatHistory: BaseMessage[];
  toolsUsed: string[];
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  durationMs: number;
}

/**
 * InvoiceAgent - Specialized agent for invoice/billing analysis
 *
 * Handles:
 * - Invoice revenue queries
 * - Tax analysis (ICMS, IPI, PIS, COFINS, etc.)
 * - Invoice search and filtering
 * - Audit trail queries
 */
export class InvoiceAgent {
  private executor: AgentExecutor | null = null;
  private llm: ChatOpenAI;
  private tools: DynamicStructuredTool[];
  private memory: ConversationMemory;
  private config: Required<
    Pick<InvoiceAgentConfig, 'model' | 'temperature' | 'maxTokens' | 'timeout' | 'verbose'>
  > &
    InvoiceAgentConfig;

  constructor(config: InvoiceAgentConfig) {
    this.config = {
      model: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 2048,
      timeout: 60000,
      verbose: false,
      ...config,
    };

    // Initialize LLM
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      openAIApiKey: this.config.openAIApiKey,
      timeout: this.config.timeout,
      streaming: true,
    });

    // Create tools
    this.tools = this.createTools();

    // Get or create memory
    this.memory = globalMemoryStore.getSession(`invoice:${config.userId}`);
  }

  /**
   * Creates invoice tools with user context
   */
  private createTools(): DynamicStructuredTool[] {
    const { userId, companyId } = this.config;

    return [
      createGetInvoiceSummaryToolWithContext(userId, companyId),
      createListInvoiceSeriesToolWithContext(userId, companyId),
      createGetInvoiceDetailsToolWithContext(userId),
      createGetTaxBreakdownToolWithContext(userId, companyId),
      createSearchInvoicesToolWithContext(userId, companyId),
      createGetInvoiceEventsToolWithContext(userId),
      createGetInvoiceErrorsToolWithContext(userId, companyId),
      createGenerateChartTool(), // Tool para gerar gráficos
    ];
  }

  /**
   * Initializes the AgentExecutor (lazy loading)
   */
  private async getExecutor(): Promise<AgentExecutor> {
    if (this.executor) {
      return this.executor;
    }

    const prompt = createInvoiceAgentPrompt();

    const agent = await createOpenAIToolsAgent({
      llm: this.llm,
      tools: this.tools,
      prompt,
    });

    this.executor = new AgentExecutor({
      agent,
      tools: this.tools,
      verbose: this.config.verbose,
      maxIterations: 10,
      returnIntermediateSteps: true,
    });

    return this.executor;
  }

  /**
   * Process a user query
   */
  async chat(input: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const executor = await this.getExecutor();

      const result = await executor.invoke({
        input,
        chat_history: await this.memory.getMessages(),
      });

      // Extract tools used
      const toolsUsed =
        result.intermediateSteps?.map((step: any) => step.action?.tool || 'unknown') || [];

      // Update memory
      await this.memory.addHumanMessage(input);
      await this.memory.addAIMessage(result.output);

      return {
        output: result.output,
        chatHistory: await this.memory.getMessages(),
        toolsUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Invoice agent error:', error);
      throw error;
    }
  }

  /**
   * Process query with streaming
   */
  async *chatStream(input: string): AsyncGenerator<string, AgentResponse, undefined> {
    const startTime = Date.now();

    try {
      const executor = await this.getExecutor();

      const streamResult = await executor.stream({
        input,
        chat_history: this.memory.getMessages(),
      });

      let fullOutput = '';
      const toolsUsed: string[] = [];

      for await (const chunk of streamResult) {
        if (chunk.intermediateSteps) {
          chunk.intermediateSteps.forEach((step: any) => {
            const tool = step.action?.tool;
            if (tool && !toolsUsed.includes(tool)) {
              toolsUsed.push(tool);
            }
          });
        }

        if (chunk.output) {
          const newContent = chunk.output.slice(fullOutput.length);
          fullOutput = chunk.output;
          yield newContent;
        }
      }

      // Update memory
      await this.memory.addHumanMessage(input);
      await this.memory.addAIMessage(fullOutput);

      return {
        output: fullOutput,
        chatHistory: await this.memory.getMessages(),
        toolsUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Invoice agent stream error:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  async clearHistory(): Promise<void> {
    await this.memory.clear();
  }

  /**
   * Get conversation history
   */
  async getHistory(): Promise<BaseMessage[]> {
    return await this.memory.getMessages();
  }

  /**
   * Get agent info
   */
  getInfo() {
    return {
      userId: this.config.userId,
      companyId: this.config.companyId,
      model: this.config.model,
      toolCount: this.tools.length,
      tools: this.tools.map(t => t.name),
    };
  }
}

/**
 * Create a new InvoiceAgent instance
 */
export function createInvoiceAgent(config: InvoiceAgentConfig): InvoiceAgent {
  return new InvoiceAgent(config);
}

// Cache of agent instances by user
const agentCache = new Map<string, InvoiceAgent>();

/**
 * Get or create an InvoiceAgent for a user
 */
export function getOrCreateInvoiceAgent(config: InvoiceAgentConfig): InvoiceAgent {
  const cacheKey = `${config.userId}:${config.companyId || 'default'}`;

  if (agentCache.has(cacheKey)) {
    return agentCache.get(cacheKey)!;
  }

  const agent = new InvoiceAgent(config);
  agentCache.set(cacheKey, agent);

  return agent;
}
