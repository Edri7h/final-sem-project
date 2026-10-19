import "./config.js";
import app from "./app.js";
import { pool, redis } from "./db.js";

const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => {
  console.info(
    JSON.stringify({
      event: "api_started",
      port,
      environment: process.env.NODE_ENV || "development",
    }),
  );
});

server.on("error", (error) => {
  console.error(
    JSON.stringify({ event: "api_start_failed", code: error.code, message: error.message }),
  );
  process.exit(1);
});

async function shutdown() {
  server.close(async () => {
    try {
      await pool.end();
      if (redis?.status === "ready") await redis.quit();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
