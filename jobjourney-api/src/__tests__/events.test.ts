import request from "supertest";
import app from "../app";

describe("Calendar Events Routes", () => {
  let token: string;
  let tenantId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "events@example.com", password: "password123", name: "Events User" });
    token = res.body.token;
    tenantId = res.body.tenantId;
  });

  // Helper to create an event
  const createEvent = (overrides = {}) =>
    request(app)
      .post(`/api/tenants/${tenantId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Event",
        startAt: "2026-06-15T10:00:00.000Z",
        type: "OTHER",
        ...overrides,
      });

  // Helper to create a job application
  const createJob = () =>
    request(app)
      .post(`/api/tenants/${tenantId}/applications`)
      .set("Authorization", `Bearer ${token}`)
      .send({ company: "Acme", role: "Engineer" });

  describe("GET /api/tenants/:tenantId/events", () => {
    it("returns empty list initially", async () => {
      const res = await request(app)
        .get(`/api/tenants/${tenantId}/events`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns created events", async () => {
      await createEvent({ title: "Event A" });
      await createEvent({ title: "Event B" });
      const res = await request(app)
        .get(`/api/tenants/${tenantId}/events`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("filters by month and year", async () => {
      await createEvent({ startAt: "2026-06-10T10:00:00.000Z" }); // June
      await createEvent({ startAt: "2026-07-10T10:00:00.000Z" }); // July
      const res = await request(app)
        .get(`/api/tenants/${tenantId}/events?month=6&year=2026`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].startAt).toContain("2026-06");
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get(`/api/tenants/${tenantId}/events`);
      expect(res.status).toBe(401);
    });

    it("returns 403 for wrong tenant", async () => {
      const other = await request(app)
        .post("/auth/signup")
        .send({ email: "other@example.com", password: "password123" });
      const res = await request(app)
        .get(`/api/tenants/${other.body.tenantId}/events`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/tenants/:tenantId/events", () => {
    it("creates an event with all fields", async () => {
      const res = await createEvent({
        title: "Recruiter Call",
        description: "Initial screening",
        startAt: "2026-06-15T10:00:00.000Z",
        endAt: "2026-06-15T10:30:00.000Z",
        type: "RECRUITER_CALL",
      });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Recruiter Call");
      expect(res.body.type).toBe("RECRUITER_CALL");
      expect(res.body.description).toBe("Initial screening");
      expect(res.body).toHaveProperty("id");
    });

    it("creates an INTERVIEW event", async () => {
      const res = await createEvent({ type: "INTERVIEW" });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe("INTERVIEW");
    });

    it("creates a NETWORKING event", async () => {
      const res = await createEvent({ type: "NETWORKING" });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe("NETWORKING");
    });

    it("defaults type to OTHER when not specified", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/events`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Generic", startAt: "2026-06-15T10:00:00.000Z" });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe("OTHER");
    });

    it("creates event linked to a job", async () => {
      const job = await createJob();
      const res = await createEvent({ jobId: job.body.id });
      expect(res.status).toBe(201);
      expect(res.body.jobId).toBe(job.body.id);
    });

    it("rejects linking to a job from another tenant", async () => {
      const other = await request(app)
        .post("/auth/signup")
        .send({ email: "other2@example.com", password: "password123" });
      const otherJob = await request(app)
        .post(`/api/tenants/${other.body.tenantId}/applications`)
        .set("Authorization", `Bearer ${other.body.token}`)
        .send({ company: "Other Co", role: "Dev" });
      const res = await createEvent({ jobId: otherJob.body.id });
      expect(res.status).toBe(404);
    });

    it("rejects missing title", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/events`)
        .set("Authorization", `Bearer ${token}`)
        .send({ startAt: "2026-06-15T10:00:00.000Z" });
      expect(res.status).toBe(400);
    });

    it("rejects missing startAt", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/events`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "No date" });
      expect(res.status).toBe(400);
    });

    it("rejects invalid event type", async () => {
      const res = await createEvent({ type: "INVALID_TYPE" });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/events`)
        .send({ title: "Test", startAt: "2026-06-15T10:00:00.000Z" });
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/tenants/:tenantId/events/:id", () => {
    let eventId: string;

    beforeEach(async () => {
      const res = await createEvent({ title: "Original Title" });
      eventId = res.body.id;
    });

    it("updates event fields", async () => {
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/events/${eventId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated Title", type: "NETWORKING" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
      expect(res.body.type).toBe("NETWORKING");
    });

    it("preserves unchanged fields", async () => {
      await request(app)
        .put(`/api/tenants/${tenantId}/events/${eventId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "INTERVIEW" });
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/events/${eventId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "New Title" });
      expect(res.body.type).toBe("INTERVIEW"); // unchanged
    });

    it("returns 404 for non-existent event", async () => {
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/events/non-existent-id`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Update" });
      expect(res.status).toBe(404);
    });

    it("rejects update from another user (non-owner)", async () => {
      // Create a second user, invite them to the tenant, have them try to edit the owner's event
      const member = await request(app)
        .post("/auth/signup")
        .send({ email: "member2@example.com", password: "password123" });
      const memberToken = member.body.token;

      const inviteRes = await request(app)
        .post(`/api/tenants/${tenantId}/invites`)
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "member2@example.com", role: "member" });

      await request(app)
        .post("/auth/invite/accept")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ token: inviteRes.body.token });

      const res = await request(app)
        .put(`/api/tenants/${tenantId}/events/${eventId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ title: "Hacked" });
      expect([403, 404]).toContain(res.status);
    });
  });

  describe("DELETE /api/tenants/:tenantId/events/:id", () => {
    let eventId: string;

    beforeEach(async () => {
      const res = await createEvent();
      eventId = res.body.id;
    });

    it("deletes the event", async () => {
      const del = await request(app)
        .delete(`/api/tenants/${tenantId}/events/${eventId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(del.status).toBe(204);

      const list = await request(app)
        .get(`/api/tenants/${tenantId}/events`)
        .set("Authorization", `Bearer ${token}`);
      expect(list.body).toHaveLength(0);
    });

    it("returns 404 for non-existent event", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/events/non-existent-id`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).delete(`/api/tenants/${tenantId}/events/${eventId}`);
      expect(res.status).toBe(401);
    });
  });
});
