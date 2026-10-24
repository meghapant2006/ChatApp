import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { UnauthorizedError } from "../utils/errors";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const user = await AuthService.getMe(req.user.userId);
      res.status(200).json({
        status: "success",
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }
}
