import request from "supertest";
import app from "../app";

describe("Goals Routes", () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "goals@example.com", password: "password123" });
    token = res.body.token;
  });

  describe("GET /api/goals/current", () => {
    it("auto-creates a goal for the current month", async () => {
      const res = await request(app)
        .get("/api/goals/current")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body.target).toBe(25);
      expect(res.body.met).toBe(false);
      const now = new Date();
      expect(res.body.month).toBe(now.getMonth() + 1);
      expect(res.body.year).toBe(now.getFullYear());
    });

    it("returns the same goal on subsequent calls (no duplicates)", async () => {
      const first = await request(app)
        .get("/api/goals/current")
        .set("Authorization", `Bearer ${token}`);
      const second = await request(app)
        .get("/api/goals/current")
        .set("Authorization", `Bearer ${token}`);
      expect(first.body.id).toBe(second.body.id);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/goals/current");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/goals/current", () => {
    it("sets a custom target", async () => {
      const res = await request(app)
        .put("/api/goals/current")
        .set("Authorization", `Bearer ${token}`)
        .send({ target: 40 });
      expect(res.status).toBe(200);
      expect(res.body.target).toBe(40);
    });

    it("updates the target on subsequent calls", async () => {
      await request(app)
        .put("/api/goals/current")
        .set("Authorization", `Bearer ${token}`)
        .send({ target: 10 });
      const res = await request(app)
        .put("/api/goals/current")
        .set("Authorization", `Bearer ${token}`)
        .send({ target: 20 });
      expect(res.body.target).toBe(20);
    });

    it("rejects target below 1", async () => {
      const res = await request(app)
        .put("/api/goals/current")
        .set("Authorization", `Bearer ${token}`)
        .send({ target: 0 });
      expect(res.status).toBe(400);
    });

    it("rejects target above 1000", async () => {
      const res = await request(app)
        .put("/api/goals/current")
        .set("Authorization", `Bearer ${token}`)
        .send({ target: 1001 });
      expect(res.status).toBe(400);
    });

    it("rejects missing target", async () => {
      const res = await request(app)
        .put("/api/goals/current")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/goals/history", () => {
    it("returns empty array initially", async () => {
      const res = await request(app)
        .get("/api/goals/history")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns goals after creating them", async () => {
      await request(app)
        .get("/api/goals/current")
        .set("Authorization", `Bearer ${token}`);
      const res = await request(app)
        .get("/api/goals/history")
        .set("Authorization", `Bearer ${token}`);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("PATCH /api/goals/:id/met", () => {
    let goalId: string;

    beforeEach(async () => {
      const res = await request(app)
        .get("/api/goals/current")
        .set("Authorization", `Bearer ${token}`);
      goalId = res.body.id;
    });

    it("marks goal as met", async () => {
      const res = await request(app)
        .patch(`/api/goals/${goalId}/met`)
        .set("Authorization", `Bearer ${token}`)
        .send({ met: true });
      expect(res.status).toBe(200);
      expect(res.body.met).toBe(true);
    });

    it("marks goal as not met", async () => {
      await request(app)
        .patch(`/api/goals/${goalId}/met`)
        .set("Authorization", `Bearer ${token}`)
        .send({ met: true });
      const res = await request(app)
        .patch(`/api/goals/${goalId}/met`)
        .set("Authorization", `Bearer ${token}`)
        .send({ met: false });
      expect(res.body.met).toBe(false);
    });

    it("returns 404 for non-existent goal id", async () => {
      const res = await request(app)
        .patch(`/api/goals/non-existent-id/met`)
        .set("Authorization", `Bearer ${token}`)
        .send({ met: true });
      expect(res.status).toBe(404);
    });

    it("rejects missing met field", async () => {
      const res = await request(app)
        .patch(`/api/goals/${goalId}/met`)
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
