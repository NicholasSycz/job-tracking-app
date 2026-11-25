import { randomUUID } from "crypto";
import { isDeepStrictEqual } from "util";
import type { ApplicationNotificationType, Job, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getVapidDetails, PushMessage } from "./webPush";
import { deliverNotification, PUSH_RETRY_DELAY } from "./notificationDelivery";

export function applicationChanged(before: Job, after: Job) {
  const editableFields = ({ updatedAt, reminderSentAt, interviewReminderSentAt, dateApplied, ...fields }: Job) => ({
    ...fields, dateApplied: dateApplied.toISOString().slice(0, 10),
  });
  return !isDeepStrictEqual(editableFields(before), editableFields(after));
}

export async function queueApplicationNotification(tx: Prisma.TransactionClient, tenantId: string, eventType: ApplicationNotificationType, title: string, body: string) {
  const vapid = getVapidDetails();
  if (!vapid) return;
  const subscriptions = await tx.webPushSubscription.findMany({
    where: {
      vapidPublicKey: vapid.publicKey,
      user: {
        isActive: true,
        tenantUsers: { some: { tenantId } },
        ...(eventType === "JOB_ADDED" ? { pushJobAdded: true } : { pushJobUpdated: true }),
      },
    },
    select: { id: true },
  });
  if (!subscriptions.length) return;
  const key = `job-change:${randomUUID()}`;
  await tx.notificationDelivery.createMany({
    data: subscriptions.map(subscription => ({
      subscriptionId: subscription.id, reminderKey: key, tenantId, eventType,
      payload: { title, body, tag: key, url: "/?view=applications" },
    })),
  });
}

async function deliverQueuedNotifications(now: Date) {
  const vapid = getVapidDetails();
  if (!vapid) return;
  const oldest = new Date(now.getTime() - 86400000);
  await prisma.notificationDelivery.deleteMany({ where: { eventType: { not: null }, sentAt: null, createdAt: { lt: oldest } } });
  const deliveries = await prisma.notificationDelivery.findMany({
    where: {
      eventType: { not: null }, sentAt: null,
      OR: [{ attemptedAt: null }, { attemptedAt: { lt: new Date(now.getTime() - PUSH_RETRY_DELAY) } }],
    },
    include: { subscription: { include: { user: { include: { tenantUsers: { select: { tenantId: true } } } } } } },
    orderBy: { createdAt: "asc" },
  });
  for (const delivery of deliveries) {
    const { subscription, tenantId, eventType } = delivery;
    const user = subscription.user;
    const allowed = user.isActive && subscription.vapidPublicKey === vapid.publicKey
      && user.tenantUsers.some(membership => membership.tenantId === tenantId)
      && (eventType === "JOB_ADDED" ? user.pushJobAdded : user.pushJobUpdated);
    const where = { subscriptionId: subscription.id, reminderKey: delivery.reminderKey };
    if (!allowed || !delivery.payload) {
      await prisma.notificationDelivery.deleteMany({ where: { ...where, sentAt: null } });
      continue;
    }
    const ttl = Math.max(1, Math.floor((delivery.createdAt.getTime() + 86400000 - now.getTime()) / 1000));
    await deliverNotification(subscription, delivery.reminderKey, delivery.payload as unknown as PushMessage, now, ttl);
  }
}

let pendingFlush: Promise<void> | null = null;

export function flushApplicationNotifications(now = new Date()): Promise<void> {
  if (!pendingFlush) {
    pendingFlush = deliverQueuedNotifications(now).finally(() => { pendingFlush = null; });
  }
  return pendingFlush;
}

export function dispatchApplicationNotifications() {
  // Network delivery runs after the transaction and cannot fail the job save.
  void flushApplicationNotifications().catch(() => {
    console.error("Job change notification delivery failed; the reminder worker will retry.");
  });
}
