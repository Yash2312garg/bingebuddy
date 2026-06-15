// src/modules/notifications/notification.service.ts

import { TriggerNotificationPayload } from "./notification.types";
import { redisClient } from "../../database/redis"; // Shared global Redis client used for non-blocking standard database mutations

/**
 * NotificationService acts as the "Producer" or "Publisher" in our event-driven streaming pipeline.
 * Its sole responsibility is to ingest incoming notification requests and append them safely to Redis.
 */
export class NotificationService {
  // Centralized stream key name. It is vital that this matches the getKey() name in your worker 
  // file exactly, otherwise the producer and consumer will be looking at two different queues.
  static getStreamKey = () => "global_notifications";

  /**
   * Pushes a notification payload into the Redis Stream for asynchronous, background processing.
   * * @param payload - The structured data containing delivery info (recipient, channel type, data context)
   * @returns A Promise resolving to the unique, time-stamped Redis Entry ID generated for this event.
   */
  static async triggerNotification(payload: TriggerNotificationPayload): Promise<string> {
    const key = this.getStreamKey();

    // xAdd appends a new entry to the end of the specified stream log.
    // Parameters under the hood:
    // 1. key: The name of the target stream ("global_notifications")
    // 2. "*": Tells Redis to automatically generate a unique, monotonic, time-based ID (e.g., "1717469714000-0")
    // 3. Object fields: Key-value string pairs. Since Redis Stream fields must be strings, we serialize 
    //    our complex payload object into a single JSON string under the field name "payload".
    const eventId = await redisClient.xAdd(key, "*", {
      payload: JSON.stringify(payload),
    });
    
    // The returned eventId contains the millisecond timestamp of insertion. 
    // This is incredibly useful for logging, debugging, or performing distributed system tracing.
    console.log(`[Notification Engine] Event queued in stream. Stream ID: ${eventId}`);
    
    return eventId;
  }
}