import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User, IUser } from "../models";
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from "../utils/errors";
import { signToken } from "../utils/jwt";
import { RegisterInput, LoginInput } from "../utils/validators";
import { env } from "../config/env";

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

  static async googleAuth(input: { idToken?: string; code?: string; redirectUri?: string }): Promise<{ user: SafeUser; token: string }> {
    let email = "";
    let name = "";
    let picture = "";

    if (input.idToken) {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.idToken)}`);
      if (!res.ok) {
        throw new UnauthorizedError("Invalid or expired Google ID token");
      }
      const data: any = await res.json();
      if (env.googleClientId && data.aud !== env.googleClientId) {
        throw new UnauthorizedError("Google client ID mismatch");
      }
      email = data.email;
      name = data.name || data.email?.split("@")[0] || "User";
      picture = data.picture || "";
    } else if (input.code) {
      if (!env.googleClientId || !env.googleClientSecret) {
        throw new BadRequestError("Google OAuth Client ID & Secret must be configured on the server");
      }
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: input.code,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          redirect_uri: input.redirectUri || `${env.clientUrl}/login`,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.text();
        throw new UnauthorizedError(`Failed to exchange Google code: ${errData}`);
      }

      const tokenData: any = await tokenRes.json();
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!userRes.ok) {
        throw new UnauthorizedError("Failed to fetch Google user profile");
      }
      const userData: any = await userRes.json();
      email = userData.email;
      name = userData.name || userData.email?.split("@")[0] || "User";
      picture = userData.picture || "";
    }

    if (!email) {
      throw new BadRequestError("No email returned from Google account");
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const randomPassword = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        avatarUrl: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });
    } else if (!user.avatarUrl && picture) {
      user.avatarUrl = picture;
      await user.save();
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
