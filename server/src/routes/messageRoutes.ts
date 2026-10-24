import { Router } from "express";
import { MessageController } from "../controllers/messageController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { editMessageSchema } from "../utils/validators";

const router = Router();

// All message modification routes require authentication
router.use(requireAuth);

router.patch("/:id", validateBody(editMessageSchema), MessageController.editMessage);
router.delete("/:id", MessageController.deleteMessage);

export default router;
