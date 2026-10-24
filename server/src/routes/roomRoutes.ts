import { Router } from "express";
import { RoomController } from "../controllers/roomController";
import { MessageController } from "../controllers/messageController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  createGroupSchema,
  createDirectSchema,
  addMemberSchema,
  sendMessageSchema,
} from "../utils/validators";
import { messageLimiter } from "../middleware/rateLimiter";

const router = Router();

// All room routes require authentication
router.use(requireAuth);

// Room management
router.get("/", RoomController.getMyRooms);
router.post("/", validateBody(createGroupSchema), RoomController.createGroup);
router.post("/direct", validateBody(createDirectSchema), RoomController.createDirect);
router.get("/:id", RoomController.getRoomById);
router.post("/:id/members", validateBody(addMemberSchema), RoomController.addMember);
router.delete("/:id/members/:userId", RoomController.removeMember);

// Room messages & read receipts
router.post(
  "/:id/messages",
  messageLimiter,
  validateBody(sendMessageSchema),
  MessageController.sendMessage
);
router.get("/:id/messages", MessageController.getRoomMessages);
router.post("/:id/read", MessageController.markRoomAsRead);

export default router;
