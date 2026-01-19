import request from "supertest";
import app from "../app";
import { prisma } from "../db";

describe("Auth Routes", () => {
  describe("POST /auth/signup", () => {
    it("should create a new user and return token", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(res.body).toHaveProperty("tenantId");
      expect(res.body.user.email).toBe("test@example.com");
      expect(res.body.user.name).toBe("Test User");
    });

    it("should create user without name", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({
          email: "noname@example.com",
          password: "password123",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("noname@example.com");
    });

    it("should reject duplicate email", async () => {
      await request(app)
        .post("/auth/signup")
        .send({
          email: "duplicate@example.com",
          password: "password123",
        });

      const res = await request(app)
        .post("/auth/signup")
        .send({
          email: "duplicate@example.com",
          password: "password456",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("Email already in use");
    });

    it("should reject invalid email format", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({
          email: "invalid-email",
          password: "password123",
        });

      expect(res.status).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({
          email: "test@example.com",
          password: "123",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await request(app)
        .post("/auth/signup")
        .send({
          email: "login@example.com",
          password: "password123",
          name: "Login User",
        });
    });

    it("should login with valid credentials", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({
          email: "login@example.com",
          password: "password123",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(res.body).toHaveProperty("tenantId");
      expect(res.body.user.email).toBe("login@example.com");
    });

    it("should reject invalid password", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({
          email: "login@example.com",
          password: "wrongpassword",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Invalid email or password");
    });

    it("should reject non-existent user", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        });

      expect(res.status).toBe(401);
    });

    it("should reject deactivated user", async () => {
      // Deactivate the user
      await prisma.user.update({
        where: { email: "login@example.com" },
        data: { isActive: false },
      });

      const res = await request(app)
        .post("/auth/login")
        .send({
          email: "login@example.com",
          password: "password123",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("deactivated");
    });
  });

  describe("GET /auth/me", () => {
    let token: string;
    let tenantId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({
          email: "me@example.com",
          password: "password123",
          name: "Me User",
        });
      token = res.body.token;
      tenantId = res.body.tenantId;
    });

    it("should return current user with valid token", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("me@example.com");
      expect(res.body.tenantId).toBe(tenantId);
    });

    it("should reject request without token", async () => {
      const res = await request(app).get("/auth/me");

      expect(res.status).toBe(401);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });

  describe("PUT /auth/profile", () => {
    let token: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({
          email: "profile@example.com",
          password: "password123",
          name: "Original Name",
        });
      token = res.body.token;
    });

    it("should update user name", async () => {
      const res = await request(app)
        .put("/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Updated Name");
    });

    it("should clear name when empty string provided", async () => {
      const res = await request(app)
        .put("/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "" });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /auth/forgot-password", () => {
    beforeEach(async () => {
      await request(app)
        .post("/auth/signup")
        .send({
          email: "forgot@example.com",
          password: "password123",
        });
    });

    it("should accept valid email and create reset token", async () => {
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "forgot@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("If an account exists");

      // Verify token was created
      const token = await prisma.passwordResetToken.findFirst({
        where: { user: { email: "forgot@example.com" } },
      });
      expect(token).not.toBeNull();
    });

    it("should return same response for non-existent email (prevent enumeration)", async () => {
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("If an account exists");
    });
  });

  describe("POST /auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      // Create user and get reset token within same test
      await request(app)
        .post("/auth/signup")
        .send({
          email: "reset1@example.com",
          password: "oldpassword",
        });

      await request(app)
        .post("/auth/forgot-password")
        .send({ email: "reset1@example.com" });

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { user: { email: "reset1@example.com" } },
      });

      const res = await request(app)
        .post("/auth/reset-password")
        .send({
          token: tokenRecord!.token,
          password: "newpassword123",
        });

      expect(res.status).toBe(200);

      // Verify can login with new password
      const loginRes = await request(app)
        .post("/auth/login")
        .send({
          email: "reset1@example.com",
          password: "newpassword123",
        });
      expect(loginRes.status).toBe(200);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({
          token: "invalid-token",
          password: "newpassword123",
        });

      expect(res.status).toBe(400);
    });

    it("should reject reused token", async () => {
      // Create user and get reset token
      await request(app)
        .post("/auth/signup")
        .send({
          email: "reset2@example.com",
          password: "oldpassword",
        });

      await request(app)
        .post("/auth/forgot-password")
        .send({ email: "reset2@example.com" });

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { user: { email: "reset2@example.com" } },
      });

      // Use the token once
      await request(app)
        .post("/auth/reset-password")
        .send({
          token: tokenRecord!.token,
          password: "newpassword123",
        });

      // Try to use it again
      const res = await request(app)
        .post("/auth/reset-password")
        .send({
          token: tokenRecord!.token,
          password: "anotherpassword",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /auth/google/status", () => {
    it("should return Google OAuth configuration status", async () => {
      const res = await request(app).get("/auth/google/status");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("configured");
      expect(typeof res.body.configured).toBe("boolean");
    });
  });
});
