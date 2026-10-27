import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { UnauthorizedError } from "../utils/errors";
import { env } from "../config/env";

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

  static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.googleAuth(req.body);
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async googleRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!env.googleClientId) {
        res.status(400).json({
          status: "fail",
          message: "GOOGLE_CLIENT_ID is not configured in environment variables",
        });
        return;
      }
      const originParam = (req.query.origin as string) || (req.headers.referer ? new URL(req.headers.referer).origin : null);
      const clientBase = originParam || env.clientUrl || "http://localhost:3000";
      const redirectUri = `${clientBase.replace(/\/$/, "")}/login`;
      const scope = encodeURIComponent("openid email profile");
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        env.googleClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
      res.redirect(url);
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
