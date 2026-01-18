/**
 * Testes unitários para o cliente Redis.
 *
 * @see US-005: Listar Projetos do Qase
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock do ioredis
const mockRedis = {
  setex: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

vi.mock("ioredis", () => ({
  default: vi.fn(() => mockRedis),
}));

// Mock do env
vi.mock("../../lib/env.js", () => ({
  env: {
    REDIS_URL: "redis://localhost:6380",
  },
}));

// Import after mocks
import {
  cacheSet,
  cacheGet,
  cacheDelete,
  cacheDeletePattern,
  isRedisConnected,
  CACHE_TTL,
  CACHE_KEYS,
} from "../../lib/redis.js";

describe("Redis Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("CACHE_TTL constants", () => {
    it("should have correct TTL values", () => {
      expect(CACHE_TTL.PROJECTS).toBe(5 * 60); // 5 minutes
      expect(CACHE_TTL.TEST_CASES).toBe(2 * 60); // 2 minutes
      expect(CACHE_TTL.RESULTS).toBe(5 * 60); // 5 minutes (US-008)
    });
  });

  describe("CACHE_KEYS helpers", () => {
    it("should generate correct project list key", () => {
      const key = CACHE_KEYS.projectList("user-123");
      expect(key).toBe("qase:projects:user-123");
    });

    it("should generate correct project key", () => {
      const key = CACHE_KEYS.project("user-123", "DEMO");
      expect(key).toBe("qase:project:user-123:DEMO");
    });

    it("should generate correct test result list key", () => {
      const key = CACHE_KEYS.testResultList("user-123", "GV", 45, "abc123");
      expect(key).toBe("qase:results:user-123:GV:45:abc123");
    });

    it("should generate correct test result key", () => {
      const key = CACHE_KEYS.testResult("user-123", "GV", "hash123");
      expect(key).toBe("qase:result:user-123:GV:hash123");
    });
  });

  describe("cacheSet", () => {
    it("should store value with TTL", async () => {
      mockRedis.setex.mockResolvedValueOnce("OK");

      const result = await cacheSet("test-key", { foo: "bar" }, 300);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        "test-key",
        300,
        JSON.stringify({ foo: "bar" })
      );
    });

    it("should return false on error", async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error("Connection failed"));

      const result = await cacheSet("test-key", { foo: "bar" }, 300);

      expect(result).toBe(false);
    });
  });

  describe("cacheGet", () => {
    it("should retrieve and parse value", async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ foo: "bar" }));

      const result = await cacheGet<{ foo: string }>("test-key");

      expect(result).toEqual({ foo: "bar" });
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
    });

    it("should return null for missing key", async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await cacheGet("missing-key");

      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Connection failed"));

      const result = await cacheGet("test-key");

      expect(result).toBeNull();
    });
  });

  describe("cacheDelete", () => {
    it("should delete key", async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      const result = await cacheDelete("test-key");

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith("test-key");
    });

    it("should return false on error", async () => {
      mockRedis.del.mockRejectedValueOnce(new Error("Connection failed"));

      const result = await cacheDelete("test-key");

      expect(result).toBe(false);
    });
  });

  describe("cacheDeletePattern", () => {
    it("should delete keys matching pattern", async () => {
      mockRedis.keys.mockResolvedValueOnce(["key1", "key2", "key3"]);
      mockRedis.del.mockResolvedValueOnce(3);

      const result = await cacheDeletePattern("qase:*");

      expect(result).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith("qase:*");
      expect(mockRedis.del).toHaveBeenCalledWith("key1", "key2", "key3");
    });

    it("should return 0 for no matching keys", async () => {
      mockRedis.keys.mockResolvedValueOnce([]);

      const result = await cacheDeletePattern("nonexistent:*");

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe("isRedisConnected", () => {
    it("should return true when connected", async () => {
      mockRedis.ping.mockResolvedValueOnce("PONG");

      const result = await isRedisConnected();

      expect(result).toBe(true);
    });

    it("should return false on ping error", async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error("Not connected"));

      const result = await isRedisConnected();

      expect(result).toBe(false);
    });
  });
});
