/**
 * Testes de integração para a rota de Chat.
 *
 * @see US-012: Consultas em Linguagem Natural
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { Hono } from "hono";

// Mock do Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock do crypto
vi.mock("../../lib/crypto.js", () => ({
  decrypt: vi.fn((token: string) => `decrypted-${token}`),
}));

// Mock do env
vi.mock("../../lib/env.js", () => ({
  env: {
    OPENAI_API_KEY: "sk-test-key",
  },
}));

// Mock do agent e orchestrator - stores reference to mock functions
vi.mock("../../agents/index.js", () => {
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
vi.mock("../../agents/memory.js", () => {
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

// Import routes after mocks
import { chatRoutes } from "../../routes/chat.js";
import { prisma } from "../../lib/prisma.js";
import { getOrCreateAgent, runOrchestrator, projectContextStore } from "../../agents/index.js";
import { globalMemoryStore } from "../../agents/memory.js";

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

describe("Chat Routes Integration", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default user with valid token
    (prisma.user.findUnique as Mock).mockResolvedValue({
      qaseApiToken: "encrypted-token",
      qaseTokenValid: true,
    });

    // Setup app with userId middleware
    app = new Hono();
    app.use("*", async (c, next) => {
      const userId = c.req.header("X-User-Id");
      if (userId) {
        c.set("userId" as never, userId);
      }
      await next();
    });
    app.route("/api/chat", chatRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/chat/message", () => {
    it("should process message and return response", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockResolvedValueOnce({
        response: "Você tem 3 projetos no Qase.",
        needsProjectSelection: false,
        toolsUsed: ["list_projects"],
        durationMs: 1200,
      });

      const res = await app.request("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({
          message: "Quais são meus projetos?",
          projectCode: "DEMO",
        }),
      });

      expect(res.status).toBe(200);

      const data = await res.json() as { success: boolean; message: { content: string; role: string }; toolsUsed: string[]; durationMs: number };
      expect(data.success).toBe(true);
      expect(data.message.content).toBe("Você tem 3 projetos no Qase.");
      expect(data.message.role).toBe("assistant");
      expect(data.toolsUsed).toContain("list_projects");
      expect(data.durationMs).toBeDefined();
    });

    it("should return 401 without authentication", async () => {
      const res = await app.request("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Test message",
        }),
      });

      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentication required");
    });

    it("should validate message is required", async () => {
      const res = await app.request("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("should validate message max length", async () => {
      const res = await app.request("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({
          message: "a".repeat(2001),
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 when user not connected to Qase", async () => {
      (prisma.user.findUnique as Mock).mockResolvedValueOnce(null);

      const res = await app.request("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({
          message: "Test message",
        }),
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("connect your Qase account");
    });

    it("should handle orchestrator errors gracefully", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockRejectedValueOnce(new Error("Orchestrator error"));

      const res = await app.request("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({
          message: "Test message",
        }),
      });

      expect(res.status).toBe(400);

      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(false);
    });

    it("should process message without projectCode", async () => {
      const orchestrator = getMockedOrchestrator();
      orchestrator.mockResolvedValueOnce({
        response: "Response without project context",
        needsProjectSelection: false,
        toolsUsed: [],
        durationMs: 500,
      });

      const res = await app.request("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({
          message: "Hello",
        }),
      });

      expect(res.status).toBe(200);

      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/chat/history", () => {
    it("should return empty history for new user", async () => {
      const memory = getMockedMemorySession();
      memory.getMessages.mockResolvedValueOnce([]);

      const res = await app.request("/api/chat/history", {
        method: "GET",
        headers: {
          "X-User-Id": "user-123",
        },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.messages).toEqual([]);
    });

    it("should return messages with correct format", async () => {
      const memory = getMockedMemorySession();
      memory.getMessages.mockResolvedValueOnce([
        { _getType: () => "human", content: "Quais projetos?" },
        { _getType: () => "ai", content: "Você tem 3 projetos." },
      ]);

      const res = await app.request("/api/chat/history", {
        method: "GET",
        headers: {
          "X-User-Id": "user-123",
        },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].role).toBe("user");
      expect(data.messages[1].role).toBe("assistant");
    });

    it("should return 401 without authentication", async () => {
      const res = await app.request("/api/chat/history", {
        method: "GET",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/chat/history", () => {
    it("should clear chat history", async () => {
      const res = await app.request("/api/chat/history", {
        method: "DELETE",
        headers: {
          "X-User-Id": "user-123",
        },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Chat history cleared");
    });

    it("should accept projectCode query param", async () => {
      const res = await app.request("/api/chat/history?projectCode=DEMO", {
        method: "DELETE",
        headers: {
          "X-User-Id": "user-123",
        },
      });

      expect(res.status).toBe(200);
    });

    it("should return 401 without authentication", async () => {
      const res = await app.request("/api/chat/history", {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/chat/status", () => {
    it("should return session status", async () => {
      const memory = getMockedMemorySession();
      memory.getMessages.mockResolvedValueOnce([
        { _getType: () => "human", content: "Test" },
      ]);

      const res = await app.request("/api/chat/status", {
        method: "GET",
        headers: {
          "X-User-Id": "user-123",
        },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.active).toBe(true);
      expect(data.agentInfo).toBeDefined();
      expect(data.agentInfo.model).toBe("gpt-4o");
      expect(data.messageCount).toBe(1);
    });

    it("should return inactive when user not connected", async () => {
      (prisma.user.findUnique as Mock).mockResolvedValueOnce(null);

      const res = await app.request("/api/chat/status", {
        method: "GET",
        headers: {
          "X-User-Id": "user-123",
        },
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.active).toBe(false);
    });

    it("should return 401 without authentication", async () => {
      const res = await app.request("/api/chat/status", {
        method: "GET",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/chat/project", () => {
    it("should change project successfully", async () => {
      const res = await app.request("/api/chat/project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({
          projectCode: "NEW_PROJECT",
        }),
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("NEW_PROJECT");
    });

    it("should validate projectCode is required", async () => {
      const res = await app.request("/api/chat/project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 when user not connected", async () => {
      (prisma.user.findUnique as Mock).mockResolvedValueOnce(null);

      const res = await app.request("/api/chat/project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-123",
        },
        body: JSON.stringify({
          projectCode: "TEST",
        }),
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it("should return 401 without authentication", async () => {
      const res = await app.request("/api/chat/project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectCode: "TEST",
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});

describe("Chat Routes - Natural Language Processing", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as Mock).mockResolvedValue({
      qaseApiToken: "encrypted-token",
      qaseTokenValid: true,
    });

    app = new Hono();
    app.use("*", async (c, next) => {
      const userId = c.req.header("X-User-Id");
      if (userId) {
        c.set("userId" as never, userId);
      }
      await next();
    });
    app.route("/api/chat", chatRoutes);
  });

  it("should process Portuguese questions", async () => {
    const orchestrator = getMockedOrchestrator();
    orchestrator.mockResolvedValueOnce({
      response: "A taxa de falha do projeto GV nos últimos 30 dias é de 15%.",
      needsProjectSelection: false,
      toolsUsed: ["get_test_runs", "get_run_results"],
      durationMs: 2500,
    });

    const res = await app.request("/api/chat/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": "user-123",
      },
      body: JSON.stringify({
        message: "Qual a taxa de falha do projeto GV nos últimos 30 dias?",
        projectCode: "GV",
      }),
    });

    expect(res.status).toBe(200);

    const data = await res.json() as { success: boolean; message: { content: string }; toolsUsed: string[] };
    expect(data.success).toBe(true);
    expect(data.message.content).toContain("taxa de falha");
    expect(data.toolsUsed).toContain("get_test_runs");
  });

  it("should handle comparison queries", async () => {
    const orchestrator = getMockedOrchestrator();
    orchestrator.mockResolvedValueOnce({
      response:
        "Comparando os projetos: Auth tem 85% de cobertura, Payments tem 72%, Notifications tem 68%.",
      needsProjectSelection: false,
      toolsUsed: ["list_projects", "get_test_cases"],
      durationMs: 3500,
    });

    const res = await app.request("/api/chat/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": "user-123",
      },
      body: JSON.stringify({
        message: "Compare a cobertura de testes entre os serviços auth, payments e notifications",
      }),
    });

    expect(res.status).toBe(200);

    const data = await res.json() as { success: boolean; message: { content: string } };
    expect(data.success).toBe(true);
    expect(data.message.content).toContain("Comparando");
  });

  it("should provide fallback for unclear questions", async () => {
    const orchestrator = getMockedOrchestrator();
    orchestrator.mockResolvedValueOnce({
      response:
        "Desculpe, não entendi sua pergunta. Você pode tentar perguntar sobre projetos, casos de teste, execuções ou métricas de qualidade.",
      needsProjectSelection: false,
      toolsUsed: [],
      durationMs: 800,
    });

    const res = await app.request("/api/chat/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": "user-123",
      },
      body: JSON.stringify({
        message: "xyzabc random text",
      }),
    });

    expect(res.status).toBe(200);

    const data = await res.json() as { success: boolean; message: { content: string } };
    expect(data.success).toBe(true);
    // Orchestrator should still respond, even if it doesn't understand
    expect(data.message.content).toBeDefined();
  });
});
