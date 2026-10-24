import { TokenPayload } from "../utils/jwt";
import { FormattedMessage } from "../services/messageService";

export interface ServerToClientEvents {
  "message:new": (message: FormattedMessage) => void;
  "typing:update": (data: {
    roomId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  }) => void;
  "presence:update": (data: {
    userId: string;
    status: "ONLINE" | "OFFLINE";
    onlineUsers?: string[];
  }) => void;
  ready: (data: { rooms: string[] }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "room:join": (
    data: { roomId: string },
    callback?: (response: { status: "success" | "fail"; message?: string }) => void
  ) => void;
  "room:leave": (
    data: { roomId: string },
    callback?: (response: { status: "success" | "fail"; message?: string }) => void
  ) => void;
  "message:send": (
    data: { roomId: string; content: string },
    callback?: (response: {
      status: "success" | "fail";
      data?: { message: FormattedMessage };
      error?: string;
    }) => void
  ) => void;
  "typing:start": (data: { roomId: string }) => void;
  "typing:stop": (data: { roomId: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user: TokenPayload;
}
