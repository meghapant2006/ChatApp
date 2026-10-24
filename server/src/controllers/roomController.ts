import { Request, Response, NextFunction } from "express";
import { RoomService } from "../services/roomService";
import { UnauthorizedError } from "../utils/errors";

export class RoomController {
  static async createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const room = await RoomService.createGroupRoom(req.user.userId, req.body);
      res.status(201).json({
        status: "success",
        data: { room },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const room = await RoomService.createDirectRoom(req.user.userId, req.body.recipientId);
      res.status(200).json({
        status: "success",
        data: { room },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const rooms = await RoomService.getUserRooms(req.user.userId);
      res.status(200).json({
        status: "success",
        data: { rooms },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const roomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!roomId) {
        res.status(400).json({ status: "fail", message: "Missing room id parameter" });
        return;
      }
      const room = await RoomService.getRoomById(roomId, req.user.userId);
      res.status(200).json({
        status: "success",
        data: { room },
      });
    } catch (err) {
      next(err);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const roomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!roomId) {
        res.status(400).json({ status: "fail", message: "Missing room id parameter" });
        return;
      }
      const room = await RoomService.addMember(roomId, req.user.userId, req.body.userId);
      res.status(200).json({
        status: "success",
        data: { room },
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const roomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      if (!roomId || !targetUserId) {
        res.status(400).json({ status: "fail", message: "Missing route parameters" });
        return;
      }
      const result = await RoomService.removeMember(roomId, req.user.userId, targetUserId);
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
