/**
 * LangChain Agents Index
 *
 * Exporta todos os componentes relacionados ao agente de IA.
 *
 * @see US-011: Configuração do LangChain Agent
 */

// Prompt Templates
export {
  QASE_AGENT_SYSTEM_PROMPT,
  CONVERSATION_SUMMARY_PROMPT,
  FALLBACK_RESPONSE_PROMPT,
  SUGGESTIONS_PROMPT,
  createAgentPrompt,
} from "./prompts.js";

// Memory Management
export {
  ConversationMemory,
  SessionMemoryStore,
  globalMemoryStore,
  type MemoryConfig,
  type ChatMessage,
} from "./memory.js";

// Agent
export {
  QaseAgent,
  createQaseAgent,
  getOrCreateAgent,
  removeAgentFromCache,
  clearAgentCache,
  type QaseAgentConfig,
  type AgentResponse,
  type AgentContext,
} from "./qase-agent.js";
