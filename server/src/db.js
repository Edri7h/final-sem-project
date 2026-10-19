import "./config.js";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import Redis from "ioredis";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
export const db = drizzle(pool);
export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    })
  : null;

if (redis) {
  redis.connect().catch((error) => {
    console.error(
      JSON.stringify({
        event: "redis_connection_failed",
        message: error.message,
      }),
    );
  });
  redis.on("error", (error) => {
    console.error(
      JSON.stringify({
        event: "redis_error",
        message: error.message,
      }),
    );
  });
}

