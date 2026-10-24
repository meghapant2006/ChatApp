import { User, IUser } from "../models";
import { SafeUser, toSafeUser } from "./authService";

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
}
