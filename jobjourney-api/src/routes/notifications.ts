import { Router } from "express";
import { ECDH } from "crypto";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthenticatedRequest } from "../types/auth";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../utils/errors";
import { getVapidDetails, sendPush } from "../services/webPush";

const router = Router();
router.use(requireAuth);

function endpointFrom(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) throw new ValidationError("Invalid push endpoint");
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError("Invalid push endpoint"); }
  const host = url.hostname;
  // Subscriptions trigger outbound requests: accept browser push services only.
  const allowed = host === "web.push.apple.com" || host.endsWith(".push.apple.com")
    || host === "fcm.googleapis.com" || host.endsWith(".push.services.mozilla.com");
  if (!allowed || url.protocol !== "https:" || url.port || url.username || url.password || url.hash) {
    throw new ValidationError("Unsupported push service");
  }
  return value;
}

function keysFrom(value: unknown) {
  const keys = value as { p256dh?: unknown; auth?: unknown } | null;
  const valid = (v: unknown, bytes: number): v is string => typeof v === "string"
    && /^[A-Za-z0-9_-]+$/.test(v) && Buffer.from(v, "base64url").length === bytes;
  if (!valid(keys?.p256dh, 65) || !valid(keys?.auth, 16)) throw new ValidationError("Invalid subscription keys");
  try {
    ECDH.convertKey(Buffer.from(keys.p256dh, "base64url"), "prime256v1");
  } catch {
    throw new ValidationError("Invalid subscription public key");
  }
  return { p256dh: keys.p256dh, auth: keys.auth };
}

router.get("/config", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { pushFollowUps: true, pushInterviews: true, pushJobAdded: true, pushJobUpdated: true, pushSubscriptions: { select: { endpoint: true, vapidPublicKey: true } } },
  });
  if (!user) throw new NotFoundError("User not found");
  const vapid = getVapidDetails();
  res.json({
    configured: !!vapid,
    publicKey: vapid?.publicKey ?? null,
    preferences: { followUps: user.pushFollowUps, interviews: user.pushInterviews, jobsAdded: user.pushJobAdded, jobsUpdated: user.pushJobUpdated },
    endpoints: user.pushSubscriptions.filter(s => s.vapidPublicKey === vapid?.publicKey).map(s => s.endpoint),
  });
}));

router.put("/preferences", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { followUps, interviews, jobsAdded, jobsUpdated } = req.body ?? {};
  if (typeof followUps !== "boolean" || typeof interviews !== "boolean"
    || (jobsAdded !== undefined && typeof jobsAdded !== "boolean")
    || (jobsUpdated !== undefined && typeof jobsUpdated !== "boolean")) {
    throw new ValidationError("Notification preferences must be true or false");
  }
  const updated = await prisma.user.update({ where: { id: req.userId }, data: {
    pushFollowUps: followUps, pushInterviews: interviews,
    ...(jobsAdded !== undefined ? { pushJobAdded: jobsAdded } : {}),
    ...(jobsUpdated !== undefined ? { pushJobUpdated: jobsUpdated } : {}),
  } });
  res.json({ followUps: updated.pushFollowUps, interviews: updated.pushInterviews, jobsAdded: updated.pushJobAdded, jobsUpdated: updated.pushJobUpdated });
}));

router.post("/subscriptions", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const vapid = getVapidDetails();
  if (!vapid) throw new AppError("Web push has not been configured on the server", 503, "PUSH_NOT_CONFIGURED");
  const endpoint = endpointFrom(req.body?.endpoint);
  const keys = keysFrom(req.body?.keys);
  const existing = await prisma.webPushSubscription.findUnique({ where: { endpoint } });
  if (existing && existing.userId !== req.userId) {
    throw new ConflictError("This device is already registered to another account. Disable notifications there first.");
  }
  await prisma.webPushSubscription.upsert({
    where: { endpoint, userId: req.userId },
    create: { endpoint, ...keys, userId: req.userId, vapidPublicKey: vapid.publicKey },
    update: { ...keys, vapidPublicKey: vapid.publicKey },
  });
  res.status(201).json({ success: true });
}));

router.delete("/subscriptions", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const endpoint = endpointFrom(req.body?.endpoint);
  await prisma.webPushSubscription.deleteMany({ where: { endpoint, userId: req.userId } });
  res.status(204).send();
}));

router.post("/test", asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!getVapidDetails()) throw new AppError("Web push has not been configured on the server", 503, "PUSH_NOT_CONFIGURED");
  const endpoint = endpointFrom(req.body?.endpoint);
  const subscription = await prisma.webPushSubscription.findFirst({ where: { endpoint, userId: req.userId } });
  if (!subscription) throw new NotFoundError("Enable notifications on this device first");
  const sent = await sendPush(subscription, {
    title: "JobJourney", body: "Notifications are working on this device.", tag: "jobjourney-test", url: "/",
  }, 300);
  if (!sent) throw new AppError("Couldn't send the test notification. Try enabling this device again.", 502, "PUSH_FAILED");
  res.json({ success: true });
}));

export default router;
