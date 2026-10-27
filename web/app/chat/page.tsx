"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Room, Message, User } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout, refreshUser } = useAuth();

  // Navigation & Workspace State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD" | "GROUP" | "DIRECT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"MEMBERS" | "MEDIA" | "FILES" | "LINKS">("MEMBERS");

  // Active Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [roomId: string]: string[] }>({});
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [showPinnedBanner, setShowPinnedBanner] = useState(true);

  // Modals
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Modal selection state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupDescInput, setGroupNameDescInput] = useState("");
  const [groupPrivacy, setGroupPrivacy] = useState<"public" | "private">("private");

  // Profile Edit State
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileAvatarSeed, setProfileAvatarSeed] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Auth Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // 2. Fetch User Rooms
  const loadRooms = async () => {
    try {
      const res = await api.getRooms();
      setRooms(res.rooms);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadRooms();
    }
  }, [isAuthenticated]);

  // 3. Socket.IO Real-time Connection
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (activeRoomId && msg.roomId === activeRoomId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        api.markAsRead(activeRoomId).catch(() => {});
      }

      setRooms((prev) =>
        prev.map((r) => {
          if (r._id === msg.roomId) {
            const isCurrent = activeRoomId === msg.roomId;
            return {
              ...r,
              lastMessage: {
                messageId: msg._id,
                senderId: msg.senderId,
                content: msg.content,
                createdAt: msg.createdAt,
              },
              unreadCount: isCurrent ? 0 : r.unreadCount + 1,
            };
          }
          return r;
        })
      );
    };

    const handleTypingUpdate = (data: { roomId: string; userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === user?._id) return;

      setTypingUsers((prev) => {
        const current = prev[data.roomId] || [];
        if (data.isTyping) {
          if (!current.includes(data.userName)) {
            return { ...prev, [data.roomId]: [...current, data.userName] };
          }
        } else {
          return { ...prev, [data.roomId]: current.filter((name) => name !== data.userName) };
        }
        return prev;
      });
    };

    const handlePresenceUpdate = (data: { userId: string; status: "ONLINE" | "OFFLINE"; onlineUsers?: string[] }) => {
      if (data.onlineUsers) {
        setOnlineUserIds(data.onlineUsers);
      } else if (data.status === "ONLINE") {
        setOnlineUserIds((prev) => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
      } else {
        setOnlineUserIds((prev) => prev.filter((id) => id !== data.userId));
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [token, activeRoomId, user?._id]);

  // 4. Fetch Messages when activeRoomId changes
  useEffect(() => {
    if (!activeRoomId) return;

    api.getMessages(activeRoomId)
      .then((res) => {
        setMessages(res.messages || []);
        api.markAsRead(activeRoomId).catch(() => {});
        setRooms((prev) =>
          prev.map((r) => (r._id === activeRoomId ? { ...r, unreadCount: 0 } : r))
        );
      })
      .catch((err) => console.error("Failed to load messages:", err));

    const socket = getSocket(token || undefined);
    if (socket) {
      socket.emit("room:join", { roomId: activeRoomId });
    }
  }, [activeRoomId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Active Room Details
  const activeRoom = useMemo(() => {
    return rooms.find((r) => r._id === activeRoomId) || null;
  }, [rooms, activeRoomId]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (activeFilter === "UNREAD" && r.unreadCount === 0) return false;
      if (activeFilter === "GROUP" && r.type !== "GROUP") return false;
      if (activeFilter === "DIRECT" && r.type !== "DIRECT") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rooms, activeFilter, searchQuery]);

  // Message Sending
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeRoomId || isSending) return;

    const content = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    const socket = getSocket(token || undefined);
    if (socket) {
      socket.emit("typing:stop", { roomId: activeRoomId });
    }

    try {
      const res = await api.sendMessage(activeRoomId, content);
      setMessages((prev) => [...prev, res.message]);
      loadRooms();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    if (!activeRoomId) return;

    const socket = getSocket(token || undefined);
    if (socket) {
      socket.emit("typing:start", { roomId: activeRoomId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing:stop", { roomId: activeRoomId });
      }, 2500);
    }
  };

  // Open New Chat Modal & Load Users
  const handleOpenNewChat = async () => {
    setIsNewChatModalOpen(true);
    setUserSearchTerm("");
    setSelectedUserIds([]);
    try {
      const res = await api.searchUsers();
      setAllUsers(res.users);
    } catch (err) {
      console.error("Failed to search users:", err);
    }
  };

  const handleSearchUsers = async (term: string) => {
    setUserSearchTerm(term);
    try {
      const res = await api.searchUsers(term);
      setAllUsers(res.users);
    } catch (err) {
      console.error("Failed to search users:", err);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStartConversationFromModal = async () => {
    if (selectedUserIds.length === 0) return;

    if (selectedUserIds.length === 1) {
      try {
        const res = await api.createDirect(selectedUserIds[0]);
        await loadRooms();
        setActiveRoomId(res.room._id);
        setIsNewChatModalOpen(false);
      } catch (err) {
        console.error("Failed to create direct room:", err);
      }
    } else {
      setIsNewChatModalOpen(false);
      setIsCreateGroupModalOpen(true);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim() || selectedUserIds.length === 0) return;

    try {
      const res = await api.createGroup(groupNameInput.trim(), selectedUserIds);
      await loadRooms();
      setActiveRoomId(res.room._id);
      setIsCreateGroupModalOpen(false);
      setGroupNameInput("");
      setSelectedUserIds([]);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleOpenProfileModal = () => {
    if (!user) return;
    setProfileNameInput(user.name);
    setProfileAvatarSeed(user.avatarUrl || "");
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateProfile({
        name: profileNameInput.trim(),
        avatarUrl: profileAvatarSeed.trim(),
      });
      await refreshUser();
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-lg animate-bounce">
            <span className="material-symbols-outlined text-2xl font-bold">forum</span>
          </div>
          <span className="text-sm font-semibold text-primary">Loading Chatly...</span>
        </div>
      </div>
    );
  }

  const activeTyping = activeRoomId ? typingUsers[activeRoomId] || [] : [];
  const activeRoomOnlineCount = activeRoom
    ? activeRoom.members.filter((m) => onlineUserIds.includes(m.userId)).length
    : 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface font-sans text-on-surface">
      {/* ─────────────────────────────────────────────────────────────
          PANE 0: FIXED UTILITY NAVIGATION RAIL (64px)
      ───────────────────────────────────────────────────────────── */}
      <aside className="w-16 flex-shrink-0 bg-surface-container-low border-r border-outline-variant/30 flex flex-col items-center py-4 justify-between z-30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center gap-6">
          {/* Brand Logo */}
          <button
            onClick={() => setActiveRoomId(null)}
            className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-md shadow-primary-container/20 hover:scale-105 transition-transform"
            title="Chatly Home"
          >
            <span className="material-symbols-outlined text-xl font-bold">forum</span>
          </button>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-2">
            <button
              onClick={() => setActiveRoomId(null)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm transition-all"
              title="All Chats"
            >
              <span className="material-symbols-outlined text-xl">chat</span>
            </button>
            <button
              onClick={() => setActiveFilter("GROUP")}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
              title="Channels"
            >
              <span className="material-symbols-outlined text-xl">tag</span>
            </button>
            <button
              onClick={handleOpenNewChat}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
              title="Teammates / New Chat"
            >
              <span className="material-symbols-outlined text-xl">group</span>
            </button>
          </nav>
        </div>

        {/* Bottom Rail Controls */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>

          <button
            onClick={handleOpenProfileModal}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
            title="Profile & Settings"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>

          <button
            onClick={logout}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition-all"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>

          {/* User Profile Avatar with Online Ring */}
          <div
            onClick={handleOpenProfileModal}
            className="relative mt-1 cursor-pointer group"
            title={`${user.name} (${user.email})`}
          >
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-container shadow-xs group-hover:scale-105 transition-transform"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary-container ring-2 ring-surface-container-low" />
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          PANE 1: CONVERSATIONS SIDEBAR (320px)
      ───────────────────────────────────────────────────────────── */}
      <aside className="w-80 md:w-88 flex-shrink-0 bg-surface-container-low border-r border-outline-variant/30 flex flex-col h-full z-20 shadow-[1px_0_0_0_rgba(118,117,135,0.08)]">
        {/* Header & Search */}
        <div className="p-4 flex flex-col gap-3 bg-surface-container-low border-b border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-on-surface">Messages</span>
              {rooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0) > 0 && (
                <span className="bg-secondary text-on-secondary text-xs px-2 py-0.5 rounded-full font-bold">
                  {rooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0)}
                </span>
              )}
            </div>
            <button
              onClick={handleOpenNewChat}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shadow-xs"
              title="New Message"
            >
              <span className="material-symbols-outlined text-lg">edit_square</span>
            </button>
          </div>

          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats, channels, files..."
              className="w-full h-9 pl-9 pr-4 rounded-full bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs transition-all"
            />
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === "ALL"
                  ? "bg-primary-container text-on-primary-container shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("UNREAD")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === "UNREAD"
                  ? "bg-primary-container text-on-primary-container shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setActiveFilter("GROUP")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === "GROUP"
                  ? "bg-primary-container text-on-primary-container shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => setActiveFilter("DIRECT")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === "DIRECT"
                  ? "bg-primary-container text-on-primary-container shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              Direct
            </button>
          </div>
        </div>

        {/* Conversations Feed List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-outline text-xs flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
              <span>No conversations match your filter</span>
              <button
                onClick={handleOpenNewChat}
                className="mt-2 text-xs text-primary font-semibold hover:underline"
              >
                Start a new conversation
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room._id === activeRoomId;
              const isDirect = room.type === "DIRECT";
              const otherUser = isDirect
                ? room.members.find((m) => m.userId !== user._id)?.user
                : null;
              const isOtherOnline = otherUser ? onlineUserIds.includes(otherUser._id) : false;

              return (
                <div
                  key={room._id}
                  onClick={() => setActiveRoomId(room._id)}
                  className={`relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? "bg-surface-container text-primary font-medium shadow-xs"
                      : "hover:bg-surface-container text-on-surface"
                  }`}
                >
                  {/* Left Active Pip Indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-container rounded-r-full" />
                  )}

                  <div className="relative flex-shrink-0">
                    {isDirect ? (
                      <img
                        src={
                          otherUser?.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            otherUser?.name || "Direct"
                          )}`
                        }
                        alt={room.name}
                        className="w-11 h-11 rounded-xl object-cover shadow-xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-[22px]">hub</span>
                      </div>
                    )}

                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-surface-container ${
                        isDirect
                          ? isOtherOnline
                            ? "bg-tertiary-container"
                            : "bg-outline"
                          : "bg-tertiary-container"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold truncate text-on-surface flex items-center gap-1">
                        {room.name}
                        {!isDirect && (
                          <span className="material-symbols-outlined text-primary text-[15px]">verified</span>
                        )}
                      </span>
                      <span className="text-[10px] text-outline flex-shrink-0">
                        {room.lastMessage
                          ? new Date(room.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-on-surface-variant">
                      <p className="text-xs truncate pr-1">
                        {room.lastMessage ? room.lastMessage.content : "No messages yet"}
                      </p>
                      {room.unreadCount > 0 && (
                        <span className="bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.2 rounded-full flex-shrink-0">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Real-time Status Footer */}
        <div className="p-2.5 bg-surface-container-low/70 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
            <span>Real-time connected</span>
          </div>
          <span className="text-outline font-mono text-[10px]">{onlineUserIds.length} active</span>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          PANE 2: MAIN CHAT CANVAS (Fluid)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 h-full flex flex-col bg-surface relative">
        {activeRoom ? (
          <>
            {/* Active Header */}
            <header className="h-16 px-6 flex items-center justify-between bg-surface-container-lowest/80 backdrop-blur-md shadow-[0_1px_4px_rgba(0,0,0,0.03)] z-20 flex-shrink-0 border-b border-outline-variant/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  {activeRoom.type === "DIRECT" ? (
                    <img
                      src={
                        activeRoom.recipient?.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeRoom.name)}`
                      }
                      alt={activeRoom.name}
                      className="w-10 h-10 rounded-xl object-cover shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">hub</span>
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-tertiary-container ring-2 ring-surface-container-lowest" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-on-surface truncate">{activeRoom.name}</h2>
                    <span className="material-symbols-outlined text-primary text-[17px]">verified</span>
                    <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
                      {activeRoomOnlineCount || 1} online
                    </span>
                  </div>
                  <p className="text-[11px] text-outline truncate mt-0.5">
                    {activeRoom.members.map((m) => m.user?.name || "Member").join(", ")}
                  </p>
                </div>
              </div>

              {/* Header Action Tools */}
              <div className="flex items-center gap-1 text-on-surface-variant flex-shrink-0">
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
                  title="Search in Conversation"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </button>
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
                  title="Voice Call"
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </button>
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
                  title="Video Call"
                >
                  <span className="material-symbols-outlined text-[20px]">videocam</span>
                </button>
                <div className="h-5 w-px bg-surface-container-highest mx-1" />
                <button
                  type="button"
                  onClick={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    isRightDrawerOpen
                      ? "bg-primary-container text-on-primary-container"
                      : "hover:bg-surface-container text-on-surface-variant"
                  }`}
                  title="Conversation Details & Members"
                >
                  <span className="material-symbols-outlined text-[20px]">info</span>
                </button>
              </div>
            </header>

            {/* Pinned Announcement Bar */}
            {showPinnedBanner && (
              <div className="px-6 py-2.5 bg-surface-container flex items-center justify-between text-on-surface shadow-xs z-10 border-b border-outline-variant/20">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[15px]">push_pin</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">Pinned:</span>
                  <p className="text-xs text-on-surface truncate">
                    Sprint 14 Design review today at 3:00 PM EST with engineering leads
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPinnedBanner(false)}
                    className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <div className="flex items-center justify-center my-2">
                <div className="px-3 py-1 rounded-full bg-surface-container text-outline text-xs flex items-center gap-1.5 shadow-xs">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  <span>Today, October 24</span>
                </div>
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === user._id;
                const senderName = msg.sender?.name || (isMe ? "You" : "Teammate");
                const senderAvatar =
                  msg.sender?.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(senderName)}`;

                return (
                  <div
                    key={msg._id}
                    className={`flex items-start gap-3 max-w-2xl ${isMe ? "ml-auto justify-end" : ""}`}
                  >
                    {!isMe && (
                      <img
                        src={senderAvatar}
                        alt={senderName}
                        className="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow-xs mt-0.5"
                      />
                    )}

                    <div className={`flex flex-col gap-1 min-w-0 ${isMe ? "items-end" : ""}`}>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            isMe ? "text-primary" : "text-secondary"
                          }`}
                        >
                          {isMe ? `${user.name} (You)` : senderName}
                        </span>
                        <span className="text-[10px] text-outline">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Asymmetric Chat Bubbles */}
                      <div
                        className={`p-3.5 text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary-container text-on-primary rounded-2xl rounded-tr-sm shadow-md text-right"
                            : "bg-surface-container-lowest text-on-surface rounded-2xl rounded-tl-sm shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-outline-variant/20"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Outgoing Delivery ticks */}
                      {isMe && (
                        <div className="flex items-center gap-1 text-[10px] text-outline pr-1">
                          <span>Delivered</span>
                          <span className="material-symbols-outlined text-primary text-[16px]">
                            done_all
                          </span>
                        </div>
                      )}
                    </div>

                    {isMe && (
                      <img
                        src={user.avatarUrl || senderAvatar}
                        alt="Your profile"
                        className="w-9 h-9 rounded-xl object-cover ring-2 ring-primary-fixed flex-shrink-0 shadow-xs mt-0.5"
                      />
                    )}
                  </div>
                );
              })}

              {/* Real-time Typing Indicator */}
              {activeTyping.length > 0 && (
                <div className="flex items-center gap-2 pt-2 text-outline">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <span>{activeTyping.join(", ")} is typing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Elevated Message Composer Area */}
            <div className="p-6 pt-2 bg-gradient-to-t from-surface via-surface to-transparent flex-shrink-0">
              <div className="rounded-2xl bg-surface-container-lowest p-2 shadow-[0_4px_24px_-4px_rgba(91,91,246,0.1)] focus-within:shadow-[0_4px_24px_rgba(91,91,246,0.18)] border border-outline-variant/30 transition-all">
                <textarea
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={`Type a message to #${activeRoom.name}... (Markdown supported)`}
                  className="w-full py-2 px-3 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none resize-none max-h-32"
                />

                <div className="flex items-center justify-between pt-1 px-1">
                  <div className="flex items-center gap-1 text-on-surface-variant">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
                      title="Attach file (+)"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
                      title="Emoji picker"
                    >
                      <span className="material-symbols-outlined text-[20px]">mood</span>
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
                      title="Voice note mic"
                    >
                      <span className="material-symbols-outlined text-[20px]">mic</span>
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
                      title="Code snippet syntax"
                    >
                      <span className="material-symbols-outlined text-[20px]">code</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-outline hidden sm:inline">Return to send</span>
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!messageInput.trim() || isSending}
                      className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary shadow-xs hover:scale-95 disabled:opacity-50 transition-all"
                      title="Send Message"
                    >
                      <span className="material-symbols-outlined text-[19px]">send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty State View */
          <div className="flex-1 h-full bg-surface relative flex flex-col justify-between items-center px-6 py-10 overflow-y-auto">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg text-center my-auto">
              <div className="relative mb-6 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-surface-container via-primary-fixed to-secondary-fixed/50 flex items-center justify-center shadow-[0_8px_30px_rgb(91,91,246,0.12)]">
                  <svg className="w-16 h-16 text-primary" fill="none" viewBox="0 0 64 64">
                    <path
                      d="M48 30C48 39.941 39.941 48 30 48C26.5 48 23.2 47.0 20.4 45.2L11 48L13.8 38.6C12.0 35.8 11 32.5 11 29C11 19.059 19.059 11 29 11C38.941 11 48 19.059 48 29V30Z"
                      fill="currentColor"
                      fillOpacity="0.15"
                    />
                    <path
                      d="M53 23C53 32.389 45.389 40 36 40C33.1 40 30.3 39.2 27.9 37.8L19 41L21.7 32.2C20.0 29.7 19 26.5 19 23C19 13.611 26.611 6 36 6C45.389 6 53 13.611 53 23Z"
                      fill="currentColor"
                    />
                    <circle cx="29" cy="23" fill="#ffffff" r="2.5" />
                    <circle cx="36" cy="23" fill="#ffffff" r="2.5" />
                    <circle cx="43" cy="23" fill="#ffffff" r="2.5" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-2 bg-surface-container-lowest p-1.5 rounded-full shadow-md text-secondary">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </div>
                <div className="absolute -bottom-1 -left-2 bg-surface-container-lowest p-1.5 rounded-full shadow-md text-tertiary-container">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
              </div>

              <span className="text-xs uppercase tracking-wider text-primary font-semibold mb-2 bg-primary-fixed/60 px-3 py-1 rounded-full">
                Chatly Messenger
              </span>
              <h1 className="text-2xl font-extrabold text-on-surface mb-2 tracking-tight">
                No conversation selected
              </h1>
              <p className="text-sm text-on-surface-variant mb-6 max-w-md leading-relaxed">
                Select a conversation from the left to start messaging, or kick off a new one with your teammates.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
                <button
                  type="button"
                  onClick={handleOpenNewChat}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(65,62,220,0.25)] hover:bg-primary-container active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  <span>Start a New Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold hover:bg-surface-container flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">groups</span>
                  <span>Create a Group</span>
                </button>
              </div>

              {/* Recent Activity Quick Card */}
              <div className="mt-8 p-4 w-full rounded-2xl bg-surface-container-lowest shadow-sm flex items-center justify-between text-left border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface">Weekly team sync in 45m</p>
                    <p className="text-[11px] text-on-surface-variant">8 teammates have confirmed attendance</p>
                  </div>
                </div>
                <span className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
                  Join room <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </div>

            <footer className="relative z-10 w-full flex flex-col items-center gap-3 pt-6 text-xs text-outline">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-lg text-on-surface-variant">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest font-semibold text-on-surface shadow-xs">
                    ⌘ N
                  </kbd>
                  <span>New Message</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-lg text-on-surface-variant">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest font-semibold text-on-surface shadow-xs">
                    ESC
                  </kbd>
                  <span>Clear Selection</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low/80 text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px] text-tertiary-container">lock</span>
                <span>Your personal messages and calls are end-to-end encrypted</span>
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          PANE 3: DOCKED RIGHT DRAWER (498bd0474ba3491b8d389cef3cff957e)
      ───────────────────────────────────────────────────────────── */}
      {isRightDrawerOpen && activeRoom && (
        <aside className="w-[360px] shrink-0 h-full bg-surface-container-lowest flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.03)] z-20 overflow-hidden border-l border-outline-variant/30 animate-in slide-in-from-right duration-200">
          <div className="h-16 px-6 flex items-center justify-between shrink-0 bg-surface-container-lowest border-b border-outline-variant/20">
            <span className="text-base font-bold text-on-surface">Group Info</span>
            <button
              type="button"
              onClick={() => setIsRightDrawerOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {/* Identity Summary */}
            <div className="flex flex-col items-center text-center pt-4 pb-2">
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary via-secondary to-primary-container p-0.5 shadow-xl flex items-center justify-center mb-4">
                <div className="w-full h-full bg-surface-container-lowest/10 backdrop-blur-xs rounded-[22px] flex items-center justify-center relative overflow-hidden">
                  <span className="material-symbols-outlined text-on-primary text-[38px] drop-shadow-md">
                    hub
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 justify-center">
                <h3 className="text-base font-bold text-on-surface">{activeRoom.name}</h3>
                <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              </div>
              <p className="text-xs text-outline mt-0.5">Created by Elena Rostova • Oct 2024</p>

              <div className="mt-4 bg-surface-container-low p-3.5 rounded-xl text-left w-full shadow-xs">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">
                  Topic & Bio
                </span>
                <p className="text-xs text-on-surface leading-relaxed">
                  Official workspace for Chatly design tokens, UI components, and WCAG accessibility standards.
                </p>
              </div>
            </div>

            {/* 4 Quick Actions Row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <button
                type="button"
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">notifications_off</span>
                <span className="text-[10px] font-medium">Mute</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
                <span className="text-[10px] font-medium">Search</span>
              </button>
              <button
                type="button"
                onClick={handleOpenNewChat}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                <span className="text-[10px] font-medium">Add</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">ios_share</span>
                <span className="text-[10px] font-medium">Export</span>
              </button>
            </div>

            {/* Tab Navigation Bar */}
            <div className="bg-surface-container-low p-1 rounded-xl flex gap-1">
              <button
                type="button"
                onClick={() => setDrawerTab("MEMBERS")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  drawerTab === "MEMBERS"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                Members ({activeRoom.members.length})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("MEDIA")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  drawerTab === "MEDIA"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                Media (48)
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("FILES")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  drawerTab === "FILES"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                Files (19)
              </button>
            </div>

            {/* Members Stack */}
            <div className="space-y-1">
              {activeRoom.members.map((member) => {
                const isOnline = onlineUserIds.includes(member.userId);
                const isSelf = member.userId === user._id;
                const memberName = member.user?.name || (isSelf ? `${user.name} (You)` : "Teammate");
                const memberAvatar =
                  member.user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(memberName)}`;

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={memberAvatar}
                          alt={memberName}
                          className="w-10 h-10 rounded-full object-cover shadow-xs"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest ${
                            isOnline ? "bg-tertiary-container" : "bg-outline"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {memberName}
                          </span>
                          {member.role === "ADMIN" && (
                            <span className="px-1.5 py-0.2 rounded bg-primary-fixed text-on-primary-fixed text-[10px] font-semibold tracking-wide uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-tertiary font-medium">
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shared Media Preview Grid */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface">Shared Media</span>
                <span className="text-[11px] text-primary hover:underline font-medium cursor-pointer">
                  View all 48
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl overflow-hidden bg-surface-container shadow-xs relative group cursor-pointer"
                  >
                    <div className="w-full h-full bg-gradient-to-tr from-primary-fixed to-secondary-fixed flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                      <span className="material-symbols-outlined text-2xl">image</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: NEW CHAT / SEARCH TEAMMATES (dab66ff218e44c29a42680d26842a726)
      ───────────────────────────────────────────────────────────── */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 top-14 left-16 bg-[#0f172a]/45 backdrop-blur-xs z-50 flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest text-on-surface w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-container" />
                  <h2 className="text-lg font-bold text-on-surface">New Message</h2>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Search contacts or invite new teammates by username or email
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Search Input Section */}
            <div className="px-6 pb-2 flex flex-col gap-2">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  autoFocus
                  value={userSearchTerm}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Type a name, @username, or email address..."
                  className="w-full h-11 pl-11 pr-24 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest shadow-[0_0_0_2px_rgba(91,91,246,0.2)] transition-all"
                />
                <div className="absolute right-3 flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] uppercase font-bold">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-container text-on-primary-container shadow-xs"
                >
                  Recent
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
                >
                  Favorites
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
                >
                  Team Members
                </button>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="px-6 py-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewChatModalOpen(false);
                    setIsCreateGroupModalOpen(true);
                  }}
                  className="group flex items-center justify-between p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">group_add</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-on-surface font-semibold truncate">New Channel</span>
                      <span className="text-[10px] text-outline truncate">Group team chat</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsNewChatModalOpen(false);
                    setIsCreateGroupModalOpen(true);
                  }}
                  className="group flex items-center justify-between p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">podcasts</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-on-surface font-semibold truncate">Broadcast List</span>
                      <span className="text-[10px] text-outline truncate">Announce to many</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Scrollable Contacts List */}
            <div className="px-6 py-2 max-h-64 overflow-y-auto space-y-1">
              <span className="text-[10px] text-outline uppercase tracking-wider font-bold block mb-1">
                Suggested & Frequent Contacts
              </span>

              {allUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-outline">No contacts found</div>
              ) : (
                allUsers.map((u) => {
                  const isChecked = selectedUserIds.includes(u._id);
                  const isOnline = onlineUserIds.includes(u._id);

                  return (
                    <label
                      key={u._id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <img
                            src={
                              u.avatarUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`
                            }
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover shadow-xs"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-surface-container-lowest ${
                              isOnline ? "bg-tertiary-container" : "bg-outline"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-on-surface block truncate">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-outline truncate block">{u.email}</span>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUserSelection(u._id)}
                        className="w-5 h-5 rounded text-primary-container accent-primary-container cursor-pointer"
                      />
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-surface-container-low/50 border-t border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-outline text-xs">
                <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold text-[10px]">
                  ESC
                </kbd>
                <span>to close</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedUserIds.length === 0}
                  onClick={handleStartConversationFromModal}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary-container hover:bg-primary text-on-primary-container shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>
                    {selectedUserIds.length > 1
                      ? `Create Group (${selectedUserIds.length})`
                      : "Start Conversation"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: CREATE GROUP MODAL (d8e02b8addae43e6a88158f832da1c90)
      ───────────────────────────────────────────────────────────── */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-on-background/25 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleCreateGroup}
            className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant/30 animate-in zoom-in-95 duration-200"
          >
            {/* Top Accent Ribbon */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary-container to-secondary" />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex flex-col gap-2 bg-surface-container-lowest border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold tracking-wide uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Channel Setup
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface">Create a New Group</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Groups are great for teams, projects, or shared topic channels.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex flex-col gap-5 max-h-[500px] overflow-y-auto">
              {/* Group Name & Upload */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-low hover:bg-surface-container flex flex-col items-center justify-center text-center p-1 transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-[24px] text-primary">photo_camera</span>
                  <span className="text-[10px] text-on-surface-variant">Upload</span>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="group-name">
                      Group Name <span className="text-error">*</span>
                    </label>
                    <span className="text-[10px] text-outline">{groupNameInput.length}/60</span>
                  </div>
                  <input
                    id="group-name"
                    type="text"
                    required
                    maxLength={60}
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    placeholder="e.g. Mobile Engineering Q4"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-xs focus:outline-none focus:bg-surface-container transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="group-desc">
                  Description / Topic <span className="text-outline font-normal">(optional)</span>
                </label>
                <textarea
                  id="group-desc"
                  rows={2}
                  value={groupDescInput}
                  onChange={(e) => setGroupNameDescInput(e.target.value)}
                  placeholder="Sprint alignment, sync engine milestone delivery, architecture reviews."
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-xs placeholder:text-outline focus:outline-none focus:bg-surface-container transition-all resize-none"
                />
              </div>

              {/* Privacy Option Cards */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-on-surface">Privacy & Access Level</span>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setGroupPrivacy("public")}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      groupPrivacy === "public"
                        ? "bg-surface-container border-primary-container shadow-xs"
                        : "bg-surface-container-low border-transparent hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="material-symbols-outlined text-primary text-[20px]">public</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          groupPrivacy === "public" ? "border-primary bg-primary" : "border-outline"
                        }`}
                      >
                        {groupPrivacy === "public" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-on-surface block">Public Channel</span>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      Anyone in the workspace can search and join.
                    </p>
                  </div>

                  <div
                    onClick={() => setGroupPrivacy("private")}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      groupPrivacy === "private"
                        ? "bg-surface-container border-primary-container shadow-xs"
                        : "bg-surface-container-low border-transparent hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          groupPrivacy === "private" ? "border-primary bg-primary" : "border-outline"
                        }`}
                      >
                        {groupPrivacy === "private" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary block">Private Group</span>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      Only invited members can view messages and participate.
                    </p>
                  </div>
                </div>
              </div>

              {/* Members Checklist */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-on-surface">
                  Add Initial Members ({selectedUserIds.length} selected)
                </span>
                <div className="max-h-36 overflow-y-auto border border-outline-variant/30 rounded-xl p-2 space-y-1">
                  {allUsers.map((u) => (
                    <label
                      key={u._id}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer text-xs"
                    >
                      <span className="truncate">{u.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u._id)}
                        onChange={() => toggleUserSelection(u._id)}
                        className="accent-primary-container"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!groupNameInput.trim() || selectedUserIds.length === 0}
                className="px-6 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-primary disabled:opacity-50 transition-all"
              >
                <span>Create Group</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: PROFILE & SETTINGS MODAL (474a437f59624148ab79099d50212e00)
      ───────────────────────────────────────────────────────────── */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-on-background/25 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSaveProfile}
            className="relative w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant/30 animate-in zoom-in-95 duration-200"
          >
            {/* Header Block */}
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                  Account Workspace
                </span>
                <h2 className="text-xl font-bold text-on-surface tracking-tight mt-1">
                  Profile Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[560px] overflow-y-auto">
              {/* Identity & Visual Avatar Module */}
              <div className="flex items-center gap-6">
                <img
                  src={
                    profileAvatarSeed ||
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
                  }
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary-container shadow-md"
                />
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-bold text-on-surface">Profile Avatar</h3>
                  <input
                    type="text"
                    value={profileAvatarSeed}
                    onChange={(e) => setProfileAvatarSeed(e.target.value)}
                    placeholder="Avatar image URL or seed..."
                    className="w-full px-3 py-1.5 bg-surface-container-low text-xs rounded-lg text-on-surface border border-outline-variant/30"
                  />
                  <p className="text-[11px] text-outline">Recommended PNG, JPG, or SVG avatar seed.</p>
                </div>
              </div>

              {/* Form Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Display Name</label>
                  <input
                    type="text"
                    required
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low text-xs rounded-lg text-on-surface border border-outline-variant/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-outline">Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 bg-surface-container-low/40 text-xs rounded-lg text-outline cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Presence & Privacy Controls */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Presence & Privacy Controls
                </h4>

                <div className="p-4 rounded-2xl bg-surface-container-low/60 border border-outline-variant/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary text-2xl">visibility</span>
                    <div>
                      <span className="text-xs font-semibold text-on-surface block">
                        Show online activity status
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Allows teammates to see when you are active.
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-6 bg-primary-container rounded-full flex items-center justify-end px-1">
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low/60 border border-outline-variant/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">done_all</span>
                    <div>
                      <span className="text-xs font-semibold text-on-surface block">
                        Send read receipts (Blue checkmarks)
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Mark conversations as read in real-time.
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-6 bg-primary-container rounded-full flex items-center justify-end px-1">
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 bg-surface-container-low flex items-center justify-between border-t border-outline-variant/20">
              <button
                type="button"
                onClick={logout}
                className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Sign Out
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-md hover:bg-primary-container transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
