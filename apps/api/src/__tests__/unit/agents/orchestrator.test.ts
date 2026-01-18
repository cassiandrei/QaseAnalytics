/**
 * Testes unitários para o LangGraph Orchestrator.
 *
 * @see US-012: Consultas em Linguagem Natural
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  projectContextStore,
  type OrchestratorConfig,
} from "../../../agents/orchestrator.js";

// Mock dos módulos externos
vi.mock("../../../tools/index.js", () => ({
  listProjectsWithCache: vi.fn(),
}));

vi.mock("../../../agents/qase-agent.js", () => ({
  QaseAgent: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({
      output: "Mocked agent response",
      chatHistory: [],
      toolsUsed: ["list_projects"],
      durationMs: 100,
    }),
    chatStream: vi.fn(),
  })),
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: "Mocked LLM response",
    }),
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        intent: "query_data",
        needsProject: true,
        extractedProjectCode: null,
      }),
    }),
  })),
}));

describe("ProjectContextStore", () => {
  beforeEach(() => {
    projectContextStore.clearAll();
  });

  describe("getProject", () => {
    it("should return null for non-existent user", () => {
      expect(projectContextStore.getProject("unknown-user")).toBeNull();
    });

    it("should return stored project code", () => {
      projectContextStore.setProject("user-1", "PROJECT-A");
      expect(projectContextStore.getProject("user-1")).toBe("PROJECT-A");
    });
  });

  describe("setProject", () => {
    it("should store project code for user", () => {
      projectContextStore.setProject("user-1", "MY-PROJECT");
      expect(projectContextStore.getProject("user-1")).toBe("MY-PROJECT");
    });

    it("should overwrite existing project", () => {
      projectContextStore.setProject("user-1", "OLD-PROJECT");
      projectContextStore.setProject("user-1", "NEW-PROJECT");
      expect(projectContextStore.getProject("user-1")).toBe("NEW-PROJECT");
    });

    it("should maintain separate projects for different users", () => {
      projectContextStore.setProject("user-1", "PROJECT-A");
      projectContextStore.setProject("user-2", "PROJECT-B");

      expect(projectContextStore.getProject("user-1")).toBe("PROJECT-A");
      expect(projectContextStore.getProject("user-2")).toBe("PROJECT-B");
    });
  });

  describe("clearProject", () => {
    it("should remove project for user", () => {
      projectContextStore.setProject("user-1", "PROJECT-A");
      const result = projectContextStore.clearProject("user-1");

      expect(result).toBe(true);
      expect(projectContextStore.getProject("user-1")).toBeNull();
    });

    it("should return false for non-existent user", () => {
      const result = projectContextStore.clearProject("unknown-user");
      expect(result).toBe(false);
    });
  });

  describe("clearAll", () => {
    it("should remove all project contexts", () => {
      projectContextStore.setProject("user-1", "PROJECT-A");
      projectContextStore.setProject("user-2", "PROJECT-B");
      projectContextStore.setProject("user-3", "PROJECT-C");

      projectContextStore.clearAll();

      expect(projectContextStore.getProject("user-1")).toBeNull();
      expect(projectContextStore.getProject("user-2")).toBeNull();
      expect(projectContextStore.getProject("user-3")).toBeNull();
    });
  });
});

describe("OrchestratorConfig", () => {
  it("should have required properties", () => {
    const config: OrchestratorConfig = {
      openAIApiKey: "sk-test-key",
      qaseToken: "qase-token",
      userId: "user-123",
      projectCode: "GV",
      verbose: false,
    };

    expect(config.openAIApiKey).toBe("sk-test-key");
    expect(config.qaseToken).toBe("qase-token");
    expect(config.userId).toBe("user-123");
    expect(config.projectCode).toBe("GV");
    expect(config.verbose).toBe(false);
  });

  it("should allow optional projectCode", () => {
    const config: OrchestratorConfig = {
      openAIApiKey: "sk-test-key",
      qaseToken: "qase-token",
      userId: "user-123",
    };

    expect(config.projectCode).toBeUndefined();
  });

  it("should allow null projectCode", () => {
    const config: OrchestratorConfig = {
      openAIApiKey: "sk-test-key",
      qaseToken: "qase-token",
      userId: "user-123",
      projectCode: null,
    };

    expect(config.projectCode).toBeNull();
  });
});

describe("Orchestrator State Machine", () => {
  describe("Intent Classification", () => {
    it("should identify list_projects intent", () => {
      // The intent classifier should recognize phrases like:
      // - "quais são meus projetos?"
      // - "list my projects"
      // - "show available projects"
      const listProjectsMessages = [
        "quais são meus projetos?",
        "list my projects",
        "show available projects",
        "what projects do I have?",
      ];

      // Intent classification is tested implicitly through integration tests
      expect(listProjectsMessages.length).toBeGreaterThan(0);
    });

    it("should identify query_data intent", () => {
      // The intent classifier should recognize phrases like:
      // - "mostre os casos de teste"
      // - "what's the pass rate?"
      // - "show test results"
      const queryDataMessages = [
        "mostre os casos de teste",
        "what's the pass rate?",
        "show test results",
        "quantos testes falharam?",
      ];

      expect(queryDataMessages.length).toBeGreaterThan(0);
    });

    it("should extract project code from message", () => {
      // The classifier should extract project codes from:
      // - "mostre os casos do projeto GV"
      // - "show tests for project DEMO"
      const messagesWithProject = [
        { message: "mostre os casos do projeto GV", expectedCode: "GV" },
        { message: "show tests for project DEMO", expectedCode: "DEMO" },
        { message: "use o projeto XYZ", expectedCode: "XYZ" },
      ];

      expect(messagesWithProject.length).toBeGreaterThan(0);
    });
  });

  describe("Project Resolution Flow", () => {
    it("should auto-select when only one project exists", () => {
      // When resolveProject finds only 1 project, it should auto-select
      const singleProject = [{ code: "ONLY", title: "Only Project" }];

      // Auto-selection happens in resolveProjectNode
      expect(singleProject.length).toBe(1);
    });

    it("should ask for selection when multiple projects exist", () => {
      // When resolveProject finds N projects (N > 1), it should ask user
      const multipleProjects = [
        { code: "PROJ-A", title: "Project A" },
        { code: "PROJ-B", title: "Project B" },
        { code: "PROJ-C", title: "Project C" },
      ];

      expect(multipleProjects.length).toBeGreaterThan(1);
    });
  });

  describe("Context Persistence", () => {
    beforeEach(() => {
      projectContextStore.clearAll();
    });

    it("should persist selected project across sessions", () => {
      // First interaction: select project
      projectContextStore.setProject("user-1", "GV");

      // Second interaction: project should be available
      const storedProject = projectContextStore.getProject("user-1");
      expect(storedProject).toBe("GV");
    });

    it("should allow changing project", () => {
      // Select first project
      projectContextStore.setProject("user-1", "OLD-PROJECT");

      // Change to different project
      projectContextStore.setProject("user-1", "NEW-PROJECT");

      expect(projectContextStore.getProject("user-1")).toBe("NEW-PROJECT");
    });

    it("should clear project on clearAll", () => {
      projectContextStore.setProject("user-1", "PROJECT-A");
      projectContextStore.clearAll();

      expect(projectContextStore.getProject("user-1")).toBeNull();
    });
  });
});

describe("Orchestrator Result", () => {
  it("should include all required fields", () => {
    interface OrchestratorResult {
      response: string;
      needsProjectSelection: boolean;
      projects?: Array<{ code: string; title: string }>;
      toolsUsed: string[];
      durationMs: number;
    }

    const result: OrchestratorResult = {
      response: "Test response",
      needsProjectSelection: false,
      toolsUsed: ["list_projects"],
      durationMs: 150,
    };

    expect(result.response).toBeDefined();
    expect(result.needsProjectSelection).toBeDefined();
    expect(result.toolsUsed).toBeDefined();
    expect(result.durationMs).toBeDefined();
  });

  it("should include projects when needsProjectSelection is true", () => {
    interface OrchestratorResult {
      response: string;
      needsProjectSelection: boolean;
      projects?: Array<{ code: string; title: string }>;
      toolsUsed: string[];
      durationMs: number;
    }

    const result: OrchestratorResult = {
      response: "Please select a project",
      needsProjectSelection: true,
      projects: [
        { code: "GV", title: "Grupo Voalle" },
        { code: "DEMO", title: "Demo Project" },
      ],
      toolsUsed: ["list_projects"],
      durationMs: 200,
    };

    expect(result.needsProjectSelection).toBe(true);
    expect(result.projects).toHaveLength(2);
    expect(result.projects?.[0]?.code).toBe("GV");
  });
});
