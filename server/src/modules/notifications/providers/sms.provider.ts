// src/modules/notifications/providers/sms.provider.ts

import { TriggerNotificationPayload } from "../notification.types";

export class SmsProvider {
    static async send(payload: TriggerNotificationPayload): Promise<void> {
        console.log(`[SmsProvider] Dispatching SMS wire text to ${payload.recipientType} [${payload.recipientId}] via Telephony Stub.`);
        // Future API integration (Twilio, Vonage, etc.) goes here
    }
}