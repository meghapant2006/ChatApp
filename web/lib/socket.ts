import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "https://chatapp-bhua.onrender.com"
    : "http://localhost:5000");

let socketInstance: Socket | null = null;

export function getSocket(token?: string): Socket | null {
  if (typeof window === "undefined") return null;

  const authToken = token || localStorage.getItem("chatly_token");
  if (!authToken) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      auth: { token: authToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  } else {
    socketInstance.auth = { token: authToken };
    socketInstance.connect();
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
