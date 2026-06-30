//server/src/services/rabbitmq/eventPublisher.ts
import rabbitMQClient from "../../config/rabbitmq";
import { Notification_Templates_ENUM } from "../../types/notificationTemplate.types";

const EXCHANGE_NAME = "bingebuddy_events";
const EXCHANGE_TYPE = "topic";
const SSE_EXCHANGE = "bingebuddy_sse_direct";
const EMAIL_EXCHANGE = "bingebuddy_email";
const EMAIL_ROUTING_KEY = "email.send"; 
export class EventPublisher {
  private static initialized = false;

  // ─── Call once at app startup ───────────────────────────────────────────────
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    const channel = rabbitMQClient.getChannel();

    // Assert the exchange once — idempotent, safe to call on reconnect too
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true, // survives broker restart
    });

    await channel.assertExchange(SSE_EXCHANGE, "direct", {
      durable: true,
    });
    this.initialized = true;
    console.log(`✅ Exchanges "${EXCHANGE_NAME}" & "${SSE_EXCHANGE}" ready`);
  }

  // ─── Call on every event ────────────────────────────────────────────────────
  static async publish(routingKey: string, data: unknown): Promise<void> {
    // Guard: re-initialize if the channel was recycled after a reconnect
    if (!this.initialized) {
      await this.initialize();
    }

    const channel = rabbitMQClient.getChannel();

    const messageBuffer = Buffer.from(JSON.stringify(data));

    const isPublished = channel.publish(
      EXCHANGE_NAME,
      EMAIL_ROUTING_KEY,  
      messageBuffer,
      {
        persistent: true, // survives broker restart
        contentType: "application/json",
        timestamp: Math.floor(Date.now() / 1000),
        appId: "bingebuddy-main", // useful for tracing in RabbitMQ UI
      },
    );

    if (isPublished) {
      console.log(`📤 Published [${routingKey}]`);
    } else {
      // Channel write buffer is full — back-pressure from RabbitMQ.
      // The message is still queued internally by amqplib; log and let
      // the caller decide whether to await the 'drain' event.
      console.warn(`⚠️  Back-pressure on [${routingKey}] — broker is slow`);
    }
  }
  static async emitInAppNotification(
    targetUserId: string,
    eventType: "IN_APP",
    data: unknown,
  ): Promise<void> {
    if (!this.initialized) await this.initialize();

    const channel = rabbitMQClient.getChannel();

    // Format the exact payload the Notification Service Consumer expects
    const payload = { targetUserId, eventType, data };
    const messageBuffer = Buffer.from(JSON.stringify(payload));
    const routingKey = `user.${targetUserId}`;
    const isPublished = channel.publish(
      SSE_EXCHANGE,
      routingKey, // Routing key is ignored by fanout exchanges
      messageBuffer,
      {
        persistent: true,
        contentType: "application/json",
      },
    );

    if (isPublished) {
      console.log(
        `📤 Emitted live event [${eventType}] to User ${targetUserId}`,
      );
    } else {
      console.warn(
        `⚠️ Back-pressure: Could not emit [${eventType}] immediately`,
      );
    }
  }

  static async emitEmailNotification(
    recipientEmail: string,
    templateCode: Notification_Templates_ENUM,
    templateData: {
      otp?: string;
      email?: string;
      company_name?: string;
      minutes?: string;
      [key: string]: unknown;
    },
  ): Promise<void> {
    if (!this.initialized) await this.initialize();

    const channel = rabbitMQClient.getChannel();
    const payload = {
      eventType: "EMAIL",  
      recipient: recipientEmail,
      template_code: templateCode,  
      template_data: templateData,
      timestamp: new Date().toISOString(),
    };

    const messageBuffer = Buffer.from(JSON.stringify(payload));
    const routingKey = "email.send"; 

    const isPublished = channel.publish(
      EMAIL_EXCHANGE,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: "application/json",
        timestamp: Math.floor(Date.now() / 1000),
      },
    );

    if (isPublished) {
      console.log(
        `📤 Published EMAIL event [${templateCode}] to ${recipientEmail}`,
      );
    } else {
      console.warn(`⚠️ Back-pressure: Could not publish EMAIL event`);
    }
  }
}
