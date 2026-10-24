import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./types";
import { socketAuthMiddleware } from "./middleware";
import { presence } from "./presence";
import { Room } from "../models";
import { MessageService } from "../services/messageService";

export type AppSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function initSocketServer(httpServer: http.Server): AppSocketServer {
  const io: AppSocketServer = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.clientUrl, "http://localhost:3000"],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Attach handshake authentication
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    const user = socket.data.user;
    const userId = user.userId;
    logger.info({ socketId: socket.id, userId, name: user.name }, "Socket connected");

    // Per-socket message rate limiting tracking
    const messageTimestamps: number[] = [];
    const MAX_SOCKET_MESSAGES = 25;
    const WINDOW_MS = 10000; // 10 seconds

    // 1. Manage presence
    const wentOnline = presence.addUserSocket(userId, socket.id);
    if (wentOnline) {
      io.emit("presence:update", {
        userId,
        status: "ONLINE",
      });
    }

    // Send the current list of online users to the newly connected socket
    socket.emit("presence:update", {
      userId,
      status: "ONLINE",
      onlineUsers: presence.getOnlineUserIds(),
    });

    // 2. Auto-join user's private notification channel
    socket.join(`user:${userId}`);

    // 3. Auto-join all of the user's rooms
    try {
      const userRooms = await Room.find({ "members.userId": userId }).select("_id");
      userRooms.forEach((r) => {
        socket.join(r._id.toString());
      });
      logger.debug(
        { userId, roomCount: userRooms.length },
        "Auto-joined user rooms"
      );
      socket.emit("ready", { rooms: userRooms.map((r) => r._id.toString()) });
    } catch (err) {
      logger.error(err, "Failed to auto-join rooms for user");
      socket.emit("ready", { rooms: [] });
    }

    // 4. Handle client-initiated room join
    socket.on("room:join", async ({ roomId }, callback) => {
      try {
        if (!roomId || !mongoose.isValidObjectId(roomId)) {
          if (typeof callback === "function") {
            callback({ status: "fail", message: "Invalid room ID" });
          }
          return;
        }

        const room = await Room.findById(roomId);
        if (!room) {
          if (typeof callback === "function") {
            callback({ status: "fail", message: "Room not found" });
          }
          return;
        }

        const isMember = room.members.some((m) => m.userId.toString() === userId);
        if (!isMember) {
          if (typeof callback === "function") {
            callback({ status: "fail", message: "Forbidden: You are not a member of this room" });
          }
          return;
        }

        socket.join(roomId);
        if (typeof callback === "function") {
          callback({ status: "success", message: `Joined room ${roomId}` });
        }
      } catch (err: any) {
        if (typeof callback === "function") {
          callback({ status: "fail", message: err.message || "Failed to join room" });
        }
      }
    });

    // 5. Handle client-initiated room leave
    socket.on("room:leave", ({ roomId }, callback) => {
      socket.leave(roomId);
      if (typeof callback === "function") {
        callback({ status: "success", message: `Left room ${roomId}` });
      }
    });

    // 6. Handle message:send event with rate limiting & validation
    socket.on("message:send", async ({ roomId, content }, callback) => {
      try {
        // Enforce socket rate limit
        const now = Date.now();
        while (messageTimestamps.length > 0 && messageTimestamps[0]! < now - WINDOW_MS) {
          messageTimestamps.shift();
        }
        if (messageTimestamps.length >= MAX_SOCKET_MESSAGES) {
          if (typeof callback === "function") {
            callback({
              status: "fail",
              error: "Rate limit exceeded: You are sending messages too quickly.",
            });
          }
          return;
        }
        messageTimestamps.push(now);

        // Validation
        if (!roomId || !mongoose.isValidObjectId(roomId)) {
          if (typeof callback === "function") {
            callback({ status: "fail", error: "Invalid room ID format" });
          }
          return;
        }

        const trimmed = (content || "").trim();
        if (!trimmed) {
          if (typeof callback === "function") {
            callback({ status: "fail", error: "Message content cannot be empty" });
          }
          return;
        }

        if (trimmed.length > 4000) {
          if (typeof callback === "function") {
            callback({ status: "fail", error: "Message content cannot exceed 4000 characters" });
          }
          return;
        }

        // Persist message to DB (enforces membership & updates room.lastMessage)
        const savedMessage = await MessageService.sendMessage(roomId, userId, trimmed);

        // Broadcast to all sockets in the room (including sender)
        io.to(roomId).emit("message:new", savedMessage);

        // Acknowledge sender
        if (typeof callback === "function") {
          callback({ status: "success", data: { message: savedMessage } });
        }
      } catch (err: any) {
        if (typeof callback === "function") {
          callback({
            status: "fail",
            error: err.message || "Failed to send message",
          });
        }
      }
    });

    // 7. Handle typing:start with membership authorization check
    socket.on("typing:start", async ({ roomId }) => {
      if (!roomId || !mongoose.isValidObjectId(roomId)) return;
      try {
        const room = await Room.findById(roomId);
        if (!room) return;
        const isMember = room.members.some((m) => m.userId.toString() === userId);
        if (!isMember) return;

        socket.to(roomId).emit("typing:update", {
          roomId,
          userId,
          userName: user.name,
          isTyping: true,
        });
      } catch (err) {
        logger.error(err, "typing:start error");
      }
    });

    // 8. Handle typing:stop with membership authorization check
    socket.on("typing:stop", async ({ roomId }) => {
      if (!roomId || !mongoose.isValidObjectId(roomId)) return;
      try {
        const room = await Room.findById(roomId);
        if (!room) return;
        const isMember = room.members.some((m) => m.userId.toString() === userId);
        if (!isMember) return;

        socket.to(roomId).emit("typing:update", {
          roomId,
          userId,
          userName: user.name,
          isTyping: false,
        });
      } catch (err) {
        logger.error(err, "typing:stop error");
      }
    });

    // 9. Handle disconnect
    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id, userId, name: user.name }, "Socket disconnected");
      const wentOffline = presence.removeUserSocket(userId, socket.id);
      if (wentOffline) {
        io.emit("presence:update", {
          userId,
          status: "OFFLINE",
        });
      }
    });
  });

  return io;
}
