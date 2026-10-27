import { User, IUser } from "../models";
import { SafeUser, toSafeUser } from "./authService";
import { NotFoundError } from "../utils/errors";

export class UserService {
  static async searchUsers(currentUserId: string, search?: string): Promise<SafeUser[]> {
    const query: any = {
      _id: { $ne: currentUserId },
    };

    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { email: { $regex: sanitized, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .sort({ name: 1 })
      .limit(30);

    return users.map((u: IUser) => toSafeUser(u));
  }

  static async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    if (data.name) user.name = data.name.trim();
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    await user.save();
    return toSafeUser(user);
  }
}
