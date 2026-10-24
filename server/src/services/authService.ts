import bcrypt from "bcryptjs";
import { User, IUser } from "../models";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors";
import { signToken } from "../utils/jwt";
import { RegisterInput, LoginInput } from "../utils/validators";

export interface SafeUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeUser(user: IUser): SafeUser {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  static async register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      avatarUrl: input.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.name)}`,
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return {
      user: toSafeUser(user),
      token,
    };
  }

  static async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return {
      user: toSafeUser(user),
      token,
    };
  }

  static async getMe(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return toSafeUser(user);
  }
}
