import request from "supertest";
import app from "../app";

describe("Bulk Operations", () => {
  let token: string;
  let tenantId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "bulk@example.com", password: "password123" });
    token = res.body.token;
    tenantId = res.body.tenantId;
  });

  describe("POST /api/tenants/:tenantId/applications/bulk (import)", () => {
    it("imports a single application", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: [{ company: "Acme", role: "Engineer" }] });
      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(1);
      expect(res.body.applications).toHaveLength(1);
    });

    it("imports multiple applications", async () => {
      const apps = Array.from({ length: 10 }, (_, i) => ({
        company: `Company ${i}`,
        role: "Dev",
        status: "APPLIED",
      }));
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: apps });
      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(10);
    });

    it("imports exactly 200 applications (limit)", async () => {
      const apps = Array.from({ length: 200 }, (_, i) => ({
        company: `Co ${i}`,
        role: "Dev",
      }));
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: apps });
      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(200);
    }, 30000);

    it("rejects import of 201 applications", async () => {
      const apps = Array.from({ length: 201 }, (_, i) => ({
        company: `Co ${i}`,
        role: "Dev",
      }));
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: apps });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("200");
    });

    it("rejects empty applications array", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: [] });
      expect(res.status).toBe(400);
    });

    it("rejects missing company", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: [{ role: "Dev" }] });
      expect(res.status).toBe(400);
    });

    it("rejects invalid status in any application", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          applications: [
            { company: "Good Co", role: "Dev" },
            { company: "Bad Co", role: "Dev", status: "INVALID" },
          ],
        });
      expect(res.status).toBe(400);
    });

    it("creates a status history entry for each imported application", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: [{ company: "Acme", role: "Eng", status: "APPLIED" }] });

      const appId = res.body.applications[0].id;
      const history = await request(app)
        .get(`/api/tenants/${tenantId}/applications/${appId}/history`)
        .set("Authorization", `Bearer ${token}`);
      expect(history.body).toHaveLength(1);
      expect(history.body[0].notes).toBe("Application imported");
    });

    it("defaults status to INTERESTED when not provided", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ applications: [{ company: "Acme", role: "Dev" }] });
      expect(res.body.applications[0].status).toBe("INTERESTED");
    });
  });

  describe("DELETE /api/tenants/:tenantId/applications/bulk", () => {
    let appIds: string[];

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          applications: [
            { company: "A", role: "Dev" },
            { company: "B", role: "Dev" },
            { company: "C", role: "Dev" },
          ],
        });
      appIds = res.body.applications.map((a: { id: string }) => a.id);
    });

    it("deletes a partial set", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds.slice(0, 2) });
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(2);
      const list = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      expect(list.body).toHaveLength(1);
    });

    it("deletes all at once", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds });
      expect(res.body.deleted).toBe(3);
    });

    it("rejects empty ids array", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: [] });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/tenants/:tenantId/applications/bulk (status update)", () => {
    let appIds: string[];

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          applications: [
            { company: "A", role: "Dev", status: "APPLIED" },
            { company: "B", role: "Dev", status: "APPLIED" },
          ],
        });
      appIds = res.body.applications.map((a: { id: string }) => a.id);
    });

    it("updates all specified applications to new status", async () => {
      const res = await request(app)
        .patch(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds, status: "REJECTED" });
      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(2);
      const list = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      expect(list.body.every((a: { status: string }) => a.status === "REJECTED")).toBe(true);
    });

    it("creates status history entries for each updated application", async () => {
      await request(app)
        .patch(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds, status: "GHOSTED" });

      const history = await request(app)
        .get(`/api/tenants/${tenantId}/applications/${appIds[0]}/history`)
        .set("Authorization", `Bearer ${token}`);
      const statuses = history.body.map((h: { status: string }) => h.status);
      expect(statuses).toContain("GHOSTED");
    });

    it("rejects missing status", async () => {
      const res = await request(app)
        .patch(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds });
      expect(res.status).toBe(400);
    });

    it("rejects empty ids array", async () => {
      const res = await request(app)
        .patch(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: [], status: "APPLIED" });
      expect(res.status).toBe(400);
    });
  });
});
