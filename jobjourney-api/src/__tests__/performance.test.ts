import request from "supertest";
import app from "../app";

// Performance tests use longer timeouts
jest.setTimeout(30000);

describe("Performance", () => {
  let token: string;
  let tenantId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "perf@example.com", password: "password123" });
    token = res.body.token;
    tenantId = res.body.tenantId;
  });

  // Seeds N applications via bulk import
  const seed = async (count: number) => {
    const apps = Array.from({ length: count }, (_, i) => ({
      company: `Company ${i}`,
      role: i % 2 === 0 ? "Engineer" : "Manager",
      status: ["INTERESTED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED", "GHOSTED"][i % 6],
    }));
    // Import in chunks of 200
    for (let i = 0; i < apps.length; i += 200) {
      await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: apps.slice(i, i + 200) });
    }
  };

  const measure = async (fn: () => Promise<request.Response>): Promise<{ res: request.Response; ms: number }> => {
    const start = Date.now();
    const res = await fn();
    return { res, ms: Date.now() - start };
  };

  describe("Response time — empty database", () => {
    it("list applications returns in < 100ms", async () => {
      const { res, ms } = await measure(() =>
        request(app)
          .get(`/api/tenants/${tenantId}/applications`)
          .set("Authorization", `Bearer ${token}`)
      );
      expect(res.status).toBe(200);
      expect(ms).toBeLessThan(100);
    });

    it("create application returns in < 300ms", async () => {
      const { res, ms } = await measure(() =>
        request(app)
          .post(`/api/tenants/${tenantId}/applications`)
          .set("Authorization", `Bearer ${token}`)
          .send({ company: "Fast Co", role: "Dev" })
      );
      expect(res.status).toBe(201);
      expect(ms).toBeLessThan(300);
    });

    it("get settings returns in < 100ms", async () => {
      const { res, ms } = await measure(() =>
        request(app)
          .get("/api/settings")
          .set("Authorization", `Bearer ${token}`)
      );
      expect(res.status).toBe(200);
      expect(ms).toBeLessThan(100);
    });

    it("get current goal returns in < 200ms", async () => {
      const { res, ms } = await measure(() =>
        request(app)
          .get("/api/goals/current")
          .set("Authorization", `Bearer ${token}`)
      );
      expect(res.status).toBe(200);
      expect(ms).toBeLessThan(200);
    });
  });

  describe("Response time — with 500 applications", () => {
    beforeEach(async () => {
      await seed(500);
    });

    it("list 500 applications returns in < 500ms", async () => {
      const { res, ms } = await measure(() =>
        request(app)
          .get(`/api/tenants/${tenantId}/applications`)
          .set("Authorization", `Bearer ${token}`)
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(500);
      expect(ms).toBeLessThan(500);
    });

    it("single update on large dataset returns in < 300ms", async () => {
      const list = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      const id = list.body[0].id;

      const { res, ms } = await measure(() =>
        request(app)
          .put(`/api/tenants/${tenantId}/applications/${id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ status: "OFFER" })
      );
      expect(res.status).toBe(200);
      expect(ms).toBeLessThan(300);
    });

    it("status history for one application returns in < 200ms", async () => {
      const list = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      const id = list.body[0].id;

      const { res, ms } = await measure(() =>
        request(app)
          .get(`/api/tenants/${tenantId}/applications/${id}/history`)
          .set("Authorization", `Bearer ${token}`)
      );
      expect(res.status).toBe(200);
      expect(ms).toBeLessThan(200);
    });
  });

  describe("Bulk operation performance", () => {
    it("bulk import 200 applications in < 8000ms", async () => {
      const apps = Array.from({ length: 200 }, (_, i) => ({
        company: `BulkCo ${i}`,
        role: "Dev",
      }));
      const { res, ms } = await measure(() =>
        request(app)
          .post(`/api/tenants/${tenantId}/applications/bulk`)
          .set("Authorization", `Bearer ${token}`)
          .send({ applications: apps })
      );
      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(200);
      expect(ms).toBeLessThan(8000);
    });

    it("bulk delete 200 applications in < 5000ms", async () => {
      await seed(200);
      const list = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      const ids = list.body.map((a: { id: string }) => a.id);

      const { res, ms } = await measure(() =>
        request(app)
          .delete(`/api/tenants/${tenantId}/applications/bulk`)
          .set("Authorization", `Bearer ${token}`)
          .send({ ids })
      );
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(200);
      expect(ms).toBeLessThan(5000);
    });

    it("bulk status update for 200 applications in < 5000ms", async () => {
      await seed(200);
      const list = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      const ids = list.body.map((a: { id: string }) => a.id);

      const { res, ms } = await measure(() =>
        request(app)
          .patch(`/api/tenants/${tenantId}/applications/bulk`)
          .set("Authorization", `Bearer ${token}`)
          .send({ ids, status: "REJECTED" })
      );
      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(200);
      expect(ms).toBeLessThan(5000);
    });
  });

  describe("Concurrency", () => {
    it("handles 10 simultaneous GET /applications without errors", async () => {
      await seed(50);
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          measure(() =>
            request(app)
              .get(`/api/tenants/${tenantId}/applications`)
              .set("Authorization", `Bearer ${token}`)
          )
        )
      );
      const statuses = results.map(r => r.res.status);
      expect(statuses.every(s => s === 200)).toBe(true);
      // p95: all requests should complete in under 1500ms
      const times = results.map(r => r.ms).sort((a, b) => a - b);
      const p95 = times[Math.floor(times.length * 0.95)];
      expect(p95).toBeLessThan(1500);
    });

    it("handles 10 simultaneous POST /applications without duplicate ids", async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          request(app)
            .post(`/api/tenants/${tenantId}/applications`)
            .set("Authorization", `Bearer ${token}`)
            .send({ company: `Concurrent Co ${i}`, role: "Dev" })
        )
      );
      const statuses = results.map(r => r.status);
      expect(statuses.every(s => s === 201)).toBe(true);
      const ids = results.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10); // No duplicate IDs
    });
  });
});
