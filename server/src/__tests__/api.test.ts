import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { connectDB } from "../config/db";

describe("ChatApp Backend API Integration Tests", () => {
  let aliceToken: string;
  let bobToken: string;
  let charlieToken: string;
  let aliceId: string;
  let bobId: string;
  let charlieId: string;

  beforeAll(async () => {
    await connectDB();

    // Login the 3 seeded users to obtain tokens and IDs
    const aliceRes = await request(app).post("/auth/login").send({
      email: "alice@example.com",
      password: "password123",
    });
    aliceToken = aliceRes.body.data.token;
    aliceId = aliceRes.body.data.user._id;

    const bobRes = await request(app).post("/auth/login").send({
      email: "bob@example.com",
      password: "password123",
    });
    bobToken = bobRes.body.data.token;
    bobId = bobRes.body.data.user._id;

    const charlieRes = await request(app).post("/auth/login").send({
      email: "charlie@example.com",
      password: "password123",
    });
    charlieToken = charlieRes.body.data.token;
    charlieId = charlieRes.body.data.user._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe("Health & Baseline", () => {
    it("GET /health should return 200 with status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("Authentication", () => {
    it("POST /auth/register should create a new user and return JWT", async () => {
      const email = `vitest_${Date.now()}@example.com`;
      const res = await request(app).post("/auth/register").send({
        name: "Vitest User",
        email,
        password: "securePassword123",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("POST /auth/register with duplicate email should return 409 Conflict", async () => {
      const res = await request(app).post("/auth/register").send({
        name: "Alice Johnson",
        email: "alice@example.com",
        password: "password123",
      });
      expect(res.status).toBe(409);
      expect(res.body.status).toBe("fail");
    });

    it("POST /auth/login with wrong password should return 401 Unauthorized", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "alice@example.com",
        password: "wrongPassword",
      });
      expect(res.status).toBe(401);
    });

    it("GET /auth/me with valid Bearer token should return user profile", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe("alice@example.com");
    });

    it("GET /auth/me without token should return 401 Unauthorized", async () => {
      const res = await request(app).get("/auth/me");
      expect(res.status).toBe(401);
    });
  });

  describe("Users", () => {
    it("GET /users?search=Bob should return Bob and exclude current user Alice", async () => {
      const res = await request(app)
        .get("/users?search=Bob")
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.users.some((u: any) => u.email === "bob@example.com")).toBe(true);
      expect(res.body.data.users.some((u: any) => u.email === "alice@example.com")).toBe(false);
    });
  });

  describe("Rooms and Authorization", () => {
    let testGroupId: string;

    it("POST /rooms/direct should create or retrieve a DM room", async () => {
      const res = await request(app)
        .post("/rooms/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ recipientId: bobId });
      expect(res.status).toBe(200);
      expect(res.body.data.room.type).toBe("DIRECT");
      expect(res.body.data.room.members.length).toBe(2);
    });

    it("POST /rooms should create a group room with creator as ADMIN", async () => {
      const res = await request(app)
        .post("/rooms")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          name: "Vitest Secret Group",
          memberIds: [bobId],
        });
      expect(res.status).toBe(201);
      expect(res.body.data.room.type).toBe("GROUP");
      testGroupId = res.body.data.room._id;

      const admin = res.body.data.room.members.find((m: any) => m.userId === aliceId);
      expect(admin.role).toBe("ADMIN");
    });

    it("GET /rooms/:id by a non-member should return 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/rooms/${testGroupId}`)
        .set("Authorization", `Bearer ${charlieToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain("not a member");
    });

    it("POST /rooms/:id/members by a non-admin should return 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/rooms/${testGroupId}/members`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ userId: charlieId });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Only group admins");
    });

    it("POST /rooms/:id/members by admin should succeed", async () => {
      const res = await request(app)
        .post(`/rooms/${testGroupId}/members`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: charlieId });
      expect(res.status).toBe(200);
      expect(res.body.data.room.members.length).toBe(3);
    });

    it("DELETE /rooms/:id/members/:userId allows member to leave group", async () => {
      const res = await request(app)
        .delete(`/rooms/${testGroupId}/members/${charlieId}`)
        .set("Authorization", `Bearer ${charlieToken}`);
      expect(res.status).toBe(200);

      // Verify Charlie is blocked again with 403
      const checkRes = await request(app)
        .get(`/rooms/${testGroupId}`)
        .set("Authorization", `Bearer ${charlieToken}`);
      expect(checkRes.status).toBe(403);
    });
  });

  describe("Messages and Pagination", () => {
    let testRoomId: string;
    let messageId: string;

    beforeAll(async () => {
      // Create a dedicated test room
      const roomRes = await request(app)
        .post("/rooms")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          name: "Messages Vitest Room",
          memberIds: [bobId],
        });
      testRoomId = roomRes.body.data.room._id;
    });

    it("POST /rooms/:id/messages should send a message and update lastMessage preview", async () => {
      const res = await request(app)
        .post(`/rooms/${testRoomId}/messages`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ content: "Vitest Message 1" });
      expect(res.status).toBe(201);
      expect(res.body.data.message.content).toBe("Vitest Message 1");
      expect(res.body.data.message.sender._id).toBe(aliceId);
      messageId = res.body.data.message._id;

      // Verify room lastMessage
      const roomRes = await request(app)
        .get(`/rooms/${testRoomId}`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(roomRes.body.data.room.lastMessage.content).toBe("Vitest Message 1");
    });

    it("POST /rooms/:id/messages by non-member should return 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/rooms/${testRoomId}/messages`)
        .set("Authorization", `Bearer ${charlieToken}`)
        .send({ content: "Intruder" });
      expect(res.status).toBe(403);
    });

    it("GET /rooms/:id/messages should return cursor-paginated messages newest first", async () => {
      // Send 2 more messages
      await request(app)
        .post(`/rooms/${testRoomId}/messages`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ content: "Vitest Message 2" });
      await request(app)
        .post(`/rooms/${testRoomId}/messages`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ content: "Vitest Message 3" });

      const res = await request(app)
        .get(`/rooms/${testRoomId}/messages?limit=2`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBe(2);
      expect(res.body.data.messages[0].content).toBe("Vitest Message 3");
      expect(res.body.data.hasMore).toBe(true);
      expect(res.body.data.nextCursor).toBeDefined();

      // Page 2
      const page2 = await request(app)
        .get(`/rooms/${testRoomId}/messages?cursor=${res.body.data.nextCursor}&limit=2`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(page2.status).toBe(200);
      expect(page2.body.data.messages.length).toBeGreaterThanOrEqual(1);
    });

    it("PATCH /messages/:id should allow sender to edit message", async () => {
      const res = await request(app)
        .patch(`/messages/${messageId}`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ content: "Vitest Message 1 (EDITED)" });
      expect(res.status).toBe(200);
      expect(res.body.data.message.content).toBe("Vitest Message 1 (EDITED)");
      expect(res.body.data.message.isEdited).toBe(true);
    });

    it("PATCH /messages/:id by non-sender should return 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/messages/${messageId}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ content: "Hacked" });
      expect(res.status).toBe(403);
    });

    it("DELETE /messages/:id by non-sender should return 403 Forbidden", async () => {
      const res = await request(app)
        .delete(`/messages/${messageId}`)
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(403);
    });

    it("DELETE /messages/:id by sender should delete message", async () => {
      const res = await request(app)
        .delete(`/messages/${messageId}`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Message deleted successfully");
    });

    it("POST /rooms/:id/read should update lastReadAt and reset unreadCount", async () => {
      const res = await request(app)
        .post(`/rooms/${testRoomId}/read`)
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Room marked as read");
    });
  });
});
