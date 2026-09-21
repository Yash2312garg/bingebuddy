import rabbitMQClient from "../../config/rabbitmq";
import { NotificationDao } from "../../dao/notification.dao";
import { EmailProvider } from "../../providers/email.provider";
import crypto from "crypto"; 
import { DLQ_QUEUE, DLX, EMAIL_EXCHANGE, EMAIL_QUEUE, MAX_RETRIES } from "./constants";

interface EmailPayload {
  eventType: "EMAIL";
  recipient: string;
  template_code: string;
  template_data: Record<string, unknown>;
  timestamp: string;
  event_id?: string;
}

export class EmailConsumer {
  static async initialize(): Promise<void> {
    const channel = rabbitMQClient.getChannel();

    // 1. Setup Dead Letter Exchange & Queue
    await channel.assertExchange(DLX, 'direct', { durable: true });
    await channel.assertQueue(DLQ_QUEUE, { durable: true });
    await channel.bindQueue(DLQ_QUEUE, DLX, 'to-dlq');
    
    // 2. Setup Main Email Exchange & Queue (linked to DLX)
    await channel.assertExchange(EMAIL_EXCHANGE, "direct", { durable: true });
    await channel.assertQueue(EMAIL_QUEUE, { 
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX,
        'x-dead-letter-routing-key': 'to-dlq'
      }
    });
    await channel.bindQueue(EMAIL_QUEUE, EMAIL_EXCHANGE, "email.send");
    await channel.prefetch(5); 

    channel.consume(EMAIL_QUEUE, async (msg) => {
      if (!msg) return;

      const headers = msg.properties.headers || {};
      const retries = headers["x-retries"] || 0;
      let payload: EmailPayload;

      // --- PHASE 1: Parse Validation ---
      try {
        payload = JSON.parse(msg.content.toString());
      } catch (err) {
        console.error("❌ [Email] Malformed JSON. Sending straight to DLQ.");
        // Bad JSON will never magically fix itself on retry. DLQ it immediately.
        channel.nack(msg, false, false);
        return;
      }

      const eventId = payload.event_id || crypto.randomUUID();

      // --- PHASE 2: Execution & Retry Logic ---
      try {
        if (payload.eventType === "EMAIL") {
          const emailData = {
            to: payload.recipient,
            template_code: payload.template_code,
            ...payload.template_data, 
          };

          await EmailProvider.sendEmail(emailData);

          await NotificationDao.saveDeliveryLogs({
            event_id: eventId,
            recipient_id: payload.recipient,
            channel: "EMAIL",
            template_code: payload.template_code,
            status: "DELIVERED",
            error_reason: null,
          }).catch(console.error); 
        }

        channel.ack(msg); // Success!

      } catch (error) {
        console.error(`⚠️ [Email Consumer] Attempt ${retries + 1} failed:`, error);
        
        if (retries < MAX_RETRIES) {
          // REPUBLISH PATTERN: Clone the message, increment retry, send to back of queue
          channel.publish(EMAIL_EXCHANGE, "email.send", msg.content, {
            ...msg.properties,
            headers: { ...headers, "x-retries": retries + 1 }
          });
          channel.ack(msg); // Delete the old one
          
        } else {
          console.error(`❌ [Email] Max retries reached. Routing to DLQ.`);
          
          // Log final failure to the Flight Recorder table
          await NotificationDao.saveDeliveryLogs({
            event_id: eventId,
            recipient_id: payload.recipient,
            channel: "EMAIL",
            template_code: payload.template_code,
            status: "FAILED",
            error_reason: error instanceof Error ? error.message : "Unknown error",
          }).catch(console.error);

          // Nack without requeue natively pushes it to the DLX/DLQ
          channel.nack(msg, false, false);
        }
      }
    });

    channel.on("error", (err) => console.error("[Email Consumer] Channel error:", err.message));
    channel.on("close", () => console.warn("[Email Consumer] Channel closed"));
  }
}