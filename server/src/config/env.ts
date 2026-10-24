import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "fallback_secret_for_development_mode",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

if (!env.mongoUri) throw new Error("MONGODB_URI is not set");
if (!env.clientUrl) throw new Error("CLIENT_URL is not set");
