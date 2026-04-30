import { Router } from "express";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { validate, schemas } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError, ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from "../utils/errors";
import { AuthenticatedRequest } from "../types/auth";
import { fileLogger } from "../utils/fileLogger";
import {
  JWT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  FRONTEND_URL,
} from "../config";

const router = Router();

// Avatar upload config
const avatarDir = path.join(__dirname, "../../uploads/avatars");
fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${(req as AuthenticatedRequest).userId}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .jpg, .jpeg, .png, .webp files are allowed"));
  },
});

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  avatarUrl?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0],
    isActive: user.isActive,
    avatarUrl: user.avatarUrl ?? null,
  };
}

// TEST ROUTE
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "auth" });
});

async function consumeInviteForUser(inviteToken: string, userId: string, userEmail: string): Promise<string | null> {
  const invite = await prisma.tenantInvite.findUnique({ where: { token: inviteToken } });
  if (!invite) {
    throw new ValidationError("Invite is invalid");
  }
  if (invite.acceptedAt) {
    throw new ValidationError("Invite has already been used");
  }
  if (invite.expiresAt < new Date()) {
    throw new ValidationError("Invite has expired");
  }
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new ForbiddenError("Invite was issued to a different email address");
  }

  // Attach user to the invite's tenant if not already a member.
  const existing = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: invite.tenantId, userId } },
  });
  if (!existing) {
    await prisma.tenantUser.create({
      data: { tenantId: invite.tenantId, userId, role: "member" },
    });
  }

  await prisma.tenantInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  fileLogger.event("Invite accepted", { userId, tenantId: invite.tenantId });
  return invite.tenantId;
}

// POST /auth/signup
router.post("/signup", validate(schemas.signup), asyncHandler(async (req, res) => {
  const { name, email, password, inviteToken } = req.body as {
    name?: string;
    email: string;
    password: string;
    inviteToken?: string;
  };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("Email already in use");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name?.trim() ? name.trim() : null,
      isActive: true,
    },
    select: { id: true, email: true, name: true, isActive: true, avatarUrl: true },
  });

  let tenantId: string;

  if (inviteToken) {
    // New user signing up via an invite: attach them to the inviting tenant instead of minting a new one.
    const invitedTenantId = await consumeInviteForUser(inviteToken, user.id, user.email);
    tenantId = invitedTenantId!;
  } else {
    // Create tenant and associate user as owner
    const tenant = await prisma.tenant.create({
      data: {
        name: `${user.name ?? "My"} Workspace`,
        tenantUsers: {
          create: { userId: user.id, role: "owner" },
        },
      },
    });
    tenantId = tenant.id;
  }

  const token = signToken(user.id);

  fileLogger.event("User signed up", { userId: user.id, email: user.email });
  res.json({ token, user: toAuthUser(user), tenantId });
}));

// POST /auth/invite/accept - authenticated user accepts an invite
router.post(
  "/invite/accept",
  requireAuth,
  validate(schemas.acceptInvite),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    const { token } = req.body as { token: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const tenantId = await consumeInviteForUser(token, user.id, user.email);
    res.json({ tenantId });
  })
);

// POST /auth/login
router.post("/login", validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!user.isActive) {
    throw new ForbiddenError("User account is deactivated");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // Get the user's tenant
  const tenantUser = await prisma.tenantUser.findFirst({
    where: { userId: user.id },
    select: { tenantId: true },
  });

  if (!tenantUser) {
    throw new ValidationError("User has no associated tenant");
  }

  const token = signToken(user.id);

  fileLogger.event("User logged in", { userId: user.id, email: user.email });
  res.json({
    token,
    user: toAuthUser(user),
    tenantId: tenantUser.tenantId,
  });
}));

router.get("/me", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isActive: true, avatarUrl: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Get the user's tenant
  const tenantUser = await prisma.tenantUser.findFirst({
    where: { userId: user.id },
    select: { tenantId: true },
  });

  res.json({
    user: toAuthUser(user),
    tenantId: tenantUser?.tenantId ?? null,
  });
}));

// PUT /auth/profile - Update user profile
router.put("/profile", requireAuth, validate(schemas.updateProfile), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { name } = req.body as { name?: string };

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name?.trim() || null,
    },
    select: { id: true, email: true, name: true, isActive: true, avatarUrl: true },
  });

  res.json({
    user: toAuthUser(user),
  });
}));

// POST /auth/avatar - Upload user avatar
router.post("/avatar", requireAuth, avatarUpload.single("avatar"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;

  if (!req.file) {
    throw new ValidationError("No file uploaded");
  }

  // Clean up old avatar files (different extensions)
  const exts = [".jpg", ".jpeg", ".png", ".webp"];
  for (const ext of exts) {
    const oldPath = path.join(avatarDir, `${userId}${ext}`);
    if (oldPath !== req.file.path) {
      fs.unlink(oldPath, () => {}); // ignore errors for non-existent files
    }
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { id: true, email: true, name: true, isActive: true, avatarUrl: true },
  });

  res.json({ user: toAuthUser(user) });
}));

// GET /auth/google - Redirect to Google OAuth
router.get("/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: "Google OAuth not configured" });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /auth/google/callback - Handle Google OAuth callback
router.get("/google/callback", async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || typeof code !== "string") {
      return res.redirect(`${FRONTEND_URL}?error=missing_code`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return res.redirect(`${FRONTEND_URL}?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string };

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return res.redirect(`${FRONTEND_URL}?error=userinfo_failed`);
    }

    const googleUser = await userInfoResponse.json() as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.id },
          { email: googleUser.email },
        ],
      },
    });

    let tenantId: string;

    if (user) {
      // Update googleId if not set (user signed up with email first)
      if (!user.googleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.id },
        });
      }

      // Get existing tenant
      const tenantUser = await prisma.tenantUser.findFirst({
        where: { userId: user.id },
        select: { tenantId: true },
      });

      if (!tenantUser) {
        // Create tenant for existing user without one
        const tenant = await prisma.tenant.create({
          data: {
            name: `${googleUser.name ?? "My"} Workspace`,
            tenantUsers: {
              create: { userId: user.id, role: "owner" },
            },
          },
        });
        tenantId = tenant.id;
      } else {
        tenantId = tenantUser.tenantId;
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          googleId: googleUser.id,
          name: googleUser.name,
          isActive: true,
        },
      });

      // Create tenant for new user
      const tenant = await prisma.tenant.create({
        data: {
          name: `${googleUser.name ?? "My"} Workspace`,
          tenantUsers: {
            create: { userId: user.id, role: "owner" },
          },
        },
      });
      tenantId = tenant.id;
    }

    // Generate JWT token
    const token = signToken(user.id);

    fileLogger.event("Google OAuth login", { userId: user.id, email: googleUser.email });

    // Redirect to frontend with token and tenantId
    const params = new URLSearchParams({
      token,
      tenantId,
    });

    res.redirect(`${FRONTEND_URL}?${params.toString()}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
  }
});

// GET /auth/google/status - Check if Google OAuth is configured
router.get("/google/status", (_req, res) => {
  res.json({
    configured: !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET,
  });
});

// POST /auth/forgot-password - Request password reset
router.post("/forgot-password", validate(schemas.forgotPassword), asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.passwordHash) {
    // User doesn't exist or is OAuth-only
    res.json({ message: "If an account exists with that email, you will receive a password reset link." });
    return;
  }

  // Generate reset token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  // In development, log the reset link to console
  // In production, this would send an email
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
  console.log(`\n[PASSWORD RESET] Reset link for ${email}: ${resetLink}\n`);
  fileLogger.event("Password reset requested", { email });

  res.json({ message: "If an account exists with that email, you will receive a password reset link." });
}));

// POST /auth/reset-password - Reset password with token
router.post("/reset-password", validate(schemas.resetPassword), asyncHandler(async (req, res) => {
  const { token, password } = req.body as { token: string; password: string };

  // Find valid token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    throw new ValidationError("Invalid or expired reset token");
  }

  if (resetToken.expiresAt < new Date()) {
    // Token expired - delete it
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
    throw new ValidationError("Reset token has expired. Please request a new one.");
  }

  if (resetToken.usedAt) {
    throw new ValidationError("This reset token has already been used");
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12);

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  fileLogger.event("Password reset completed", { userId: resetToken.userId });
  res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
}));

export default router;
