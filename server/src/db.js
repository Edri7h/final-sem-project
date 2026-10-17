import './config.js';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
export const db = drizzle(pool);
export const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL,{lazyConnect:true, maxRetriesPerRequest:1, retryStrategy:()=>null}) : null;
if (redis) redis.connect().catch(()=>{});


if (redis) redis.on('error',()=>{});

