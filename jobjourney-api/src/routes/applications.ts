import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { AuthenticatedRequest, getParam } from "../types/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors";
import { validate, schemas } from "../middleware/validate";
import { fileLogger } from "../utils/fileLogger";

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
  source?: string | null;
  externalJobId?: string | null;
  followUpDate?: Date | null;
  reminderEnabled?: boolean;
  reminderSentAt?: Date | null;
  interviewDate?: Date | null;
  interviewReminderEnabled?: boolean;
  interviewReminderSentAt?: Date | null;
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
    source: job.source ?? undefined,
    externalJobId: job.externalJobId ?? undefined,
    followUpDate: job.followUpDate?.toISOString() ?? undefined,
    reminderEnabled: job.reminderEnabled ?? false,
    reminderSentAt: job.reminderSentAt?.toISOString() ?? undefined,
    interviewDate: job.interviewDate?.toISOString() ?? undefined,
    interviewReminderEnabled: job.interviewReminderEnabled ?? false,
    interviewReminderSentAt: job.interviewReminderSentAt?.toISOString() ?? undefined,
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

  const { company, role, status, dateApplied, description, location, salary, link, notes, source, externalJobId, followUpDate, reminderEnabled, interviewDate, interviewReminderEnabled } = req.body;

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
      source: source || null,
      externalJobId: externalJobId || null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      reminderEnabled: reminderEnabled || false,
      interviewDate: interviewDate ? new Date(interviewDate) : null,
      interviewReminderEnabled: interviewReminderEnabled || false,
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

  fileLogger.event("Application created", { userId, tenantId, company, role, jobId: job.id });
  res.status(201).json(toJobResponse(job));
}));

// BULK ROUTES - Must be defined before /:id routes to avoid matching "bulk" as an id

// POST /api/tenants/:tenantId/applications/bulk - Bulk import applications
router.post("/tenants/:tenantId/applications/bulk", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;
  const { applications } = req.body as { applications: Array<{
    company: string;
    role: string;
    status?: string;
    dateApplied?: string;
    description?: string;
    location?: string;
    salary?: string;
    link?: string;
    notes?: string;
    source?: string;
    externalJobId?: string;
    followUpDate?: string;
    reminderEnabled?: boolean;
    interviewDate?: string;
    interviewReminderEnabled?: boolean;
  }> };

  await verifyTenantAccess(userId, tenantId);

  if (!applications || !Array.isArray(applications) || applications.length === 0) {
    throw new ValidationError("No applications provided");
  }

  // Limit bulk import to 100 at a time
  if (applications.length > 100) {
    throw new ValidationError("Maximum 100 applications per import");
  }

  // Validate required fields
  const errors: string[] = [];
  applications.forEach((app, index) => {
    if (!app.company || typeof app.company !== 'string' || app.company.trim() === '') {
      errors.push(`Application ${index + 1}: company is required`);
    }
    if (!app.role || typeof app.role !== 'string' || app.role.trim() === '') {
      errors.push(`Application ${index + 1}: role is required`);
    }
    if (app.status && !['INTERESTED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'GHOSTED'].includes(app.status)) {
      errors.push(`Application ${index + 1}: invalid status "${app.status}"`);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '));
  }

  // Create all applications
  const createdJobs = await prisma.$transaction(async (tx) => {
    const jobs = [];
    for (const app of applications) {
      const job = await tx.job.create({
        data: {
          tenantId,
          createdByUserId: userId,
          company: app.company.trim(),
          role: app.role.trim(),
          status: (app.status as "INTERESTED" | "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED" | "GHOSTED") || "INTERESTED",
          dateApplied: app.dateApplied ? new Date(app.dateApplied) : new Date(),
          description: app.description || null,
          location: app.location || null,
          salary: app.salary || null,
          link: app.link || null,
          notes: app.notes || null,
          source: app.source || 'manual',
          externalJobId: app.externalJobId || null,
          followUpDate: app.followUpDate ? new Date(app.followUpDate) : null,
          reminderEnabled: app.reminderEnabled || false,
          interviewDate: app.interviewDate ? new Date(app.interviewDate) : null,
          interviewReminderEnabled: app.interviewReminderEnabled || false,
        },
      });

      // Create initial status history entry
      await tx.jobStatusHistory.create({
        data: {
          jobId: job.id,
          status: job.status,
          changedAt: new Date(),
          changedByUserId: userId,
          notes: "Application imported",
        },
      });

      jobs.push(job);
    }
    return jobs;
  });

  fileLogger.event("Bulk import", { userId, tenantId, count: createdJobs.length });
  res.status(201).json({
    imported: createdJobs.length,
    applications: createdJobs.map(toJobResponse),
  });
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

  fileLogger.event("Bulk delete", { userId, tenantId, count: result.count });
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

  fileLogger.event("Bulk status update", { userId, tenantId, count: validIds.length, status });
  res.json({ updated: validIds.length });
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

  const { company, role, status, dateApplied, description, location, salary, link, notes, source, externalJobId, followUpDate, reminderEnabled, interviewDate, interviewReminderEnabled } = req.body;

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
      source: source !== undefined ? source || null : existingJob.source,
      externalJobId: externalJobId !== undefined ? externalJobId || null : existingJob.externalJobId,
      followUpDate: followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : null) : existingJob.followUpDate,
      reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : existingJob.reminderEnabled,
      interviewDate: interviewDate !== undefined ? (interviewDate ? new Date(interviewDate) : null) : existingJob.interviewDate,
      interviewReminderEnabled: interviewReminderEnabled !== undefined ? interviewReminderEnabled : existingJob.interviewReminderEnabled,
    },
  });

  fileLogger.event("Application updated", { userId, tenantId, jobId: id, statusChanged: !!statusChanged });

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

  fileLogger.event("Application deleted", { userId, tenantId, jobId: id, company: existingJob.company, role: existingJob.role });
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

// GET /api/tenants/:tenantId/applications/check-duplicate - Check if job already exists
router.get("/tenants/:tenantId/applications/check-duplicate", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  const { externalJobId, link } = req.query;

  if (!externalJobId && !link) {
    res.json({ isDuplicate: false });
    return;
  }

  // Check for existing job with same externalJobId or link
  const existingJob = await prisma.job.findFirst({
    where: {
      tenantId,
      OR: [
        ...(externalJobId ? [{ externalJobId: externalJobId as string }] : []),
        ...(link ? [{ link: link as string }] : []),
      ],
    },
    select: { id: true, company: true, role: true },
  });

  res.json({
    isDuplicate: !!existingJob,
    existingJob: existingJob || undefined,
  });
}));

// GET /api/tenants/:tenantId/reminders/pending - Get jobs with pending reminders
router.get("/tenants/:tenantId/reminders/pending", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  const now = new Date();

  // Find jobs where:
  // - reminderEnabled is true
  // - followUpDate is in the past or today
  // - reminderSentAt is null (not sent) or more than 24 hours ago
  const pendingReminders = await prisma.job.findMany({
    where: {
      tenantId,
      reminderEnabled: true,
      followUpDate: {
        lte: now,
      },
      OR: [
        { reminderSentAt: null },
        {
          reminderSentAt: {
            lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        },
      ],
    },
    select: {
      id: true,
      company: true,
      role: true,
      followUpDate: true,
      status: true,
    },
    orderBy: { followUpDate: "asc" },
  });

  res.json(pendingReminders.map((job) => ({
    id: job.id,
    company: job.company,
    role: job.role,
    followUpDate: job.followUpDate?.toISOString(),
    status: job.status,
  })));
}));

// POST /api/tenants/:tenantId/applications/:id/reminder-sent - Mark reminder as sent
router.post("/tenants/:tenantId/applications/:id/reminder-sent", asyncHandler(async (req: AuthenticatedRequest, res) => {
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

  await prisma.job.update({
    where: { id },
    data: { reminderSentAt: new Date() },
  });

  res.json({ success: true });
}));

// PATCH /api/tenants/:tenantId/applications/:id/reminder - Update reminder settings
router.patch("/tenants/:tenantId/applications/:id/reminder", asyncHandler(async (req: AuthenticatedRequest, res) => {
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

  const { followUpDate, reminderEnabled, reminderSentAt } = req.body;

  const job = await prisma.job.update({
    where: { id },
    data: {
      followUpDate: followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : null) : existingJob.followUpDate,
      reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : existingJob.reminderEnabled,
      reminderSentAt: reminderSentAt !== undefined ? (reminderSentAt ? new Date(reminderSentAt) : null) : existingJob.reminderSentAt,
    },
  });

  res.json(toJobResponse(job));
}));

// Health check
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "applications" });
});

export default router;
