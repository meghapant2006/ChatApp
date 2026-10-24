import http from "http";
import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";

async function start() {
  await connectDB();
  const server = http.createServer(app); // raw HTTP server so Socket.IO can attach later
  server.listen(env.port, () => console.log(`Server running on :${env.port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});