import request from "supertest";
import app from "../app";

describe("Health Route", () => {
  describe("GET /health", () => {
    it("reports ok when the database is reachable", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.database).toBe("up");
      expect(typeof res.body.uptime).toBe("number");
    });

    it("requires no authentication", async () => {
      const res = await request(app).get("/health");
      expect(res.status).not.toBe(401);
    });
  });
});
