import http from "http";
import app from "../app";
import { connectDB } from "../config/db";
import mongoose from "mongoose";

async function testAuth() {
  await connectDB();
  const server = http.createServer(app);
  const port = 5002;

  await new Promise<void>((resolve) => server.listen(port, resolve));
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n🧪 Running Phase 2 Auth Integration Tests against ${baseUrl}...\n`);

  try {
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = "securePassword123";

    // 1. Test Registration with valid data
    console.log("1️⃣ Testing POST /auth/register (valid data)...");
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    console.log(`   Status: ${regRes.status}`);
    console.log(`   Response:`, JSON.stringify(regData));
    if (regRes.status !== 201 || !regData.data?.token || !regData.data?.user?._id) {
      throw new Error("Registration test failed");
    }
    console.log("   ✅ Registration passed!");

    // 2. Test Duplicate Registration
    console.log("\n2️⃣ Testing POST /auth/register (duplicate email)...");
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User 2",
        email: testEmail,
        password: testPassword,
      }),
    });
    const dupData = await dupRes.json();
    console.log(`   Status: ${dupRes.status}`);
    console.log(`   Response:`, JSON.stringify(dupData));
    if (dupRes.status !== 409) {
      throw new Error("Duplicate registration did not return 409");
    }
    console.log("   ✅ Duplicate registration conflict check passed!");

    // 3. Test Validation Error (Short Password)
    console.log("\n3️⃣ Testing POST /auth/register (validation failure: password < 6 chars)...");
    const valRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        email: "shortpwd@example.com",
        password: "123",
      }),
    });
    const valData = await valRes.json();
    console.log(`   Status: ${valRes.status}`);
    console.log(`   Response:`, JSON.stringify(valData));
    if (valRes.status !== 400 || !valData.errors) {
      throw new Error("Validation check did not return 400 with errors");
    }
    console.log("   ✅ Validation check passed!");

    // 4. Test Login with valid credentials
    console.log("\n4️⃣ Testing POST /auth/login (valid credentials)...");
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    console.log(`   Status: ${loginRes.status}`);
    console.log(`   Response:`, JSON.stringify(loginData));
    if (loginRes.status !== 200 || !loginData.data?.token) {
      throw new Error("Login test failed");
    }
    const token = loginData.data.token;
    console.log("   ✅ Login passed! Received JWT token.");

    // 5. Test Login with wrong password
    console.log("\n5️⃣ Testing POST /auth/login (invalid password)...");
    const wrongLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "wrongpassword",
      }),
    });
    const wrongLoginData = await wrongLoginRes.json();
    console.log(`   Status: ${wrongLoginRes.status}`);
    console.log(`   Response:`, JSON.stringify(wrongLoginData));
    if (wrongLoginRes.status !== 401) {
      throw new Error("Invalid login did not return 401");
    }
    console.log("   ✅ Invalid login check passed!");

    // 6. Test GET /auth/me with Bearer token
    console.log("\n6️⃣ Testing GET /auth/me (authenticated)...");
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    console.log(`   Status: ${meRes.status}`);
    console.log(`   Response:`, JSON.stringify(meData));
    if (meRes.status !== 200 || meData.data?.user?.email !== testEmail) {
      throw new Error("GET /auth/me failed");
    }
    console.log("   ✅ GET /auth/me passed!");

    // 7. Test GET /auth/me without token
    console.log("\n7️⃣ Testing GET /auth/me (unauthenticated, missing token)...");
    const unauthRes = await fetch(`${baseUrl}/auth/me`);
    const unauthData = await unauthRes.json();
    console.log(`   Status: ${unauthRes.status}`);
    console.log(`   Response:`, JSON.stringify(unauthData));
    if (unauthRes.status !== 401) {
      throw new Error("Unauthenticated request did not return 401");
    }
    console.log("   ✅ Unauthenticated request blocked correctly!");

    // 8. Test Also Seed Users Login (e.g. alice@example.com / password123)
    console.log("\n8️⃣ Testing POST /auth/login with seeded user (alice@example.com)...");
    const seedLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        password: "password123",
      }),
    });
    const seedLoginData = await seedLoginRes.json();
    console.log(`   Status: ${seedLoginRes.status}`);
    console.log(`   User:`, seedLoginData.data?.user?.name);
    if (seedLoginRes.status !== 200 || seedLoginData.data?.user?.email !== "alice@example.com") {
      throw new Error("Seeded user login failed");
    }
    console.log("   ✅ Seed user login verified!");

    console.log("\n🎉 ALL PHASE 2 AUTH TESTS PASSED SUCCESSFULLY! 🎉\n");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

testAuth().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
