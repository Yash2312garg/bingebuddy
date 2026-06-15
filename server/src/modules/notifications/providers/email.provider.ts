// src/modules/notifications/providers/email.provider.ts

import { TriggerNotificationPayload } from "../notification.types";

export class EmailProvider {
    static async send(payload: TriggerNotificationPayload): Promise<void> {
        console.log(`[EmailProvider] Transmitting email to ${payload.recipientType} [${payload.recipientId}] via SMTP Stub.`);
        // Future SMTP integration (Nodemailer, SendGrid, etc.) goes here
    }
}