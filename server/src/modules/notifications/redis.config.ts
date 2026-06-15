// src/modules/notifications/redis.config.ts

import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Dedicated connection for the worker's blocking stream operations
export const redisStreamClient = createClient({ url: redisUrl });

redisStreamClient.on('error', (err: Error) => console.error('Redis Stream Client Error:', err));