import http from "http";
import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { initSocketServer } from "./sockets";
import { logger } from "./utils/logger";

async function start() {
  await connectDB();
  const server = http.createServer(app);

  // Initialize and attach Socket.IO server
  initSocketServer(server);

  server.listen(env.port, () =>
    logger.info(`🚀 Server and Socket.IO running on :${env.port}`)
  );
}

start().catch((err) => {
  logger.error(err, "Startup error");
  process.exit(1);
});
