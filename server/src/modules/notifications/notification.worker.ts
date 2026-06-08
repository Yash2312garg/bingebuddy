// src/modules/notifications/notification.worker.ts

import * as os from "os";
import { redisStreamClient } from "./redis.config";
import { redisClient } from "../../database/redis";
import { TriggerNotificationPayload, Notification } from "./notification.types";
import { NotificationPostgresDao } from "./notification.dao";
import { EmailProvider } from "./providers/email.provider";
import { SmsProvider } from "./providers/sms.provider";

export class RedisConsumer {
  static getKey = () => "global_notifications";
  static getGroupName = () => "notification_processing_group";

  static async createConsumerGroup(): Promise<void> {
    const streamKey = this.getKey();
    const groupName = this.getGroupName();

    try {
      await redisClient.xGroupCreate(streamKey, groupName, "$", { MKSTREAM: true });
      console.log(`[Worker Init] Consumer group ${groupName} successfully validated.`);
    } catch (err: any) {
      if (err.message && err.message.includes("BUSYGROUP")) {
        return;
      }
      throw err;
    }
  }

  static async startWorkerLoop(): Promise<void> {
    const streamKey = this.getKey();
    const groupName = this.getGroupName();
    const consumerName = `notification-worker:${os.hostname()}:${process.pid}`;
    
    await this.createConsumerGroup();
    console.log(`[Worker Started] Listening as consumer: ${consumerName}`);

    while (true) {
        console.log("inside the worker loop ")
      try {
        const response = await redisStreamClient.xReadGroup(
          groupName,
          consumerName,
          { key: streamKey, id: ">" },
          { BLOCK: 1000, COUNT: 1 }
        ) as any[];

        if (!response || response.length === 0) {
          continue;
        }

        const streamData = response[0];
        const rawMessage = streamData.messages[0]; // FIXED: Plural 'messages' mapping
        
        if (!rawMessage) continue;
        
        const redisMessageId = rawMessage.id;
        const parsedPayload: TriggerNotificationPayload = JSON.parse(rawMessage.message.payload);

        console.log(`[Worker] Intercepted event [${redisMessageId}] for ${parsedPayload.recipientType} ID: ${parsedPayload.recipientId}`);

        // 1. Process and route the notification based on context
        await this.routeNotification(parsedPayload);

        // 2. Acknowledge message processing completion to clear Redis tracking
        await redisStreamClient.xAck(streamKey, groupName, redisMessageId);

      } catch (loopError) {
        console.error("[Worker Loop Error] Pipeline failure encountered. Evading crash, retrying in 1s...", loopError);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  static async routeNotification(payload: TriggerNotificationPayload): Promise<void> {
    switch (payload.eventType) {
      case "IN_APP":
        // Persist to relational storage
        const savedNotification: Notification = await NotificationPostgresDao.create(payload);
        
        // Broadcast downstream to real-time client windows
        const channel = `notifications:${payload.recipientType.toLowerCase()}:${payload.recipientId}`;
        await redisClient.publish(channel, JSON.stringify(savedNotification));
        break;

      case "EMAIL":
        await EmailProvider.send(payload);
        break;

      case "SMS":
        await SmsProvider.send(payload);
        break;

      default:
        console.warn(`[Router] Unhandled delivery channel detected: ${payload.eventType}`);
        break;
    }
  }
}