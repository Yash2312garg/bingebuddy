// src/modules/notifications/notification.service.ts

import { TriggerNotificationPayload } from "./notification.types";
import { redisClient } from "../../database/redis"; // Using your shared global client

export class NotificationService {
  static getStreamKey = () => "global_notifications";

  static async triggerNotification(payload: TriggerNotificationPayload): Promise<string> {
    const key = this.getStreamKey();

    const eventId = await redisClient.xAdd(key, "*", {
      payload: JSON.stringify(payload),
    });
    
    console.log(`[Notification Engine] Event queued in stream. Stream ID: ${eventId}`);
    return eventId;
  }
}