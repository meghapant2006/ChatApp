import mongoose, { Document, Schema } from "mongoose";

export type RoomType = "DIRECT" | "GROUP";
export type MemberRole = "ADMIN" | "MEMBER";

export interface IRoomMember {
  userId: mongoose.Types.ObjectId;
  role: MemberRole;
  lastReadAt: Date;
}

export interface ILastMessagePreview {
  messageId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  type: RoomType;
  name?: string;
  members: IRoomMember[];
  directKey?: string;
  lastMessage?: ILastMessagePreview;
  createdAt: Date;
  updatedAt: Date;
}

const RoomMemberSchema = new Schema<IRoomMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "MEMBER"],
      default: "MEMBER",
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const LastMessagePreviewSchema = new Schema<ILastMessagePreview>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoom>(
  {
    type: {
      type: String,
      enum: ["DIRECT", "GROUP"],
      required: true,
      default: "DIRECT",
    },
    name: {
      type: String,
      trim: true,
    },
    members: {
      type: [RoomMemberSchema],
      required: true,
      validate: [
        (members: IRoomMember[]) => members.length >= 2,
        "A room must have at least 2 members",
      ],
    },
    directKey: {
      type: String,
      trim: true,
    },
    lastMessage: {
      type: LastMessagePreviewSchema,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
RoomSchema.index({ "members.userId": 1 });
RoomSchema.index({ directKey: 1 }, { unique: true, sparse: true });

export const Room = mongoose.model<IRoom>("Room", RoomSchema);
