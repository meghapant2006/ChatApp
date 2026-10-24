import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

export default app;