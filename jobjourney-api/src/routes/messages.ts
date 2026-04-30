import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { AuthenticatedRequest, getParam } from "../types/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors";
import { validate, schemas } from "../middleware/validate";
import { fileLogger } from "../utils/fileLogger";

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

async function verifyParticipant(conversationId: string, userId: string, tenantId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    include: { participants: true },
  });
  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }
  const me = conversation.participants.find((p) => p.userId === userId);
  if (!me) {
    throw new ForbiddenError("Not a participant in this conversation");
  }
  return { conversation, me };
}

function toMessageResponse(m: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.deletedAt ? "" : m.body,
    createdAt: m.createdAt.toISOString(),
    deletedAt: m.deletedAt?.toISOString() ?? null,
  };
}

// GET /api/tenants/:tenantId/conversations
router.get("/tenants/:tenantId/conversations", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tenantId = getParam(req.params.tenantId);
  const userId = req.userId;

  await verifyTenantAccess(userId, tenantId);

  const myParticipations = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      conversation: { tenantId },
    },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, email: true, name: true, avatarUrl: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const conversations = await Promise.all(
    myParticipations.map(async (p) => {
      const otherParticipants = p.conversation.participants
        .filter((cp) => cp.userId !== userId)
        .map((cp) => ({
          id: cp.user.id,
          email: cp.user.email,
          name: cp.user.name,
          avatarUrl: cp.user.avatarUrl,
        }));

      const lastMessage = p.conversation.messages[0];

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          deletedAt: null,
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });

      return {
        id: p.conversation.id,
        tenantId: p.conversation.tenantId,
        otherParticipants,
        lastMessage: lastMessage
          ? toMessageResponse(lastMessage)
          : null,
        lastMessageAt: p.conversation.lastMessageAt?.toISOString() ?? null,
        unreadCount,
      };
    })
  );

  conversations.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  res.json(conversations);
}));

// POST /api/tenants/:tenantId/conversations - find or create 1:1 conversation
router.post(
  "/tenants/:tenantId/conversations",
  validate(schemas.createConversation),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const userId = req.userId;
    const { recipientUserId } = req.body as { recipientUserId: string };

    if (recipientUserId === userId) {
      throw new ValidationError("Cannot start a conversation with yourself");
    }

    await verifyTenantAccess(userId, tenantId);
    // Recipient must also belong to the same tenant.
    const recipientMembership = await prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: recipientUserId } },
    });
    if (!recipientMembership) {
      throw new ValidationError("Recipient is not a member of this tenant");
    }

    // Find existing 1:1 conversation between the two users in this tenant.
    const mine = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        conversation: { tenantId },
      },
      select: { conversationId: true },
    });
    const mineIds = mine.map((p) => p.conversationId);

    let existing: { id: string } | null = null;
    if (mineIds.length > 0) {
      const candidate = await prisma.conversation.findFirst({
        where: {
          id: { in: mineIds },
          participants: {
            some: { userId: recipientUserId },
          },
        },
        include: { participants: true },
      });
      if (candidate && candidate.participants.length === 2) {
        existing = { id: candidate.id };
      }
    }

    let conversationId: string;
    if (existing) {
      conversationId = existing.id;
    } else {
      const created = await prisma.conversation.create({
        data: {
          tenantId,
          participants: {
            create: [
              { userId },
              { userId: recipientUserId },
            ],
          },
        },
      });
      conversationId = created.id;
      fileLogger.event("Conversation created", { userId, tenantId, conversationId, recipientUserId });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    const otherParticipants = conversation!.participants
      .filter((p) => p.userId !== userId)
      .map((p) => ({
        id: p.user.id,
        email: p.user.email,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
      }));

    res.status(existing ? 200 : 201).json({
      id: conversation!.id,
      tenantId: conversation!.tenantId,
      otherParticipants,
      lastMessage: null,
      lastMessageAt: conversation!.lastMessageAt?.toISOString() ?? null,
      unreadCount: 0,
    });
  })
);

// GET /api/tenants/:tenantId/conversations/:id/messages
router.get(
  "/tenants/:tenantId/conversations/:id/messages",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const conversationId = getParam(req.params.id);
    const userId = req.userId;

    await verifyTenantAccess(userId, tenantId);
    await verifyParticipant(conversationId, userId, tenantId);

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    res.json(messages.map(toMessageResponse));
  })
);

// POST /api/tenants/:tenantId/conversations/:id/messages
router.post(
  "/tenants/:tenantId/conversations/:id/messages",
  validate(schemas.createMessage),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const conversationId = getParam(req.params.id);
    const userId = req.userId;
    const { body } = req.body as { body: string };

    await verifyTenantAccess(userId, tenantId);
    await verifyParticipant(conversationId, userId, tenantId);

    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          body: body.trim(),
          createdAt: now,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      }),
      prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: now },
      }),
    ]);

    res.status(201).json(toMessageResponse(message));
  })
);

// POST /api/tenants/:tenantId/conversations/:id/read
router.post(
  "/tenants/:tenantId/conversations/:id/read",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const conversationId = getParam(req.params.id);
    const userId = req.userId;

    await verifyTenantAccess(userId, tenantId);
    await verifyParticipant(conversationId, userId, tenantId);

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    res.json({ success: true });
  })
);

// DELETE /api/tenants/:tenantId/messages/:id - soft-delete own message
router.delete(
  "/tenants/:tenantId/messages/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const id = getParam(req.params.id);
    const userId = req.userId;

    await verifyTenantAccess(userId, tenantId);

    const message = await prisma.message.findFirst({
      where: {
        id,
        conversation: { tenantId },
      },
    });
    if (!message) {
      throw new NotFoundError("Message not found");
    }
    if (message.senderId !== userId) {
      throw new ForbiddenError("You can only delete your own messages");
    }
    if (message.deletedAt) {
      res.status(204).send();
      return;
    }

    await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    fileLogger.event("Message deleted", { userId, tenantId, messageId: id });
    res.status(204).send();
  })
);

// GET /api/tenants/:tenantId/messages/unread-count
router.get(
  "/tenants/:tenantId/messages/unread-count",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = getParam(req.params.tenantId);
    const userId = req.userId;

    await verifyTenantAccess(userId, tenantId);

    const participations = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        conversation: { tenantId },
      },
      select: { conversationId: true, lastReadAt: true },
    });

    if (participations.length === 0) {
      res.json({ count: 0 });
      return;
    }

    let total = 0;
    for (const p of participations) {
      total += await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          deletedAt: null,
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
    }

    res.json({ count: total });
  })
);

export default router;
