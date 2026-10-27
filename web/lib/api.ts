import { User, Room, Message } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("chatly_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...options, headers });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data?.data !== undefined ? data.data : data;
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  async register(userData: { name: string; email: string; password: string; avatarUrl?: string }): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>("/api/auth/me");
  },

  // Users
  async searchUsers(query?: string): Promise<{ users: User[] }> {
    const q = query ? `?search=${encodeURIComponent(query)}` : "";
    return request<{ users: User[] }>(`/api/users${q}`);
  },

  async updateProfile(data: { name?: string; avatarUrl?: string }): Promise<{ user: User }> {
    return request<{ user: User }>("/api/users/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Rooms
  async getRooms(): Promise<{ rooms: Room[] }> {
    return request<{ rooms: Room[] }>("/api/rooms");
  },

  async getRoom(id: string): Promise<{ room: Room }> {
    return request<{ room: Room }>(`/api/rooms/${id}`);
  },

  async createDirect(recipientId: string): Promise<{ room: Room }> {
    return request<{ room: Room }>("/api/rooms/direct", {
      method: "POST",
      body: JSON.stringify({ recipientId }),
    });
  },

  async createGroup(name: string, memberIds: string[]): Promise<{ room: Room }> {
    return request<{ room: Room }>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    });
  },

  async addMember(roomId: string, userId: string): Promise<{ room: Room }> {
    return request<{ room: Room }>(`/api/rooms/${roomId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  async removeMember(roomId: string, userId: string): Promise<void> {
    return request<void>(`/api/rooms/${roomId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  // Messages
  async getMessages(roomId: string, cursor?: string, limit = 50): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", limit.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(`/api/rooms/${roomId}/messages${query}`);
  },

  async sendMessage(roomId: string, content: string): Promise<{ message: Message }> {
    return request<{ message: Message }>(`/api/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  async markAsRead(roomId: string): Promise<void> {
    return request<void>(`/api/rooms/${roomId}/read`, {
      method: "POST",
    });
  },
};
