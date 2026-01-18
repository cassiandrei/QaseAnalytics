/**
 * Unit Tests - Prisma Client Module
 *
 * Testa o módulo de conexão com o banco de dados.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock do PrismaClient antes de importar o módulo
vi.mock("@prisma/client", () => {
  const mockPrisma = {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe("Prisma Client Module", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("prisma instance", () => {
    it("should export a prisma instance", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      expect(prisma).toBeDefined();
    });

    it("should be a singleton", async () => {
      const { prisma: prisma1 } = await import("../../lib/prisma.js");
      const { prisma: prisma2 } = await import("../../lib/prisma.js");
      expect(prisma1).toBe(prisma2);
    });
  });

  describe("checkDatabaseConnection", () => {
    it("should return true when database is connected", async () => {
      const { checkDatabaseConnection, prisma } = await import(
        "../../lib/prisma.js"
      );

      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { "?column?": 1 },
      ]);

      const result = await checkDatabaseConnection();
      expect(result).toBe(true);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("should return false when database connection fails", async () => {
      const { checkDatabaseConnection, prisma } = await import(
        "../../lib/prisma.js"
      );

      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const result = await checkDatabaseConnection();
      expect(result).toBe(false);
    });
  });

  describe("disconnectDatabase", () => {
    it("should call prisma.$disconnect", async () => {
      const { disconnectDatabase, prisma } = await import("../../lib/prisma.js");

      (prisma.$disconnect as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        undefined
      );

      await disconnectDatabase();
      expect(prisma.$disconnect).toHaveBeenCalledOnce();
    });
  });
});
