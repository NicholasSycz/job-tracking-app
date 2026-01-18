import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { NotFoundError } from "../utils/errors";
import { AuthenticatedRequest } from "../types/auth";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/settings - Get user settings
router.get("/", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { applicationGoal: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  res.json({
    applicationGoal: user.applicationGoal,
  });
}));

// PUT /api/settings - Update user settings
router.put("/", validate({
  applicationGoal: {
    type: 'number' as const,
    required: false,
    min: 1,
    max: 1000,
  },
}), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { applicationGoal } = req.body as { applicationGoal?: number };

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      applicationGoal: applicationGoal !== undefined ? applicationGoal : undefined,
    },
    select: { applicationGoal: true },
  });

  res.json({
    applicationGoal: user.applicationGoal,
  });
}));

export default router;
