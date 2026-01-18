/**
 * Testes unitários para o ChatService.
 *
 * @see US-012: Consultas em Linguagem Natural
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// Mock do Prisma
vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock do crypto
vi.mock("../../../lib/crypto.js", () => ({
  decrypt: vi.fn((token: string) => `decrypted-${token}`),
}));

// Mock do env
vi.mock("../../../lib/env.js", () => ({
  env: {
    OPENAI_API_KEY: "sk-test-key",
  },
}));

// Mock do agent e orchestrator - stores reference to mock functions
vi.mock("../../../agents/index.js", () => {
  const chat = vi.fn();
  const getInfo = vi.fn(() => ({
    model: "gpt-4o",
    userId: "user-123",
    projectCode: "DEMO",
    toolsCount: 4,
    toolNames: ["list_projects", "get_test_cases", "get_test_runs", "get_run_results"],
  }));

  const agentMock = {
    chat,
    getInfo,
    setProject: vi.fn(),
    clearHistory: vi.fn(),
  };

  // Mock do orchestrator
  const runOrchestrator = vi.fn().mockResolvedValue({
    response: "Mocked orchestrator response",
    needsProjectSelection: false,
    projects: undefined,
    toolsUsed: ["list_projects"],
    durationMs: 150,
  });

  const runOrchestratorStream = vi.fn();

  const projectContextStore = {
    getProject: vi.fn().mockReturnValue(null),
    setProject: vi.fn(),
    clearProject: vi.fn().mockReturnValue(true),
    clearAll: vi.fn(),
  };

  return {
    getOrCreateAgent: vi.fn(() => agentMock),
    removeAgentFromCache: vi.fn(),
    runOrchestrator,
    runOrchestratorStream,
    projectContextStore,
  };
});

// Mock da memória
vi.mock("../../../agents/memory.js", () => {
  const getMessages = vi.fn(() => Promise.resolve([]));
  const clear = vi.fn(() => Promise.resolve(undefined));

  return {
    globalMemoryStore: {
      getSession: vi.fn(() => ({
        getMessages,
        clear,
      })),
    },
  };
});

// Import after mocks
import {
  sendMessage,
  getChatHistory,
  clearChatHistory,
  getChatSessionStatus,
  setProjectForChat,
  type SendMessageInput,
} from "../../../services/chat.service.js";
import {
  getOrCreateAgent,
  removeAgentFromCache,
  runOrchestrator,
} from "../../../agents/index.js";
import { globalMemoryStore } from "../../../agents/memory.js";
import { prisma } from "../../../lib/prisma.js";

// Helper to get mocked agent
function getMockedAgent() {
  return (getOrCreateAgent as Mock)() as {
    chat: Mock;
    getInfo: Mock;
    setProject: Mock;
    clearHistory: Mock;
  };
}

// Helper to get mocked memory session
function getMockedMemorySession() {
  return (globalMemoryStore.getSession as Mock)() as {
    getMessages: Mock;
    clear: Mock;
  };
}

// Helper to get mocked orchestrator
function getMockedOrchestrator() {
  return runOrchestrator as Mock;
}

describe("ChatService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default user with valid token
    (prisma.user.findUnique as Mock).mockResolvedValue({
      qaseApiToken: "encrypted-token",
      qaseTokenValid: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendMessage", () => {
    const validInput: SendMessageInput = {
      userId: "user-123",
      message: "Quais são meus projetos?",
      projectCode: "DEMO",
    };

    it("should process message successfully", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockResolvedValueOnce({
        response: "Você tem 5 projetos: Project A, Project B...",
        needsProjectSelection: false,
        toolsUsed: ["list_projects"],
        durationMs: 1500,
      });

      const result = await sendMessage(validInput);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message?.content).toBe("Você tem 5 projetos: Project A, Project B...");
      expect(result.message?.role).toBe("assistant");
      expect(result.toolsUsed).toContain("list_projects");
      expect(result.durationMs).toBeDefined();
    });

    it("should return error when message is empty", async () => {
      const result = await sendMessage({
        ...validInput,
        message: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Message is required");
    });

    it("should return error when message is too long", async () => {
      const result = await sendMessage({
        ...validInput,
        message: "a".repeat(2001),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Message is too long (max 2000 characters)");
    });

    it("should return error when user is not connected to Qase", async () => {
      (prisma.user.findUnique as Mock).mockResolvedValueOnce(null);

      const result = await sendMessage(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Please connect your Qase account first");
    });

    it("should return error when Qase token is invalid", async () => {
      (prisma.user.findUnique as Mock).mockResolvedValueOnce({
        qaseApiToken: "token",
        qaseTokenValid: false,
      });

      const result = await sendMessage(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Please connect your Qase account first");
    });

    it("should call orchestrator with correct config", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockResolvedValueOnce({
        response: "Response",
        needsProjectSelection: false,
        toolsUsed: [],
        durationMs: 100,
      });

      await sendMessage(validInput);

      expect(orchestrator).toHaveBeenCalledWith(
        {
          openAIApiKey: "sk-test-key",
          qaseToken: "decrypted-encrypted-token",
          userId: "user-123",
          projectCode: "DEMO",
        },
        "Quais são meus projetos?"
      );
    });

    it("should handle orchestrator errors gracefully", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockRejectedValueOnce(new Error("Orchestrator error"));

      const result = await sendMessage(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("I encountered an error processing your request. Please try again.");
    });

    it("should handle rate limit errors", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockRejectedValueOnce(new Error("429 rate_limit exceeded"));

      const result = await sendMessage(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limit exceeded");
    });

    it("should handle timeout errors", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockRejectedValueOnce(new Error("timeout exceeded"));

      const result = await sendMessage(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
    });

    it("should include tools used in response", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockResolvedValueOnce({
        response: "Response with multiple tools",
        needsProjectSelection: false,
        toolsUsed: ["list_projects", "get_test_cases", "get_test_runs"],
        durationMs: 3000,
      });

      const result = await sendMessage(validInput);

      expect(result.toolsUsed).toEqual(["list_projects", "get_test_cases", "get_test_runs"]);
    });
  });

  describe("getChatHistory", () => {
    it("should return empty history for new user", async () => {
      const memory = getMockedMemorySession();
      memory.getMessages.mockResolvedValueOnce([]);

      const history = await getChatHistory("user-123");

      expect(history.messages).toEqual([]);
      expect(globalMemoryStore.getSession).toHaveBeenCalledWith("user-123");
    });

    it("should return formatted messages", async () => {
      const memory = getMockedMemorySession();
      memory.getMessages.mockResolvedValueOnce([
        {
          _getType: () => "human",
          content: "Hello",
        },
        {
          _getType: () => "ai",
          content: "Hi there!",
        },
      ]);

      const history = await getChatHistory("user-123");

      expect(history.messages).toHaveLength(2);
      expect(history.messages[0].role).toBe("user");
      expect(history.messages[0].content).toBe("Hello");
      expect(history.messages[1].role).toBe("assistant");
      expect(history.messages[1].content).toBe("Hi there!");
    });
  });

  describe("clearChatHistory", () => {
    it("should clear memory session", async () => {
      const memory = getMockedMemorySession();
      await clearChatHistory("user-123");

      expect(globalMemoryStore.getSession).toHaveBeenCalledWith("user-123");
      expect(memory.clear).toHaveBeenCalled();
    });

    it("should remove agent from cache", async () => {
      await clearChatHistory("user-123", "DEMO");

      expect(removeAgentFromCache).toHaveBeenCalledWith("user-123", "DEMO");
    });
  });

  describe("getChatSessionStatus", () => {
    it("should return inactive when user not connected", async () => {
      (prisma.user.findUnique as Mock).mockResolvedValueOnce(null);

      const status = await getChatSessionStatus("user-123");

      expect(status.active).toBe(false);
      expect(status.messageCount).toBe(0);
    });

    it("should return active status with agent info", async () => {
      const memory = getMockedMemorySession();
      memory.getMessages.mockResolvedValueOnce([
        { _getType: () => "human", content: "Hello" },
        { _getType: () => "ai", content: "Hi" },
      ]);

      const status = await getChatSessionStatus("user-123");

      expect(status.active).toBe(true);
      expect(status.agentInfo).toBeDefined();
      expect(status.agentInfo?.model).toBe("gpt-4o");
      expect(status.agentInfo?.toolsCount).toBe(4);
      expect(status.messageCount).toBe(2);
    });
  });

  describe("setProjectForChat", () => {
    it("should successfully change project", async () => {
      const result = await setProjectForChat("user-123", "NEW_PROJECT");

      expect(result.success).toBe(true);
      expect(result.message).toContain("NEW_PROJECT");
      expect(removeAgentFromCache).toHaveBeenCalledWith("user-123");
    });

    it("should return error when user not connected", async () => {
      (prisma.user.findUnique as Mock).mockResolvedValueOnce(null);

      const result = await setProjectForChat("user-123", "NEW_PROJECT");

      expect(result.success).toBe(false);
      expect(result.message).toContain("connect your Qase account");
    });
  });
});

describe("ChatService - Message validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as Mock).mockResolvedValue({
      qaseApiToken: "encrypted-token",
      qaseTokenValid: true,
    });
  });

  it("should allow messages up to 2000 characters", async () => {
    const orchestrator = getMockedOrchestrator();
    orchestrator.mockResolvedValue({
      response: "Response",
      needsProjectSelection: false,
      toolsUsed: [],
      durationMs: 100,
    });

    const result = await sendMessage({
      userId: "user-123",
      message: "a".repeat(2000),
    });

    expect(result.success).toBe(true);
  });

  it("should reject messages over 2000 characters", async () => {
    const result = await sendMessage({
      userId: "user-123",
      message: "a".repeat(2001),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("too long");
  });
});

describe("ChatService - Response format", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as Mock).mockResolvedValue({
      qaseApiToken: "encrypted-token",
      qaseTokenValid: true,
    });
  });

  it("should generate unique message IDs", async () => {
    const orchestrator = getMockedOrchestrator();
    orchestrator.mockResolvedValueOnce({
      response: "Response 1",
      needsProjectSelection: false,
      toolsUsed: [],
      durationMs: 100,
    });

    const result1 = await sendMessage({
      userId: "user-123",
      message: "First message",
    });

    orchestrator.mockResolvedValueOnce({
      response: "Response 2",
      needsProjectSelection: false,
      toolsUsed: [],
      durationMs: 100,
    });

    const result2 = await sendMessage({
      userId: "user-123",
      message: "Second message",
    });

    expect(result1.message?.id).toBeDefined();
    expect(result2.message?.id).toBeDefined();
    expect(result1.message?.id).not.toBe(result2.message?.id);
  });

  it("should include timestamp in response", async () => {
    const orchestrator = getMockedOrchestrator();
    orchestrator.mockResolvedValue({
      response: "Response",
      needsProjectSelection: false,
      toolsUsed: [],
      durationMs: 100,
    });

    const result = await sendMessage({
      userId: "user-123",
      message: "Test message",
    });

    expect(result.message?.timestamp).toBeInstanceOf(Date);
  });

  it("should include duration in milliseconds", async () => {
    const orchestrator = getMockedOrchestrator();
    orchestrator.mockResolvedValue({
      response: "Response",
      needsProjectSelection: false,
      toolsUsed: [],
      durationMs: 2500,
    });

    const result = await sendMessage({
      userId: "user-123",
      message: "Test message",
    });

    expect(result.durationMs).toBeDefined();
    expect(typeof result.durationMs).toBe("number");
  });
});
