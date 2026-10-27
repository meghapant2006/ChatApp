import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required").optional(),
  code: z.string().min(1, "Authorization code is required").optional(),
  redirectUri: z.string().optional(),
}).refine((data) => data.idToken || data.code, {
  message: "Either idToken or code must be provided",
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(60, "Group name cannot exceed 60 characters"),
  memberIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID"))
    .min(1, "At least one additional member is required to create a group"),
});

export const createDirectSchema = z.object({
  recipientId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid recipient ID"),
});

export const addMemberSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50).optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty")
    .max(4000, "Message content cannot exceed 4000 characters"),
});

export const editMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty")
    .max(4000, "Message content cannot exceed 4000 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateDirectInput = z.infer<typeof createDirectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
