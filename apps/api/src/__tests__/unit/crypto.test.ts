/**
 * Testes unitários para o módulo de criptografia.
 *
 * @see US-004: Conexão com Qase API
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encrypt, decrypt, canDecrypt, maskToken } from "../../lib/crypto.js";

describe("Crypto Module", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Define uma chave de teste válida (32 caracteres)
    process.env.ENCRYPTION_KEY = "test-encryption-key-that-is-32ch";
  });

  afterAll(() => {
    // Restaura o ambiente original
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe("encrypt", () => {
    it("should encrypt a plaintext string", () => {
      const plaintext = "my-secret-api-token";
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    it("should produce different ciphertext for same plaintext (random IV/salt)", () => {
      const plaintext = "same-text";

      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty strings", () => {
      const encrypted = encrypt("");
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });

    it("should handle unicode characters", () => {
      const plaintext = "token-with-émojis-🎉-and-ñ";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle long tokens", () => {
      const plaintext = "a".repeat(1000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw if ENCRYPTION_KEY is not set", () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY environment variable is required");

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it("should throw if ENCRYPTION_KEY is too short", () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = "short";

      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be at least 32 characters");

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe("decrypt", () => {
    it("should decrypt an encrypted string", () => {
      const plaintext = "my-secret-api-token";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty encrypted strings", () => {
      const encrypted = encrypt("");
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe("");
    });

    it("should throw on invalid ciphertext", () => {
      expect(() => decrypt("invalid-base64!@#")).toThrow();
    });

    it("should throw on tampered ciphertext", () => {
      const encrypted = encrypt("test");
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -5) + "XXXXX";

      expect(() => decrypt(tampered)).toThrow();
    });

    it("should throw with wrong encryption key", () => {
      const encrypted = encrypt("test");

      // Change the key
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = "different-encryption-key-32chars";

      expect(() => decrypt(encrypted)).toThrow();

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe("canDecrypt", () => {
    it("should return true for valid encrypted text", () => {
      const encrypted = encrypt("test");
      expect(canDecrypt(encrypted)).toBe(true);
    });

    it("should return false for invalid encrypted text", () => {
      expect(canDecrypt("invalid")).toBe(false);
    });

    it("should return false for tampered encrypted text", () => {
      const encrypted = encrypt("test");
      const tampered = encrypted.slice(0, -5) + "XXXXX";

      expect(canDecrypt(tampered)).toBe(false);
    });
  });

  describe("maskToken", () => {
    it("should mask middle of token with default visible chars", () => {
      const token = "qase_12345678_abcd";
      const masked = maskToken(token);

      expect(masked).toBe("qase********abcd");
      expect(masked.length).toBeLessThan(token.length);
    });

    it("should mask token with custom visible chars", () => {
      const token = "qase_12345678_abcd";
      const masked = maskToken(token, 2);

      expect(masked).toBe("qa********cd");
    });

    it("should mask entire token if too short", () => {
      const token = "short";
      const masked = maskToken(token, 4);

      expect(masked).toBe("*****");
    });

    it("should handle empty token", () => {
      const masked = maskToken("", 4);
      expect(masked).toBe("");
    });

    it("should limit mask length to 8 chars", () => {
      const token = "a".repeat(100);
      const masked = maskToken(token, 4);

      // Should be: aaaa + 8 asterisks + aaaa = 16 chars
      expect(masked).toBe("aaaa********aaaa");
    });
  });
});
