import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { healthRoutes } from "./routes/health.js";

const app = new Hono();

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

// Routes
app.route("/health", healthRoutes);

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
