import { Request, Response, NextFunction } from "express";
import { MessageService } from "../services/messageService";
import { UnauthorizedError } from "../utils/errors";

export class MessageController {
  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const roomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!roomId) {
        res.status(400).json({ status: "fail", message: "Missing room ID parameter" });
        return;
      }
      const message = await MessageService.sendMessage(
        roomId,
        req.user.userId,
        req.body.content
      );
      res.status(201).json({
        status: "success",
        data: { message },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRoomMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const roomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!roomId) {
        res.status(400).json({ status: "fail", message: "Missing room ID parameter" });
        return;
      }
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await MessageService.getRoomMessages(
        roomId,
        req.user.userId,
        cursor,
        limit
      );
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markRoomAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const roomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!roomId) {
        res.status(400).json({ status: "fail", message: "Missing room ID parameter" });
        return;
      }
      const result = await MessageService.markRoomAsRead(roomId, req.user.userId);
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async editMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const messageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!messageId) {
        res.status(400).json({ status: "fail", message: "Missing message ID parameter" });
        return;
      }
      const message = await MessageService.editMessage(
        messageId,
        req.user.userId,
        req.body.content
      );
      res.status(200).json({
        status: "success",
        data: { message },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("Authentication required");
      }
      const messageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!messageId) {
        res.status(400).json({ status: "fail", message: "Missing message ID parameter" });
        return;
      }
      const result = await MessageService.deleteMessage(messageId, req.user.userId);
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
