import http from "http";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import app from "../app";
import { connectDB } from "../config/db";
import { initSocketServer } from "../sockets";
import { Message, Room } from "../models";
import mongoose from "mongoose";

async function testSockets() {
  await connectDB();
  const server = http.createServer(app);
  initSocketServer(server);

  const port = 5005;
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n🧪 Running Phase 5 Socket.IO Real-Time Integration Tests against ${baseUrl}...\n`);

  let aliceSocket: ClientSocket | null = null;
  let bobSocket: ClientSocket | null = null;
  let charlieSocket: ClientSocket | null = null;

  try {
    // 0. Login users via REST to obtain JWT tokens
    console.log("0️⃣ Obtaining JWT tokens for Alice, Bob, and Charlie...");
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

    // Create a dedicated direct room between Alice and Bob
    const roomRes = await fetch(`${baseUrl}/rooms/direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({ recipientId: bob.user._id }),
    });
    const roomData = await roomRes.json();
    const roomId = roomData.data?.room?._id;
    console.log(`   Direct Room ID: ${roomId}`);

    // 1. Test Handshake Authentication Rejection (Missing Token)
    console.log("\n1️⃣ Testing Socket Handshake Authentication (Missing Token)...");
    const rejectedSocket = ioClient(baseUrl, {
      transports: ["websocket"],
      reconnection: false,
    });

    const authFailed = await new Promise<boolean>((resolve) => {
      rejectedSocket.on("connect_error", (err) => {
        console.log(`   Rejected correctly with error: ${err.message}`);
        resolve(true);
      });
      rejectedSocket.on("connect", () => resolve(false));
    });
    rejectedSocket.disconnect();
    if (!authFailed) throw new Error("Socket connected without token when it should fail!");
    console.log("   ✅ Unauthenticated handshake rejected!");

    // Helper to connect and wait for 'ready' event
    const connectUserSocket = (token: string, name: string): Promise<ClientSocket> => {
      const s = ioClient(baseUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnection: false,
      });

      return new Promise<ClientSocket>((resolve, reject) => {
        s.on("ready", () => {
          console.log(`   ${name} connected and ready! (Socket ID: ${s.id})`);
          resolve(s);
        });
        s.on("connect_error", (err) => reject(err));
      });
    };

    // 2. Connect Alice
    console.log("\n2️⃣ Connecting Alice...");
    aliceSocket = await connectUserSocket(alice.token, "Alice");

    // Set up presence listener on Alice for Bob's online event
    const bobPresencePromise = new Promise<{ userId: string; status: string }>((resolve) => {
      aliceSocket!.on("presence:update", (data) => {
        if (data.userId === bob.user._id && data.status === "ONLINE") {
          resolve(data);
        }
      });
    });

    // Connect Bob
    console.log("   Connecting Bob...");
    bobSocket = await connectUserSocket(bob.token, "Bob");

    // 3. Verify Presence Update
    console.log("\n3️⃣ Testing Presence Updates...");
    const presenceData = await bobPresencePromise;
    console.log(`   Alice received presence update for Bob: ${presenceData.status}`);
    if (presenceData.status !== "ONLINE") throw new Error("Presence update failed");
    console.log("   ✅ Presence update broadcast received!");

    // Ensure both sockets are explicitly in roomId if room was created just now
    await new Promise<void>((res) => aliceSocket!.emit("room:join", { roomId }, () => res()));
    await new Promise<void>((res) => bobSocket!.emit("room:join", { roomId }, () => res()));

    // 4. Test Typing Indicators
    console.log("\n4️⃣ Testing Typing Indicators (Alice types, Bob listens)...");
    const bobTypingPromise = new Promise<{ userId: string; isTyping: boolean }>((resolve) => {
      bobSocket!.on("typing:update", (data) => {
        if (data.roomId === roomId && data.userId === alice.user._id) {
          resolve(data);
        }
      });
    });

    aliceSocket.emit("typing:start", { roomId });
    const typingData = await bobTypingPromise;
    console.log(`   Bob received typing status from Alice: isTyping = ${typingData.isTyping}`);
    if (!typingData.isTyping) throw new Error("Typing start indicator failed");
    console.log("   ✅ Typing indicator broadcast verified!");

    // 5. Test Live Message Exchange & Acknowledgements
    console.log("\n5️⃣ Testing Live Message Exchange (Alice sends, Bob receives, DB persists)...");
    const testContent = `Real-time message at ${Date.now()}`;

    // Bob listens for message:new
    const bobReceivedMessagePromise = new Promise<any>((resolve) => {
      bobSocket!.on("message:new", (msg) => {
        if (msg.roomId === roomId && msg.content === testContent) {
          resolve(msg);
        }
      });
    });

    // Alice sends message:send with acknowledgement
    const ackResponse = await new Promise<any>((resolve) => {
      aliceSocket!.emit("message:send", { roomId, content: testContent }, (res: any) => {
        resolve(res);
      });
    });

    console.log(`   Alice acknowledgement response:`, JSON.stringify(ackResponse));
    if (ackResponse.status !== "success" || !ackResponse.data?.message?._id) {
      throw new Error("Message acknowledgement failed");
    }

    const receivedByBob = await bobReceivedMessagePromise;
    console.log(`   Bob received message:new: "${receivedByBob.content}" from ${receivedByBob.sender?.name}`);
    if (receivedByBob.content !== testContent || receivedByBob.sender?._id !== alice.user._id) {
      throw new Error("Bob did not receive expected message");
    }
    console.log("   ✅ Real-time message exchange and acknowledgement passed!");

    // 6. Verify Database Persistence of Socket Message
    console.log("\n6️⃣ Verifying MongoDB persistence of the socket message...");
    const persistedMsg = await Message.findById(ackResponse.data.message._id);
    if (!persistedMsg || persistedMsg.content !== testContent) {
      throw new Error("Message was not persisted in MongoDB!");
    }
    const persistedRoom = await Room.findById(roomId);
    if (persistedRoom?.lastMessage?.content !== testContent) {
      throw new Error("Room lastMessage was not updated in MongoDB!");
    }
    console.log("   ✅ Message verified in MongoDB and room lastMessage preview updated!");

    // 7. Test Non-member Socket Authorization Check
    console.log("\n7️⃣ Testing Non-member message:send rejection...");
    charlieSocket = await connectUserSocket(charlie.token, "Charlie");

    const charlieAck = await new Promise<any>((resolve) => {
      charlieSocket!.emit(
        "message:send",
        { roomId, content: "Intruder attempting to chat!" },
        (res: any) => resolve(res)
      );
    });
    console.log(`   Charlie acknowledgement:`, JSON.stringify(charlieAck));
    if (charlieAck.status !== "fail") {
      throw new Error("Non-member socket message was not rejected!");
    }
    console.log("   ✅ Non-member socket message blocked correctly!");

    // 8. Test Offline Presence Broadcast on Disconnect
    console.log("\n8️⃣ Testing Offline Presence on Disconnect...");
    const bobOfflinePromise = new Promise<{ userId: string; status: string }>((resolve) => {
      aliceSocket!.on("presence:update", (data) => {
        if (data.userId === bob.user._id && data.status === "OFFLINE") {
          resolve(data);
        }
      });
    });

    bobSocket.disconnect();
    const offlineData = await bobOfflinePromise;
    console.log(`   Alice received offline presence update for Bob: ${offlineData.status}`);
    if (offlineData.status !== "OFFLINE") throw new Error("Offline presence update failed");
    console.log("   ✅ Offline presence update broadcast verified!");

    console.log("\n🎉 ALL PHASE 5 SOCKET.IO TESTS PASSED SUCCESSFULLY! 🎉\n");
  } finally {
    if (aliceSocket) aliceSocket.disconnect();
    if (bobSocket) bobSocket.disconnect();
    if (charlieSocket) charlieSocket.disconnect();
    server.close();
    await mongoose.disconnect();
  }
}

testSockets().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
