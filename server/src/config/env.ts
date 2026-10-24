import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
};

if (!env.mongoUri) throw new Error("MONGODB_URI is not set");
if (!env.clientUrl) throw new Error("CLIENT_URL is not set");
