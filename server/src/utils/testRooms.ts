import http from "http";
import app from "../app";
import { connectDB } from "../config/db";
import mongoose from "mongoose";

async function testRooms() {
  await connectDB();
  const server = http.createServer(app);
  const port = 5003;

  await new Promise<void>((resolve) => server.listen(port, resolve));
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n🧪 Running Phase 3 Rooms Integration Tests against ${baseUrl}...\n`);

  try {
    // 0. Login as Alice, Bob, and Charlie
    console.log("0️⃣ Logging in test users (Alice, Bob, Charlie)...");
    const loginUser = async (email: string) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Login failed for ${email}`);
      return { token: data.data.token, user: data.data.user };
    };

    const alice = await loginUser("alice@example.com");
    const bob = await loginUser("bob@example.com");
    const charlie = await loginUser("charlie@example.com");

    console.log(`   Alice ID: ${alice.user._id}`);
    console.log(`   Bob ID: ${bob.user._id}`);
    console.log(`   Charlie ID: ${charlie.user._id}`);

    // 1. Test GET /users?search=
    console.log("\n1️⃣ Testing GET /users?search=Bob (Alice searching for Bob)...");
    const searchRes = await fetch(`${baseUrl}/users?search=Bob`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const searchData = await searchRes.json();
    console.log(`   Status: ${searchRes.status}, Found: ${searchData.data?.users?.length} user(s)`);
    if (searchRes.status !== 200 || !searchData.data.users.some((u: any) => u.email === "bob@example.com")) {
      throw new Error("Search users failed to find Bob");
    }
    // Verify Alice is excluded from search results
    if (searchData.data.users.some((u: any) => u.email === "alice@example.com")) {
      throw new Error("Current user was not excluded from search results");
    }
    console.log("   ✅ User search passed!");

    // 2. Test POST /rooms/direct (Alice creates DM with Charlie)
    console.log("\n2️⃣ Testing POST /rooms/direct (Alice starts DM with Charlie)...");
    const dmRes = await fetch(`${baseUrl}/rooms/direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({ recipientId: charlie.user._id }),
    });
    const dmData = await dmRes.json();
    console.log(`   Status: ${dmRes.status}, Room ID: ${dmData.data?.room?._id}`);
    if (dmRes.status !== 200 || dmData.data?.room?.type !== "DIRECT") {
      throw new Error("Direct room creation failed");
    }
    const dmRoomId = dmData.data.room._id;
    console.log("   ✅ Direct room created successfully!");

    // 3. Test Direct Room Idempotency (calling again returns existing room)
    console.log("\n3️⃣ Testing POST /rooms/direct idempotency (Charlie starts DM with Alice)...");
    const dmRes2 = await fetch(`${baseUrl}/rooms/direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${charlie.token}`,
      },
      body: JSON.stringify({ recipientId: alice.user._id }),
    });
    const dmData2 = await dmRes2.json();
    console.log(`   Status: ${dmRes2.status}, Room ID: ${dmData2.data?.room?._id}`);
    if (dmData2.data?.room?._id !== dmRoomId) {
      throw new Error("Direct room duplicate was created instead of returning existing!");
    }
    console.log("   ✅ Direct room idempotency check passed (no duplicate DM)!");

    // 4. Test POST /rooms (Create Group: Alice creates 'Dev Team' with Bob)
    console.log("\n4️⃣ Testing POST /rooms (Alice creates group 'Dev Team' with Bob)...");
    const groupRes = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({
        name: "Dev Team",
        memberIds: [bob.user._id],
      }),
    });
    const groupData = await groupRes.json();
    console.log(`   Status: ${groupRes.status}, Group ID: ${groupData.data?.room?._id}`);
    if (groupRes.status !== 201 || groupData.data?.room?.type !== "GROUP") {
      throw new Error("Group creation failed");
    }
    const groupId = groupData.data.room._id;
    const adminMember = groupData.data.room.members.find((m: any) => m.userId === alice.user._id);
    if (adminMember?.role !== "ADMIN") {
      throw new Error("Creator is not set as ADMIN");
    }
    console.log("   ✅ Group room created with creator as ADMIN!");

    // 5. Test GET /rooms (Alice views her rooms)
    console.log("\n5️⃣ Testing GET /rooms (Alice retrieving her rooms)...");
    const roomsRes = await fetch(`${baseUrl}/rooms`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const roomsData = await roomsRes.json();
    console.log(`   Status: ${roomsRes.status}, Rooms count: ${roomsData.data?.rooms?.length}`);
    if (roomsRes.status !== 200 || !Array.isArray(roomsData.data?.rooms)) {
      throw new Error("GET /rooms failed");
    }
    console.log("   ✅ GET /rooms retrieved successfully with unread counts!");

    // 6. Test GET /rooms/:id (Authorized member access)
    console.log("\n6️⃣ Testing GET /rooms/:id (Alice accesses 'Dev Team')...");
    const getGroupRes = await fetch(`${baseUrl}/rooms/${groupId}`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    console.log(`   Status: ${getGroupRes.status}`);
    if (getGroupRes.status !== 200) throw new Error("Alice could not access room");
    console.log("   ✅ Member access granted!");

    // 7. Test Non-member GET /rooms/:id -> 403 Forbidden!
    console.log("\n7️⃣ Testing GET /rooms/:id (Non-member Charlie attempts to access 'Dev Team')...");
    const forbiddenRes = await fetch(`${baseUrl}/rooms/${groupId}`, {
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    const forbiddenData = await forbiddenRes.json();
    console.log(`   Status: ${forbiddenRes.status}`);
    console.log(`   Response:`, JSON.stringify(forbiddenData));
    if (forbiddenRes.status !== 403) {
      throw new Error("Non-member was NOT blocked with 403!");
    }
    console.log("   ✅ Non-member correctly blocked with 403 Forbidden!");

    // 8. Test POST /rooms/:id/members (Admin Alice adds Charlie to 'Dev Team')
    console.log("\n8️⃣ Testing POST /rooms/:id/members (Admin Alice adds Charlie)...");
    const addMemberRes = await fetch(`${baseUrl}/rooms/${groupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({ userId: charlie.user._id }),
    });
    const addMemberData = await addMemberRes.json();
    console.log(`   Status: ${addMemberRes.status}, Members: ${addMemberData.data?.room?.members?.length}`);
    if (addMemberRes.status !== 200 || addMemberData.data?.room?.members?.length !== 3) {
      throw new Error("Failed to add Charlie to group");
    }
    console.log("   ✅ Member added by admin successfully!");

    // 9. Test Charlie now can access the room -> 200 OK
    console.log("\n9️⃣ Testing GET /rooms/:id (Charlie now accesses 'Dev Team')...");
    const charlieAccessRes = await fetch(`${baseUrl}/rooms/${groupId}`, {
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    console.log(`   Status: ${charlieAccessRes.status}`);
    if (charlieAccessRes.status !== 200) throw new Error("Charlie should now be able to access room");
    console.log("   ✅ Newly added member can now access room!");

    // 10. Test Non-admin Bob attempts to add member -> 403 Forbidden
    console.log("\n🔟 Testing POST /rooms/:id/members (Non-admin Bob attempts to add member)...");
    const bobAddRes = await fetch(`${baseUrl}/rooms/${groupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bob.token}`,
      },
      body: JSON.stringify({ userId: charlie.user._id }),
    });
    console.log(`   Status: ${bobAddRes.status}`);
    if (bobAddRes.status !== 403) {
      throw new Error("Non-admin was not blocked from adding members!");
    }
    console.log("   ✅ Non-admin blocked with 403 from adding members!");

    // 11. Test DELETE /rooms/:id/members/:userId (Charlie leaves the group)
    console.log("\n1️⃣1️⃣ Testing DELETE /rooms/:id/members/:userId (Charlie leaves the group)...");
    const leaveRes = await fetch(`${baseUrl}/rooms/${groupId}/members/${charlie.user._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    const leaveData = await leaveRes.json();
    console.log(`   Status: ${leaveRes.status}, Response:`, JSON.stringify(leaveData));
    if (leaveRes.status !== 200) {
      throw new Error("Charlie failed to leave group");
    }
    console.log("   ✅ Member left group successfully!");

    // 12. Test Charlie is once again blocked with 403
    console.log("\n1️⃣2️⃣ Testing GET /rooms/:id after leaving (Charlie blocked again)...");
    const charlieBlockedAgain = await fetch(`${baseUrl}/rooms/${groupId}`, {
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    console.log(`   Status: ${charlieBlockedAgain.status}`);
    if (charlieBlockedAgain.status !== 403) {
      throw new Error("Charlie was not blocked after leaving!");
    }
    console.log("   ✅ Former member correctly blocked with 403!");

    console.log("\n🎉 ALL PHASE 3 ROOMS & MEMBERS TESTS PASSED SUCCESSFULLY! 🎉\n");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

testRooms().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
