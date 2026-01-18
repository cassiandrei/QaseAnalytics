/**
 * Testes unitários para o serviço Qase.
 *
 * @see US-004: Conexão com Qase API
 * @see US-005: Listar Projetos do Qase
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { QaseAuthError, QaseApiError, QaseClient } from "../../lib/qase-client.js";

// Mock do Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock do crypto
vi.mock("../../lib/crypto.js", () => ({
  encrypt: vi.fn((text: string) => `encrypted:${text}`),
  decrypt: vi.fn((text: string) => text.replace("encrypted:", "")),
  maskToken: vi.fn((token: string) => `${token.slice(0, 4)}****`),
}));

// Mock do Redis
vi.mock("../../lib/redis.js", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDelete: vi.fn(),
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
  validateQaseToken,
  connectQase,
  disconnectQase,
  getQaseConnectionStatus,
  listQaseProjects,
  getQaseProject,
  revalidateQaseToken,
  invalidateProjectsCache,
} from "../../services/qase.service.js";
import { cacheGet, cacheSet, cacheDelete } from "../../lib/redis.js";

describe("Qase Service", () => {
  const mockGetProjects = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup mock para QaseClient
    vi.mocked(QaseClient).mockImplementation(() => ({
      validateToken: vi.fn(),
      getProjects: mockGetProjects,
      getProject: vi.fn(),
      getCurrentUser: vi.fn(),
    }) as unknown as QaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateQaseToken", () => {
    it("should return valid for a working token", async () => {
      mockGetProjects.mockResolvedValueOnce({ total: 5, entities: [] });

      const result = await validateQaseToken("valid-token");

      expect(result.valid).toBe(true);
      expect(result.projectCount).toBe(5);
    });

    it("should return invalid for empty token", async () => {
      const result = await validateQaseToken("");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Token is required");
    });

    it("should return invalid for auth error", async () => {
      mockGetProjects.mockRejectedValueOnce(new QaseAuthError());

      const result = await validateQaseToken("invalid-token");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Invalid or expired token");
    });

    it("should return invalid for API error", async () => {
      mockGetProjects.mockRejectedValueOnce(new QaseApiError("Server error", 500));

      const result = await validateQaseToken("token");

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Server error");
    });
  });

  describe("connectQase", () => {
    it("should connect user with valid token", async () => {
      mockGetProjects.mockResolvedValue({
        total: 2,
        entities: [
          { code: "PROJ1", title: "Project 1" },
          { code: "PROJ2", title: "Project 2" },
        ],
      });
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

      const result = await connectQase("user-123", "valid-token");

      expect(result.success).toBe(true);
      expect(result.projects).toHaveLength(2);
      expect(result.maskedToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          qaseApiToken: "encrypted:valid-token",
          qaseTokenValid: true,
        },
      });
    });

    it("should fail with invalid token", async () => {
      mockGetProjects.mockRejectedValue(new QaseAuthError());

      const result = await connectQase("user-123", "invalid-token");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid or expired token");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should fail with empty token", async () => {
      const result = await connectQase("user-123", "");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Token is required");
    });
  });

  describe("disconnectQase", () => {
    it("should disconnect user successfully", async () => {
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

      const result = await disconnectQase("user-123");

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          qaseApiToken: null,
          qaseTokenValid: false,
        },
      });
    });

    it("should return false on error", async () => {
      vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("DB error"));

      const result = await disconnectQase("user-123");

      expect(result).toBe(false);
    });
  });

  describe("getQaseConnectionStatus", () => {
    it("should return connected for user with valid token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: "encrypted:valid-token",
        qaseTokenValid: true,
      } as never);

      const result = await getQaseConnectionStatus("user-123");

      expect(result.connected).toBe(true);
      expect(result.maskedToken).toBeDefined();
    });

    it("should return disconnected for user without token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: null,
        qaseTokenValid: false,
      } as never);

      const result = await getQaseConnectionStatus("user-123");

      expect(result.connected).toBe(false);
    });

    it("should return disconnected for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const result = await getQaseConnectionStatus("non-existent");

      expect(result.connected).toBe(false);
    });
  });

  describe("listQaseProjects", () => {
    it("should list projects for connected user", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: "encrypted:valid-token",
        qaseTokenValid: true,
      } as never);
      mockGetProjects.mockResolvedValueOnce({
        total: 2,
        entities: [{ code: "PROJ1" }, { code: "PROJ2" }],
      });

      const result = await listQaseProjects("user-123");

      expect(result).not.toBeNull();
      expect(result?.total).toBe(2);
      expect(cacheSet).toHaveBeenCalled();
    });

    it("should return cached projects when available", async () => {
      const cachedProjects = {
        total: 1,
        entities: [{ code: "CACHED" }],
      };
      vi.mocked(cacheGet).mockResolvedValueOnce(cachedProjects);

      const result = await listQaseProjects("user-123");

      expect(result).toEqual(cachedProjects);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("should skip cache when skipCache option is true", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: "encrypted:valid-token",
        qaseTokenValid: true,
      } as never);
      mockGetProjects.mockResolvedValueOnce({
        total: 1,
        entities: [{ code: "FRESH" }],
      });

      const result = await listQaseProjects("user-123", { skipCache: true });

      expect(result?.entities[0]?.code).toBe("FRESH");
      expect(cacheGet).not.toHaveBeenCalled();
    });

    it("should return null for disconnected user", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: null,
        qaseTokenValid: false,
      } as never);

      const result = await listQaseProjects("user-123");

      expect(result).toBeNull();
    });
  });

  describe("getQaseProject", () => {
    const mockGetProject = vi.fn();

    beforeEach(() => {
      vi.mocked(QaseClient).mockImplementation(() => ({
        validateToken: vi.fn(),
        getProjects: mockGetProjects,
        getProject: mockGetProject,
        getCurrentUser: vi.fn(),
      }) as unknown as QaseClient);
    });

    it("should get project from API when not cached", async () => {
      vi.mocked(cacheGet).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: "encrypted:valid-token",
        qaseTokenValid: true,
      } as never);
      mockGetProject.mockResolvedValueOnce({
        code: "DEMO",
        title: "Demo Project",
      });

      const result = await getQaseProject("user-123", "DEMO");

      expect(result?.code).toBe("DEMO");
      expect(cacheSet).toHaveBeenCalled();
    });

    it("should return cached project when available", async () => {
      const cachedProject = { code: "CACHED", title: "Cached" };
      vi.mocked(cacheGet).mockResolvedValueOnce(cachedProject);

      const result = await getQaseProject("user-123", "CACHED");

      expect(result).toEqual(cachedProject);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("invalidateProjectsCache", () => {
    it("should invalidate specific project cache", async () => {
      await invalidateProjectsCache("user-123", "DEMO");

      expect(cacheDelete).toHaveBeenCalledWith("qase:project:user-123:DEMO");
    });

    it("should invalidate project list cache", async () => {
      await invalidateProjectsCache("user-123");

      expect(cacheDelete).toHaveBeenCalledWith("qase:projects:user-123");
    });
  });

  describe("revalidateQaseToken", () => {
    it("should revalidate valid token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: "encrypted:valid-token",
      } as never);
      mockGetProjects.mockResolvedValueOnce({ total: 3, entities: [] });
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

      const result = await revalidateQaseToken("user-123");

      expect(result.valid).toBe(true);
      expect(result.projectCount).toBe(3);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { qaseTokenValid: true },
      });
    });

    it("should mark invalid token as invalid", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: "encrypted:invalid-token",
      } as never);
      mockGetProjects.mockRejectedValueOnce(new QaseAuthError());
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

      const result = await revalidateQaseToken("user-123");

      expect(result.valid).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { qaseTokenValid: false },
      });
    });

    it("should return invalid for user without token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        qaseApiToken: null,
      } as never);

      const result = await revalidateQaseToken("user-123");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("No token configured");
    });
  });
});
