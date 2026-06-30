import rabbitMQClient from "../config/rabbitmq";
import { EmailProvider } from "../providers/email.provider";
import { IN_APP_provider } from "../providers/inApp.provider";
import { SseRegistry } from "./sseRegistry";

// const FANOUT_EXCHANGE = "bingebuddy_live_broadcasts";
const SSE_EXCHANGE = "bingebuddy_sse_direct";

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

    const { queue } = await channel.assertQueue("", { exclusive: true });
    this.activeQueue = queue;
    // await channel.bindQueue(queue, FANOUT_EXCHANGE, "");
    await channel.prefetch(1);
    channel.consume(queue, (msg) => {
      if (!msg) {
        NotificationConsumer.initialize().catch(console.error);
        return;
      }

      let payload: NotificationPayload;
      try {
        payload = JSON.parse(msg.content.toString()) as NotificationPayload;
      } catch {
        channel.nack(msg, false, false);
        return;
      }
      const { targetUserId, eventType, data } = payload;
      if (!targetUserId || !eventType) {
        channel.nack(msg, false, false);
        return;
      }
      console.log("message payload: ",payload)
      // this.event_based_actions(targetUserId, eventType, data)
      IN_APP_provider(targetUserId,eventType,data)

      channel.ack(msg);
    });
    channel.on('error', (err) => {
      console.error('[Consumer] Channel error:', err.message);
    });
    channel.on('close', () => {
      console.warn('[Consumer] Channel closed — will reconnect via RabbitMQ client');
    });
  }

  static async bindUser(userId:string):Promise<void>{
    if (!this.activeQueue) return;
    const channel = rabbitMQClient.getChannel();
    const routingKey = `user.${userId}`;
    await channel.bindQueue(this.activeQueue, SSE_EXCHANGE, routingKey);
  }
static async unbindUser(userId: string): Promise<void> {
    if (!this.activeQueue) return;
    const channel = rabbitMQClient.getChannel();
    const routingKey = `user.${userId}`;    
    await channel.unbindQueue(this.activeQueue, SSE_EXCHANGE, routingKey);
  }
}
