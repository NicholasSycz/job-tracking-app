import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { AuthenticatedRequest, getParam } from "../types/auth";

const router = Router();

router.use(requireAuth);

// GET /api/goals/current - Get the current month's goal
router.get("/current", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  let goal = await prisma.monthlyGoal.findUnique({
    where: { userId_month_year: { userId, month, year } },
  });

  // If no goal set for this month, return default
  if (!goal) {
    // Check if there's a previous month's goal to carry forward the target
    const previousGoal = await prisma.monthlyGoal.findFirst({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const defaultTarget = previousGoal?.target ?? 25;

    goal = await prisma.monthlyGoal.create({
      data: { userId, month, year, target: defaultTarget },
    });
  }

  res.json(goal);
}));

// PUT /api/goals/current - Set or update the current month's goal
router.put("/current", validate({
  target: {
    type: 'number' as const,
    required: true,
    min: 1,
    max: 1000,
  },
}), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { target } = req.body as { target: number };
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const goal = await prisma.monthlyGoal.upsert({
    where: { userId_month_year: { userId, month, year } },
    update: { target },
    create: { userId, month, year, target },
  });

  res.json(goal);
}));

// GET /api/goals/history - Get all past monthly goals
router.get("/history", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;

  const goals = await prisma.monthlyGoal.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  res.json(goals);
}));

// PATCH /api/goals/:id/met - Mark a goal as met or not met
router.patch("/:id/met", validate({
  met: {
    type: 'boolean' as const,
    required: true,
  },
}), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const goalId = getParam(req.params.id);
  const { met } = req.body as { met: boolean };

  const goal = await prisma.monthlyGoal.updateMany({
    where: { id: goalId, userId },
    data: { met },
  });

  if (goal.count === 0) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  const updated = await prisma.monthlyGoal.findUnique({
    where: { id: goalId },
  });

  res.json(updated);
}));

export default router;
