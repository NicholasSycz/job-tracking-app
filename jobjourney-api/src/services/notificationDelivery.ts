import type { WebPushSubscription } from "@prisma/client";
import { prisma } from "../db";
import { PushMessage, sendPush } from "./webPush";

export const PUSH_RETRY_DELAY = 5 * 60000;

export async function deliverNotification(subscription: WebPushSubscription, reminderKey: string, message: PushMessage, now: Date, ttl: number) {
  const where = { subscriptionId: subscription.id, reminderKey };
  // Claim atomically so overlapping workers cannot send the same delivery.
  const claim = await prisma.notificationDelivery.updateMany({
    where: { ...where, sentAt: null, OR: [{ attemptedAt: null }, { attemptedAt: { lt: new Date(now.getTime() - PUSH_RETRY_DELAY) } }] },
    data: { attemptedAt: now },
  });
  if (!claim.count) return;
  if (await sendPush(subscription, message, ttl)) {
    await prisma.notificationDelivery.updateMany({ where, data: { sentAt: now } });
  }
}
