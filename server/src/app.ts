import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { apiLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import roomRoutes from "./routes/roomRoutes";
import messageRoutes from "./routes/messageRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { NotFoundError } from "./utils/errors";

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [env.clientUrl, "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Structured HTTP request logging with Pino
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/health",
    },
  })
);

// Parse JSON bodies
app.use(express.json({ limit: "1mb" }));

// Health check route (unrestricted)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// General rate limiter on API routes
app.use("/api", apiLimiter);

// Authentication routes
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

// Users routes
app.use("/users", userRoutes);
app.use("/api/users", userRoutes);

// Rooms routes (includes /rooms/:id/messages and /rooms/:id/read)
app.use("/rooms", roomRoutes);
app.use("/api/rooms", roomRoutes);

// Messages routes (PATCH/DELETE /messages/:id)
app.use("/messages", messageRoutes);
app.use("/api/messages", messageRoutes);

// Catch-all 404 for unhandled routes
app.use((_req, _res, next) => {
  next(new NotFoundError("Requested resource not found"));
});

// Central error handler
app.use(errorHandler);

export default app;
