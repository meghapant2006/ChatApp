export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface RoomMember {
  userId: string;
  role: "ADMIN" | "MEMBER";
  lastReadAt?: string;
  user?: User;
}

export interface Room {
  _id: string;
  type: "DIRECT" | "GROUP";
  name: string;
  members: RoomMember[];
  recipient?: User;
  lastMessage?: {
    messageId: string;
    senderId: string;
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  roomId: string;
  senderId: string;
  sender?: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
  updatedAt?: string;
}
