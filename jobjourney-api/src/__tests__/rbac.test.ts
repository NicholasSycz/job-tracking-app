import request from "supertest";
import app from "../app";

/**
 * RBAC tests: two users (owner + member) in the same tenant.
 * Verifies that members can only mutate their own resources,
 * while owners can mutate anything in the tenant.
 */
describe("RBAC — Role-Based Access Control", () => {
  let ownerToken: string;
  let memberToken: string;
  let tenantId: string;

  beforeEach(async () => {
    // Create owner
    const ownerRes = await request(app)
      .post("/auth/signup")
      .send({ email: "owner@example.com", password: "password123", name: "Owner" });
    ownerToken = ownerRes.body.token;
    tenantId = ownerRes.body.tenantId;

    // Create member account (gets their own tenant + JWT)
    const memberSignup = await request(app)
      .post("/auth/signup")
      .send({ email: "member@example.com", password: "password123", name: "Member" });
    memberToken = memberSignup.body.token;

    // Owner invites member to owner's tenant
    const inviteRes = await request(app)
      .post(`/api/tenants/${tenantId}/invites`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "member@example.com", role: "member" });
    const inviteToken = inviteRes.body.token;

    // Member accepts the invite using their own JWT
    await request(app)
      .post("/auth/invite/accept")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ token: inviteToken });
  });

  describe("Application mutations", () => {
    it("member can create their own application", async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ company: "My Company", role: "Dev" });
      expect(res.status).toBe(201);
    });

    it("member can update their own application", async () => {
      const create = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ company: "My Co", role: "Dev" });
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/applications/${create.body.id}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ status: "APPLIED" });
      expect(res.status).toBe(200);
    });

    it("member cannot update another member's application", async () => {
      const ownerApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ company: "Owner Co", role: "Lead" });
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/applications/${ownerApp.body.id}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ status: "REJECTED" });
      expect(res.status).toBe(403);
    });

    it("member cannot delete another member's application", async () => {
      const ownerApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ company: "Owner Co", role: "Lead" });
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/${ownerApp.body.id}`)
        .set("Authorization", `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it("owner can update any member's application", async () => {
      const memberApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ company: "Member Co", role: "Dev" });
      const res = await request(app)
        .put(`/api/tenants/${tenantId}/applications/${memberApp.body.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ status: "OFFER" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("OFFER");
    });

    it("owner can delete any member's application", async () => {
      const memberApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ company: "Member Co", role: "Dev" });
      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/${memberApp.body.id}`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(204);
    });
  });

  describe("Bulk operations RBAC", () => {
    it("member cannot bulk-delete a mix of own and other's applications", async () => {
      const memberApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ company: "Mine", role: "Dev" });
      const ownerApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ company: "Theirs", role: "Lead" });

      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ ids: [memberApp.body.id, ownerApp.body.id] });
      expect(res.status).toBe(403);
    });

    it("owner can bulk-delete all applications regardless of creator", async () => {
      const memberApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ company: "Mine", role: "Dev" });
      const ownerApp = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ company: "Theirs", role: "Lead" });

      const res = await request(app)
        .delete(`/api/tenants/${tenantId}/applications/bulk`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ ids: [memberApp.body.id, ownerApp.body.id] });
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(2);
    });
  });

  describe("Cross-tenant isolation", () => {
    it("user cannot read another tenant's applications", async () => {
      const outsider = await request(app)
        .post("/auth/signup")
        .send({ email: "outsider@example.com", password: "password123" });
      const res = await request(app)
        .get(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${outsider.body.token}`);
      expect(res.status).toBe(403);
    });

    it("user cannot create applications in another tenant", async () => {
      const outsider = await request(app)
        .post("/auth/signup")
        .send({ email: "outsider2@example.com", password: "password123" });
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/applications`)
        .set("Authorization", `Bearer ${outsider.body.token}`)
        .send({ company: "Hack", role: "Hacker" });
      expect(res.status).toBe(403);
    });
  });
});
