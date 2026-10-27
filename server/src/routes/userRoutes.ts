import { Router } from "express";
import { UserController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateProfileSchema } from "../utils/validators";

const router = Router();

router.use(requireAuth);
router.get("/", UserController.searchUsers);
router.patch("/profile", validateBody(updateProfileSchema), UserController.updateProfile);

export default router;
