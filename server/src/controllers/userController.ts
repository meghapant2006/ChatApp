import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import { UnauthorizedError } from "../utils/errors";

export class UserController {
  static async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const users = await UserService.searchUsers(req.user.userId, search);

      res.status(200).json({
        status: "success",
        data: { users },
      });
    } catch (err) {
      next(err);
    }
  }
}
