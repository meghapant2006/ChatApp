import mongoose from "mongoose";
import { Message, IMessage, Room } from "../models";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";

export interface FormattedMessage {
  _id: string;
  roomId: string;
  senderId: string;
  sender?: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string | undefined;
  } | undefined;
  content: string;
  isEdited?: boolean | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export class MessageService {
  private static formatMessage(msg: any): FormattedMessage {
    const isPopulated = msg.senderId && typeof msg.senderId === "object" && "_id" in msg.senderId;
    const rawSender = isPopulated ? msg.senderId : null;
    const senderIdStr = isPopulated ? rawSender._id.toString() : msg.senderId.toString();

    return {
      _id: msg._id.toString(),
      roomId: msg.roomId.toString(),
      senderId: senderIdStr,
      sender: rawSender
        ? {
            _id: rawSender._id.toString(),
            name: rawSender.name,
            email: rawSender.email,
            avatarUrl: rawSender.avatarUrl ?? undefined,
          }
        : undefined,
      content: msg.content,
      isEdited: msg.isEdited ?? false,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    };
  }

  static async sendMessage(
    roomId: string,
    senderId: string,
    content: string
  ): Promise<FormattedMessage> {
    if (!mongoose.isValidObjectId(roomId)) {
      throw new BadRequestError("Invalid room ID format");
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const member = room.members.find(
      (m) => m.userId.toString() === senderId
    );
    if (!member) {
      throw new ForbiddenError("You are not a member of this room");
    }

    const message = await Message.create({
      roomId: new mongoose.Types.ObjectId(roomId),
      senderId: new mongoose.Types.ObjectId(senderId),
      content: content.trim(),
    });

    // Update room lastMessage and sender's lastReadAt
    room.lastMessage = {
      messageId: message._id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
    };
    member.lastReadAt = message.createdAt;
    await room.save();

    await message.populate("senderId", "name email avatarUrl");
    return this.formatMessage(message);
  }

  static async getRoomMessages(
    roomId: string,
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<{ messages: FormattedMessage[]; nextCursor: string | null; hasMore: boolean }> {
    if (!mongoose.isValidObjectId(roomId)) {
      throw new BadRequestError("Invalid room ID format");
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const isMember = room.members.some(
      (m) => m.userId.toString() === userId
    );
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this room");
    }

    const query: any = { roomId: new mongoose.Types.ObjectId(roomId) };
    if (cursor) {
      if (!mongoose.isValidObjectId(cursor)) {
        throw new BadRequestError("Invalid cursor format");
      }
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    // Fetch limit + 1 to check if another page exists
    const rawMessages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(safeLimit + 1)
      .populate("senderId", "name email avatarUrl");

    const hasMore = rawMessages.length > safeLimit;
    const pageItems = hasMore ? rawMessages.slice(0, safeLimit) : rawMessages;
    const lastItem = pageItems[pageItems.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem._id.toString() : null;

    return {
      messages: pageItems.map((m) => this.formatMessage(m)),
      nextCursor,
      hasMore,
    };
  }

  static async editMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<FormattedMessage> {
    if (!mongoose.isValidObjectId(messageId)) {
      throw new BadRequestError("Invalid message ID format");
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new NotFoundError("Message not found");
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenError("Only the sender can edit this message");
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    // Check if this message is the room's lastMessage preview
    const room = await Room.findById(message.roomId);
    if (room && room.lastMessage && room.lastMessage.messageId.toString() === messageId) {
      room.lastMessage.content = message.content;
      await room.save();
    }

    await message.populate("senderId", "name email avatarUrl");
    return this.formatMessage(message);
  }

  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<{ message: string }> {
    if (!mongoose.isValidObjectId(messageId)) {
      throw new BadRequestError("Invalid message ID format");
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new NotFoundError("Message not found");
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenError("Only the sender can delete this message");
    }

    const roomId = message.roomId;
    await Message.findByIdAndDelete(messageId);

    // If this was the room's lastMessage, replace with newest remaining message
    const room = await Room.findById(roomId);
    if (room && room.lastMessage && room.lastMessage.messageId.toString() === messageId) {
      const prevMessage = await Message.findOne({ roomId: room._id }).sort({ _id: -1 });
      if (prevMessage) {
        room.lastMessage = {
          messageId: prevMessage._id,
          senderId: prevMessage.senderId,
          content: prevMessage.content,
          createdAt: prevMessage.createdAt,
        };
      } else {
        room.lastMessage = undefined;
      }
      await room.save();
    }

    return { message: "Message deleted successfully" };
  }

  static async markRoomAsRead(
    roomId: string,
    userId: string
  ): Promise<{ message: string; lastReadAt: Date }> {
    if (!mongoose.isValidObjectId(roomId)) {
      throw new BadRequestError("Invalid room ID format");
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const member = room.members.find(
      (m) => m.userId.toString() === userId
    );
    if (!member) {
      throw new ForbiddenError("You are not a member of this room");
    }

    const now = new Date();
    member.lastReadAt = now;
    await room.save();

    return {
      message: "Room marked as read",
      lastReadAt: now,
    };
  }
}
