import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { NotFoundError, ValidationError } from "../utils/errors";
import { AuthenticatedRequest } from "../types/auth";

const router = Router();

router.use(requireAuth);

// GET /api/settings - Get user settings
router.get("/", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { applicationGoal: true, jobSources: true, recruitingServices: true, interviewTypes: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  res.json({
    applicationGoal: user.applicationGoal,
    jobSources: user.jobSources ?? null,
    recruitingServices: user.recruitingServices ?? null,
    interviewTypes: user.interviewTypes ?? null,
  });
}));

// PUT /api/settings - Update user settings
router.put("/", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { applicationGoal, jobSources, recruitingServices, interviewTypes } = req.body as {
    applicationGoal?: number;
    jobSources?: { value: string; label: string }[] | null;
    recruitingServices?: string[] | null;
    interviewTypes?: { value: string; label: string }[] | null;
  };

  if (applicationGoal !== undefined) {
    if (typeof applicationGoal !== 'number' || applicationGoal < 1 || applicationGoal > 1000) {
      throw new ValidationError("applicationGoal must be a number between 1 and 1000");
    }
  }

  if (jobSources !== undefined && jobSources !== null) {
    if (!Array.isArray(jobSources)) throw new ValidationError("jobSources must be an array");
    for (const s of jobSources) {
      if (!s.value || !s.label) throw new ValidationError("Each job source must have a value and label");
    }
  }

  if (recruitingServices !== undefined && recruitingServices !== null) {
    if (!Array.isArray(recruitingServices)) throw new ValidationError("recruitingServices must be an array");
    if (recruitingServices.some(s => typeof s !== 'string')) throw new ValidationError("recruitingServices must be an array of strings");
  }

  if (interviewTypes !== undefined && interviewTypes !== null) {
    if (!Array.isArray(interviewTypes)) throw new ValidationError("interviewTypes must be an array");
    for (const t of interviewTypes) {
      if (!t.value || !t.label) throw new ValidationError("Each interview type must have a value and label");
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(applicationGoal !== undefined && { applicationGoal }),
      ...(jobSources !== undefined && { jobSources: jobSources ?? [] }),
      ...(recruitingServices !== undefined && { recruitingServices: recruitingServices ?? [] }),
      ...(interviewTypes !== undefined && { interviewTypes: interviewTypes ?? [] }),
    },
    select: { applicationGoal: true, jobSources: true, recruitingServices: true, interviewTypes: true },
  });

  res.json({
    applicationGoal: user.applicationGoal,
    jobSources: user.jobSources ?? null,
    recruitingServices: user.recruitingServices ?? null,
    interviewTypes: user.interviewTypes ?? null,
  });
}));

export default router;
