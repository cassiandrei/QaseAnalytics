/**
 * Testes unitários para a LangChain tool get_test_runs.
 *
 * @see US-007: Obter Execuções de Teste
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QaseAuthError, QaseApiError } from "../../lib/qase-client.js";

// Mock do Redis
vi.mock("../../lib/redis.js", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  CACHE_TTL: { PROJECTS: 300, TEST_CASES: 120, TEST_RUNS: 120 },
  CACHE_KEYS: {
    projectList: (userId: string) => `qase:projects:${userId}`,
    project: (userId: string, code: string) => `qase:project:${userId}:${code}`,
    testCaseList: (userId: string, projectCode: string, filterHash: string) =>
      `qase:cases:${userId}:${projectCode}:${filterHash}`,
    testCase: (userId: string, projectCode: string, caseId: number) =>
      `qase:case:${userId}:${projectCode}:${caseId}`,
    testRunList: (userId: string, projectCode: string, filterHash: string) =>
      `qase:runs:${userId}:${projectCode}:${filterHash}`,
    testRun: (userId: string, projectCode: string, runId: number) =>
      `qase:run:${userId}:${projectCode}:${runId}`,
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
  getTestRunsWithCache,
  createGetTestRunsTool,
  createGetTestRunsToolWithContext,
  type GetTestRunsResult,
} from "../../tools/get-test-runs.tool.js";
import { QaseClient } from "../../lib/qase-client.js";
import { cacheGet, cacheSet } from "../../lib/redis.js";

describe("Get Test Runs Tool", () => {
  const mockGetTestRuns = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(QaseClient).mockImplementation(() => ({
      getTestRuns: mockGetTestRuns,
      getTestRun: vi.fn(),
      getTestCases: vi.fn(),
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

  describe("getTestRunsWithCache", () => {
    it("should return test runs from API when not cached", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 3,
        filtered: 3,
        count: 3,
        entities: [
          {
            id: 1,
            title: "Sprint 1 Run",
            description: "First sprint test run",
            status: 1, // complete
            start_time: "2024-01-15T10:00:00Z",
            end_time: "2024-01-15T12:00:00Z",
            stats: {
              total: 50,
              passed: 45,
              failed: 3,
              blocked: 2,
              skipped: 0,
              untested: 0,
            },
            time_spent: 7200000,
            environment_id: 1,
            milestone_id: 10,
            cases_count: 50,
          },
          {
            id: 2,
            title: "Sprint 2 Run",
            description: null,
            status: 0, // active
            start_time: "2024-01-20T09:00:00Z",
            end_time: null,
            stats: {
              total: 30,
              passed: 10,
              failed: 5,
              blocked: 0,
              skipped: 0,
              untested: 15,
            },
            time_spent: 3600000,
            environment_id: null,
            milestone_id: null,
            cases_count: 30,
          },
          {
            id: 3,
            title: "Aborted Run",
            status: 2, // abort
            start_time: "2024-01-10T08:00:00Z",
            end_time: "2024-01-10T08:30:00Z",
            stats: {
              total: 20,
              passed: 5,
              failed: 2,
              blocked: 1,
              skipped: 2,
              untested: 10,
            },
          },
        ],
      });

      const result = await getTestRunsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        limit: 100,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.count).toBe(3);
      expect(result.runs).toHaveLength(3);

      // Check first run mapping
      expect(result.runs[0]).toEqual({
        id: 1,
        title: "Sprint 1 Run",
        description: "First sprint test run",
        status: "complete",
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T12:00:00Z",
        stats: {
          total: 50,
          passed: 45,
          failed: 3,
          blocked: 2,
          skipped: 0,
          untested: 0,
        },
        passRate: 90, // 45/50 * 100
        environmentId: 1,
        milestoneId: 10,
        timeSpent: 7200000,
        casesCount: 50,
      });

      // Check active run
      expect(result.runs[1]?.status).toBe("active");
      expect(result.runs[1]?.endTime).toBeNull();
      expect(result.runs[1]?.passRate).toBe(33.33); // 10/30 * 100 rounded

      // Check aborted run
      expect(result.runs[2]?.status).toBe("abort");

      expect(result.cached).toBe(false);
      expect(cacheSet).toHaveBeenCalled();
    });

    it("should return test runs from cache when available", async () => {
      const cachedData = {
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            id: 100,
            title: "Cached Run",
            status: 1,
            start_time: "2024-01-01T00:00:00Z",
            end_time: "2024-01-01T01:00:00Z",
            stats: {
              total: 10,
              passed: 10,
              failed: 0,
              blocked: 0,
            },
          },
        ],
      };
      vi.mocked(cacheGet).mockResolvedValueOnce(cachedData);

      const result = await getTestRunsWithCache("valid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.success).toBe(true);
      expect(result.runs[0]?.id).toBe(100);
      expect(result.runs[0]?.title).toBe("Cached Run");
      expect(result.runs[0]?.passRate).toBe(100);
      expect(result.cached).toBe(true);
      expect(mockGetTestRuns).not.toHaveBeenCalled();
    });

    it("should apply filters correctly", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 50,
        filtered: 10,
        count: 10,
        entities: [],
      });

      await getTestRunsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        status: "complete",
        fromStartTime: "2024-01-01",
        toStartTime: "2024-01-31",
        environment: 5,
        milestone: 10,
        limit: 50,
        offset: 0,
      });

      expect(mockGetTestRuns).toHaveBeenCalledWith("GV", {
        limit: 50,
        offset: 0,
        status: "complete",
        fromStartTime: "2024-01-01",
        toStartTime: "2024-01-31",
        environment: 5,
        milestone: 10,
      });
    });

    it("should handle auth error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockRejectedValueOnce(new QaseAuthError());

      const result = await getTestRunsWithCache("invalid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired");
      expect(result.total).toBe(0);
      expect(result.runs).toEqual([]);
    });

    it("should handle API error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockRejectedValueOnce(new QaseApiError("Project not found", 404));

      const result = await getTestRunsWithCache("valid-token", "user-123", {
        projectCode: "INVALID",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Project not found");
    });

    it("should handle unknown error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockRejectedValueOnce(new Error("Network error"));

      const result = await getTestRunsWithCache("valid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get test runs");
    });

    it("should handle runs with zero total cases", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            id: 1,
            title: "Empty Run",
            status: 0,
            stats: {
              total: 0,
              passed: 0,
              failed: 0,
              blocked: 0,
            },
          },
        ],
      });

      const result = await getTestRunsWithCache("valid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.runs[0]?.passRate).toBe(0);
    });
  });

  describe("createGetTestRunsTool", () => {
    it("should create a valid LangChain tool", () => {
      const tool = createGetTestRunsTool(
        () => "test-token",
        () => "user-123"
      );

      expect(tool.name).toBe("get_test_runs");
      expect(tool.description).toContain("Gets test runs");
      expect(tool.description).toContain("status");
      expect(tool.description).toContain("passRate");
    });

    it("should execute and return JSON result", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            id: 1,
            title: "Test Run",
            status: 1,
            stats: {
              total: 20,
              passed: 18,
              failed: 2,
              blocked: 0,
            },
          },
        ],
      });

      const tool = createGetTestRunsTool(
        () => "test-token",
        () => "user-123"
      );

      const resultJson = await tool.invoke({ projectCode: "GV" });
      const result: GetTestRunsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
      expect(result.runs[0]?.title).toBe("Test Run");
      expect(result.runs[0]?.passRate).toBe(90);
    });

    it("should support async token/userId getters", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetTestRunsTool(
        async () => "async-token",
        async () => "async-user"
      );

      const resultJson = await tool.invoke({ projectCode: "GV", limit: 50 });
      const result: GetTestRunsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });

    it("should pass filters to the API", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetTestRunsTool(
        () => "test-token",
        () => "user-123"
      );

      await tool.invoke({
        projectCode: "GV",
        status: "complete",
        fromStartTime: "2024-01-01",
        toStartTime: "2024-01-31",
      });

      expect(mockGetTestRuns).toHaveBeenCalledWith("GV", expect.objectContaining({
        status: "complete",
        fromStartTime: "2024-01-01",
        toStartTime: "2024-01-31",
      }));
    });
  });

  describe("createGetTestRunsToolWithContext", () => {
    it("should create tool with fixed token and userId", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetTestRunsToolWithContext("fixed-token", "fixed-user");

      const resultJson = await tool.invoke({ projectCode: "GV" });
      const result: GetTestRunsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });
  });

  describe("filter hash generation", () => {
    it("should use different cache keys for different filters", async () => {
      vi.mocked(cacheGet).mockResolvedValue(null);
      mockGetTestRuns.mockResolvedValue({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      // First call with status filter
      await getTestRunsWithCache("token", "user", {
        projectCode: "GV",
        status: "complete",
      });

      // Second call with different filter
      await getTestRunsWithCache("token", "user", {
        projectCode: "GV",
        status: "active",
      });

      // Each call should have a different cache key
      const cacheSetCalls = vi.mocked(cacheSet).mock.calls;
      expect(cacheSetCalls.length).toBe(2);
      expect(cacheSetCalls[0]?.[0]).not.toBe(cacheSetCalls[1]?.[0]);
    });
  });

  describe("pass rate calculation", () => {
    it("should correctly calculate pass rate with various stats", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestRuns.mockResolvedValueOnce({
        total: 3,
        filtered: 3,
        count: 3,
        entities: [
          {
            id: 1,
            title: "Perfect Run",
            status: 1,
            stats: { total: 100, passed: 100, failed: 0, blocked: 0 },
          },
          {
            id: 2,
            title: "Partial Run",
            status: 1,
            stats: { total: 100, passed: 75, failed: 20, blocked: 5 },
          },
          {
            id: 3,
            title: "Failed Run",
            status: 1,
            stats: { total: 100, passed: 0, failed: 100, blocked: 0 },
          },
        ],
      });

      const result = await getTestRunsWithCache("valid-token", "user-123", {
        projectCode: "GV",
      });

      expect(result.runs[0]?.passRate).toBe(100);
      expect(result.runs[1]?.passRate).toBe(75);
      expect(result.runs[2]?.passRate).toBe(0);
    });
  });
});
