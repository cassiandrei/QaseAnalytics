import { Hono } from "hono";

export const healthRoutes = new Hono();

healthRoutes.get("/", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRoutes.get("/ready", async (c) => {
  // TODO: Add database and redis connectivity checks
  const checks = {
    database: "pending", // Will be implemented in US-002
    redis: "pending", // Will be implemented in US-003
  };

  return c.json({
    status: "ready",
    checks,
    timestamp: new Date().toISOString(),
  });
});
