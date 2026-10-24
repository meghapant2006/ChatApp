import http from "http";
import app from "../app";
import { connectDB } from "../config/db";
import mongoose from "mongoose";

async function testMessages() {
  await connectDB();
  const server = http.createServer(app);
  const port = 5004;

  await new Promise<void>((resolve) => server.listen(port, resolve));
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n🧪 Running Phase 4 Messages REST Integration Tests against ${baseUrl}...\n`);

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

    // 1. Create a fresh test group room between Alice and Bob
    console.log("1️⃣ Setting up test room between Alice and Bob...");
    const roomRes = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({
        name: "Pagination Test Room",
        memberIds: [bob.user._id],
      }),
    });
    const roomData = await roomRes.json();
    const roomId = roomData.data?.room?._id;
    if (!roomId) throw new Error("Failed to create test room");
    console.log(`   Room created with ID: ${roomId}`);

    // 2. Alice sends a message (POST /rooms/:id/messages)
    console.log("\n2️⃣ Testing POST /rooms/:id/messages (Alice sends message)...");
    const sendRes = await fetch(`${baseUrl}/rooms/${roomId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({ content: "Hello Bob! Testing messages API." }),
    });
    const sendData = await sendRes.json();
    console.log(`   Status: ${sendRes.status}, Message ID: ${sendData.data?.message?._id}`);
    if (sendRes.status !== 201 || !sendData.data?.message?._id) {
      throw new Error("Alice failed to send message");
    }
    const msg1Id = sendData.data.message._id;
    console.log("   ✅ Message sent successfully!");

    // 3. Non-member Charlie tries to send message -> 403 Forbidden
    console.log("\n3️⃣ Testing POST /rooms/:id/messages (Non-member Charlie attempts to send)...");
    const charlieSendRes = await fetch(`${baseUrl}/rooms/${roomId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${charlie.token}`,
      },
      body: JSON.stringify({ content: "I shouldn't be here!" }),
    });
    console.log(`   Status: ${charlieSendRes.status}`);
    if (charlieSendRes.status !== 403) {
      throw new Error("Non-member was not blocked with 403 from sending messages!");
    }
    console.log("   ✅ Non-member blocked with 403 Forbidden!");

    // 4. Non-member Charlie tries to read messages -> 403 Forbidden
    console.log("\n4️⃣ Testing GET /rooms/:id/messages (Non-member Charlie attempts to read)...");
    const charlieReadRes = await fetch(`${baseUrl}/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${charlie.token}` },
    });
    console.log(`   Status: ${charlieReadRes.status}`);
    if (charlieReadRes.status !== 403) {
      throw new Error("Non-member was not blocked with 403 from reading messages!");
    }
    console.log("   ✅ Non-member blocked with 403 Forbidden from reading messages!");

    // 5. Test Cursor Pagination (Send 5 sequential messages and page through them)
    console.log("\n5️⃣ Testing Cursor-based pagination...");
    const sentContents = [
      "Message 1 - First",
      "Message 2 - Second",
      "Message 3 - Third",
      "Message 4 - Fourth",
      "Message 5 - Fifth",
    ];

    for (const text of sentContents) {
      await fetch(`${baseUrl}/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bob.token}`,
        },
        body: JSON.stringify({ content: text }),
      });
    }

    // Page 1: limit = 2
    console.log("   Fetching Page 1 (limit=2)...");
    const p1Res = await fetch(`${baseUrl}/rooms/${roomId}/messages?limit=2`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const p1Data = await p1Res.json();
    console.log(`   Page 1 count: ${p1Data.data.messages.length}, hasMore: ${p1Data.data.hasMore}, nextCursor: ${p1Data.data.nextCursor}`);
    if (p1Data.data.messages.length !== 2 || !p1Data.data.hasMore || !p1Data.data.nextCursor) {
      throw new Error("Pagination Page 1 failed");
    }
    if (p1Data.data.messages[0].content !== "Message 5 - Fifth") {
      throw new Error(`Expected newest message 'Message 5 - Fifth', got '${p1Data.data.messages[0].content}'`);
    }

    // Page 2: cursor = p1.nextCursor, limit = 2
    console.log("   Fetching Page 2 (cursor=p1.nextCursor, limit=2)...");
    const p2Res = await fetch(
      `${baseUrl}/rooms/${roomId}/messages?cursor=${p1Data.data.nextCursor}&limit=2`,
      { headers: { Authorization: `Bearer ${alice.token}` } }
    );
    const p2Data = await p2Res.json();
    console.log(`   Page 2 count: ${p2Data.data.messages.length}, hasMore: ${p2Data.data.hasMore}, nextCursor: ${p2Data.data.nextCursor}`);
    if (p2Data.data.messages.length !== 2 || !p2Data.data.hasMore) {
      throw new Error("Pagination Page 2 failed");
    }
    if (p2Data.data.messages[0].content !== "Message 3 - Third") {
      throw new Error(`Expected 'Message 3 - Third', got '${p2Data.data.messages[0].content}'`);
    }

    // Page 3: cursor = p2.nextCursor, limit = 2
    console.log("   Fetching Page 3 (cursor=p2.nextCursor, limit=2)...");
    const p3Res = await fetch(
      `${baseUrl}/rooms/${roomId}/messages?cursor=${p2Data.data.nextCursor}&limit=2`,
      { headers: { Authorization: `Bearer ${alice.token}` } }
    );
    const p3Data = await p3Res.json();
    console.log(`   Page 3 count: ${p3Data.data.messages.length}, hasMore: ${p3Data.data.hasMore}, nextCursor: ${p3Data.data.nextCursor}`);
    // Remaining messages include Message 1 and initial hello msg
    if (p3Data.data.messages.length !== 2) {
      throw new Error("Pagination Page 3 failed");
    }

    console.log("   ✅ Cursor pagination (newest-first ordering) verified successfully!");

    // 6. Test PATCH /messages/:id (Edit message)
    console.log("\n6️⃣ Testing PATCH /messages/:id (Message editing)...");
    // Bob tries to edit Alice's message -> 403 Forbidden
    const bobEditRes = await fetch(`${baseUrl}/messages/${msg1Id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bob.token}`,
      },
      body: JSON.stringify({ content: "Bob trying to hack Alice's message" }),
    });
    console.log(`   Bob edit status: ${bobEditRes.status}`);
    if (bobEditRes.status !== 403) {
      throw new Error("Non-sender was not blocked with 403 from editing message!");
    }

    // Alice edits her own message -> 200 OK
    const aliceEditRes = await fetch(`${baseUrl}/messages/${msg1Id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({ content: "Hello Bob! [EDITED BY ALICE]" }),
    });
    const aliceEditData = await aliceEditRes.json();
    console.log(`   Alice edit status: ${aliceEditRes.status}`);
    if (aliceEditRes.status !== 200 || !aliceEditData.data?.message?.isEdited) {
      throw new Error("Sender edit message failed");
    }
    console.log("   ✅ Message editing permissions & flag verified!");

    // 7. Test DELETE /messages/:id (Delete message)
    console.log("\n7️⃣ Testing DELETE /messages/:id (Message deletion)...");
    // Bob tries to delete Alice's message -> 403 Forbidden
    const bobDelRes = await fetch(`${baseUrl}/messages/${msg1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    console.log(`   Bob delete status: ${bobDelRes.status}`);
    if (bobDelRes.status !== 403) {
      throw new Error("Non-sender was not blocked from deleting message!");
    }

    // Alice deletes her own message -> 200 OK
    const aliceDelRes = await fetch(`${baseUrl}/messages/${msg1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    console.log(`   Alice delete status: ${aliceDelRes.status}`);
    if (aliceDelRes.status !== 200) {
      throw new Error("Alice failed to delete own message");
    }
    console.log("   ✅ Message deletion permissions verified!");

    // 8. Test POST /rooms/:id/read (Unread count and mark-as-read)
    console.log("\n8️⃣ Testing POST /rooms/:id/read & unread count updates...");
    // Alice sends a new message to Bob
    await fetch(`${baseUrl}/rooms/${roomId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({ content: "Unread counter test message!" }),
    });

    // Check Bob's rooms -> should have unreadCount >= 1
    const bobRoomsRes1 = await fetch(`${baseUrl}/rooms`, {
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    const bobRoomsData1 = await bobRoomsRes1.json();
    const bobRoomBefore = bobRoomsData1.data?.rooms?.find((r: any) => r._id === roomId);
    console.log(`   Bob's unreadCount before mark-as-read: ${bobRoomBefore?.unreadCount}`);
    if (!bobRoomBefore || bobRoomBefore.unreadCount < 1) {
      throw new Error("Unread counter was not incremented for Bob!");
    }

    // Bob marks room as read
    const readRes = await fetch(`${baseUrl}/rooms/${roomId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    console.log(`   Mark as read status: ${readRes.status}`);
    if (readRes.status !== 200) throw new Error("POST /rooms/:id/read failed");

    // Check Bob's rooms again -> should have unreadCount === 0
    const bobRoomsRes2 = await fetch(`${baseUrl}/rooms`, {
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    const bobRoomsData2 = await bobRoomsRes2.json();
    const bobRoomAfter = bobRoomsData2.data?.rooms?.find((r: any) => r._id === roomId);
    console.log(`   Bob's unreadCount after mark-as-read: ${bobRoomAfter?.unreadCount}`);
    if (!bobRoomAfter || bobRoomAfter.unreadCount !== 0) {
      throw new Error("Unread counter was not reset to 0 after marking as read!");
    }
    console.log("   ✅ Read receipts and unread counters verified successfully!");

    console.log("\n🎉 ALL PHASE 4 MESSAGES REST TESTS PASSED SUCCESSFULLY! 🎉\n");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

testMessages().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
