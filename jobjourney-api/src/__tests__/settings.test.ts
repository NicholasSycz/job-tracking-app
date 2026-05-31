import request from "supertest";
import app from "../app";

describe("Settings Routes", () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "settings@example.com", password: "password123" });
    token = res.body.token;
  });

  describe("GET /api/settings", () => {
    it("returns default settings for a new user", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.applicationGoal).toBe(25);
      expect(res.body.jobSources).toBeNull();
      expect(res.body.recruitingServices).toBeNull();
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/settings");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/settings", () => {
    it("updates applicationGoal", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ applicationGoal: 50 });
      expect(res.status).toBe(200);
      expect(res.body.applicationGoal).toBe(50);
    });

    it("updates jobSources array", async () => {
      const sources = [
        { value: "linkedin", label: "LinkedIn" },
        { value: "custom", label: "Custom Board" },
      ];
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobSources: sources });
      expect(res.status).toBe(200);
      expect(res.body.jobSources).toHaveLength(2);
      expect(res.body.jobSources[1].label).toBe("Custom Board");
    });

    it("updates recruitingServices array", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ recruitingServices: ["Hays", "Robert Half"] });
      expect(res.status).toBe(200);
      expect(res.body.recruitingServices).toEqual(["Hays", "Robert Half"]);
    });

    it("updates all fields at once", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          applicationGoal: 30,
          jobSources: [{ value: "other", label: "Other" }],
          recruitingServices: ["Adecco"],
        });
      expect(res.status).toBe(200);
      expect(res.body.applicationGoal).toBe(30);
      expect(res.body.jobSources).toHaveLength(1);
      expect(res.body.recruitingServices).toEqual(["Adecco"]);
    });

    it("persists settings across GET calls", async () => {
      await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ applicationGoal: 75 });
      const res = await request(app)
        .get("/api/settings")
        .set("Authorization", `Bearer ${token}`);
      expect(res.body.applicationGoal).toBe(75);
    });

    it("rejects applicationGoal below 1", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ applicationGoal: 0 });
      expect(res.status).toBe(400);
    });

    it("rejects applicationGoal above 1000", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ applicationGoal: 1001 });
      expect(res.status).toBe(400);
    });

    it("rejects jobSources with missing label", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobSources: [{ value: "x" }] });
      expect(res.status).toBe(400);
    });

    it("rejects jobSources with non-array value", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobSources: "not-an-array" });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/settings")
        .send({ applicationGoal: 10 });
      expect(res.status).toBe(401);
    });
  });
});
