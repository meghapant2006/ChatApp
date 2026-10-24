import mongoose from "mongoose";
import { Room, IRoom, User, Message } from "../models";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";
import { CreateGroupInput } from "../utils/validators";

export interface FormattedRoomMember {
  userId: string;
  role: "ADMIN" | "MEMBER";
  lastReadAt: Date;
  user?: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface FormattedRoom {
  _id: string;
  type: "DIRECT" | "GROUP";
  name: string;
  directKey?: string | undefined;
  members: FormattedRoomMember[];
  recipient?: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string | undefined;
  } | undefined;
  lastMessage?: {
    messageId: string;
    senderId: string;
    content: string;
    createdAt: Date;
  } | undefined;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class RoomService {
  private static getDirectKey(id1: string, id2: string): string {
    return [id1, id2].sort().join("_");
  }

  private static formatRoom(room: any, currentUserId: string, unreadCount = 0): FormattedRoom {
    const members: FormattedRoomMember[] = (room.members || []).map((m: any) => {
      const isPopulated = m.userId && typeof m.userId === "object" && "_id" in m.userId;
      const rawUser = isPopulated ? m.userId : null;
      const userIdStr = isPopulated ? rawUser._id.toString() : m.userId.toString();

      return {
        userId: userIdStr,
        role: m.role,
        lastReadAt: m.lastReadAt,
        ...(rawUser
          ? {
              user: {
                _id: rawUser._id.toString(),
                name: rawUser.name,
                email: rawUser.email,
                avatarUrl: rawUser.avatarUrl,
              },
            }
          : {}),
      };
    });

    let recipient: FormattedRoom["recipient"] = undefined;
    let displayName = room.name || "Chat";

    if (room.type === "DIRECT") {
      const otherMember = members.find((m) => m.userId !== currentUserId);
      if (otherMember?.user) {
        recipient = otherMember.user;
        displayName = otherMember.user.name;
      }
    }

    return {
      _id: room._id.toString(),
      type: room.type,
      name: displayName,
      directKey: room.directKey,
      members,
      recipient,
      lastMessage: room.lastMessage
        ? {
            messageId: room.lastMessage.messageId ? room.lastMessage.messageId.toString() : "",
            senderId: room.lastMessage.senderId ? room.lastMessage.senderId.toString() : "",
            content: room.lastMessage.content,
            createdAt: room.lastMessage.createdAt,
          }
        : undefined,
      unreadCount,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  private static async countUnreadMessages(roomId: any, userId: string, lastReadAt?: Date): Promise<number> {
    const query: any = {
      roomId,
      senderId: { $ne: new mongoose.Types.ObjectId(userId) },
    };

    if (lastReadAt) {
      query.createdAt = { $gt: lastReadAt };
    }

    return Message.countDocuments(query);
  }

  static async createDirectRoom(currentUserId: string, recipientId: string): Promise<FormattedRoom> {
    if (currentUserId === recipientId) {
      throw new BadRequestError("Cannot create a direct conversation with yourself");
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new NotFoundError("Recipient user not found");
    }

    const directKey = this.getDirectKey(currentUserId, recipientId);

    // Look for existing direct room
    let room = await Room.findOne({ directKey }).populate(
      "members.userId",
      "name email avatarUrl"
    );

    if (room) {
      const member = room.members.find((m) => m.userId && (m.userId as any)._id.toString() === currentUserId);
      const unread = await this.countUnreadMessages(room._id, currentUserId, member?.lastReadAt);
      return this.formatRoom(room, currentUserId, unread);
    }

    // Create new direct room
    room = await Room.create({
      type: "DIRECT",
      directKey,
      members: [
        {
          userId: new mongoose.Types.ObjectId(currentUserId),
          role: "MEMBER",
          lastReadAt: new Date(),
        },
        {
          userId: new mongoose.Types.ObjectId(recipientId),
          role: "MEMBER",
          lastReadAt: new Date(),
        },
      ],
    });

    await room.populate("members.userId", "name email avatarUrl");
    return this.formatRoom(room, currentUserId, 0);
  }

  static async createGroupRoom(
    creatorId: string,
    input: CreateGroupInput
  ): Promise<FormattedRoom> {
    const uniqueMemberIds = Array.from(
      new Set(input.memberIds.filter((id) => id !== creatorId))
    );

    if (uniqueMemberIds.length === 0) {
      throw new BadRequestError("At least one additional member is required to create a group");
    }

    // Verify all member IDs exist
    const foundUsers = await User.find({ _id: { $in: uniqueMemberIds } });
    if (foundUsers.length !== uniqueMemberIds.length) {
      throw new BadRequestError("One or more invited members do not exist");
    }

    const members = [
      {
        userId: new mongoose.Types.ObjectId(creatorId),
        role: "ADMIN" as const,
        lastReadAt: new Date(),
      },
      ...uniqueMemberIds.map((id) => ({
        userId: new mongoose.Types.ObjectId(id),
        role: "MEMBER" as const,
        lastReadAt: new Date(),
      })),
    ];

    const room = await Room.create({
      type: "GROUP",
      name: input.name.trim(),
      members,
    });

    await room.populate("members.userId", "name email avatarUrl");
    return this.formatRoom(room, creatorId, 0);
  }

  static async getUserRooms(userId: string): Promise<FormattedRoom[]> {
    const rooms = await Room.find({ "members.userId": userId })
      .populate("members.userId", "name email avatarUrl")
      .sort({ updatedAt: -1 });

    const formattedRooms = await Promise.all(
      rooms.map(async (room) => {
        const member = room.members.find(
          (m) =>
            m.userId &&
            (m.userId as any)._id.toString() === userId
        );
        const unread = await this.countUnreadMessages(
          room._id,
          userId,
          member?.lastReadAt
        );
        return this.formatRoom(room, userId, unread);
      })
    );

    return formattedRooms;
  }

  static async getRoomById(roomId: string, userId: string): Promise<FormattedRoom> {
    if (!mongoose.isValidObjectId(roomId)) {
      throw new BadRequestError("Invalid room ID format");
    }

    const room = await Room.findById(roomId).populate(
      "members.userId",
      "name email avatarUrl"
    );

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const member = room.members.find(
      (m) =>
        m.userId &&
        (m.userId as any)._id.toString() === userId
    );

    if (!member) {
      throw new ForbiddenError("You are not a member of this room");
    }

    const unread = await this.countUnreadMessages(room._id, userId, member.lastReadAt);
    return this.formatRoom(room, userId, unread);
  }

  static async addMember(
    roomId: string,
    currentUserId: string,
    targetUserId: string
  ): Promise<FormattedRoom> {
    if (!mongoose.isValidObjectId(roomId)) {
      throw new BadRequestError("Invalid room ID format");
    }
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new BadRequestError("Invalid user ID format");
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (room.type !== "GROUP") {
      throw new BadRequestError("Cannot add members to a direct message room");
    }

    const currentMember = room.members.find(
      (m) => m.userId.toString() === currentUserId
    );
    if (!currentMember) {
      throw new ForbiddenError("You are not a member of this room");
    }

    if (currentMember.role !== "ADMIN") {
      throw new ForbiddenError("Only group admins can add new members");
    }

    const userToAdd = await User.findById(targetUserId);
    if (!userToAdd) {
      throw new NotFoundError("User to add was not found");
    }

    const isAlreadyMember = room.members.some(
      (m) => m.userId.toString() === targetUserId
    );
    if (isAlreadyMember) {
      throw new BadRequestError("User is already a member of this room");
    }

    room.members.push({
      userId: new mongoose.Types.ObjectId(targetUserId),
      role: "MEMBER",
      lastReadAt: new Date(),
    });

    await room.save();
    await room.populate("members.userId", "name email avatarUrl");

    return this.formatRoom(room, currentUserId, 0);
  }

  static async removeMember(
    roomId: string,
    currentUserId: string,
    targetUserId: string
  ): Promise<{ message: string; room?: FormattedRoom }> {
    if (!mongoose.isValidObjectId(roomId)) {
      throw new BadRequestError("Invalid room ID format");
    }
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new BadRequestError("Invalid user ID format");
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (room.type !== "GROUP") {
      throw new BadRequestError("Cannot remove members from a direct message room");
    }

    const currentMember = room.members.find(
      (m) => m.userId.toString() === currentUserId
    );
    if (!currentMember) {
      throw new ForbiddenError("You are not a member of this room");
    }

    const targetMemberIndex = room.members.findIndex(
      (m) => m.userId.toString() === targetUserId
    );
    if (targetMemberIndex === -1) {
      throw new NotFoundError("Target user is not a member of this room");
    }

    // Permission: User removing themselves OR Admin removing someone else
    const isSelf = currentUserId === targetUserId;
    if (!isSelf && currentMember.role !== "ADMIN") {
      throw new ForbiddenError("Only group admins can remove other members");
    }

    const targetMember = room.members[targetMemberIndex];
    room.members.splice(targetMemberIndex, 1);

    // If no members remain, delete the room
    if (room.members.length === 0) {
      await Room.findByIdAndDelete(roomId);
      return { message: "Room deleted as no members remain" };
    }

    // If an admin left and there are no other admins remaining, promote the first member
    if (targetMember && targetMember.role === "ADMIN") {
      const hasOtherAdmin = room.members.some((m) => m.role === "ADMIN");
      if (!hasOtherAdmin && room.members.length > 0 && room.members[0]) {
        room.members[0].role = "ADMIN";
      }
    }

    await room.save();
    await room.populate("members.userId", "name email avatarUrl");

    return {
      message: isSelf ? "Successfully left the group" : "Member removed successfully",
      room: this.formatRoom(room, currentUserId, 0),
    };
  }
}
