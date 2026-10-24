import { Socket } from "socket.io";
import { verifyToken, TokenPayload } from "../utils/jwt";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./types";

type CustomSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function socketAuthMiddleware(
  socket: CustomSocket,
  next: (err?: Error) => void
): void {
  try {
    const rawAuth =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization;

    if (!rawAuth || typeof rawAuth !== "string") {
      return next(new Error("Authentication error: Token missing"));
    }

    const token = rawAuth.startsWith("Bearer ")
      ? rawAuth.slice(7).trim()
      : rawAuth.trim();

    if (!token) {
      return next(new Error("Authentication error: Token empty"));
    }

    const decoded = verifyToken(token);
    socket.data.user = decoded;
    next();
  } catch (err: any) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
}
