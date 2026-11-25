import webpush from "web-push";
import type { WebPushSubscription } from "@prisma/client";
import { prisma } from "../db";

export function getVapidDetails() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_SUBJECT?.trim();
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

export interface PushMessage {
  title: string;
  body: string;
  tag: string;
  url: string;
}

export async function sendPush(subscription: WebPushSubscription, message: PushMessage, ttl = 86400) {
  const vapidDetails = getVapidDetails();
  if (!vapidDetails) return false;
  try {
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, JSON.stringify(message), { vapidDetails, TTL: ttl, timeout: 10000 });
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await prisma.webPushSubscription.deleteMany({ where: { id: subscription.id } });
      return false;
    }
    // Endpoints and payloads can identify users; keep them out of server logs.
    console.error("Web push delivery failed", { status: status ?? "network_error" });
    return false;
  }
}
