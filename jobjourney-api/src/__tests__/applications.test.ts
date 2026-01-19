import request from "supertest";
import app from "../app";

describe("Applications Routes", () => {
  let token: string;
  let tenantId: string;

  beforeEach(async () => {
    // Create a user and get auth token
    const res = await request(app)
      .post("/auth/signup")
      .send({
        email: "apps@example.com",
        password: "password123",
        name: "Apps User",
      });
    token = res.body.token;
    tenantId = res.body.tenantId;
  });

  describe("GET /api/tenants/:tenantId/applications", () => {
    it("should return empty list initially", async () => {
      const res = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return applications after creating some", async () => {
      // Create an application
      await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "Test Company",
          role: "Software Engineer",
          status: "APPLIED",
        });

      const res = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].company).toBe("Test Company");
    });

    it("should reject request without auth", async () => {
      const res = await request(app)
        .get(`/api/tenants/${tenantId}/applications`);

      expect(res.status).toBe(401);
    });

    it("should reject access to other tenant", async () => {
      // Create another user with different tenant
      const otherRes = await request(app)
        .post("/auth/signup")
        .send({
          email: "other@example.com",
          password: "password123",
        });
      const otherTenantId = otherRes.body.tenantId;

      const res = await request(app)
        .get(`/api/tenants/${otherTenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/tenants/:tenantId/applications", () => {
    it("should create a new application", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "New Company",
          role: "Product Manager",
          status: "INTERESTED",
          dateApplied: "2025-01-15",
          description: "Great opportunity",
          location: "Remote",
          salary: "$150k",
          link: "https://example.com/job",
          notes: "Applied via referral",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.company).toBe("New Company");
      expect(res.body.role).toBe("Product Manager");
      expect(res.body.status).toBe("INTERESTED");
      expect(res.body.location).toBe("Remote");
    });

    it("should create application with minimal fields", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "Minimal Co",
          role: "Engineer",
        });

      expect(res.status).toBe(201);
      expect(res.body.company).toBe("Minimal Co");
      expect(res.body.status).toBe("INTERESTED"); // Default status
    });

    it("should reject missing company", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          role: "Engineer",
        });

      expect(res.status).toBe(400);
    });

    it("should reject missing role", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "Some Company",
        });

      expect(res.status).toBe(400);
    });

    it("should reject invalid status", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "Test Co",
          role: "Engineer",
          status: "INVALID_STATUS",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/tenants/:tenantId/applications/:id", () => {
    let applicationId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "Update Test Co",
          role: "Engineer",
          status: "APPLIED",
        });
      applicationId = res.body.id;
    });

    it("should update application fields", async () => {
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/applications/${applicationId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "Updated Company",
          status: "INTERVIEWING",
          notes: "Had first call",
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toBe("Updated Company");
      expect(res.body.status).toBe("INTERVIEWING");
      expect(res.body.notes).toBe("Had first call");
    });

    it("should update single field", async () => {
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/applications/${applicationId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          status: "OFFER",
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("OFFER");
      expect(res.body.company).toBe("Update Test Co"); // Unchanged
    });

    it("should return 404 for non-existent application", async () => {
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/applications/non-existent-id`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          status: "INTERVIEWING",
        });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/tenants/:tenantId/applications/:id", () => {
    let applicationId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "Delete Test Co",
          role: "Engineer",
        });
      applicationId = res.body.id;
    });

    it("should delete application", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/${applicationId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify it's deleted
      const listRes = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      expect(listRes.body).toHaveLength(0);
    });

    it("should return 404 for non-existent application", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/non-existent-id`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/tenants/:tenantId/applications/:id/history", () => {
    let applicationId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          company: "History Test Co",
          role: "Engineer",
          status: "APPLIED",
        });
      applicationId = res.body.id;
    });

    it("should return status history", async () => {
      const res = await request(app)
        .get(`/api/tenants/${tenantId}/applications/${applicationId}/history`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe("APPLIED");
      expect(res.body[0].notes).toBe("Application created");
    });

    it("should track status changes", async () => {
      // Update status
      await request(app)
        .put(`/api/tenants/${tenantId}/applications/${applicationId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "INTERVIEWING" });

      const res = await request(app)
        .get(`/api/tenants/${tenantId}/applications/${applicationId}/history`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      // History is ordered by changedAt desc
      expect(res.body[0].status).toBe("INTERVIEWING");
      expect(res.body[1].status).toBe("APPLIED");
    });
  });

  describe("DELETE /api/tenants/:tenantId/applications/bulk", () => {
    let appIds: string[];

    beforeEach(async () => {
      appIds = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post(`/api/tenants/${tenantId}/applications`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            company: `Bulk Delete Co ${i}`,
            role: "Engineer",
          });
        appIds.push(res.body.id);
      }
    });

    it("should bulk delete applications", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds.slice(0, 2) });

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(2);

      // Verify remaining
      const listRes = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      expect(listRes.body).toHaveLength(1);
    });

    it("should reject empty ids array", async () => {
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: [] });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/tenants/:tenantId/applications/bulk", () => {
    let appIds: string[];

    beforeEach(async () => {
      appIds = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post(`/api/tenants/${tenantId}/applications`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            company: `Bulk Update Co ${i}`,
            role: "Engineer",
            status: "APPLIED",
          });
        appIds.push(res.body.id);
      }
    });

    it("should bulk update status", async () => {
      const res = await request(app)
        .patch(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds, status: "INTERVIEWING" });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(3);

      // Verify update
      const listRes = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${token}`);
      expect(listRes.body.every((app: { status: string }) => app.status === "INTERVIEWING")).toBe(true);
    });

    it("should reject missing status", async () => {
      const res = await request(app)
        .patch(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: appIds });

      expect(res.status).toBe(400);
    });
  });
});
