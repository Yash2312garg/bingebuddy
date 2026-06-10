// src/modules/notifications/notification.worker.ts

import * as os from "os";
import { redisStreamClient } from "./redis.config";
import { redisClient } from "../../database/redis";
import { TriggerNotificationPayload, Notification } from "./notification.types";
import { NotificationPostgresDao } from "./notification.dao";
import { EmailProvider } from "./providers/email.provider";
import { SmsProvider } from "./providers/sms.provider";

/**
 * RedisConsumer handles the background processing of notification events.
 * It uses Redis Streams for reliable message queuing and distribution across instances.
 */
export class RedisConsumer {
  // The unique identifier/key for our notification event stream log
  static getKey = () => "global_notifications";
  
  // The name of the competing consumer group assigned to share this stream's workload
  static getGroupName = () => "notification_processing_group";

  /**
   * Initializes the consumer group on the Redis stream.
   * This setup must run once before any workers attempt to pull data.
   */
  static async createConsumerGroup(): Promise<void> {
    const streamKey = this.getKey();
    const groupName = this.getGroupName();

    try {
      // Create the group. 
      // '$' means: Ignore historical data, only look for messages arriving AFTER group creation.
      // MKSTREAM: true means: Automatically create an empty stream key if it doesn't exist yet.
      await redisClient.xGroupCreate(streamKey, groupName, "$", { MKSTREAM: true });
      console.log(`[Worker Init] Consumer group ${groupName} successfully validated.`);
    } catch (err: any) {
      // If the group already exists, Redis throws a "BUSYGROUP" error. 
      // We safely catch and ignore this, as it means the environment is already properly configured.
      if (err.message && err.message.includes("BUSYGROUP")) {
        return;
      }
      throw err;
    }
  }

  /**
   * Spawns the infinite event loop that continually polls Redis for new notifications.
   */
  static async startWorkerLoop(): Promise<void> {
    const streamKey = this.getKey();
    const groupName = this.getGroupName();
    
    // Generate a unique consumer name for this specific process instance.
    // Combining the hostname and Process ID (PID) ensures Redis can track individual worker crashes.
    const consumerName = `notification-worker:${os.hostname()}:${process.pid}`;
    
    // Ensure the stream and consumer group infrastructure exist before looping
    await this.createConsumerGroup();
    console.log(`[Worker Started] Listening as consumer: ${consumerName}`);

    while (true) {
      console.log("inside the worker loop ");
      try {
        // Fetch data as a group member using XREADGROUP
        const response = await redisStreamClient.xReadGroup(
          groupName,
          consumerName,
          { 
            key: streamKey, 
            id: ">"  // ">" tells Redis: "Give me brand new tasks that have NEVER been given to anyone else"
          },
          { 
            BLOCK: 1000, // Long-poll: If stream is empty, freeze the terminal/loop for up to 1000ms waiting for data
            COUNT: 1     // Pull exactly 1 message at a time to evenly balance the workload across multiple workers
          }
        ) as any[];

        // If the 1000ms block timed out with no new data, restart the loop immediately
        if (!response || response.length === 0) {
          continue;
        }

        // Extract the target message from the nested Redis response array structure
        const streamData = response[0];
        const rawMessage = streamData.messages[0]; 
        
        if (!rawMessage) continue;
        
        // This is the unique sequential ID (e.g., 1717469714000-0) assigned by Redis
        const redisMessageId = rawMessage.id;
        
        // The event data payload is stored as a string inside the stringified dictionary value
        const parsedPayload: TriggerNotificationPayload = JSON.parse(rawMessage.message.payload);

        console.log(`[Worker] Intercepted event [${redisMessageId}] for ${parsedPayload.recipientType} ID: ${parsedPayload.recipientId}`);

        // 1. Process and route the notification based on its channels (EMAIL, SMS, IN_APP)
        await this.routeNotification(parsedPayload);

        // 2. Clear the message from this worker's Pending Entries List (PEL).
        // This acknowledges successful completion and tells Redis it is safe to forget about this item.
        await redisStreamClient.xAck(streamKey, groupName, redisMessageId);

      } catch (loopError) {
        // Essential circuit breaker: catching errors inside the loop prevents the entire application/process 
        // from crashing if a single notification processing run throws an unhandled exception.
        console.error("[Worker Loop Error] Pipeline failure encountered. Evading crash, retrying in 1s...", loopError);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Processes the structured payload and handles downstream routing mechanics.
   */
  static async routeNotification(payload: TriggerNotificationPayload): Promise<void> {
    switch (payload.eventType) {
      case "IN_APP":
        // Step A: Save a persistent record of the notification to the primary SQL database
        const savedNotification: Notification = await NotificationPostgresDao.create(payload);
        
        // Step B: Hybrid Broadcast! Instantly transmit the notification object via Redis Pub/Sub.
        // Any open user WebSocket/SSE server instances subscribed to this target channel 
        // will pick up this real-time broadcast and push it to the user's browser UI instantly.
        const channel = `notifications:${payload.recipientType.toLowerCase()}:${payload.recipientId}`;
        await redisClient.publish(channel, JSON.stringify(savedNotification));
        break;

      case "EMAIL":
        // Outsource processing to external SMTP/Email delivery services (e.g., SendGrid, SES)
        await EmailProvider.send(payload);
        break;

      case "SMS":
        // Outsource processing to external SMS gateways (e.g., Twilio)
        await SmsProvider.send(payload);
        break;

      default:
        console.warn(`[Router] Unhandled delivery channel detected: ${payload.eventType}`);
        break;
    }
  }
}