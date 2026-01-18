/**
 * Prisma Client Singleton
 *
 * Instância única do Prisma Client para toda a aplicação.
 * Evita múltiplas conexões ao banco durante hot reload em desenvolvimento.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client configurado com logging em desenvolvimento.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Verifica a conexão com o banco de dados.
 * @returns true se conectado, false caso contrário
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Desconecta do banco de dados.
 * Útil para cleanup em testes ou shutdown graceful.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
