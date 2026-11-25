import request from "supertest";
import { createECDH, randomBytes } from "crypto";
import webpush from "web-push";
import app from "../app";
import { prisma } from "../db";
import { runNotificationCycle } from "../services/notificationWorker";
import { flushApplicationNotifications, queueApplicationNotification } from "../services/applicationNotifications";

jest.mock("web-push", () => ({ ...jest.requireActual("web-push"), sendNotification: jest.fn() }));
const send = webpush.sendNotification as jest.MockedFunction<typeof webpush.sendNotification>;
const vapid = webpush.generateVAPIDKeys();
const deviceKey = createECDH("prime256v1").generateKeys().toString("base64url");
const keys = { p256dh: deviceKey, auth: randomBytes(16).toString("base64url") };
const endpoint = (device: string) => `https://web.push.apple.com/test-${device}`;
const previousEnv = { publicKey: process.env.WEB_PUSH_PUBLIC_KEY, privateKey: process.env.WEB_PUSH_PRIVATE_KEY, subject: process.env.WEB_PUSH_SUBJECT };

beforeEach(() => {
  process.env.WEB_PUSH_PUBLIC_KEY = vapid.publicKey;
  process.env.WEB_PUSH_PRIVATE_KEY = vapid.privateKey;
  process.env.WEB_PUSH_SUBJECT = "mailto:notifications@example.com";
  send.mockReset().mockResolvedValue({ statusCode: 201, body: "", headers: {} });
});
afterEach(async () => { await flushApplicationNotifications(); });
afterAll(() => {
  for (const [name, value] of Object.entries({ WEB_PUSH_PUBLIC_KEY: previousEnv.publicKey, WEB_PUSH_PRIVATE_KEY: previousEnv.privateKey, WEB_PUSH_SUBJECT: previousEnv.subject })) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

async function account(name = "first") {
  const res = await request(app).post("/auth/signup").send({ email: `${name}@example.com`, password: "password123", name });
  expect(res.status).toBe(200);
  return { token: res.body.token as string, userId: res.body.user.id as string, tenantId: res.body.tenantId as string };
}
async function subscribe(token: string, device = "first") {
  const res = await request(app).post("/api/notifications/subscriptions").set("Authorization", `Bearer ${token}`).send({ endpoint: endpoint(device), keys });
  expect(res.status).toBe(201);
  return prisma.webPushSubscription.findUniqueOrThrow({ where: { endpoint: endpoint(device) } });
}

it("requires authentication and stores subscriptions idempotently without exposing encryption keys", async () => {
  expect((await request(app).get("/api/notifications/config")).status).toBe(401);
  const user = await account();
  await subscribe(user.token);
  await subscribe(user.token);
  expect(await prisma.webPushSubscription.count()).toBe(1);
  const config = await request(app).get("/api/notifications/config").set("Authorization", `Bearer ${user.token}`);
  expect(config.body).toEqual({ configured: true, publicKey: vapid.publicKey, preferences: { followUps: true, interviews: true, jobsAdded: true, jobsUpdated: true }, endpoints: [endpoint("first")] });
});

it("isolates accounts when listing, testing, disabling and registering devices", async () => {
  const first = await account();
  const second = await account("second");
  await subscribe(first.token);
  const auth = `Bearer ${second.token}`;
  const config = await request(app).get("/api/notifications/config").set("Authorization", auth);
  expect(config.body.endpoints).toEqual([]);
  expect((await request(app).post("/api/notifications/test").set("Authorization", auth).send({ endpoint: endpoint("first") })).status).toBe(404);
  expect((await request(app).post("/api/notifications/subscriptions").set("Authorization", auth).send({ endpoint: endpoint("first"), keys })).status).toBe(409);
  expect((await request(app).delete("/api/notifications/subscriptions").set("Authorization", auth).send({ endpoint: endpoint("first") })).status).toBe(204);
  expect(await prisma.webPushSubscription.count()).toBe(1);
  expect(send).not.toHaveBeenCalled();
});

it.each(["http://web.push.apple.com/test", "https://127.0.0.1/test", "https://web.push.apple.com.evil.example/test", "https://web.push.apple.com:444/test", "https://user:password@web.push.apple.com/test"])("rejects unsafe push endpoints: %s", async unsafe => {
  const user = await account();
  const res = await request(app).post("/api/notifications/subscriptions").set("Authorization", `Bearer ${user.token}`).send({ endpoint: unsafe, keys });
  expect(res.status).toBe(400);
  expect(await prisma.webPushSubscription.count()).toBe(0);
});

it("rejects malformed subscription keys", async () => {
  const user = await account();
  const res = await request(app).post("/api/notifications/subscriptions").set("Authorization", `Bearer ${user.token}`).send({ endpoint: endpoint("bad"), keys: { p256dh: "bad", auth: "bad" } });
  expect(res.status).toBe(400);
});

it("persists and validates reminder preferences", async () => {
  const user = await account();
  const auth = `Bearer ${user.token}`;
  const saved = await request(app).put("/api/notifications/preferences").set("Authorization", auth).send({ followUps: false, interviews: true });
  expect(saved.status).toBe(200);
  const config = await request(app).get("/api/notifications/config").set("Authorization", auth);
  expect(config.body.preferences).toEqual({ followUps: false, interviews: true, jobsAdded: true, jobsUpdated: true });
  expect((await request(app).put("/api/notifications/preferences").set("Authorization", auth).send({ followUps: "true", interviews: false })).status).toBe(400);
});

it("reports missing configuration without sending a push", async () => {
  delete process.env.WEB_PUSH_PRIVATE_KEY;
  const user = await account();
  const config = await request(app).get("/api/notifications/config").set("Authorization", `Bearer ${user.token}`);
  expect(config.body.configured).toBe(false);
  expect(config.body.publicKey).toBeNull();
  expect((await request(app).post("/api/notifications/subscriptions").set("Authorization", `Bearer ${user.token}`).send({ endpoint: endpoint("first"), keys })).status).toBe(503);
  await runNotificationCycle();
  expect(send).not.toHaveBeenCalled();
});

it("sends a test only to the selected device and deletes expired subscriptions", async () => {
  const user = await account();
  const first = await subscribe(user.token);
  await subscribe(user.token, "second");
  const auth = `Bearer ${user.token}`;
  expect((await request(app).post("/api/notifications/test").set("Authorization", auth).send({ endpoint: first.endpoint })).status).toBe(200);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0].endpoint).toBe(first.endpoint);
  expect(JSON.parse(send.mock.calls[0][1] as string).url).toBe("/");
  send.mockRejectedValueOnce({ statusCode: 410 });
  expect((await request(app).post("/api/notifications/test").set("Authorization", auth).send({ endpoint: first.endpoint })).status).toBe(502);
  expect(await prisma.webPushSubscription.count()).toBe(1);
  expect(await prisma.webPushSubscription.findUnique({ where: { id: first.id } })).toBeNull();
});

const now = new Date("2026-11-25T12:00:00Z");
async function reminderJob(user: Awaited<ReturnType<typeof account>>) {
  return prisma.job.create({ data: {
    tenantId: user.tenantId, createdByUserId: user.userId, company: "Reminder Co", role: "Engineer", status: "APPLIED",
    dateApplied: now, reminderEnabled: true, followUpDate: new Date(now.getTime() - 60000),
  } });
}

it("delivers due reminders once to each of the creator's phones, including every upcoming round", async () => {
  const user = await account();
  const other = await account("other");
  await subscribe(user.token);
  await subscribe(user.token, "second");
  await subscribe(other.token, "other");
  const job = await reminderJob(user);
  await prisma.job.update({ where: { id: job.id }, data: { interviewReminderEnabled: true, interviews: [
    { id: "soon", scheduledAt: new Date(now.getTime() + 3600000).toISOString() },
    { id: "later", scheduledAt: new Date(now.getTime() + 48 * 3600000).toISOString() },
    { id: "finished", scheduledAt: new Date(now.getTime() + 3600000).toISOString(), outcome: "PASSED" },
  ] } });
  await runNotificationCycle(now);
  await runNotificationCycle(new Date(now.getTime() + 60000));
  expect(send).toHaveBeenCalledTimes(4);
  expect(new Set(send.mock.calls.map(call => call[0].endpoint))).toEqual(new Set([endpoint("first"), endpoint("second")]));
  expect(await prisma.notificationDelivery.count({ where: { sentAt: { not: null } } })).toBe(4);
  await runNotificationCycle(new Date(now.getTime() + 25 * 3600000));
  expect(send).toHaveBeenCalledTimes(6);
});

it("retries temporary failures after the lease expires without repeating successful deliveries", async () => {
  const user = await account();
  await subscribe(user.token);
  await reminderJob(user);
  send.mockRejectedValueOnce({ statusCode: 503 });
  await runNotificationCycle(now);
  await runNotificationCycle(new Date(now.getTime() + 60000));
  expect(send).toHaveBeenCalledTimes(1);
  await runNotificationCycle(new Date(now.getTime() + 6 * 60000));
  await runNotificationCycle(new Date(now.getTime() + 7 * 60000));
  expect(send).toHaveBeenCalledTimes(2);
  expect(await prisma.notificationDelivery.count({ where: { sentAt: { not: null } } })).toBe(1);
});

it("claims reminders atomically across overlapping workers", async () => {
  const user = await account();
  await subscribe(user.token);
  await reminderJob(user);
  await Promise.all([runNotificationCycle(now), runNotificationCycle(now)]);
  expect(send).toHaveBeenCalledTimes(1);
});

it("respects opt-outs, inactive accounts, departed members and closed applications", async () => {
  const user = await account();
  await subscribe(user.token);
  const job = await reminderJob(user);
  await prisma.user.update({ where: { id: user.userId }, data: { pushFollowUps: false } });
  await runNotificationCycle(now);
  await prisma.user.update({ where: { id: user.userId }, data: { pushFollowUps: true, isActive: false } });
  await runNotificationCycle(now);
  await prisma.user.update({ where: { id: user.userId }, data: { isActive: true } });
  await prisma.job.update({ where: { id: job.id }, data: { status: "REJECTED" } });
  await runNotificationCycle(now);
  await prisma.job.update({ where: { id: job.id }, data: { status: "APPLIED" } });
  await prisma.tenantUser.deleteMany({ where: { userId: user.userId, tenantId: user.tenantId } });
  await runNotificationCycle(now);
  expect(send).not.toHaveBeenCalled();
});

it("removes subscriptions and their delivery history when this device is disabled", async () => {
  const user = await account();
  await subscribe(user.token);
  await reminderJob(user);
  await runNotificationCycle(now);
  expect(await prisma.notificationDelivery.count()).toBe(1);
  expect((await request(app).delete("/api/notifications/subscriptions").set("Authorization", `Bearer ${user.token}`).send({ endpoint: endpoint("first") })).status).toBe(204);
  expect(await prisma.notificationDelivery.count()).toBe(0);
  await runNotificationCycle(new Date(now.getTime() + 60000));
  expect(send).toHaveBeenCalledTimes(1);
});

async function sharedWorkspace() {
  const owner = await account("owner");
  const wife = await account("wife");
  const outsider = await account("outsider");
  await prisma.tenantUser.create({ data: { tenantId: owner.tenantId, userId: wife.userId, role: "member" } });
  await subscribe(owner.token, "owner");
  await subscribe(wife.token, "wife");
  await subscribe(outsider.token, "outsider");
  return { owner, wife, outsider, base: `/api/tenants/${owner.tenantId}/applications` };
}

it("notifies separate accounts in the same tenant, including all their enabled devices", async () => {
  const { owner, base } = await sharedWorkspace();
  await subscribe(owner.token, "owners-second-phone");
  const created = await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({ company: "Shared Co", role: "Engineer" });
  expect(created.status).toBe(201);
  await flushApplicationNotifications();
  expect(send).toHaveBeenCalledTimes(3);
  expect(new Set(send.mock.calls.map(call => call[0].endpoint))).toEqual(new Set([endpoint("owner"), endpoint("wife"), endpoint("owners-second-phone")]));
  expect(JSON.parse(send.mock.calls[0][1] as string)).toMatchObject({ title: "Job added", body: "Engineer at Shared Co", url: "/?view=applications" });

  send.mockClear();
  const updated = await request(app).put(`${base}/${created.body.id}`).set("Authorization", `Bearer ${owner.token}`).send({ status: "REJECTED" });
  expect(updated.status).toBe(200);
  await flushApplicationNotifications();
  expect(send).toHaveBeenCalledTimes(3);
  expect(JSON.parse(send.mock.calls[0][1] as string).title).toBe("Job updated");
  await runNotificationCycle();
  expect(send).toHaveBeenCalledTimes(3);
});

it("also notifies both accounts when the member creates or edits her application", async () => {
  const { wife, base } = await sharedWorkspace();
  const created = await request(app).post(base).set("Authorization", `Bearer ${wife.token}`).send({ company: "Wife Co", role: "Designer" });
  expect(created.status).toBe(201);
  await flushApplicationNotifications();
  expect(send).toHaveBeenCalledTimes(2);
  send.mockClear();
  expect((await request(app).put(`${base}/${created.body.id}`).set("Authorization", `Bearer ${wife.token}`).send({ notes: "Interview arranged" })).status).toBe(200);
  await flushApplicationNotifications();
  expect(new Set(send.mock.calls.map(call => call[0].endpoint))).toEqual(new Set([endpoint("owner"), endpoint("wife")]));
});

it("does not notify for unchanged saves, including full form payloads and interview JSON", async () => {
  const { owner, base } = await sharedWorkspace();
  const created = await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({
    company: "Shared Co", role: "Engineer", interviews: [{ id: "round", type: "technical", scheduledAt: new Date().toISOString(), notes: "Notes" }],
  });
  expect(created.status).toBe(201);
  await flushApplicationNotifications();
  send.mockClear();
  expect((await request(app).put(`${base}/${created.body.id}`).set("Authorization", `Bearer ${owner.token}`).send(created.body)).status).toBe(200);
  await flushApplicationNotifications();
  expect(send).not.toHaveBeenCalled();
});

it("persists independent job-added and job-updated preferences per recipient", async () => {
  const { owner, wife, base } = await sharedWorkspace();
  const saved = await request(app).put("/api/notifications/preferences").set("Authorization", `Bearer ${wife.token}`).send({ followUps: true, interviews: true, jobsAdded: false, jobsUpdated: true });
  expect(saved.status).toBe(200);
  const config = await request(app).get("/api/notifications/config").set("Authorization", `Bearer ${wife.token}`);
  expect(config.body.preferences).toEqual({ followUps: true, interviews: true, jobsAdded: false, jobsUpdated: true });
  const created = await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({ company: "Shared Co", role: "Engineer" });
  expect(created.status).toBe(201);
  await flushApplicationNotifications();
  expect(send.mock.calls.map(call => call[0].endpoint)).toEqual([endpoint("owner")]);
  send.mockClear();
  expect((await request(app).put(`${base}/${created.body.id}`).set("Authorization", `Bearer ${owner.token}`).send({ role: "Senior Engineer" })).status).toBe(200);
  await flushApplicationNotifications();
  expect(new Set(send.mock.calls.map(call => call[0].endpoint))).toEqual(new Set([endpoint("owner"), endpoint("wife")]));
  expect((await request(app).put("/api/notifications/preferences").set("Authorization", `Bearer ${wife.token}`).send({ followUps: true, interviews: true, jobsAdded: "false" })).status).toBe(400);
});

it("rejects unauthorized or invalid mutations without queuing alerts", async () => {
  const { owner, wife, outsider, base } = await sharedWorkspace();
  const created = await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({ company: "Shared Co", role: "Engineer" });
  expect(created.status).toBe(201);
  await flushApplicationNotifications();
  send.mockClear();
  const previousCount = await prisma.notificationDelivery.count();
  expect((await request(app).post(base).set("Authorization", `Bearer ${outsider.token}`).send({ company: "Bad", role: "No access" })).status).toBe(403);
  expect((await request(app).put(`${base}/${created.body.id}`).set("Authorization", `Bearer ${wife.token}`).send({ role: "Not mine" })).status).toBe(403);
  expect((await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({ role: "Missing company" })).status).toBe(400);
  await flushApplicationNotifications();
  expect(send).not.toHaveBeenCalled();
  expect(await prisma.notificationDelivery.count()).toBe(previousCount);
});

it("returns a successful save without waiting for push delivery", async () => {
  const { owner, base } = await sharedWorkspace();
  let release!: (result: webpush.SendResult) => void;
  const pending = new Promise<webpush.SendResult>(resolve => { release = resolve; });
  send.mockReturnValueOnce(pending);
  try {
    const created = await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({ company: "Shared Co", role: "Engineer" }).timeout({ deadline: 5000 });
    expect(created.status).toBe(201);
  } finally {
    release({ statusCode: 201, body: "", headers: {} });
    await flushApplicationNotifications();
  }
  expect(send).toHaveBeenCalledTimes(2);
});

it("retains failed job alerts for retry without duplicating successful deliveries", async () => {
  const { owner, base } = await sharedWorkspace();
  send.mockRejectedValue({ statusCode: 503 });
  const created = await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({ company: "Shared Co", role: "Engineer" });
  expect(created.status).toBe(201);
  await flushApplicationNotifications();
  expect(await prisma.job.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  expect(await prisma.notificationDelivery.count({ where: { eventType: "JOB_ADDED", sentAt: null } })).toBe(2);
  expect(send).toHaveBeenCalledTimes(2);
  send.mockResolvedValue({ statusCode: 201, body: "", headers: {} });
  const retryAt = new Date(Date.now() + 6 * 60000);
  await runNotificationCycle(retryAt);
  await runNotificationCycle(new Date(retryAt.getTime() + 60000));
  expect(send).toHaveBeenCalledTimes(4);
  expect(await prisma.notificationDelivery.count({ where: { eventType: "JOB_ADDED", sentAt: { not: null } } })).toBe(2);
});

it.each(["membership", "preference", "inactive"])("rechecks recipient %s before retrying queued tenant alerts", async reason => {
  const { owner, wife, base } = await sharedWorkspace();
  send.mockRejectedValue({ statusCode: 503 });
  expect((await request(app).post(base).set("Authorization", `Bearer ${owner.token}`).send({ company: "Shared Co", role: "Engineer" })).status).toBe(201);
  await flushApplicationNotifications();
  if (reason === "membership") await prisma.tenantUser.deleteMany({ where: { userId: wife.userId, tenantId: owner.tenantId } });
  if (reason === "preference") await prisma.user.update({ where: { id: wife.userId }, data: { pushJobAdded: false } });
  if (reason === "inactive") await prisma.user.update({ where: { id: wife.userId }, data: { isActive: false } });
  send.mockClear().mockResolvedValue({ statusCode: 201, body: "", headers: {} });
  await runNotificationCycle(new Date(Date.now() + 6 * 60000));
  expect(send.mock.calls.map(call => call[0].endpoint)).toEqual([endpoint("owner")]);
});

it("sends a single summary per phone for bulk imports and bulk status changes", async () => {
  const { owner, base } = await sharedWorkspace();
  const auth = `Bearer ${owner.token}`;
  const imported = await request(app).post(`${base}/bulk`).set("Authorization", auth).send({ applications: [
    { company: "First Co", role: "Engineer" }, { company: "Second Co", role: "Designer" },
  ] });
  expect(imported.status).toBe(201);
  await flushApplicationNotifications();
  expect(send).toHaveBeenCalledTimes(2);
  expect(JSON.parse(send.mock.calls[0][1] as string)).toMatchObject({ title: "Jobs added", body: "2 applications imported" });
  send.mockClear();
  const ids = imported.body.applications.map((job: { id: string }) => job.id);
  expect((await request(app).patch(`${base}/bulk`).set("Authorization", auth).send({ ids, status: "APPLIED" })).status).toBe(200);
  await flushApplicationNotifications();
  expect(send).toHaveBeenCalledTimes(2);
  expect(JSON.parse(send.mock.calls[0][1] as string)).toMatchObject({ title: "Jobs updated", body: "2 applications changed to APPLIED" });
  send.mockClear();
  expect((await request(app).patch(`${base}/bulk`).set("Authorization", auth).send({ ids, status: "APPLIED" })).status).toBe(200);
  await flushApplicationNotifications();
  expect(send).not.toHaveBeenCalled();
});

it("rolls queued deliveries back together with a failed transaction", async () => {
  const { owner } = await sharedWorkspace();
  await expect(prisma.$transaction(async tx => {
    await tx.job.create({ data: { tenantId: owner.tenantId, createdByUserId: owner.userId, company: "Rolled back", role: "Engineer", dateApplied: new Date() } });
    await queueApplicationNotification(tx, owner.tenantId, "JOB_ADDED", "Job added", "Should not be sent");
    throw new Error("Rollback");
  })).rejects.toThrow("Rollback");
  expect(await prisma.job.count()).toBe(0);
  expect(await prisma.notificationDelivery.count()).toBe(0);
  expect(send).not.toHaveBeenCalled();
});

it("alerts on reminder edits from the extension but ignores delivery bookkeeping", async () => {
  const { owner, base } = await sharedWorkspace();
  const job = await reminderJob(owner);
  const auth = `Bearer ${owner.token}`;
  const reminder = `${base}/${job.id}/reminder`;
  const changed = { followUpDate: "2026-12-01T09:00:00.000Z", reminderEnabled: true, reminderSentAt: null };
  expect((await request(app).patch(reminder).set("Authorization", auth).send(changed)).status).toBe(200);
  await flushApplicationNotifications();
  expect(send).toHaveBeenCalledTimes(2);
  expect(JSON.parse(send.mock.calls[0][1] as string).title).toBe("Job updated");
  send.mockClear();
  expect((await request(app).post(`${base}/${job.id}/reminder-sent`).set("Authorization", auth)).status).toBe(200);
  expect((await request(app).post(`${base}/${job.id}/interview-reminder-sent`).set("Authorization", auth)).status).toBe(200);
  expect((await request(app).patch(reminder).set("Authorization", auth).send(changed)).status).toBe(200);
  await flushApplicationNotifications();
  expect(send).not.toHaveBeenCalled();
});
