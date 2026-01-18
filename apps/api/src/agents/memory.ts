/**
 * Memory Buffer para Contexto de Conversa
 *
 * Gerencia o histórico de mensagens do chat para manter contexto
 * entre interações com o agente.
 *
 * @see US-011: Configuração do LangChain Agent
 * @see US-013: Memória Conversacional
 */

import { BufferMemory, BufferWindowMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

/** Configuração padrão de memória */
export interface MemoryConfig {
  /** Número máximo de mensagens a manter (window mode) */
  maxMessages?: number;
  /** Limite de tokens para contexto */
  maxTokens?: number;
  /** Chave para input humano */
  humanPrefix?: string;
  /** Chave para output do AI */
  aiPrefix?: string;
}

/** Configuração padrão */
const DEFAULT_CONFIG: Required<MemoryConfig> = {
  maxMessages: 20,
  maxTokens: 4096,
  humanPrefix: "Human",
  aiPrefix: "AI",
};

/**
 * Representa uma mensagem no histórico.
 */
export interface ChatMessage {
  role: "human" | "ai" | "system";
  content: string;
  timestamp?: Date;
}

/**
 * Gerenciador de memória conversacional.
 * Mantém histórico de mensagens e fornece acesso ao contexto.
 */
export class ConversationMemory {
  private history: ChatMessageHistory;
  private config: Required<MemoryConfig>;

  constructor(config: MemoryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.history = new ChatMessageHistory();
  }

  /**
   * Adiciona uma mensagem humana ao histórico.
   */
  async addHumanMessage(content: string): Promise<void> {
    await this.history.addMessage(new HumanMessage(content));
    await this.trimHistory();
  }

  /**
   * Adiciona uma mensagem do AI ao histórico.
   */
  async addAIMessage(content: string): Promise<void> {
    await this.history.addMessage(new AIMessage(content));
    await this.trimHistory();
  }

  /**
   * Adiciona uma mensagem do sistema ao histórico.
   */
  async addSystemMessage(content: string): Promise<void> {
    await this.history.addMessage(new SystemMessage(content));
  }

  /**
   * Obtém todas as mensagens do histórico.
   */
  async getMessages(): Promise<BaseMessage[]> {
    return this.history.getMessages();
  }

  /**
   * Obtém o histórico como array de ChatMessage.
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    const messages = await this.history.getMessages();
    return messages.map((msg) => ({
      role: this.getMessageRole(msg),
      content: msg.content as string,
    }));
  }

  /**
   * Limpa todo o histórico.
   */
  async clear(): Promise<void> {
    await this.history.clear();
  }

  /**
   * Obtém o número de mensagens no histórico.
   */
  async getMessageCount(): Promise<number> {
    const messages = await this.history.getMessages();
    return messages.length;
  }

  /**
   * Cria um BufferMemory do LangChain a partir deste histórico.
   * Útil para integração com agents.
   */
  createBufferMemory(): BufferMemory {
    return new BufferMemory({
      chatHistory: this.history,
      returnMessages: true,
      memoryKey: "chat_history",
      inputKey: "input",
      outputKey: "output",
    });
  }

  /**
   * Cria um BufferWindowMemory do LangChain (janela deslizante).
   * Mantém apenas as últimas N interações.
   */
  createWindowMemory(k: number = 10): BufferWindowMemory {
    return new BufferWindowMemory({
      chatHistory: this.history,
      returnMessages: true,
      memoryKey: "chat_history",
      inputKey: "input",
      outputKey: "output",
      k,
    });
  }

  /**
   * Determina o role de uma mensagem.
   */
  private getMessageRole(msg: BaseMessage): "human" | "ai" | "system" {
    if (msg instanceof HumanMessage) return "human";
    if (msg instanceof AIMessage) return "ai";
    if (msg instanceof SystemMessage) return "system";
    return "human";
  }

  /**
   * Remove mensagens antigas se exceder o limite.
   */
  private async trimHistory(): Promise<void> {
    const messages = await this.history.getMessages();

    if (messages.length > this.config.maxMessages) {
      // Remove as mensagens mais antigas, mantendo as últimas maxMessages
      const toKeep = messages.slice(-this.config.maxMessages);
      await this.history.clear();

      for (const msg of toKeep) {
        await this.history.addMessage(msg);
      }
    }
  }
}

/**
 * Store de memória por sessão.
 * Gerencia múltiplas conversas independentes.
 */
export class SessionMemoryStore {
  private sessions: Map<string, ConversationMemory>;
  private config: MemoryConfig;

  constructor(config: MemoryConfig = {}) {
    this.sessions = new Map();
    this.config = config;
  }

  /**
   * Obtém ou cria a memória para uma sessão.
   */
  getSession(sessionId: string): ConversationMemory {
    let memory = this.sessions.get(sessionId);

    if (!memory) {
      memory = new ConversationMemory(this.config);
      this.sessions.set(sessionId, memory);
    }

    return memory;
  }

  /**
   * Verifica se uma sessão existe.
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Remove uma sessão.
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Limpa todas as sessões.
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }

  /**
   * Obtém o número de sessões ativas.
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Lista IDs de todas as sessões ativas.
   */
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

/**
 * Instância global do store de sessões.
 * Em produção, considere usar Redis para persistência.
 */
export const globalMemoryStore = new SessionMemoryStore({
  maxMessages: 20,
  maxTokens: 4096,
});
