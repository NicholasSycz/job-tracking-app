import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0],
    isActive: user.isActive,
  };
}

// TEST ROUTE
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "auth" });
});

// POST /auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
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
      select: { id: true, email: true, name: true, isActive: true },
    });

    // Create tenant and associate user as owner
    const tenant = await prisma.tenant.create({
      data: {
        name: `${user.name ?? "My"} Workspace`,
        tenantUsers: {
          create: { userId: user.id, role: "owner" },
        },
      },
    });

    const token = signToken(user.id);

    res.json({ token, user: toAuthUser(user), tenantId: tenant.id });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "User account is deactivated" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = signToken(user.id);

    return res.json({
      token,
      user: toAuthUser({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      }),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isActive: true },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email.split("@")[0],
      isActive: user.isActive,
    },
  });
});

export default router;
