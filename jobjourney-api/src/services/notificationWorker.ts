import type { Job, WebPushSubscription } from "@prisma/client";
import { prisma } from "../db";
import { getVapidDetails, PushMessage } from "./webPush";
import { deliverNotification } from "./notificationDelivery";
import { flushApplicationNotifications } from "./applicationNotifications";

const DAY = 86400000;

export function remindersForJob(job: Job, now: Date, preferences: { followUps: boolean; interviews: boolean }) {
  const reminders: { key: string; message: PushMessage; ttl: number }[] = [];
  if (preferences.followUps && job.reminderEnabled && job.followUpDate && job.followUpDate <= now) {
    const key = `follow-up:${job.id}:${job.followUpDate.toISOString()}`;
    reminders.push({ key, ttl: 86400, message: {
      title: "Time to follow up", body: `${job.role} at ${job.company}`,
      tag: key, url: "/?view=applications",
    } });
  }
  if (preferences.interviews && job.interviewReminderEnabled) {
    const rounds = Array.isArray(job.interviews) && job.interviews.length
      ? job.interviews
      : job.interviewDate ? [{ id: "legacy", scheduledAt: job.interviewDate.toISOString(), outcome: job.interviewOutcome }] : [];
    for (const round of rounds) {
      if (!round || typeof round !== "object" || Array.isArray(round)) continue;
      const { id, scheduledAt, outcome } = round;
      if (typeof scheduledAt !== "string" || (outcome && outcome !== "PENDING")) continue;
      const date = new Date(scheduledAt);
      const remaining = date.getTime() - now.getTime();
      if (!(remaining > 0 && remaining <= DAY)) continue;
      const key = `interview:${job.id}:${typeof id === "string" ? id : "round"}:${date.toISOString()}`;
      reminders.push({ key, ttl: Math.max(1, Math.floor(remaining / 1000)), message: {
        title: "Upcoming interview", body: `${job.role} at ${job.company} — within the next 24 hours`,
        tag: key, url: "/?view=calendar",
      } });
    }
  }
  return reminders;
}

async function deliverReminder(subscription: WebPushSubscription, reminder: ReturnType<typeof remindersForJob>[number], now: Date) {
  const where = { subscriptionId: subscription.id, reminderKey: reminder.key };
  await prisma.notificationDelivery.createMany({ data: [where], skipDuplicates: true });
  await deliverNotification(subscription, reminder.key, reminder.message, now, reminder.ttl);
}

export async function runNotificationCycle(now = new Date()) {
  const vapid = getVapidDetails();
  if (!vapid) return;
  await flushApplicationNotifications(now);
  const jobs = await prisma.job.findMany({
    where: {
      status: { notIn: ["REJECTED", "GHOSTED", "OFFER"] },
      createdByUser: { isActive: true, pushSubscriptions: { some: { vapidPublicKey: vapid.publicKey } } },
      OR: [{ reminderEnabled: true, followUpDate: { lte: now } }, { interviewReminderEnabled: true }],
    },
    include: { createdByUser: { include: { pushSubscriptions: true, tenantUsers: { select: { tenantId: true } } } } },
  });
  for (const job of jobs) {
    const user = job.createdByUser;
    if (!user.tenantUsers.some(membership => membership.tenantId === job.tenantId)) continue;
    const reminders = remindersForJob(job, now, { followUps: user.pushFollowUps, interviews: user.pushInterviews });
    for (const subscription of user.pushSubscriptions) {
      if (subscription.vapidPublicKey !== vapid.publicKey) continue;
      for (const reminder of reminders) {
        // An expired endpoint may have been removed while sending an earlier reminder.
        if (!await prisma.webPushSubscription.findUnique({ where: { id: subscription.id }, select: { id: true } })) break;
        await deliverReminder(subscription, reminder, now);
      }
    }
  }
}

export function startNotificationWorker() {
  if (!getVapidDetails()) return () => {};
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runNotificationCycle(); }
    catch { console.error("Notification reminder cycle failed; it will retry on the next cycle."); }
    finally { running = false; }
  };
  const timer = setInterval(() => { void tick(); }, 60000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
