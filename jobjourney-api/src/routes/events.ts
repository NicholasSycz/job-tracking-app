import { Router } from "express";
import { TenantRole, EventType } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireTenantMember } from "../middleware/tenantAuth";
import { AuthenticatedRequest, getParam } from "../types/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors";

const router = Router();

router.use(requireAuth);

const VALID_EVENT_TYPES = Object.values(EventType);

function toEventResponse(event: {
  id: string;
  tenantId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  type: EventType;
  jobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: event.id,
    tenantId: event.tenantId,
    createdByUserId: event.createdByUserId,
    title: event.title,
    description: event.description ?? undefined,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? undefined,
    type: event.type,
    jobId: event.jobId ?? undefined,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function canMutate(role: TenantRole | undefined, userId: string, event: { createdByUserId: string }) {
  return role === TenantRole.owner || event.createdByUserId === userId;
}

// GET /api/tenants/:tenantId/events
router.get("/tenants/:tenantId/events", requireTenantMember, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const { month, year } = req.query;

  const dateFilter = month && year
    ? { gte: new Date(parseInt(year as string), parseInt(month as string) - 1, 1), lt: new Date(parseInt(year as string), parseInt(month as string), 1) }
    : undefined;

  const where = { tenantId, ...(dateFilter ? { startAt: dateFilter } : {}) };

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
  });

  res.json(events.map(toEventResponse));
}));

// POST /api/tenants/:tenantId/events
router.post("/tenants/:tenantId/events", requireTenantMember, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;
  const { title, description, startAt, endAt, type, jobId } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    throw new ValidationError("title is required");
  }
  if (!startAt) {
    throw new ValidationError("startAt is required");
  }
  if (type && !VALID_EVENT_TYPES.includes(type)) {
    throw new ValidationError(`type must be one of: ${VALID_EVENT_TYPES.join(", ")}`);
  }
  if (jobId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, tenantId } });
    if (!job) throw new NotFoundError("Linked job not found");
  }

  const event = await prisma.calendarEvent.create({
    data: {
      tenantId,
      createdByUserId: userId,
      title: title.trim(),
      description: description || null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      type: type || EventType.OTHER,
      jobId: jobId || null,
    },
  });

  res.status(201).json(toEventResponse(event));
}));

// PUT /api/tenants/:tenantId/events/:id
router.put("/tenants/:tenantId/events/:id", requireTenantMember, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const id = getParam(req.params.id);
  const userId = req.userId;

  const existing = await prisma.calendarEvent.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError("Event not found");
  if (!canMutate(req.tenantRole, userId, existing)) throw new ForbiddenError("You can only modify events you created");

  const { title, description, startAt, endAt, type, jobId } = req.body;

  if (type && !VALID_EVENT_TYPES.includes(type)) {
    throw new ValidationError(`type must be one of: ${VALID_EVENT_TYPES.join(", ")}`);
  }
  if (jobId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, tenantId } });
    if (!job) throw new NotFoundError("Linked job not found");
  }

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? (description || null) : existing.description,
      startAt: startAt ? new Date(startAt) : existing.startAt,
      endAt: endAt !== undefined ? (endAt ? new Date(endAt) : null) : existing.endAt,
      type: type ?? existing.type,
      jobId: jobId !== undefined ? (jobId || null) : existing.jobId,
    },
  });

  res.json(toEventResponse(event));
}));

// DELETE /api/tenants/:tenantId/events/:id
router.delete("/tenants/:tenantId/events/:id", requireTenantMember, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const id = getParam(req.params.id);
  const userId = req.userId;

  const existing = await prisma.calendarEvent.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError("Event not found");
  if (!canMutate(req.tenantRole, userId, existing)) throw new ForbiddenError("You can only delete events you created");

  await prisma.calendarEvent.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
