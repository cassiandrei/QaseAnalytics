import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { healthRoutes } from "./routes/health.js";
import { qaseRoutes } from "./routes/qase.js";
import { chatRoutes } from "./routes/chat.js";

/** Tipo de variáveis de contexto para o Hono */
type AppVariables = {
  userId?: string;
};

const app = new Hono<{ Variables: AppVariables }>();

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// Temporary middleware to read X-User-Id header
// TODO: Replace with proper JWT authentication (US-038/US-039)
app.use("/api/*", async (c, next) => {
  const userId = c.req.header("X-User-Id");
  if (userId) {
    c.set("userId", userId);
  }
  await next();
});

// Routes
app.route("/health", healthRoutes);
app.route("/api/qase", qaseRoutes);
app.route("/api/chat", chatRoutes);

// Root
app.get("/", (c) => {
  return c.json({
    name: "QaseAnalytics API",
    version: "0.1.0",
    status: "running",
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

const port = Number(process.env.API_PORT) || 3001;

console.log(`Starting QaseAnalytics API on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`QaseAnalytics API running at http://localhost:${port}`);
