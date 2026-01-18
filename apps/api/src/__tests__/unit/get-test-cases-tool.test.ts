/**
 * Testes unitários para a LangChain tool get_test_cases.
 *
 * @see US-006: Obter Casos de Teste
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QaseAuthError, QaseApiError } from "../../lib/qase-client.js";

// Mock do Redis
vi.mock("../../lib/redis.js", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  CACHE_TTL: { PROJECTS: 300, TEST_CASES: 120 },
  CACHE_KEYS: {
    projectList: (userId: string) => `qase:projects:${userId}`,
    project: (userId: string, code: string) => `qase:project:${userId}:${code}`,
    testCaseList: (userId: string, projectCode: string, filterHash: string) =>
      `qase:cases:${userId}:${projectCode}:${filterHash}`,
    testCase: (userId: string, projectCode: string, caseId: number) =>
      `qase:case:${userId}:${projectCode}:${caseId}`,
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
  getTestCasesWithCache,
  createGetTestCasesTool,
  createGetTestCasesToolWithContext,
  type GetTestCasesResult,
} from "../../tools/get-test-cases.tool.js";
import { QaseClient } from "../../lib/qase-client.js";
import { cacheGet, cacheSet } from "../../lib/redis.js";

describe("Get Test Cases Tool", () => {
  const mockGetTestCases = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(QaseClient).mockImplementation(() => ({
      getTestCases: mockGetTestCases,
      getTestCase: vi.fn(),
      getProjects: vi.fn(),
      getProject: vi.fn(),
      validateToken: vi.fn(),
      getCurrentUser: vi.fn(),
    }) as unknown as QaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getTestCasesWithCache", () => {
    it("should return test cases from API when not cached", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockResolvedValueOnce({
        total: 3,
        filtered: 3,
        count: 3,
        entities: [
          {
            id: 1,
            title: "Login Test",
            severity: 2, // critical
            priority: 1, // high
            automation: 1, // automated
            status: 0, // actual
            suite_id: 10,
            is_flaky: 0,
            tags: [{ id: 1, title: "smoke" }],
          },
          {
            id: 2,
            title: "Logout Test",
            severity: 4, // normal
            priority: 2, // medium
            automation: 0, // is-not-automated
            status: 0,
            suite_id: 10,
            is_flaky: 1,
            tags: [],
          },
          {
            id: 3,
            title: "Draft Test",
            severity: 5, // minor
            priority: 3, // low
            automation: 2, // to-be-automated
            status: 1, // draft
            suite_id: null,
            is_flaky: 0,
          },
        ],
      });

      const result = await getTestCasesWithCache("valid-token", "user-123", {
        projectCode: "GV",
        limit: 100,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.count).toBe(3);
      expect(result.cases).toHaveLength(3);

      // Check first case mapping
      expect(result.cases[0]).toEqual({
        id: 1,
        title: "Login Test",
        severity: "critical",
        priority: "high",
        automation: "automated",
        status: "actual",
        suiteId: 10,
        isFlaky: false,
        tags: ["smoke"],
      });

      // Check flaky case
      expect(result.cases[1]?.isFlaky).toBe(true);
      expect(result.cases[1]?.automation).toBe("is-not-automated");

      // Check draft case
      expect(result.cases[2]?.status).toBe("draft");
      expect(result.cases[2]?.automation).toBe("to-be-automated");
      expect(result.cases[2]?.suiteId).toBeNull();

      expect(result.cached).toBe(false);
      expect(cacheSet).toHaveBeenCalled();
    });

    it("should return test cases from cache when available", async () => {
      const cachedData = {
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            id: 100,
            title: "Cached Test",
            severity: 4,
            priority: 2,
            automation: 1,
            status: 0,
            suite_id: 5,
            is_flaky: 0,
            tags: [],
          },
        ],
      };
      vi.mocked(cacheGet).mockResolvedValueOnce(cachedData);

      const result = await getTestCasesWithCache("valid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.success).toBe(true);
      expect(result.cases[0]?.id).toBe(100);
      expect(result.cases[0]?.title).toBe("Cached Test");
      expect(result.cached).toBe(true);
      expect(mockGetTestCases).not.toHaveBeenCalled();
    });

    it("should apply filters correctly", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockResolvedValueOnce({
        total: 50,
        filtered: 10,
        count: 10,
        entities: [],
      });

      await getTestCasesWithCache("valid-token", "user-123", {
        projectCode: "GV",
        priority: "high",
        automation: "automated",
        status: "actual",
        suiteId: 5,
        search: "login",
        limit: 50,
        offset: 0,
      });

      expect(mockGetTestCases).toHaveBeenCalledWith("GV", {
        limit: 50,
        offset: 0,
        priority: "high",
        automation: "automated",
        status: "actual",
        suiteId: 5,
        search: "login",
      });
    });

    it("should handle auth error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockRejectedValueOnce(new QaseAuthError());

      const result = await getTestCasesWithCache("invalid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired");
      expect(result.total).toBe(0);
      expect(result.cases).toEqual([]);
    });

    it("should handle API error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockRejectedValueOnce(new QaseApiError("Project not found", 404));

      const result = await getTestCasesWithCache("valid-token", "user-123", {
        projectCode: "INVALID",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Project not found");
    });

    it("should handle unknown error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockRejectedValueOnce(new Error("Network error"));

      const result = await getTestCasesWithCache("valid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get test cases");
    });

    it("should handle undefined severity/priority/automation values", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            id: 1,
            title: "Test with undefined values",
            // No severity, priority, automation, status defined
          },
        ],
      });

      const result = await getTestCasesWithCache("valid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.cases[0]).toEqual({
        id: 1,
        title: "Test with undefined values",
        severity: "undefined",
        priority: "undefined",
        automation: "is-not-automated",
        status: "actual",
        suiteId: null,
        isFlaky: false,
        tags: [],
      });
    });
  });

  describe("createGetTestCasesTool", () => {
    it("should create a valid LangChain tool", () => {
      const tool = createGetTestCasesTool(
        () => "test-token",
        () => "user-123"
      );

      expect(tool.name).toBe("get_test_cases");
      expect(tool.description).toContain("Gets test cases");
      expect(tool.description).toContain("severity");
      expect(tool.description).toContain("priority");
      expect(tool.description).toContain("automation");
    });

    it("should execute and return JSON result", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            id: 1,
            title: "Test Case",
            severity: 4,
            priority: 2,
            automation: 1,
            status: 0,
          },
        ],
      });

      const tool = createGetTestCasesTool(
        () => "test-token",
        () => "user-123"
      );

      const resultJson = await tool.invoke({ projectCode: "GV" });
      const result: GetTestCasesResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
      expect(result.cases[0]?.title).toBe("Test Case");
    });

    it("should support async token/userId getters", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetTestCasesTool(
        async () => "async-token",
        async () => "async-user"
      );

      const resultJson = await tool.invoke({ projectCode: "GV", limit: 50 });
      const result: GetTestCasesResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });

    it("should pass filters to the API", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetTestCasesTool(
        () => "test-token",
        () => "user-123"
      );

      await tool.invoke({
        projectCode: "GV",
        severity: "critical",
        priority: "high",
        automation: "automated",
      });

      expect(mockGetTestCases).toHaveBeenCalledWith("GV", expect.objectContaining({
        severity: "critical",
        priority: "high",
        automation: "automated",
      }));
    });
  });

  describe("createGetTestCasesToolWithContext", () => {
    it("should create tool with fixed token and userId", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestCases.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetTestCasesToolWithContext("fixed-token", "fixed-user");

      const resultJson = await tool.invoke({ projectCode: "GV" });
      const result: GetTestCasesResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });
  });

  describe("filter hash generation", () => {
    it("should use different cache keys for different filters", async () => {
      vi.mocked(cacheGet).mockResolvedValue(null);
      mockGetTestCases.mockResolvedValue({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      // First call with priority filter
      await getTestCasesWithCache("token", "user", {
        projectCode: "GV",
        priority: "high",
      });

      // Second call with different filter
      await getTestCasesWithCache("token", "user", {
        projectCode: "GV",
        priority: "low",
      });

      // Each call should have a different cache key
      const cacheSetCalls = vi.mocked(cacheSet).mock.calls;
      expect(cacheSetCalls.length).toBe(2);
      expect(cacheSetCalls[0]?.[0]).not.toBe(cacheSetCalls[1]?.[0]);
    });
  });
});
