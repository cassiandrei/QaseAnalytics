import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.string().transform(Number).default("3001"),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Invoice Database (ERP - read-only)
  INVOICE_DATABASE_URL: z.string().optional(),
  INVOICE_DB_ENCRYPTION_KEY: z.string().min(32).optional(),

  // Qase API
  QASE_API_TOKEN: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((e) => e.path.join(".")).join(", ");
      console.error(`Missing or invalid environment variables: ${missing}`);
      console.error("Please check your .env file");
    }
    throw error;
  }
}

export const env = loadEnv();
