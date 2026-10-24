import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import { User, Room, Message } from "../models";

function getDirectKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("_");
}

async function seed() {
  try {
    console.log("🌱 Starting database seeding...");
    await connectDB();

    // Ensure models are registered and sync indexes
    await User.syncIndexes();
    await Room.syncIndexes();
    await Message.syncIndexes();

    console.log("🧹 Clearing old data...");
    await Message.deleteMany({});
    await Room.deleteMany({});
    await User.deleteMany({});

    console.log("👤 Creating test users...");
    const defaultPassword = "password123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const users = await User.create([
      {
        name: "Alice Johnson",
        email: "alice@example.com",
        passwordHash,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
      },
      {
        name: "Bob Smith",
        email: "bob@example.com",
        passwordHash,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
      },
      {
        name: "Charlie Brown",
        email: "charlie@example.com",
        passwordHash,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
      },
    ]);

    const [alice, bob, charlie] = users;
    if (!alice || !bob || !charlie) {
      throw new Error("Failed to create all seed users");
    }
    console.log(`Created ${users.length} users:`);
    users.forEach((u) => console.log(`  - ${u.name} (${u.email}) [ID: ${u._id}]`));

    console.log("\n💬 Creating rooms...");
    // 1. Direct message room between Alice and Bob
    const directKey = getDirectKey(alice._id.toString(), bob._id.toString());
    const dmRoom = await Room.create({
      type: "DIRECT",
      directKey,
      members: [
        { userId: alice._id, role: "MEMBER", lastReadAt: new Date() },
        { userId: bob._id, role: "MEMBER", lastReadAt: new Date() },
      ],
    });

    // 2. Group room with Alice (ADMIN), Bob (MEMBER), Charlie (MEMBER)
    const groupRoom = await Room.create({
      type: "GROUP",
      name: "General Chat",
      members: [
        { userId: alice._id, role: "ADMIN", lastReadAt: new Date() },
        { userId: bob._id, role: "MEMBER", lastReadAt: new Date() },
        { userId: charlie._id, role: "MEMBER", lastReadAt: new Date() },
      ],
    });

    console.log("Created 2 rooms:");
    console.log(`  - DM Room ID: ${dmRoom._id} (key: ${dmRoom.directKey})`);
    console.log(`  - Group Room ID: ${groupRoom._id} (name: ${groupRoom.name})`);

    console.log("\n✉️ Creating seed messages...");
    // Messages in DM Room
    const dmMsg1 = await Message.create({
      roomId: dmRoom._id,
      senderId: alice._id,
      content: "Hey Bob! How are you doing?",
      createdAt: new Date(Date.now() - 60000 * 5),
    });

    const dmMsg2 = await Message.create({
      roomId: dmRoom._id,
      senderId: bob._id,
      content: "Hey Alice, all good! Ready to build this chat app.",
      createdAt: new Date(),
    });

    dmRoom.lastMessage = {
      messageId: dmMsg2._id,
      senderId: bob._id,
      content: dmMsg2.content,
      createdAt: dmMsg2.createdAt,
    };
    await dmRoom.save();

    // Messages in Group Room
    const grpMsg1 = await Message.create({
      roomId: groupRoom._id,
      senderId: alice._id,
      content: "Welcome everyone to the General Chat room!",
      createdAt: new Date(Date.now() - 60000 * 10),
    });

    const grpMsg2 = await Message.create({
      roomId: groupRoom._id,
      senderId: charlie._id,
      content: "Excited to be here!",
      createdAt: new Date(),
    });

    groupRoom.lastMessage = {
      messageId: grpMsg2._id,
      senderId: charlie._id,
      content: grpMsg2.content,
      createdAt: grpMsg2.createdAt,
    };
    await groupRoom.save();

    console.log("\n📋 Verifying collection indexes in MongoDB:");
    const userIndexes = await User.collection.indexes();
    console.log("User indexes:", userIndexes.map((idx) => idx.name));

    const roomIndexes = await Room.collection.indexes();
    console.log("Room indexes:", roomIndexes.map((idx) => idx.name));

    const messageIndexes = await Message.collection.indexes();
    console.log("Message indexes:", messageIndexes.map((idx) => idx.name));

    console.log("\n✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seed();
