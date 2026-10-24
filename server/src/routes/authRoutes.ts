import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimiter";
import { registerSchema, loginSchema } from "../utils/validators";

const router = Router();

router.post("/register", authLimiter, validateBody(registerSchema), AuthController.register);
router.post("/login", authLimiter, validateBody(loginSchema), AuthController.login);
router.get("/me", requireAuth, AuthController.getMe);

export default router;
