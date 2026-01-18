import { Router } from "express";

const router = Router();

// Temporary placeholder so the import works:
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "applications" });
});

export default router;
