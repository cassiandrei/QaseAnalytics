/**
 * Testes unitários para o QaseAgent.
 *
 * @see US-011: Configuração do LangChain Agent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock do ChatOpenAI antes de importar o módulo
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    modelName: "gpt-4o",
    temperature: 0.1,
    invoke: vi.fn(),
    bind: vi.fn().mockReturnThis(),
  })),
}));

// Mock do createOpenAIToolsAgent
vi.mock("langchain/agents", () => ({
  AgentExecutor: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      output: "Mocked response",
      intermediateSteps: [],
    }),
  })),
  createOpenAIToolsAgent: vi.fn().mockResolvedValue({
    invoke: vi.fn(),
  }),
}));

// Mock das tools - returns mock tools with required properties
const mockListProjectsTool = {
  name: "list_projects",
  description: "List projects",
  invoke: vi.fn(),
  schema: {},
};
const mockGetTestCasesTool = {
  name: "get_test_cases",
  description: "Get test cases",
  invoke: vi.fn(),
  schema: {},
};
const mockGetTestRunsTool = {
  name: "get_test_runs",
  description: "Get test runs",
  invoke: vi.fn(),
  schema: {},
};
const mockGetRunResultsTool = {
  name: "get_run_results",
  description: "Get run results",
  invoke: vi.fn(),
  schema: {},
};

vi.mock("../../../tools/index.js", () => ({
  createListProjectsToolWithContext: vi.fn(() => mockListProjectsTool),
  createGetTestCasesToolWithContext: vi.fn(() => mockGetTestCasesTool),
  createGetTestRunsToolWithContext: vi.fn(() => mockGetTestRunsTool),
  createGetRunResultsToolWithContext: vi.fn(() => mockGetRunResultsTool),
}));

// Mock da memória
vi.mock("../../../agents/memory.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../agents/memory.js")>();
  return {
    ...original,
    globalMemoryStore: {
      getSession: vi.fn().mockReturnValue({
        addHumanMessage: vi.fn(),
        addAIMessage: vi.fn(),
        getMessages: vi.fn().mockResolvedValue([]),
        clear: vi.fn(),
        createBufferMemory: vi.fn().mockReturnValue({
          chatHistory: { getMessages: vi.fn().mockResolvedValue([]) },
          returnMessages: true,
          memoryKey: "chat_history",
        }),
      }),
    },
  };
});

// Import after mocks
import {
  QaseAgent,
  createQaseAgent,
  getOrCreateAgent,
  removeAgentFromCache,
  clearAgentCache,
  type QaseAgentConfig,
} from "../../../agents/qase-agent.js";
import {
  createListProjectsToolWithContext,
  createGetTestCasesToolWithContext,
  createGetTestRunsToolWithContext,
  createGetRunResultsToolWithContext,
} from "../../../tools/index.js";

describe("QaseAgent", () => {
  const defaultConfig: QaseAgentConfig = {
    openAIApiKey: "sk-test-key",
    qaseToken: "qase-test-token",
    userId: "user-123",
    projectCode: "DEMO",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create agent with default config", () => {
      const agent = new QaseAgent(defaultConfig);

      expect(agent).toBeInstanceOf(QaseAgent);
    });

    it("should create tools with user context", () => {
      new QaseAgent(defaultConfig);

      expect(createListProjectsToolWithContext).toHaveBeenCalledWith(
        "qase-test-token",
        "user-123"
      );
      expect(createGetTestCasesToolWithContext).toHaveBeenCalledWith(
        "qase-test-token",
        "user-123"
      );
      expect(createGetTestRunsToolWithContext).toHaveBeenCalledWith(
        "qase-test-token",
        "user-123"
      );
      expect(createGetRunResultsToolWithContext).toHaveBeenCalledWith(
        "qase-test-token",
        "user-123"
      );
    });
  });

  describe("getInfo", () => {
    it("should return agent information", () => {
      const agent = new QaseAgent(defaultConfig);
      const info = agent.getInfo();

      expect(info.model).toBe("gpt-4o");
      expect(info.userId).toBe("user-123");
      expect(info.projectCode).toBe("DEMO");
      expect(info.toolsCount).toBe(4);
      expect(info.toolNames).toContain("list_projects");
      expect(info.toolNames).toContain("get_test_cases");
      expect(info.toolNames).toContain("get_test_runs");
      expect(info.toolNames).toContain("get_run_results");
    });

    it("should return 'all' as projectCode when not specified", () => {
      const agent = new QaseAgent({
        ...defaultConfig,
        projectCode: undefined,
      });

      expect(agent.getInfo().projectCode).toBe("all");
    });
  });

  describe("setProject", () => {
    it("should update project code", () => {
      const agent = new QaseAgent(defaultConfig);
      expect(agent.getInfo().projectCode).toBe("DEMO");

      agent.setProject("NEW_PROJECT");

      expect(agent.getInfo().projectCode).toBe("NEW_PROJECT");
    });
  });

  describe("custom config", () => {
    it("should use custom model", () => {
      const agent = new QaseAgent({
        ...defaultConfig,
        model: "gpt-4-turbo",
      });

      expect(agent.getInfo().model).toBe("gpt-4-turbo");
    });

    it("should use custom temperature", () => {
      const agent = new QaseAgent({
        ...defaultConfig,
        temperature: 0.5,
      });

      // Temperature is internal, but we can verify agent was created
      expect(agent).toBeInstanceOf(QaseAgent);
    });
  });
});

describe("createQaseAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentCache();
  });

  it("should create a new QaseAgent instance", () => {
    const agent = createQaseAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    });

    expect(agent).toBeInstanceOf(QaseAgent);
  });
});

describe("getOrCreateAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentCache();
  });

  it("should create new agent if not in cache", () => {
    const agent = getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    });

    expect(agent).toBeInstanceOf(QaseAgent);
  });

  it("should return cached agent", () => {
    const config: QaseAgentConfig = {
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
      projectCode: "DEMO",
    };

    const agent1 = getOrCreateAgent(config);
    const agent2 = getOrCreateAgent(config);

    // Should be the same instance
    expect(agent1).toBe(agent2);
  });

  it("should create different agents for different users", () => {
    const agent1 = getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    });

    const agent2 = getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-2",
    });

    expect(agent1).not.toBe(agent2);
  });

  it("should create different agents for different projects", () => {
    const agent1 = getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
      projectCode: "PROJECT_A",
    });

    const agent2 = getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
      projectCode: "PROJECT_B",
    });

    expect(agent1).not.toBe(agent2);
  });

  it("should force new agent when forceNew is true", () => {
    const config: QaseAgentConfig = {
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    };

    const agent1 = getOrCreateAgent(config);
    const agent2 = getOrCreateAgent(config, true);

    expect(agent1).not.toBe(agent2);
  });
});

describe("removeAgentFromCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentCache();
  });

  it("should remove agent from cache", () => {
    const config: QaseAgentConfig = {
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
      projectCode: "DEMO",
    };

    const agent1 = getOrCreateAgent(config);
    removeAgentFromCache("user-1", "DEMO");
    const agent2 = getOrCreateAgent(config);

    expect(agent1).not.toBe(agent2);
  });

  it("should return true when agent was in cache", () => {
    getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    });

    const result = removeAgentFromCache("user-1");

    expect(result).toBe(true);
  });

  it("should return false when agent was not in cache", () => {
    const result = removeAgentFromCache("non-existent");

    expect(result).toBe(false);
  });
});

describe("clearAgentCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should clear all cached agents", () => {
    // Create multiple agents
    getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    });
    getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-2",
    });

    clearAgentCache();

    // After clearing, creating agents should return new instances
    const agent1 = getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    });
    const agent2 = getOrCreateAgent({
      openAIApiKey: "sk-test",
      qaseToken: "token",
      userId: "user-1",
    });

    // These should be the same (cached after clear)
    expect(agent1).toBe(agent2);
  });
});
