/**
 * Redis Client
 *
 * Cliente Redis para caching de dados.
 * Usado para cache de projetos Qase e outras operações.
 *
 * @see US-005: Listar Projetos do Qase
 */

import Redis from "ioredis";
import { env } from "./env.js";

/** Configuração padrão de TTL (em segundos) */
export const CACHE_TTL = {
  /** Cache de projetos: 5 minutos */
  PROJECTS: 5 * 60,
  /** Cache de casos de teste: 2 minutos */
  TEST_CASES: 2 * 60,
  /** Cache de test runs: 2 minutos */
  TEST_RUNS: 2 * 60,
  /** Cache de resultados detalhados: 5 minutos (US-008) */
  RESULTS: 5 * 60,
} as const;

/** Prefixos de chave para organização do cache */
export const CACHE_KEYS = {
  /** Prefixo para lista de projetos */
  projectList: (userId: string) => `qase:projects:${userId}`,
  /** Prefixo para projeto específico */
  project: (userId: string, code: string) => `qase:project:${userId}:${code}`,
  /** Prefixo para lista de casos de teste */
  testCaseList: (userId: string, projectCode: string, filterHash: string) =>
    `qase:cases:${userId}:${projectCode}:${filterHash}`,
  /** Prefixo para caso de teste específico */
  testCase: (userId: string, projectCode: string, caseId: number) =>
    `qase:case:${userId}:${projectCode}:${caseId}`,
  /** Prefixo para lista de test runs */
  testRunList: (userId: string, projectCode: string, filterHash: string) =>
    `qase:runs:${userId}:${projectCode}:${filterHash}`,
  /** Prefixo para test run específico */
  testRun: (userId: string, projectCode: string, runId: number) =>
    `qase:run:${userId}:${projectCode}:${runId}`,
  /** Prefixo para lista de resultados de teste (filtrado por run) */
  testResultList: (userId: string, projectCode: string, runId: number, filterHash: string) =>
    `qase:results:${userId}:${projectCode}:${runId}:${filterHash}`,
  /** Prefixo para resultado específico */
  testResult: (userId: string, projectCode: string, hash: string) =>
    `qase:result:${userId}:${projectCode}:${hash}`,
} as const;

/**
 * Cliente Redis singleton.
 * Retorna null se REDIS_URL não estiver configurado.
 */
let redisClient: Redis | null = null;

/**
 * Obtém o cliente Redis.
 * Cria uma nova conexão se ainda não existir.
 *
 * @returns Cliente Redis ou null se não configurado
 */
export function getRedisClient(): Redis | null {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    redisClient.on("connect", () => {
      // Redis connected successfully
    });
  }

  return redisClient;
}

/**
 * Armazena um valor no cache.
 *
 * @param key - Chave do cache
 * @param value - Valor a ser armazenado (será serializado como JSON)
 * @param ttlSeconds - Tempo de expiração em segundos
 * @returns true se armazenado com sucesso
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Redis SET error:", error);
    return false;
  }
}

/**
 * Obtém um valor do cache.
 *
 * @param key - Chave do cache
 * @returns Valor deserializado ou null se não encontrado
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Redis GET error:", error);
    return null;
  }
}

/**
 * Remove uma chave do cache.
 *
 * @param key - Chave a ser removida
 * @returns true se removido com sucesso
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("Redis DEL error:", error);
    return false;
  }
}

/**
 * Remove todas as chaves com um determinado prefixo.
 *
 * @param pattern - Padrão de chaves (ex: "qase:projects:*")
 * @returns Número de chaves removidas
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) {
    return 0;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return await redis.del(...keys);
  } catch (error) {
    console.error("Redis DEL pattern error:", error);
    return 0;
  }
}

/**
 * Verifica se o Redis está conectado.
 *
 * @returns true se conectado
 */
export async function isRedisConnected(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fecha a conexão com o Redis.
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
