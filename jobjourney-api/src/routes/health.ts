import { Router } from "express";

import { prisma } from "../db";
import { fileLogger } from "../utils/fileLogger";

const router = Router();

// Liveness + readiness in one probe: the process answered and the database is
// reachable. Mounted before the rate limiters so monitors aren't throttled.
router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "up", uptime: Math.round(process.uptime()) });
  } catch (err) {
    fileLogger.error("Health check failed: database unreachable", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(503).json({ status: "error", database: "down" });
  }
});

export default router;
