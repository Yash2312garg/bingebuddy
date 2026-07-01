import rabbitMQClient from "../../config/rabbitmq";
import { IN_APP_provider } from "../../providers/inApp.provider";
import { SSE_EXCHANGE } from "./constants";

interface NotificationPayload {
  targetUserId: string;
  eventType: string;
  data: unknown;
}

export class NotificationConsumer {
  private static activeQueue: string | null = null;
  
  static async initialize(): Promise<void> {
    const channel = rabbitMQClient.getChannel();
    await channel.assertExchange(SSE_EXCHANGE, "direct", { durable: true });

    // Exclusive queue for this specific server instance's active SSE connections
    const { queue } = await channel.assertQueue("", { exclusive: true });
    this.activeQueue = queue;
    
    await channel.prefetch(1);
    
    channel.consume(queue, async (msg) => {
      if (!msg) {
        NotificationConsumer.initialize().catch(console.error);
        return;
      }

      let payload: NotificationPayload;

      try {
        payload = JSON.parse(msg.content.toString()) as NotificationPayload;
      } catch {
        // Bad JSON. Discard.
        channel.nack(msg, false, false);
        return;
      }
      
      const { targetUserId, eventType, data } = payload;
      if (!targetUserId || !eventType) {
        channel.nack(msg, false, false);
        return;
      }

      try {
        // The provider handles DB saves (QUEUED, DELIVERED, FAILED).
        await IN_APP_provider(targetUserId, eventType, data);
        
        // Always ack. We don't DLQ volatile web socket events.
        channel.ack(msg);
      } catch (err) {
        console.error("❌ [Consumer] Critical failure processing notification:", err);
        // If the DB is completely down, discard the live event. 
        channel.nack(msg, false, false); 
      }
    });

    channel.on("error", (err) => console.error("[Consumer] Error:", err.message));
    channel.on("close", () => console.warn("[Consumer] Channel closed"));
  }

  static async bindUser(userId: string): Promise<void> {
    if (!this.activeQueue) return;
    const channel = rabbitMQClient.getChannel();
    await channel.bindQueue(this.activeQueue, SSE_EXCHANGE, `user.${userId}`);
  }
  
  static async unbindUser(userId: string): Promise<void> {
    if (!this.activeQueue) return;
    const channel = rabbitMQClient.getChannel();
    await channel.unbindQueue(this.activeQueue, SSE_EXCHANGE, `user.${userId}`);
  }
}
