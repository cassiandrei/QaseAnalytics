/**
 * Testes de integração para as rotas Qase.
 *
 * @see US-004: Conexão com Qase API
 * @see US-006: Obter Casos de Teste
 * @see US-007: Obter Execuções de Teste
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { qaseRoutes } from "../../routes/qase.js";

// Mock do serviço Qase
vi.mock("../../services/qase.service.js", () => ({
  validateQaseToken: vi.fn(),
  connectQase: vi.fn(),
  disconnectQase: vi.fn(),
  getQaseConnectionStatus: vi.fn(),
  listQaseProjects: vi.fn(),
  getQaseProject: vi.fn(),
  revalidateQaseToken: vi.fn(),
  listQaseTestCases: vi.fn(),
  getQaseTestCase: vi.fn(),
  listQaseTestRuns: vi.fn(),
  getQaseTestRun: vi.fn(),
}));

import {
  validateQaseToken,
  connectQase,
  disconnectQase,
  getQaseConnectionStatus,
  listQaseProjects,
  getQaseProject,
  revalidateQaseToken,
  listQaseTestCases,
  getQaseTestCase,
  listQaseTestRuns,
  getQaseTestRun,
} from "../../services/qase.service.js";

/** Helper para tipar respostas JSON */
async function getJsonResponse<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("Qase Routes Integration", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/qase", qaseRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/qase/validate", () => {
    it("should validate a token successfully", async () => {
      vi.mocked(validateQaseToken).mockResolvedValueOnce({
        valid: true,
        message: "Token is valid",
        projectCount: 5,
      });

      const res = await app.request("/api/qase/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "valid-token" }),
      });

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ valid: boolean; projectCount: number }>(res);
      expect(data.valid).toBe(true);
      expect(data.projectCount).toBe(5);
    });

    it("should return 400 for invalid token", async () => {
      vi.mocked(validateQaseToken).mockResolvedValueOnce({
        valid: false,
        message: "Invalid or expired token",
      });

      const res = await app.request("/api/qase/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token" }),
      });

      expect(res.status).toBe(400);
      const data = await getJsonResponse<{ valid: boolean }>(res);
      expect(data.valid).toBe(false);
    });

    it("should return 400 for missing token", async () => {
      const res = await app.request("/api/qase/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/qase/connect", () => {
    it("should connect successfully with valid token", async () => {
      vi.mocked(connectQase).mockResolvedValueOnce({
        success: true,
        message: "Successfully connected to Qase.io. Found 2 projects.",
        projects: [
          { code: "PROJ1", title: "Project 1" },
          { code: "PROJ2", title: "Project 2" },
        ],
        maskedToken: "vali****oken",
      });

      const res = await app.request("/api/qase/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "valid-token" }),
      });

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{
        success: boolean;
        projects: Array<{ code: string; title: string }>;
      }>(res);
      expect(data.success).toBe(true);
      expect(data.projects).toHaveLength(2);
    });

    it("should return 400 for invalid token", async () => {
      vi.mocked(connectQase).mockResolvedValueOnce({
        success: false,
        message: "Invalid or expired token",
      });

      const res = await app.request("/api/qase/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token" }),
      });

      expect(res.status).toBe(400);
      const data = await getJsonResponse<{ success: boolean }>(res);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/qase/disconnect", () => {
    it("should disconnect successfully", async () => {
      vi.mocked(disconnectQase).mockResolvedValueOnce(true);

      const res = await app.request("/api/qase/disconnect", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ success: boolean }>(res);
      expect(data.success).toBe(true);
    });

    it("should return 500 on failure", async () => {
      vi.mocked(disconnectQase).mockResolvedValueOnce(false);

      const res = await app.request("/api/qase/disconnect", {
        method: "POST",
      });

      expect(res.status).toBe(500);
      const data = await getJsonResponse<{ success: boolean }>(res);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/qase/status", () => {
    it("should return connected status", async () => {
      vi.mocked(getQaseConnectionStatus).mockResolvedValueOnce({
        connected: true,
        maskedToken: "vali****oken",
      });

      const res = await app.request("/api/qase/status");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ connected: boolean; maskedToken?: string }>(res);
      expect(data.connected).toBe(true);
      expect(data.maskedToken).toBeDefined();
    });

    it("should return disconnected status", async () => {
      vi.mocked(getQaseConnectionStatus).mockResolvedValueOnce({
        connected: false,
      });

      const res = await app.request("/api/qase/status");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ connected: boolean }>(res);
      expect(data.connected).toBe(false);
    });
  });

  describe("POST /api/qase/revalidate", () => {
    it("should revalidate successfully", async () => {
      vi.mocked(revalidateQaseToken).mockResolvedValueOnce({
        valid: true,
        message: "Token is valid",
        projectCount: 3,
      });

      const res = await app.request("/api/qase/revalidate", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ valid: boolean }>(res);
      expect(data.valid).toBe(true);
    });

    it("should return 400 for invalid token", async () => {
      vi.mocked(revalidateQaseToken).mockResolvedValueOnce({
        valid: false,
        message: "Invalid or expired token",
      });

      const res = await app.request("/api/qase/revalidate", {
        method: "POST",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/qase/projects", () => {
    it("should list projects for connected user", async () => {
      vi.mocked(listQaseProjects).mockResolvedValueOnce({
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          { code: "PROJ1", title: "Project 1" },
          { code: "PROJ2", title: "Project 2" },
        ],
      });

      const res = await app.request("/api/qase/projects");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{
        total: number;
        entities: Array<{ code: string }>;
      }>(res);
      expect(data.total).toBe(2);
      expect(data.entities).toHaveLength(2);
    });

    it("should return 401 for disconnected user", async () => {
      vi.mocked(listQaseProjects).mockResolvedValueOnce(null);

      const res = await app.request("/api/qase/projects");

      expect(res.status).toBe(401);
      const data = await getJsonResponse<{ error: string }>(res);
      expect(data.error).toBe("Not connected to Qase.io");
    });

    it("should support pagination", async () => {
      vi.mocked(listQaseProjects).mockResolvedValueOnce({
        total: 10,
        filtered: 10,
        count: 5,
        entities: [],
      });

      const res = await app.request("/api/qase/projects?limit=5&offset=5");

      expect(res.status).toBe(200);
      expect(listQaseProjects).toHaveBeenCalledWith(expect.any(String), {
        limit: 5,
        offset: 5,
      });
    });
  });

  describe("GET /api/qase/projects/:code", () => {
    it("should get project details", async () => {
      vi.mocked(getQaseProject).mockResolvedValueOnce({
        code: "DEMO",
        title: "Demo Project",
        description: "A demo project",
      });

      const res = await app.request("/api/qase/projects/DEMO");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ code: string }>(res);
      expect(data.code).toBe("DEMO");
    });

    it("should return 404 for non-existent project", async () => {
      vi.mocked(getQaseProject).mockResolvedValueOnce(null);

      const res = await app.request("/api/qase/projects/NONEXISTENT");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/qase/projects/:code/cases", () => {
    it("should list test cases for a project", async () => {
      vi.mocked(listQaseTestCases).mockResolvedValueOnce({
        total: 2,
        filtered: 2,
        count: 2,
        entities: [
          { id: 1, title: "Login Test", severity: 2, priority: 1, automation: 1 },
          { id: 2, title: "Logout Test", severity: 4, priority: 2, automation: 0 },
        ],
      });

      const res = await app.request("/api/qase/projects/GV/cases");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{
        total: number;
        entities: Array<{ id: number; title: string }>;
      }>(res);
      expect(data.total).toBe(2);
      expect(data.entities).toHaveLength(2);
      expect(data.entities[0]?.title).toBe("Login Test");
    });

    it("should return 401 for disconnected user", async () => {
      vi.mocked(listQaseTestCases).mockResolvedValueOnce(null);

      const res = await app.request("/api/qase/projects/GV/cases");

      expect(res.status).toBe(401);
      const data = await getJsonResponse<{ error: string }>(res);
      expect(data.error).toBe("Not connected to Qase.io");
    });

    it("should support pagination", async () => {
      vi.mocked(listQaseTestCases).mockResolvedValueOnce({
        total: 100,
        filtered: 100,
        count: 50,
        entities: [],
      });

      const res = await app.request("/api/qase/projects/GV/cases?limit=50&offset=50");

      expect(res.status).toBe(200);
      expect(listQaseTestCases).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({ limit: 50, offset: 50 })
      );
    });

    it("should support filters", async () => {
      vi.mocked(listQaseTestCases).mockResolvedValueOnce({
        total: 10,
        filtered: 5,
        count: 5,
        entities: [],
      });

      const res = await app.request(
        "/api/qase/projects/GV/cases?priority=high&automation=automated&status=actual"
      );

      expect(res.status).toBe(200);
      expect(listQaseTestCases).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({
          priority: "high",
          automation: "automated",
          status: "actual",
        })
      );
    });

    it("should support search filter", async () => {
      vi.mocked(listQaseTestCases).mockResolvedValueOnce({
        total: 5,
        filtered: 2,
        count: 2,
        entities: [],
      });

      const res = await app.request("/api/qase/projects/GV/cases?search=login");

      expect(res.status).toBe(200);
      expect(listQaseTestCases).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({ search: "login" })
      );
    });

    it("should support suiteId filter", async () => {
      vi.mocked(listQaseTestCases).mockResolvedValueOnce({
        total: 10,
        filtered: 3,
        count: 3,
        entities: [],
      });

      const res = await app.request("/api/qase/projects/GV/cases?suiteId=5");

      expect(res.status).toBe(200);
      expect(listQaseTestCases).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({ suiteId: 5 })
      );
    });
  });

  describe("GET /api/qase/projects/:code/cases/:caseId", () => {
    it("should get test case details", async () => {
      vi.mocked(getQaseTestCase).mockResolvedValueOnce({
        id: 123,
        title: "Login Test",
        description: "Test the login functionality",
        severity: 2,
        priority: 1,
        automation: 1,
      });

      const res = await app.request("/api/qase/projects/GV/cases/123");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ id: number; title: string }>(res);
      expect(data.id).toBe(123);
      expect(data.title).toBe("Login Test");
    });

    it("should return 404 for non-existent test case", async () => {
      vi.mocked(getQaseTestCase).mockResolvedValueOnce(null);

      const res = await app.request("/api/qase/projects/GV/cases/999");

      expect(res.status).toBe(404);
      const data = await getJsonResponse<{ error: string }>(res);
      expect(data.error).toBe("Test case not found or not connected");
    });

    it("should return 400 for invalid case ID", async () => {
      const res = await app.request("/api/qase/projects/GV/cases/invalid");

      expect(res.status).toBe(400);
      const data = await getJsonResponse<{ error: string }>(res);
      expect(data.error).toBe("Invalid case ID");
    });

    it("should return 400 for negative case ID", async () => {
      const res = await app.request("/api/qase/projects/GV/cases/-1");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/qase/projects/:code/runs", () => {
    it("should list test runs for a project", async () => {
      vi.mocked(listQaseTestRuns).mockResolvedValueOnce({
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
      });

      const res = await app.request("/api/qase/projects/GV/runs");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{
        total: number;
        entities: Array<{ id: number; title: string }>;
      }>(res);
      expect(data.total).toBe(2);
      expect(data.entities).toHaveLength(2);
      expect(data.entities[0]?.title).toBe("Sprint 1 Run");
    });

    it("should return 401 for disconnected user", async () => {
      vi.mocked(listQaseTestRuns).mockResolvedValueOnce(null);

      const res = await app.request("/api/qase/projects/GV/runs");

      expect(res.status).toBe(401);
      const data = await getJsonResponse<{ error: string }>(res);
      expect(data.error).toBe("Not connected to Qase.io");
    });

    it("should support pagination", async () => {
      vi.mocked(listQaseTestRuns).mockResolvedValueOnce({
        total: 100,
        filtered: 100,
        count: 50,
        entities: [],
      });

      const res = await app.request("/api/qase/projects/GV/runs?limit=50&offset=50");

      expect(res.status).toBe(200);
      expect(listQaseTestRuns).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({ limit: 50, offset: 50 })
      );
    });

    it("should support status filter", async () => {
      vi.mocked(listQaseTestRuns).mockResolvedValueOnce({
        total: 10,
        filtered: 5,
        count: 5,
        entities: [],
      });

      const res = await app.request("/api/qase/projects/GV/runs?status=complete");

      expect(res.status).toBe(200);
      expect(listQaseTestRuns).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({ status: "complete" })
      );
    });

    it("should support date range filters", async () => {
      vi.mocked(listQaseTestRuns).mockResolvedValueOnce({
        total: 5,
        filtered: 5,
        count: 5,
        entities: [],
      });

      const res = await app.request(
        "/api/qase/projects/GV/runs?fromStartTime=2024-01-01&toStartTime=2024-01-31"
      );

      expect(res.status).toBe(200);
      expect(listQaseTestRuns).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({
          fromStartTime: "2024-01-01",
          toStartTime: "2024-01-31",
        })
      );
    });

    it("should support milestone and environment filters", async () => {
      vi.mocked(listQaseTestRuns).mockResolvedValueOnce({
        total: 5,
        filtered: 2,
        count: 2,
        entities: [],
      });

      const res = await app.request("/api/qase/projects/GV/runs?milestone=10&environment=5");

      expect(res.status).toBe(200);
      expect(listQaseTestRuns).toHaveBeenCalledWith(
        expect.any(String),
        "GV",
        expect.objectContaining({ milestone: 10, environment: 5 })
      );
    });
  });

  describe("GET /api/qase/projects/:code/runs/:runId", () => {
    it("should get test run details", async () => {
      vi.mocked(getQaseTestRun).mockResolvedValueOnce({
        id: 123,
        title: "Sprint 1 Run",
        description: "Test run for sprint 1",
        status: 1,
        stats: { total: 50, passed: 45, failed: 3, blocked: 2 },
        start_time: "2024-01-15T10:00:00Z",
        end_time: "2024-01-15T12:00:00Z",
      });

      const res = await app.request("/api/qase/projects/GV/runs/123");

      expect(res.status).toBe(200);
      const data = await getJsonResponse<{ id: number; title: string }>(res);
      expect(data.id).toBe(123);
      expect(data.title).toBe("Sprint 1 Run");
    });

    it("should return 404 for non-existent test run", async () => {
      vi.mocked(getQaseTestRun).mockResolvedValueOnce(null);

      const res = await app.request("/api/qase/projects/GV/runs/999");

      expect(res.status).toBe(404);
      const data = await getJsonResponse<{ error: string }>(res);
      expect(data.error).toBe("Test run not found or not connected");
    });

    it("should return 400 for invalid run ID", async () => {
      const res = await app.request("/api/qase/projects/GV/runs/invalid");

      expect(res.status).toBe(400);
      const data = await getJsonResponse<{ error: string }>(res);
      expect(data.error).toBe("Invalid run ID");
    });

    it("should return 400 for negative run ID", async () => {
      const res = await app.request("/api/qase/projects/GV/runs/-1");

      expect(res.status).toBe(400);
    });
  });
});
