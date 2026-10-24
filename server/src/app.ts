import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { NotFoundError } from "./utils/errors";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());

// Health check route
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Authentication routes
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

// Catch-all 404 for unhandled routes
app.use((_req, _res, next) => {
  next(new NotFoundError("Requested resource not found"));
});

// Central error handler
app.use(errorHandler);

export default app;
