/**
 * Crypto Utilities
 *
 * Encriptação e decriptação AES-256-GCM para tokens sensíveis.
 * Usado para armazenar API keys de forma segura no banco de dados.
 *
 * @see US-004: Conexão com Qase API
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Deriva uma chave de criptografia a partir de uma senha e salt.
 * Usa scrypt para key derivation (resistente a ataques de força bruta).
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Obtém a chave de encriptação do ambiente.
 * @throws Error se ENCRYPTION_KEY não estiver definida
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required for encryption");
  }
  if (key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters long");
  }
  return key;
}

/**
 * Encripta um texto usando AES-256-GCM.
 *
 * Formato do resultado: salt:iv:authTag:ciphertext (base64)
 *
 * @param plaintext - Texto a ser encriptado
 * @returns Texto encriptado em formato base64
 * @throws Error se a encriptação falhar
 *
 * @example
 * ```typescript
 * const encrypted = encrypt("my-api-token");
 * // Returns: "base64string..."
 * ```
 */
export function encrypt(plaintext: string): string {
  const encryptionKey = getEncryptionKey();

  // Gera salt e IV aleatórios para cada encriptação
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Deriva a chave a partir da senha e salt
  const key = deriveKey(encryptionKey, salt);

  // Cria o cipher e encripta
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combina salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decripta um texto encriptado com AES-256-GCM.
 *
 * @param encryptedText - Texto encriptado em formato base64
 * @returns Texto original decriptado
 * @throws Error se a decriptação falhar (chave errada ou dados corrompidos)
 *
 * @example
 * ```typescript
 * const decrypted = decrypt(encryptedToken);
 * // Returns: "my-api-token"
 * ```
 */
export function decrypt(encryptedText: string): string {
  const encryptionKey = getEncryptionKey();

  // Decodifica o base64
  const combined = Buffer.from(encryptedText, "base64");

  // Extrai as partes: salt + iv + authTag + ciphertext
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  // Deriva a chave a partir da senha e salt
  const key = deriveKey(encryptionKey, salt);

  // Cria o decipher e decripta
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Verifica se um texto encriptado pode ser decriptado com sucesso.
 * Útil para validar se a chave de encriptação está correta.
 *
 * @param encryptedText - Texto encriptado em formato base64
 * @returns true se a decriptação foi bem sucedida, false caso contrário
 */
export function canDecrypt(encryptedText: string): boolean {
  try {
    decrypt(encryptedText);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mascara um token para exibição segura.
 * Mostra apenas os primeiros e últimos caracteres.
 *
 * @param token - Token a ser mascarado
 * @param visibleChars - Número de caracteres visíveis no início e fim (default: 4)
 * @returns Token mascarado (ex: "qase_****_abc1")
 *
 * @example
 * ```typescript
 * maskToken("qase_12345678_abcd");
 * // Returns: "qase_****_abcd"
 * ```
 */
export function maskToken(token: string, visibleChars: number = 4): string {
  if (token.length <= visibleChars * 2) {
    return "*".repeat(token.length);
  }

  const start = token.slice(0, visibleChars);
  const end = token.slice(-visibleChars);
  const maskedLength = token.length - visibleChars * 2;

  return `${start}${"*".repeat(Math.min(maskedLength, 8))}${end}`;
}
