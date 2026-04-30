import { Router } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { AuthenticatedRequest, getParam } from "../types/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors";
import { validate, schemas } from "../middleware/validate";
import { fileLogger } from "../utils/fileLogger";
import { FRONTEND_URL } from "../config";

const router = Router();

router.use(requireAuth);

async function verifyTenantAccess(userId: string, tenantId: string): Promise<void> {
  const tenantUser = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!tenantUser) {
    throw new ForbiddenError("Access denied to this tenant");
  }
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// GET /api/tenants/:tenantId/members - list users in the tenant
router.get("/tenants/:tenantId/members", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  const members = await prisma.tenantUser.findMany({
    where: { tenantId },
    include: {
      user: { select: { id: true, email: true, name: true, avatarUrl: true, isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(
    members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      isActive: m.user.isActive,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }))
  );
}));

function toInviteResponse(i: {
  id: string;
  tenantId: string;
  email: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: i.id,
    tenantId: i.tenantId,
    email: i.email,
    token: i.token,
    link: `${FRONTEND_URL}/?invite=${i.token}`,
    expiresAt: i.expiresAt.toISOString(),
    acceptedAt: i.acceptedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

// GET /api/tenants/:tenantId/invites - list outstanding invites
router.get("/tenants/:tenantId/invites", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  const invites = await prisma.tenantInvite.findMany({
    where: { tenantId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });

  res.json(invites.map(toInviteResponse));
}));

// POST /api/tenants/:tenantId/invites - create an invite for an email
router.post(
  "/tenants/:tenantId/invites",
  validate(schemas.createInvite),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const userId = req.userId;
    const emailRaw = (req.body as { email: string }).email;
    const email = emailRaw.trim().toLowerCase();

    await verifyTenantAccess(userId, tenantId);

    // If the email already belongs to a user who is in this tenant, reject.
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      const alreadyMember = await prisma.tenantUser.findUnique({
        where: { tenantId_userId: { tenantId, userId: existingUser.id } },
      });
      if (alreadyMember) {
        throw new ConflictError("This user is already a member of the tenant");
      }
    }

    // If there's already a pending invite for this email in this tenant, return it instead of duplicating.
    const pending = await prisma.tenantInvite.findFirst({
      where: { tenantId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending) {
      res.status(200).json(toInviteResponse(pending));
      return;
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await prisma.tenantInvite.create({
      data: {
        tenantId,
        email,
        token,
        invitedByUserId: userId,
        expiresAt,
      },
    });

    fileLogger.event("Invite created", { userId, tenantId, email });
    res.status(201).json(toInviteResponse(invite));
  })
);

// DELETE /api/tenants/:tenantId/invites/:id - revoke an invite
router.delete(
  "/tenants/:tenantId/invites/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const id = getParam(req.params.id);
    const userId = req.userId;

    await verifyTenantAccess(userId, tenantId);

    const invite = await prisma.tenantInvite.findFirst({
      where: { id, tenantId },
    });
    if (!invite) {
      throw new NotFoundError("Invite not found");
    }

    await prisma.tenantInvite.delete({ where: { id } });

    fileLogger.event("Invite revoked", { userId, tenantId, inviteId: id });
    res.status(204).send();
  })
);

export default router;
