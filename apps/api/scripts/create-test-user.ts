/**
 * Script para criar um usuário de teste com token Qase encriptado.
 *
 * Execute com: npx tsx scripts/create-test-user.ts
 */

import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const qaseToken = process.env.QASE_API_TOKEN || "bad94dd78a12ff0aa002276f03d501d6597f3b053752b513dc974d56d20f6734";

  console.log("Encrypting Qase token...");
  const encryptedToken = encrypt(qaseToken);

  console.log("Creating/updating test user...");
  const user = await prisma.user.upsert({
    where: { id: "test-user" },
    update: {
      qaseApiToken: encryptedToken,
      qaseTokenValid: true,
    },
    create: {
      id: "test-user",
      email: "test@example.com",
      name: "Test User",
      password: "hashed",
      qaseApiToken: encryptedToken,
      qaseTokenValid: true,
      tier: "FREE",
    },
  });

  console.log(`✅ User created/updated: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Token valid: ${user.qaseTokenValid}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Error:", e);
    prisma.$disconnect();
    process.exit(1);
  });
