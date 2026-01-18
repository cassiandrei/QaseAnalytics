/**
 * Testes unitários para o cliente Qase API.
 *
 * @see US-004: Conexão com Qase API
 * @see US-059: Retry com Backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  QaseClient,
  QaseApiError,
  QaseAuthError,
  QaseRateLimitError,
} from "../../lib/qase-client.js";

describe("QaseClient", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("constructor", () => {
    it("should create client with valid token", () => {
      const client = new QaseClient("valid-token");
      expect(client).toBeInstanceOf(QaseClient);
    });

    it("should throw if token is empty", () => {
      expect(() => new QaseClient("")).toThrow("Qase API token is required");
    });
  });

  describe("validateToken", () => {
    it("should return true for valid token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { total: 5, filtered: 5, count: 1, entities: [] },
        }),
      });

      const client = new QaseClient("valid-token");
      const isValid = await client.validateToken();

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("should return false for invalid token (401)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ status: false, errorMessage: "Unauthorized" }),
      });

      const client = new QaseClient("invalid-token");
      const isValid = await client.validateToken();

      expect(isValid).toBe(false);
    });

    it("should return false for forbidden (403)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ status: false, errorMessage: "Forbidden" }),
      });

      const client = new QaseClient("forbidden-token");
      const isValid = await client.validateToken();

      expect(isValid).toBe(false);
    });
  });

  describe("getProjects", () => {
    it("should fetch projects successfully", async () => {
      const mockProjects = {
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          { code: "PROJ1", title: "Project 1", description: "First project" },
          { code: "PROJ2", title: "Project 2", description: null },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: true, result: mockProjects }),
      });

      const client = new QaseClient("valid-token");
      const projects = await client.getProjects();

      expect(projects.total).toBe(2);
      expect(projects.entities).toHaveLength(2);
      expect(projects.entities[0]?.code).toBe("PROJ1");
    });

    it("should pass pagination parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { total: 10, filtered: 10, count: 5, entities: [] },
        }),
      });

      const client = new QaseClient("valid-token");
      await client.getProjects({ limit: 5, offset: 10 });

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toContain("limit=5");
      expect(url).toContain("offset=10");
    });

    it("should include Token header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { total: 0, filtered: 0, count: 0, entities: [] },
        }),
      });

      const client = new QaseClient("my-api-token");
      await client.getProjects();

      const options = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(options?.headers).toHaveProperty("Token", "my-api-token");
    });
  });

  describe("getProject", () => {
    it("should fetch a single project", async () => {
      const mockProject = {
        code: "DEMO",
        title: "Demo Project",
        description: "A demo project",
        counts: { cases: 10, suites: 2, milestones: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: true, result: mockProject }),
      });

      const client = new QaseClient("valid-token");
      const project = await client.getProject("DEMO");

      expect(project.code).toBe("DEMO");
      expect(project.title).toBe("Demo Project");
    });
  });

  describe("error handling", () => {
    it("should throw QaseAuthError on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => null },
        json: async () => ({ status: false }),
      });

      const client = new QaseClient("invalid-token");

      await expect(client.getProjects()).rejects.toThrow(QaseAuthError);
    });

    it("should throw QaseRateLimitError on 429", async () => {
      const mockHeaders = {
        get: (name: string) => (name === "Retry-After" ? "60" : null),
      };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: mockHeaders,
        json: async () => ({ status: false }),
      });

      const client = new QaseClient("valid-token", "https://api.qase.io/v1");

      await expect(client.getProjects()).rejects.toThrow(QaseRateLimitError);
    });

    it("should throw QaseApiError on other errors", async () => {
      // Mockar 4 tentativas (1 inicial + 3 retries) todas com 500
      const mockResponse = {
        ok: false,
        status: 500,
        headers: { get: () => null },
        json: async () => ({ status: false, errorMessage: "Server error" }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new QaseClient("valid-token", "https://api.qase.io/v1");

      await expect(client.getProjects()).rejects.toThrow(QaseApiError);
    }, 15000);
  });

  describe("retry with backoff", () => {
    it("should retry on 5xx errors", async () => {
      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: { get: () => null },
          json: async () => ({ status: false, errorMessage: "Server error" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({
            status: true,
            result: { total: 1, filtered: 1, count: 1, entities: [] },
          }),
        });

      const client = new QaseClient("valid-token");
      const projects = await client.getProjects();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(projects.total).toBe(1);
    }, 10000);

    it("should not retry on 4xx errors (except 429)", async () => {
      // Use mockResolvedValue para garantir resposta em todas as chamadas
      // Mesmo que não devesse haver retry, isso evita undefined
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => null },
        json: async () => ({ status: false, errorMessage: "Not found" }),
      });

      const client = new QaseClient("valid-token", "https://api.qase.io/v1");

      await expect(client.getProjects()).rejects.toThrow(QaseApiError);
      // 404 não é retentável, então deve haver apenas 1 chamada
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should not retry on auth errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => null },
        json: async () => ({ status: false }),
      });

      const client = new QaseClient("invalid-token", "https://api.qase.io/v1");

      await expect(client.getProjects()).rejects.toThrow(QaseAuthError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should fail after max retries", async () => {
      // All calls fail with 500
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => null },
        json: async () => ({ status: false, errorMessage: "Server error" }),
      });

      const client = new QaseClient("valid-token");

      await expect(client.getProjects()).rejects.toThrow(QaseApiError);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    }, 30000);
  });

  describe("getTestCases", () => {
    it("should fetch test cases successfully", async () => {
      const mockTestCases = {
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          {
            id: 1,
            title: "Login Test",
            severity: 2,
            priority: 1,
            automation: 1,
            status: 0,
          },
          {
            id: 2,
            title: "Logout Test",
            severity: 4,
            priority: 2,
            automation: 0,
            status: 0,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: true, result: mockTestCases }),
      });

      const client = new QaseClient("valid-token");
      const testCases = await client.getTestCases("GV");

      expect(testCases.total).toBe(2);
      expect(testCases.entities).toHaveLength(2);
      expect(testCases.entities[0]?.id).toBe(1);
      expect(testCases.entities[0]?.title).toBe("Login Test");
    });

    it("should pass filter parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { total: 0, filtered: 0, count: 0, entities: [] },
        }),
      });

      const client = new QaseClient("valid-token");
      await client.getTestCases("GV", {
        limit: 50,
        offset: 10,
        severity: "critical",
        priority: "high",
        automation: "automated",
        status: "actual",
        suiteId: 5,
        search: "login",
      });

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toContain("limit=50");
      expect(url).toContain("offset=10");
      expect(url).toContain("severity=critical");
      expect(url).toContain("priority=high");
      expect(url).toContain("automation=automated");
      expect(url).toContain("status=actual");
      expect(url).toContain("suite_id=5");
      expect(url).toContain("search=login");
    });

    it("should call correct endpoint with project code", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { total: 0, filtered: 0, count: 0, entities: [] },
        }),
      });

      const client = new QaseClient("valid-token");
      await client.getTestCases("MY_PROJECT");

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toContain("/case/MY_PROJECT");
    });
  });

  describe("getTestCase", () => {
    it("should fetch a single test case", async () => {
      const mockTestCase = {
        id: 123,
        title: "Test Case Details",
        description: "A detailed test case",
        severity: 2,
        priority: 1,
        automation: 1,
        status: 0,
        suite_id: 5,
        is_flaky: 0,
        tags: [{ id: 1, title: "smoke" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: true, result: mockTestCase }),
      });

      const client = new QaseClient("valid-token");
      const testCase = await client.getTestCase("GV", 123);

      expect(testCase.id).toBe(123);
      expect(testCase.title).toBe("Test Case Details");
      expect(testCase.severity).toBe(2);
    });

    it("should call correct endpoint with project code and case ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { id: 456, title: "Test" },
        }),
      });

      const client = new QaseClient("valid-token");
      await client.getTestCase("MY_PROJECT", 456);

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toContain("/case/MY_PROJECT/456");
    });
  });

  describe("getTestRuns", () => {
    it("should fetch test runs successfully", async () => {
      const mockTestRuns = {
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          {
            id: 1,
            title: "Sprint 1 Run",
            status: 1,
            stats: { total: 50, passed: 45, failed: 3, blocked: 2 },
            start_time: "2024-01-15T10:00:00Z",
            end_time: "2024-01-15T12:00:00Z",
          },
          {
            id: 2,
            title: "Sprint 2 Run",
            status: 0,
            stats: { total: 30, passed: 10, failed: 5, blocked: 0 },
            start_time: "2024-01-20T09:00:00Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: true, result: mockTestRuns }),
      });

      const client = new QaseClient("valid-token");
      const testRuns = await client.getTestRuns("GV");

      expect(testRuns.total).toBe(2);
      expect(testRuns.entities).toHaveLength(2);
      expect(testRuns.entities[0]?.id).toBe(1);
      expect(testRuns.entities[0]?.title).toBe("Sprint 1 Run");
      expect(testRuns.entities[0]?.stats.passed).toBe(45);
    });

    it("should pass filter parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { total: 0, filtered: 0, count: 0, entities: [] },
        }),
      });

      const client = new QaseClient("valid-token");
      await client.getTestRuns("GV", {
        limit: 50,
        offset: 10,
        status: "complete",
        fromStartTime: "2024-01-01",
        toStartTime: "2024-01-31",
        milestone: 5,
        environment: 2,
      });

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toContain("limit=50");
      expect(url).toContain("offset=10");
      expect(url).toContain("status=complete");
      expect(url).toContain("from_start_time=2024-01-01");
      expect(url).toContain("to_start_time=2024-01-31");
      expect(url).toContain("milestone=5");
      expect(url).toContain("environment=2");
    });

    it("should call correct endpoint with project code", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { total: 0, filtered: 0, count: 0, entities: [] },
        }),
      });

      const client = new QaseClient("valid-token");
      await client.getTestRuns("MY_PROJECT");

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toContain("/run/MY_PROJECT");
    });
  });

  describe("getTestRun", () => {
    it("should fetch a single test run", async () => {
      const mockTestRun = {
        id: 123,
        title: "Test Run Details",
        description: "A detailed test run",
        status: 1,
        stats: { total: 100, passed: 95, failed: 3, blocked: 2 },
        start_time: "2024-01-15T10:00:00Z",
        end_time: "2024-01-15T14:00:00Z",
        environment_id: 1,
        milestone_id: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: true, result: mockTestRun }),
      });

      const client = new QaseClient("valid-token");
      const testRun = await client.getTestRun("GV", 123);

      expect(testRun.id).toBe(123);
      expect(testRun.title).toBe("Test Run Details");
      expect(testRun.status).toBe(1);
      expect(testRun.stats.passed).toBe(95);
    });

    it("should call correct endpoint with project code and run ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          result: { id: 456, title: "Test", status: 0, stats: { total: 0, passed: 0, failed: 0, blocked: 0 } },
        }),
      });

      const client = new QaseClient("valid-token");
      await client.getTestRun("MY_PROJECT", 456);

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toContain("/run/MY_PROJECT/456");
    });
  });
});
