/**
 * LangGraph Orchestrator
 *
 * State machine que gerencia o fluxo de execução do agente,
 * incluindo resolução de projetos e contexto.
 *
 * @see US-012: Consultas em Linguagem Natural
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";

import { listProjectsWithCache } from "../tools/index.js";
import { getOrCreateAgent, type QaseAgentConfig } from "./qase-agent.js";
import { globalMemoryStore } from "./memory.js";

/** Projeto simplificado */
export interface Project {
  code: string;
  title: string;
}

/** Estado do orchestrator */
export const OrchestratorState = Annotation.Root({
  /** Mensagem original do usuário */
  input: Annotation<string>,
  /** ID do usuário */
  userId: Annotation<string>,
  /** Token da API do Qase */
  qaseToken: Annotation<string>,
  /** API Key da OpenAI */
  openAIApiKey: Annotation<string>,
  /** Código do projeto selecionado */
  projectCode: Annotation<string | null>,
  /** Lista de projetos disponíveis */
  projects: Annotation<Project[] | null>,
  /** Flag indicando se precisa selecionar projeto */
  needsProjectSelection: Annotation<boolean>,
  /** Resposta final do agente */
  response: Annotation<string | null>,
  /** Histórico de mensagens */
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  /** Tools utilizadas */
  toolsUsed: Annotation<string[]>({
    reducer: (prev, next) => [...new Set([...prev, ...next])],
    default: () => [],
  }),
  /** Duração em ms */
  durationMs: Annotation<number>,
  /** Erro durante execução */
  error: Annotation<string | null>,
  /** Intent classificado */
  intent: Annotation<"query_data" | "list_projects" | "select_project" | "general">,
});

/** Tipo do estado */
export type OrchestratorStateType = typeof OrchestratorState.State;

/** Configuração do orchestrator */
export interface OrchestratorConfig {
  openAIApiKey: string;
  qaseToken: string;
  userId: string;
  projectCode?: string | null;
  verbose?: boolean;
}

/** Resultado do orchestrator */
export interface OrchestratorResult {
  response: string;
  needsProjectSelection: boolean;
  projects?: Project[];
  toolsUsed: string[];
  durationMs: number;
}

/**
 * Cria o LLM para classificação de intents.
 */
function createClassifierLLM(apiKey: string): ChatOpenAI {
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    openAIApiKey: apiKey,
  });
}

/**
 * Schema para classificação de intent.
 */
const IntentSchema = z.object({
  intent: z.enum(["query_data", "list_projects", "select_project", "general"]).describe(
    "The classified intent of the user message"
  ),
  needsProject: z.boolean().describe("Whether this intent requires a project to be selected"),
  extractedProjectCode: z.string().nullable().describe(
    "Project code mentioned in the message, if any (e.g., 'GV', 'DEMO')"
  ),
});

type IntentClassification = z.infer<typeof IntentSchema>;

/**
 * Classifica a intenção do usuário.
 */
async function classifyIntent(
  input: string,
  llm: ChatOpenAI
): Promise<IntentClassification> {
  // Use function calling with JSON schema for structured output
  const response = await llm.invoke(
    [
      {
        role: "system",
        content: `You are an intent classifier for a QA analytics assistant that works with Qase.io.

Classify the user's message into one of these intents:
- "list_projects": User wants to see their available projects
- "select_project": User wants to select/change the active project
- "query_data": User wants to query test data (cases, runs, results, metrics)
- "general": General conversation, greetings, or unclear intent

Also determine:
- needsProject: true if the query_data intent requires a specific project
- extractedProjectCode: if the user mentions a project code (e.g., "projeto GV", "project DEMO")

Examples:
- "quais são meus projetos?" -> list_projects, needsProject: false
- "mostre os casos de teste" -> query_data, needsProject: true
- "mostre os casos do projeto GV" -> query_data, needsProject: false (project mentioned)
- "use o projeto DEMO" -> select_project, needsProject: false
- "olá" -> general, needsProject: false
- "qual a taxa de falha?" -> query_data, needsProject: true

Respond with a JSON object with these exact fields:
- intent: one of "query_data", "list_projects", "select_project", "general"
- needsProject: boolean
- extractedProjectCode: string or null`,
      },
      {
        role: "user",
        content: input,
      },
    ],
    {
      response_format: { type: "json_object" },
    }
  );

  try {
    const content = response.content as string;
    const parsed = JSON.parse(content);

    return {
      intent: parsed.intent ?? "general",
      needsProject: parsed.needsProject ?? false,
      extractedProjectCode: parsed.extractedProjectCode ?? null,
    };
  } catch {
    // Fallback to general intent if parsing fails
    return {
      intent: "general",
      needsProject: false,
      extractedProjectCode: null,
    };
  }
}

/**
 * Node: Analisa a intenção do usuário.
 */
async function analyzeIntentNode(
  state: OrchestratorStateType
): Promise<Partial<OrchestratorStateType>> {
  const llm = createClassifierLLM(state.openAIApiKey);
  const classification = await classifyIntent(state.input, llm);

  // Se projeto foi mencionado, usa ele
  if (classification.extractedProjectCode) {
    return {
      intent: classification.intent,
      projectCode: classification.extractedProjectCode,
      needsProjectSelection: false,
    };
  }

  // Se já tem projeto selecionado, não precisa resolver
  if (state.projectCode) {
    return {
      intent: classification.intent,
      needsProjectSelection: false,
    };
  }

  // Se precisa de projeto e não tem, marca para resolver
  if (classification.needsProject) {
    return {
      intent: classification.intent,
      needsProjectSelection: true,
    };
  }

  return {
    intent: classification.intent,
    needsProjectSelection: false,
  };
}

/**
 * Node: Busca projetos disponíveis.
 */
async function resolveProjectNode(
  state: OrchestratorStateType
): Promise<Partial<OrchestratorStateType>> {
  try {
    const result = await listProjectsWithCache(state.qaseToken, state.userId, {
      limit: 100,
      offset: 0,
    });

    if (!result.success || result.projects.length === 0) {
      return {
        projects: [],
        error: "No projects found in your Qase account.",
        needsProjectSelection: false,
      };
    }

    const projects: Project[] = result.projects.map((p) => ({
      code: p.code,
      title: p.title,
    }));

    // Se tem apenas 1 projeto, auto-seleciona
    if (projects.length === 1 && projects[0]) {
      return {
        projects,
        projectCode: projects[0].code,
        needsProjectSelection: false,
      };
    }

    // Múltiplos projetos - precisa perguntar ao usuário
    return {
      projects,
      needsProjectSelection: true,
    };
  } catch (error) {
    console.error("Error resolving projects:", error);
    return {
      error: "Failed to fetch projects. Please try again.",
      needsProjectSelection: false,
    };
  }
}

/**
 * Node: Gera pergunta para seleção de projeto.
 */
async function askProjectSelectionNode(
  state: OrchestratorStateType
): Promise<Partial<OrchestratorStateType>> {
  const projects = state.projects ?? [];

  if (projects.length === 0) {
    return {
      response: "You don't have any projects in your Qase account yet.",
      needsProjectSelection: false,
    };
  }

  const projectList = projects
    .map((p) => `- **${p.code}**: ${p.title}`)
    .join("\n");

  const exampleProject = projects[0]?.code ?? "CODE";
  const response = `Para continuar, preciso saber qual projeto você quer analisar.

Seus projetos disponíveis:
${projectList}

Por favor, mencione o código do projeto (ex: "use o projeto ${exampleProject}") ou reformule sua pergunta incluindo o projeto.`;

  return {
    response,
    needsProjectSelection: true,
    toolsUsed: ["list_projects"],
  };
}

/**
 * Node: Executa o QaseAgent com contexto completo.
 */
async function executeAgentNode(
  state: OrchestratorStateType
): Promise<Partial<OrchestratorStateType>> {
  const startTime = Date.now();

  try {
    const config: QaseAgentConfig = {
      openAIApiKey: state.openAIApiKey,
      qaseToken: state.qaseToken,
      userId: state.userId,
      projectCode: state.projectCode ?? undefined,
    };

    const agent = getOrCreateAgent(config);
    const result = await agent.chat(state.input);

    return {
      response: result.output,
      toolsUsed: result.toolsUsed,
      durationMs: Date.now() - startTime,
      messages: [new AIMessage(result.output)],
      needsProjectSelection: false,
    };
  } catch (error) {
    console.error("Error executing agent:", error);
    return {
      response: "I encountered an error processing your request. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
      needsProjectSelection: false,
    };
  }
}

/**
 * Node: Responde com listagem de projetos.
 */
async function listProjectsNode(
  state: OrchestratorStateType
): Promise<Partial<OrchestratorStateType>> {
  const startTime = Date.now();

  try {
    const result = await listProjectsWithCache(state.qaseToken, state.userId, {
      limit: 100,
      offset: 0,
    });

    if (!result.success) {
      return {
        response: `Failed to list projects: ${result.error}`,
        durationMs: Date.now() - startTime,
        needsProjectSelection: false,
      };
    }

    if (result.projects.length === 0) {
      return {
        response: "You don't have any projects in your Qase account yet.",
        durationMs: Date.now() - startTime,
        needsProjectSelection: false,
      };
    }

    const projectList = result.projects
      .map((p) => `- **${p.code}**: ${p.title} (${p.casesCount ?? 0} test cases)`)
      .join("\n");

    const exampleCode = result.projects[0]?.code ?? "CODE";
    const response = `Você tem ${result.total} projeto(s) disponíveis:\n\n${projectList}\n\nPara analisar um projeto específico, diga por exemplo: "mostre os casos de teste do projeto ${exampleCode}"`;

    return {
      response,
      projects: result.projects.map((p) => ({ code: p.code, title: p.title })),
      toolsUsed: ["list_projects"],
      durationMs: Date.now() - startTime,
      needsProjectSelection: false,
    };
  } catch (error) {
    console.error("Error listing projects:", error);
    return {
      response: "Failed to list projects. Please try again.",
      durationMs: Date.now() - startTime,
      needsProjectSelection: false,
    };
  }
}

/**
 * Node: Seleciona um projeto.
 */
async function selectProjectNode(
  state: OrchestratorStateType
): Promise<Partial<OrchestratorStateType>> {
  // O projeto já foi extraído em analyzeIntent
  if (state.projectCode) {
    return {
      response: `Projeto **${state.projectCode}** selecionado. O que você gostaria de saber sobre ele?`,
      needsProjectSelection: false,
    };
  }

  // Se não tem projeto extraído, lista para o usuário escolher
  return {
    needsProjectSelection: true,
  };
}

/**
 * Node: Resposta genérica.
 * Inclui histórico de conversação para manter contexto.
 */
async function generalResponseNode(
  state: OrchestratorStateType
): Promise<Partial<OrchestratorStateType>> {
  const llm = createClassifierLLM(state.openAIApiKey);

  // Obtém histórico de conversação da memória global
  const memory = globalMemoryStore.getSession(state.userId);
  const chatHistory = await memory.getMessages();

  // Converte histórico para formato de mensagens do LLM
  const historyMessages = chatHistory.map((msg) => ({
    role: msg._getType() === "human" ? "user" as const : "assistant" as const,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
  }));

  const response = await llm.invoke([
    {
      role: "system",
      content: `You are QaseAnalytics AI, a helpful assistant for QA analytics.
Respond to general messages in a friendly way.
If the user seems confused, explain what you can help with:
- List their Qase.io projects
- Show test cases for a project
- Show test runs and results
- Calculate metrics like pass rate
- Generate charts and visualizations

Keep responses concise and helpful.
IMPORTANT: Use the conversation history to understand context. If the user refers to something mentioned before, use that context.`,
    },
    ...historyMessages,
    {
      role: "user",
      content: state.input,
    },
  ]);

  // Salva a interação na memória
  await memory.addHumanMessage(state.input);
  await memory.addAIMessage(response.content as string);

  return {
    response: response.content as string,
    needsProjectSelection: false,
  };
}

/**
 * Função de roteamento após análise de intent.
 */
function routeAfterIntent(
  state: OrchestratorStateType
): "resolveProject" | "executeAgent" | "listProjects" | "selectProject" | "generalResponse" {
  // Se houve erro, vai para resposta geral
  if (state.error) {
    return "generalResponse";
  }

  // Roteamento baseado no intent
  switch (state.intent) {
    case "list_projects":
      return "listProjects";

    case "select_project":
      if (state.projectCode) {
        return "selectProject";
      }
      return "resolveProject";

    case "query_data":
      // Se precisa de projeto e não tem, resolve primeiro
      if (state.needsProjectSelection && !state.projectCode) {
        return "resolveProject";
      }
      return "executeAgent";

    case "general":
    default:
      return "generalResponse";
  }
}

/**
 * Função de roteamento após resolução de projeto.
 */
function routeAfterResolve(
  state: OrchestratorStateType
): "askProjectSelection" | "executeAgent" {
  // Se ainda precisa selecionar projeto, pergunta
  if (state.needsProjectSelection) {
    return "askProjectSelection";
  }

  // Projeto foi auto-selecionado, executa
  return "executeAgent";
}

/**
 * Cria o grafo do orchestrator.
 */
export function createOrchestratorGraph() {
  const graph = new StateGraph(OrchestratorState)
    // Nodes
    .addNode("analyzeIntent", analyzeIntentNode)
    .addNode("resolveProject", resolveProjectNode)
    .addNode("askProjectSelection", askProjectSelectionNode)
    .addNode("executeAgent", executeAgentNode)
    .addNode("listProjects", listProjectsNode)
    .addNode("selectProject", selectProjectNode)
    .addNode("generalResponse", generalResponseNode)

    // Edges
    .addEdge(START, "analyzeIntent")
    .addConditionalEdges("analyzeIntent", routeAfterIntent, [
      "resolveProject",
      "executeAgent",
      "listProjects",
      "selectProject",
      "generalResponse",
    ])
    .addConditionalEdges("resolveProject", routeAfterResolve, [
      "askProjectSelection",
      "executeAgent",
    ])
    .addEdge("askProjectSelection", END)
    .addEdge("executeAgent", END)
    .addEdge("listProjects", END)
    .addEdge("selectProject", END)
    .addEdge("generalResponse", END);

  return graph.compile();
}

/**
 * Store de projetos selecionados por sessão.
 * Persiste o projeto escolhido entre mensagens.
 */
class ProjectContextStore {
  private contexts: Map<string, string> = new Map();

  getProject(userId: string): string | null {
    return this.contexts.get(userId) ?? null;
  }

  setProject(userId: string, projectCode: string): void {
    this.contexts.set(userId, projectCode);
  }

  clearProject(userId: string): boolean {
    return this.contexts.delete(userId);
  }

  clearAll(): void {
    this.contexts.clear();
  }
}

/** Store global de contexto de projetos */
export const projectContextStore = new ProjectContextStore();

/**
 * Executa o orchestrator para uma mensagem.
 *
 * @param config - Configuração do orchestrator
 * @param message - Mensagem do usuário
 * @returns Resultado com resposta e metadados
 */
export async function runOrchestrator(
  config: OrchestratorConfig,
  message: string
): Promise<OrchestratorResult> {
  const startTime = Date.now();

  // Recupera projeto do contexto se não fornecido
  let projectCode = config.projectCode;
  if (!projectCode) {
    projectCode = projectContextStore.getProject(config.userId);
  }

  const graph = createOrchestratorGraph();

  const initialState: Partial<OrchestratorStateType> = {
    input: message,
    userId: config.userId,
    qaseToken: config.qaseToken,
    openAIApiKey: config.openAIApiKey,
    projectCode,
    projects: null,
    needsProjectSelection: false,
    response: null,
    messages: [new HumanMessage(message)],
    toolsUsed: [],
    durationMs: 0,
    error: null,
    intent: "general",
  };

  try {
    console.log("[Orchestrator] Starting with state:", {
      input: message,
      userId: config.userId,
      projectCode,
      hasQaseToken: !!config.qaseToken,
      hasOpenAIKey: !!config.openAIApiKey,
    });

    const result = await graph.invoke(initialState);

    console.log("[Orchestrator] Completed:", {
      intent: result.intent,
      hasResponse: !!result.response,
      needsProjectSelection: result.needsProjectSelection,
      toolsUsed: result.toolsUsed,
      error: result.error,
    });

    // Atualiza o contexto se um projeto foi selecionado
    if (result.projectCode && result.projectCode !== projectCode) {
      projectContextStore.setProject(config.userId, result.projectCode);
    }

    return {
      response: result.response ?? "I couldn't process your request.",
      needsProjectSelection: result.needsProjectSelection ?? false,
      projects: result.projects ?? undefined,
      toolsUsed: result.toolsUsed ?? [],
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    console.error("[Orchestrator] Error stack:", error instanceof Error ? error.stack : "no stack");
    return {
      response: "I encountered an error processing your request. Please try again.",
      needsProjectSelection: false,
      toolsUsed: [],
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Callbacks para streaming do orchestrator.
 */
export interface OrchestratorStreamCallbacks {
  onToken: (token: string) => void | Promise<void>;
  onToolStart?: (toolName: string) => void | Promise<void>;
  onToolEnd?: (toolName: string) => void | Promise<void>;
  onProjectsFound?: (projects: Project[]) => void | Promise<void>;
  onNeedsProjectSelection?: (projects: Project[]) => void | Promise<void>;
  onError?: (error: string) => void | Promise<void>;
  onDone?: (result: OrchestratorResult) => void | Promise<void>;
}

/**
 * Executa o orchestrator com streaming.
 *
 * @param config - Configuração
 * @param message - Mensagem do usuário
 * @param callbacks - Callbacks para eventos
 */
export async function runOrchestratorStream(
  config: OrchestratorConfig,
  message: string,
  callbacks: OrchestratorStreamCallbacks
): Promise<void> {
  const startTime = Date.now();

  // Recupera projeto do contexto se não fornecido
  let projectCode = config.projectCode;
  if (!projectCode) {
    projectCode = projectContextStore.getProject(config.userId);
  }

  const graph = createOrchestratorGraph();

  const initialState: Partial<OrchestratorStateType> = {
    input: message,
    userId: config.userId,
    qaseToken: config.qaseToken,
    openAIApiKey: config.openAIApiKey,
    projectCode,
    projects: null,
    needsProjectSelection: false,
    response: null,
    messages: [new HumanMessage(message)],
    toolsUsed: [],
    durationMs: 0,
    error: null,
    intent: "general",
  };

  try {
    // Stream events from the graph
    const eventStream = graph.streamEvents(initialState, { version: "v2" });

    let finalResult: Partial<OrchestratorStateType> = {};
    const toolsUsed: string[] = [];

    // Track which node is currently executing
    let currentNode = "";

    for await (const event of eventStream) {
      // Track node transitions
      if (event.event === "on_chain_start" && event.name) {
        currentNode = event.name;
      }

      // Tokens do LLM - only stream from response nodes, not from intent classifier
      if (event.event === "on_chat_model_stream") {
        // Skip tokens from the intent classifier (analyzeIntent node)
        // The classifier outputs JSON which shouldn't be shown to users
        const isClassifier = currentNode === "analyzeIntent" ||
          (event.metadata?.langgraph_node === "analyzeIntent");

        if (!isClassifier) {
          const chunk = event.data?.chunk;
          if (chunk?.content) {
            const token = typeof chunk.content === "string"
              ? chunk.content
              : chunk.content[0]?.text || "";
            if (token) {
              await callbacks.onToken(token);
            }
          }
        }
      }

      // Tool start
      if (event.event === "on_tool_start") {
        const toolName = event.name;
        if (toolName && !toolsUsed.includes(toolName)) {
          toolsUsed.push(toolName);
          await callbacks.onToolStart?.(toolName);
        }
      }

      // Tool end
      if (event.event === "on_tool_end") {
        await callbacks.onToolEnd?.(event.name);
      }

      // Chain end - captura resultado final
      if (event.event === "on_chain_end") {
        if (event.data?.output) {
          finalResult = { ...finalResult, ...event.data.output };
        }
      }
    }

    // Notifica se precisa selecionar projeto
    if (finalResult.needsProjectSelection && finalResult.projects) {
      await callbacks.onNeedsProjectSelection?.(finalResult.projects);
    }

    // Atualiza o contexto se um projeto foi selecionado
    if (finalResult.projectCode && finalResult.projectCode !== projectCode) {
      projectContextStore.setProject(config.userId, finalResult.projectCode);
    }

    // Se a resposta não foi streamada (como em askProjectSelection), envia toda
    if (finalResult.response && !finalResult.response.includes("[streamed]")) {
      // Para respostas que não vieram de streaming, emite token por token
      for (const char of finalResult.response) {
        await callbacks.onToken(char);
      }
    }

    const result: OrchestratorResult = {
      response: finalResult.response ?? "I couldn't process your request.",
      needsProjectSelection: finalResult.needsProjectSelection ?? false,
      projects: finalResult.projects ?? undefined,
      toolsUsed: [...toolsUsed, ...(finalResult.toolsUsed ?? [])],
      durationMs: Date.now() - startTime,
    };

    await callbacks.onDone?.(result);
  } catch (error) {
    console.error("Orchestrator stream error:", error);
    await callbacks.onError?.("I encountered an error processing your request.");
  }
}
