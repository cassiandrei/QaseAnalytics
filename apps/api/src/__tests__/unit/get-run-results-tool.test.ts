/**
 * Testes unitários para a LangChain tool get_run_results.
 *
 * @see US-008: Obter Resultados Detalhados
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QaseAuthError, QaseApiError } from "../../lib/qase-client.js";

// Mock do Redis
vi.mock("../../lib/redis.js", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  CACHE_TTL: { PROJECTS: 300, TEST_CASES: 120, TEST_RUNS: 120, RESULTS: 300 },
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
    testResultList: (userId: string, projectCode: string, runId: number, filterHash: string) =>
      `qase:results:${userId}:${projectCode}:${runId}:${filterHash}`,
    testResult: (userId: string, projectCode: string, hash: string) =>
      `qase:result:${userId}:${projectCode}:${hash}`,
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
  getRunResultsWithCache,
  createGetRunResultsTool,
  createGetRunResultsToolWithContext,
  type GetRunResultsResult,
} from "../../tools/get-run-results.tool.js";
import { QaseClient } from "../../lib/qase-client.js";
import { cacheGet, cacheSet } from "../../lib/redis.js";

describe("Get Run Results Tool", () => {
  const mockGetTestResults = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(QaseClient).mockImplementation(() => ({
      getTestResults: mockGetTestResults,
      getTestResult: vi.fn(),
      getTestRuns: vi.fn(),
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

  describe("getRunResultsWithCache", () => {
    it("should return test results from API when not cached", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 4,
        filtered: 4,
        count: 4,
        entities: [
          {
            hash: "abc123",
            run_id: 45,
            case_id: 1,
            status: "passed",
            time_spent_ms: 1200,
            comment: null,
            stacktrace: null,
            case: {
              title: "Login Test",
              severity: 3,
              priority: 2,
            },
            start_time: "2024-01-15T10:00:00Z",
            end_time: "2024-01-15T10:00:01Z",
            steps: [
              { position: 1, status: "passed" },
              { position: 2, status: "passed" },
            ],
          },
          {
            hash: "def456",
            run_id: 45,
            case_id: 2,
            status: "failed",
            time_spent_ms: 3500,
            comment: "Element not found",
            stacktrace: "Error: Element not found at line 42",
            case: {
              title: "Registration Test",
            },
            start_time: "2024-01-15T10:01:00Z",
            end_time: "2024-01-15T10:01:03Z",
            steps: [
              { position: 1, status: "passed" },
              { position: 2, status: "failed", comment: "Button not clickable" },
            ],
          },
          {
            hash: "ghi789",
            run_id: 45,
            case_id: 3,
            status: "blocked",
            time_spent_ms: 0,
            case: {
              title: "Blocked Test",
            },
          },
          {
            hash: "jkl012",
            run_id: 45,
            case_id: 4,
            status: "skipped",
            time_spent_ms: null,
            case: {
              title: "Skipped Test",
            },
          },
        ],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
        limit: 100,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(result.total).toBe(4);
      expect(result.count).toBe(4);
      expect(result.runId).toBe(45);
      expect(result.results).toHaveLength(4);

      // Check first result mapping
      expect(result.results[0]).toMatchObject({
        hash: "abc123",
        caseId: 1,
        caseTitle: "Login Test",
        status: "passed",
        duration: 1200,
        comment: null,
        stacktrace: null,
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T10:00:01Z",
      });

      // Check steps are mapped
      expect(result.results[0]?.steps).toHaveLength(2);
      expect(result.results[0]?.steps[0]).toEqual({
        position: 1,
        status: "passed",
        comment: null,
      });

      // Check case info is mapped
      expect(result.results[0]?.case).toMatchObject({
        title: "Login Test",
        severity: "major", // 3 -> major
        priority: "medium", // 2 -> medium
      });

      // Check failed result
      expect(result.results[1]?.status).toBe("failed");
      expect(result.results[1]?.comment).toBe("Element not found");
      expect(result.results[1]?.stacktrace).toContain("Error: Element not found");
      expect(result.results[1]?.steps[1]?.comment).toBe("Button not clickable");

      // Check blocked and skipped results
      expect(result.results[2]?.status).toBe("blocked");
      expect(result.results[3]?.status).toBe("skipped");

      // Check byStatus grouping
      expect(result.byStatus.passed).toHaveLength(1);
      expect(result.byStatus.failed).toHaveLength(1);
      expect(result.byStatus.blocked).toHaveLength(1);
      expect(result.byStatus.skipped).toHaveLength(1);

      // Check summary
      expect(result.summary).toEqual({
        passed: 1,
        failed: 1,
        blocked: 1,
        skipped: 1,
        invalid: 0,
        in_progress: 0,
        other: 0,
        passRate: 25, // 1 passed out of 4
      });

      expect(result.cached).toBe(false);
      expect(cacheSet).toHaveBeenCalled();
    });

    it("should return test results from cache when available", async () => {
      const cachedData = {
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            hash: "cached123",
            run_id: 10,
            case_id: 1,
            status: "passed",
            case: { title: "Cached Test" },
          },
        ],
      };
      vi.mocked(cacheGet).mockResolvedValueOnce(cachedData);

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 10,
      });

      expect(result.success).toBe(true);
      expect(result.results[0]?.hash).toBe("cached123");
      expect(result.results[0]?.caseTitle).toBe("Cached Test");
      expect(result.cached).toBe(true);
      expect(mockGetTestResults).not.toHaveBeenCalled();
    });

    it("should apply filters correctly", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 50,
        filtered: 10,
        count: 10,
        entities: [],
      });

      await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
        status: "failed",
        limit: 50,
        offset: 10,
      });

      expect(mockGetTestResults).toHaveBeenCalledWith("GV", {
        run: 45,
        status: "failed",
        limit: 50,
        offset: 10,
      });
    });

    it("should handle auth error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockRejectedValueOnce(new QaseAuthError());

      const result = await getRunResultsWithCache("invalid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired");
      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("should handle API error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockRejectedValueOnce(new QaseApiError("Run not found", 404));

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 9999,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Run not found");
    });

    it("should handle unknown error", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockRejectedValueOnce(new Error("Network error"));

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get run results");
    });

    it("should handle results without steps", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            hash: "nosteps123",
            run_id: 45,
            case_id: 1,
            status: "passed",
            case: { title: "No Steps Test" },
            // No steps property
          },
        ],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.results[0]?.steps).toEqual([]);
    });

    it("should handle empty results", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.success).toBe(true);
      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.summary.passRate).toBe(0);
      expect(result.summary).toEqual({
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        invalid: 0,
        in_progress: 0,
        other: 0,
        passRate: 0,
      });
    });

    it("should correctly count all status types in summary", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 7,
        filtered: 7,
        count: 7,
        entities: [
          { hash: "1", run_id: 45, case_id: 1, status: "passed", case: { title: "T1" } },
          { hash: "2", run_id: 45, case_id: 2, status: "passed", case: { title: "T2" } },
          { hash: "3", run_id: 45, case_id: 3, status: "failed", case: { title: "T3" } },
          { hash: "4", run_id: 45, case_id: 4, status: "blocked", case: { title: "T4" } },
          { hash: "5", run_id: 45, case_id: 5, status: "skipped", case: { title: "T5" } },
          { hash: "6", run_id: 45, case_id: 6, status: "invalid", case: { title: "T6" } },
          { hash: "7", run_id: 45, case_id: 7, status: "in_progress", case: { title: "T7" } },
        ],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.summary.passed).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.blocked).toBe(1);
      expect(result.summary.skipped).toBe(1);
      expect(result.summary.invalid).toBe(1);
      expect(result.summary.in_progress).toBe(1);
      expect(result.summary.other).toBe(0);

      // Pass rate = passed / total * 100 = 2/7 * 100 = 28.57
      expect(result.summary.passRate).toBeCloseTo(28.57, 1);
    });

    it("should handle results without case info", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            hash: "nocase123",
            run_id: 45,
            case_id: 999,
            status: "passed",
            // No case property
          },
        ],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.results[0]?.caseTitle).toBe("Case #999");
      expect(result.results[0]?.case).toBeNull();
    });
  });

  describe("createGetRunResultsTool", () => {
    it("should create a valid LangChain tool", () => {
      const tool = createGetRunResultsTool(
        () => "test-token",
        () => "user-123"
      );

      expect(tool.name).toBe("get_run_results");
      expect(tool.description).toContain("Gets");
      expect(tool.description).toContain("test results");
      expect(tool.description).toContain("runId");
    });

    it("should execute and return JSON result", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          {
            hash: "test1",
            run_id: 45,
            case_id: 1,
            status: "passed",
            case: { title: "Test Case 1" },
          },
          {
            hash: "test2",
            run_id: 45,
            case_id: 2,
            status: "failed",
            comment: "Assertion failed",
            case: { title: "Test Case 2" },
          },
        ],
      });

      const tool = createGetRunResultsTool(
        () => "test-token",
        () => "user-123"
      );

      const resultJson = await tool.invoke({ projectCode: "GV", runId: 45 });
      const result: GetRunResultsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
      expect(result.results[0]?.caseTitle).toBe("Test Case 1");
      expect(result.results[1]?.comment).toBe("Assertion failed");
      expect(result.summary.passRate).toBe(50);
    });

    it("should support async token/userId getters", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetRunResultsTool(
        async () => "async-token",
        async () => "async-user"
      );

      const resultJson = await tool.invoke({ projectCode: "GV", runId: 45 });
      const result: GetRunResultsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });

    it("should pass filters to the API", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetRunResultsTool(
        () => "test-token",
        () => "user-123"
      );

      await tool.invoke({
        projectCode: "GV",
        runId: 45,
        status: "failed",
        limit: 25,
        offset: 0,
      });

      expect(mockGetTestResults).toHaveBeenCalledWith("GV", expect.objectContaining({
        run: 45,
        status: "failed",
        limit: 25,
        offset: 0,
      }));
    });
  });

  describe("createGetRunResultsToolWithContext", () => {
    it("should create tool with fixed token and userId", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      const tool = createGetRunResultsToolWithContext("fixed-token", "fixed-user");

      const resultJson = await tool.invoke({ projectCode: "GV", runId: 45 });
      const result: GetRunResultsResult = JSON.parse(resultJson);

      expect(result.success).toBe(true);
    });
  });

  describe("filter hash generation", () => {
    it("should use different cache keys for different filters", async () => {
      vi.mocked(cacheGet).mockResolvedValue(null);
      mockGetTestResults.mockResolvedValue({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      // First call with passed status filter
      await getRunResultsWithCache("token", "user", {
        projectCode: "GV",
        runId: 45,
        status: "passed",
      });

      // Second call with failed status filter
      await getRunResultsWithCache("token", "user", {
        projectCode: "GV",
        runId: 45,
        status: "failed",
      });

      // Each call should have a different cache key
      const cacheSetCalls = vi.mocked(cacheSet).mock.calls;
      expect(cacheSetCalls.length).toBe(2);
      expect(cacheSetCalls[0]?.[0]).not.toBe(cacheSetCalls[1]?.[0]);
    });

    it("should use same cache key for same filters", async () => {
      vi.mocked(cacheGet).mockResolvedValue(null);
      mockGetTestResults.mockResolvedValue({
        total: 0,
        filtered: 0,
        count: 0,
        entities: [],
      });

      // Two calls with same filters
      await getRunResultsWithCache("token", "user", {
        projectCode: "GV",
        runId: 45,
        status: "passed",
        limit: 100,
      });

      await getRunResultsWithCache("token", "user", {
        projectCode: "GV",
        runId: 45,
        status: "passed",
        limit: 100,
      });

      // Both should use same cache key pattern
      const cacheSetCalls = vi.mocked(cacheSet).mock.calls;
      expect(cacheSetCalls[0]?.[0]).toBe(cacheSetCalls[1]?.[0]);
    });
  });

  describe("pass rate calculation", () => {
    it("should correctly calculate pass rate with various scenarios", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 10,
        filtered: 10,
        count: 10,
        entities: Array.from({ length: 10 }, (_, i) => ({
          hash: `hash${i}`,
          run_id: 45,
          case_id: i + 1,
          status: i < 7 ? "passed" : "failed", // 7 passed, 3 failed
          case: { title: `Test ${i + 1}` },
        })),
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.summary.passRate).toBe(70); // 7/10 * 100
    });

    it("should return 0 pass rate for all failed results", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 5,
        filtered: 5,
        count: 5,
        entities: Array.from({ length: 5 }, (_, i) => ({
          hash: `hash${i}`,
          run_id: 45,
          case_id: i + 1,
          status: "failed",
          case: { title: `Test ${i + 1}` },
        })),
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.summary.passRate).toBe(0);
    });

    it("should return 100 pass rate for all passed results", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 5,
        filtered: 5,
        count: 5,
        entities: Array.from({ length: 5 }, (_, i) => ({
          hash: `hash${i}`,
          run_id: 45,
          case_id: i + 1,
          status: "passed",
          case: { title: `Test ${i + 1}` },
        })),
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.summary.passRate).toBe(100);
    });
  });

  describe("byStatus grouping", () => {
    it("should correctly group results by status", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 6,
        filtered: 6,
        count: 6,
        entities: [
          { hash: "p1", run_id: 45, case_id: 1, status: "passed", case: { title: "T1" } },
          { hash: "p2", run_id: 45, case_id: 2, status: "passed", case: { title: "T2" } },
          { hash: "f1", run_id: 45, case_id: 3, status: "failed", case: { title: "T3" } },
          { hash: "b1", run_id: 45, case_id: 4, status: "blocked", case: { title: "T4" } },
          { hash: "s1", run_id: 45, case_id: 5, status: "skipped", case: { title: "T5" } },
          { hash: "f2", run_id: 45, case_id: 6, status: "failed", case: { title: "T6" } },
        ],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.byStatus.passed).toHaveLength(2);
      expect(result.byStatus.failed).toHaveLength(2);
      expect(result.byStatus.blocked).toHaveLength(1);
      expect(result.byStatus.skipped).toHaveLength(1);
      expect(result.byStatus.invalid).toHaveLength(0);
      expect(result.byStatus.in_progress).toHaveLength(0);
      expect(result.byStatus.other).toHaveLength(0);

      // Verify the actual items are in the correct groups
      expect(result.byStatus.passed.map(r => r.hash)).toEqual(["p1", "p2"]);
      expect(result.byStatus.failed.map(r => r.hash)).toEqual(["f1", "f2"]);
    });

    it("should put unknown status into other group", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          { hash: "p1", run_id: 45, case_id: 1, status: "passed", case: { title: "T1" } },
          { hash: "u1", run_id: 45, case_id: 2, status: "unknown_status", case: { title: "T2" } },
        ],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.byStatus.passed).toHaveLength(1);
      expect(result.byStatus.other).toHaveLength(1);
      expect(result.byStatus.other[0]?.hash).toBe("u1");
    });
  });

  describe("severity/priority/automation mapping", () => {
    it("should correctly map severity values", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      mockGetTestResults.mockResolvedValueOnce({
        total: 1,
        filtered: 1,
        count: 1,
        entities: [
          {
            hash: "sev123",
            run_id: 45,
            case_id: 1,
            status: "passed",
            case: {
              title: "Severity Test",
              severity: 1, // blocker
              priority: 1, // high
              automation: 1, // automated
            },
          },
        ],
      });

      const result = await getRunResultsWithCache("valid-token", "user-123", {
        projectCode: "GV",
        runId: 45,
      });

      expect(result.results[0]?.case?.severity).toBe("blocker");
      expect(result.results[0]?.case?.priority).toBe("high");
      expect(result.results[0]?.case?.automation).toBe("automated");
    });
  });
});
