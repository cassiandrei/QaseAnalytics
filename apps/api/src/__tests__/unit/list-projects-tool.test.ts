/**
 * Testes unitários para a LangChain tool list_projects.
 *
 * @see US-005: Listar Projetos do Qase
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QaseAuthError, QaseApiError } from "../../lib/qase-client.js";

// Mock do Redis
vi.mock("../../lib/redis.js", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  CACHE_TTL: { PROJECTS: 300 },
  CACHE_KEYS: {
    projectList: (userId: string) => `qase:projects:${userId}`,
    project: (userId: string, code: string) => `qase:project:${userId}:${code}`,
  },
}));

// Mock do QaseClient
vi.mock("../../lib/qase-client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/qase-client.js")>();
  return {
    ...actual,
    QaseClient: vi.fn(),
  };
});

// Import after mocks
import {
  listProjectsWithCache,
  createListProjectsTool,
  createListProjectsToolWithContext,
  type ListProjectsResult,
} from "../../tools/list-projects.tool.js";
import { QaseClient } from "../../lib/qase-client.js";
import { cacheGet, cacheSet } from "../../lib/redis.js";

describe("List Projects Tool", () => {
  const mockGetProjects = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(QaseClient).mockImplementation(() => ({
      getProjects: mockGetProjects,
      getProject: vi.fn(),
      validateToken: vi.fn(),
      getCurrentUser: vi.fn(),
    }) as unknown as QaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listProjectsWithCache", () => {
    it("should return projects from API when not cached", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockResolvedValueOnce({
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          { code: "PROJ1", title: "Project 1", description: "First project", counts: { cases: 10, suites: 2 } },
          { code: "PROJ2", title: "Project 2", description: null, counts: { cases: 5, suites: 1 } },
        ],
      });

      const result = await listProjectsWithCache("valid-token", "user-123", { limit: 100, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.count).toBe(2);
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0]).toEqual({
        code: "PROJ1",
        title: "Project 1",
        description: "First project",
        casesCount: 10,
        suitesCount: 2,
      });
      expect(result.cached).toBe(false);
      expect(cacheSet).toHaveBeenCalled();
    });

    it("should return projects from cache when available", async () => {
      const cachedData = {
        total: 1,
        filtered: 1,
        count: 1,
        entities: [{ code: "CACHED", title: "Cached Project", description: "From cache" }],
      };
      vi.mocked(cacheGet).mockResolvedValueOnce(cachedData);

      const result = await listProjectsWithCache("valid-token", "user-123", { limit: 100, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.projects[0]?.code).toBe("CACHED");
      expect(result.cached).toBe(true);
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("should not use cache for paginated requests", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockResolvedValueOnce({
        total: 50,
        filtered: 50,
        count: 10,
        entities: [],
      });

      await listProjectsWithCache("valid-token", "user-123", { limit: 10, offset: 20 });

      expect(cacheGet).not.toHaveBeenCalled();
      expect(cacheSet).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalledWith({ limit: 10, offset: 20 });
    });

    it("should handle auth error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockRejectedValueOnce(new QaseAuthError());

      const result = await listProjectsWithCache("invalid-token", "user-123", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired");
    });

    it("should handle API error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockRejectedValueOnce(new QaseApiError("Server error", 500));

      const result = await listProjectsWithCache("valid-token", "user-123", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server error");
    });

    it("should handle unknown error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockRejectedValueOnce(new Error("Unknown"));

      const result = await listProjectsWithCache("valid-token", "user-123", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to list projects");
    });
  });

  describe("createListProjectsTool", () => {
    it("should create a valid LangChain tool", () => {
      const tool = createListProjectsTool(
        () => "test-token",
        () => "user-123"
      );

      expect(tool.name).toBe("list_projects");
      expect(tool.description).toContain("Lists all projects");
    });

    it("should execute and return JSON result", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [{ code: "TEST", title: "Test", description: null }],
      });

      const tool = createListProjectsTool(
        () => "test-token",
        () => "user-123"
      );

      const resultJson = await tool.invoke({});
      const result: ListProjectsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
      expect(result.projects[0]?.code).toBe("TEST");
    });

    it("should support async token/userId getters", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createListProjectsTool(
        async () => "async-token",
        async () => "async-user"
      );

      const resultJson = await tool.invoke({ limit: 50 });
      const result: ListProjectsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });
  });

  describe("createListProjectsToolWithContext", () => {
    it("should create tool with fixed token and userId", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetProjects.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createListProjectsToolWithContext("fixed-token", "fixed-user");

      const resultJson = await tool.invoke({});
      const result: ListProjectsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });
  });
});
