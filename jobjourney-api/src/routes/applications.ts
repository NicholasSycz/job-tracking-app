import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { AuthenticatedRequest, getParam } from "../types/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors";
import { validate, schemas } from "../middleware/validate";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Helper to verify user belongs to tenant
async function verifyTenantAccess(userId: string, tenantId: string): Promise<void> {
  const tenantUser = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: { tenantId, userId },
    },
  });
  if (!tenantUser) {
    throw new ForbiddenError("Access denied to this tenant");
  }
}

// Transform job to frontend format
function toJobResponse(job: {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: Date;
  description: string | null;
  location: string | null;
  salary: string | null;
  link: string | null;
  notes: string | null;
}) {
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    status: job.status,
    dateApplied: job.dateApplied.toISOString().split("T")[0],
    description: job.description ?? "",
    location: job.location ?? "",
    salary: job.salary ?? undefined,
    link: job.link ?? undefined,
    notes: job.notes ?? undefined,
  };
}

// GET /api/tenants/:tenantId/applications - List all applications for tenant
router.get("/tenants/:tenantId/applications", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  const jobs = await prisma.job.findMany({
    where: { tenantId },
    orderBy: { dateApplied: "desc" },
  });

  const applications = jobs.map(toJobResponse);
  res.json(applications);
}));

// POST /api/tenants/:tenantId/applications - Create new application
router.post("/tenants/:tenantId/applications", validate(schemas.createApplication), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  const { company, role, status, dateApplied, description, location, salary, link, notes } = req.body;

  const job = await prisma.job.create({
    data: {
      tenantId,
      createdByUserId: userId,
      company,
      role,
      status: status || "INTERESTED",
      dateApplied: dateApplied ? new Date(dateApplied) : new Date(),
      description: description || null,
      location: location || null,
      salary: salary || null,
      link: link || null,
      notes: notes || null,
    },
  });

  // Create initial status history entry
  await prisma.jobStatusHistory.create({
    data: {
      jobId: job.id,
      status: job.status,
      changedAt: new Date(),
      changedByUserId: userId,
      notes: "Application created",
    },
  });

  res.status(201).json(toJobResponse(job));
}));

// PUT /api/tenants/:tenantId/applications/:id - Update application
router.put("/tenants/:tenantId/applications/:id", validate(schemas.updateApplication), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const id = getParam(req.params.id);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  // Verify job exists and belongs to tenant
  const existingJob = await prisma.job.findFirst({
    where: { id, tenantId },
  });

  if (!existingJob) {
    throw new NotFoundError("Application not found");
  }

  const { company, role, status, dateApplied, description, location, salary, link, notes } = req.body;

  // Track status change for history
  const statusChanged = status && status !== existingJob.status;

  const job = await prisma.job.update({
    where: { id },
    data: {
      company: company ?? existingJob.company,
      role: role ?? existingJob.role,
      status: status ?? existingJob.status,
      dateApplied: dateApplied ? new Date(dateApplied) : existingJob.dateApplied,
      description: description !== undefined ? description || null : existingJob.description,
      location: location !== undefined ? location || null : existingJob.location,
      salary: salary !== undefined ? salary || null : existingJob.salary,
      link: link !== undefined ? link || null : existingJob.link,
      notes: notes !== undefined ? notes || null : existingJob.notes,
    },
  });

  // Record status change in history
  if (statusChanged) {
    await prisma.jobStatusHistory.create({
      data: {
        jobId: job.id,
        status: job.status,
        changedAt: new Date(),
        changedByUserId: userId,
        notes: `Status changed from ${existingJob.status} to ${job.status}`,
      },
    });
  }

  res.json(toJobResponse(job));
}));

// DELETE /api/tenants/:tenantId/applications/:id - Delete application
router.delete("/tenants/:tenantId/applications/:id", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const id = getParam(req.params.id);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  // Verify job exists and belongs to tenant
  const existingJob = await prisma.job.findFirst({
    where: { id, tenantId },
  });

  if (!existingJob) {
    throw new NotFoundError("Application not found");
  }

  // Delete status history first (due to foreign key constraint)
  await prisma.jobStatusHistory.deleteMany({
    where: { jobId: id },
  });

  // Delete the job
  await prisma.job.delete({
    where: { id },
  });

  res.status(204).send();
}));

// GET /api/tenants/:tenantId/applications/:id/history - Get status history for an application
router.get("/tenants/:tenantId/applications/:id/history", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const id = getParam(req.params.id);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  // Verify job exists and belongs to tenant
  const job = await prisma.job.findFirst({
    where: { id, tenantId },
  });

  if (!job) {
    throw new NotFoundError("Application not found");
  }

  const history = await prisma.jobStatusHistory.findMany({
    where: { jobId: id },
    orderBy: { changedAt: "desc" },
    include: {
      changedByUser: {
        select: { name: true, email: true },
      },
    },
  });

  const formattedHistory = history.map((h) => ({
    id: h.id,
    status: h.status,
    notes: h.notes,
    changedAt: h.changedAt.toISOString(),
    changedBy: h.changedByUser?.name || h.changedByUser?.email || "Unknown",
  }));

  res.json(formattedHistory);
}));

// DELETE /api/tenants/:tenantId/applications/bulk - Bulk delete applications
router.delete("/tenants/:tenantId/applications/bulk", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;
  const { ids } = req.body as { ids: string[] };

  await verifyTenantAccess(userId, tenantId);

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError("No application IDs provided");
  }

  // Verify all jobs belong to tenant
  const jobs = await prisma.job.findMany({
    where: { id: { in: ids }, tenantId },
    select: { id: true },
  });

  const validIds = jobs.map((j) => j.id);

  // Delete status history first
  await prisma.jobStatusHistory.deleteMany({
    where: { jobId: { in: validIds } },
  });

  // Delete jobs
  const result = await prisma.job.deleteMany({
    where: { id: { in: validIds } },
  });

  res.json({ deleted: result.count });
}));

// PATCH /api/tenants/:tenantId/applications/bulk - Bulk update application status
router.patch("/tenants/:tenantId/applications/bulk", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;
  const { ids, status } = req.body as { ids: string[]; status: string };

  await verifyTenantAccess(userId, tenantId);

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError("No application IDs provided");
  }

  if (!status) {
    throw new ValidationError("Status is required");
  }

  // Verify all jobs belong to tenant
  const jobs = await prisma.job.findMany({
    where: { id: { in: ids }, tenantId },
  });

  const validIds = jobs.map((j) => j.id);

  // Update all jobs
  await prisma.job.updateMany({
    where: { id: { in: validIds } },
    data: { status: status as any },
  });

  // Create status history entries for each
  await prisma.jobStatusHistory.createMany({
    data: validIds.map((jobId) => ({
      jobId,
      status: status as any,
      changedAt: new Date(),
      changedByUserId: userId,
      notes: `Bulk status change to ${status}`,
    })),
  });

  res.json({ updated: validIds.length });
}));

// Health check
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "applications" });
});

export default router;
