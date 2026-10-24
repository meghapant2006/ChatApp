import { Router } from "express";
import { UserController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/", UserController.searchUsers);

export default router;
