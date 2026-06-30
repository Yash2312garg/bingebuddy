import rabbitMQClient from "../config/rabbitmq";
import { EmailProvider } from "../providers/email.provider";

const EMAIL_EXCHANGE = "bingebuddy_email";
const EMAIL_QUEUE = "email_delivery_queue";

interface EmailPayload {
  eventType: "EMAIL";
  recipient: string;
  template_code: string;
  template_data: Record<string, unknown>;
  timestamp: string;
}

export class EmailConsumer {
  static async initialize(): Promise<void> {
    const channel = rabbitMQClient.getChannel();

    // ===== FIXED: Use "direct" to match main server =====
    await channel.assertExchange(EMAIL_EXCHANGE, "direct", { durable: true });

    // Assert durable queue (survives restarts)
    await channel.assertQueue(EMAIL_QUEUE, { durable: true });

    // ===== FIXED: Bind with correct routing key =====
    await channel.bindQueue(EMAIL_QUEUE, EMAIL_EXCHANGE, "email.send");

    await channel.prefetch(5); // Process 5 messages at a time

    console.log(`📧 [Email Consumer] Ready and listening on: ${EMAIL_QUEUE}`);

    channel.consume(EMAIL_QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const payload: EmailPayload = JSON.parse(msg.content.toString());

        console.log(
          `📧 [Email Consumer] Received email for ${payload.recipient}`
        );

        // ===== FIXED: Use correct payload structure =====
        if (payload.eventType === "EMAIL") {
          // Prepare data for EmailProvider
          const emailData = {
            to: payload.recipient,
            template_code: payload.template_code,
            ...payload.template_data, // Spread template variables (otp, company_name, etc.)
          };

          await EmailProvider.sendEmail(emailData);
          console.log(
            `✅ [Email Consumer] Email sent successfully to ${payload.recipient}`
          );
        }

        channel.ack(msg); // Remove from queue only after successful send

      } catch (error) {
        console.error(`❌ [Email Consumer] Failed to process message:`, error);
        // Requeue message so it gets retried
        channel.nack(msg, false,false);
      }
    });

    // Handle channel errors
    channel.on("error", (err) => {
      console.error("[Email Consumer] Channel error:", err.message);
    });

    channel.on("close", () => {
      console.warn("[Email Consumer] Channel closed");
    });
  }
}