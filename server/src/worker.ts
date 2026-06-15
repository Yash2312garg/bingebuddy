import { pool } from "./database/db";
import { redisClient } from "./database/redis";
import { redisStreamClient } from "./modules/notifications/redis.config";
import { RedisConsumer } from "./modules/notifications";

async function bootworker() {
  try {
    console.log("Starting Standalone Binge Buddy Worker Process...");
    await pool.connect();
    console.log(" Worker Database Node Connection: Linked.");
    await redisClient.connect();
    console.log(" Worker Shared Publisher Node Connection: Linked.");
    await redisStreamClient.connect();
    console.log("Worker Blocking Stream Node Connection: Linked.");
    RedisConsumer.startWorkerLoop().catch((loopCrash) => {
      console.error(
        " CRITICAL CORE CRASH: Background worker loop terminated:",
        loopCrash,
      );
      process.exit(1);
    });
  } catch (initError) {
    console.error(
      " CRITICAL FAULT: Standalone process failed initialization:",
      initError,
    );
    process.exit(1);
  }
}
bootworker();
