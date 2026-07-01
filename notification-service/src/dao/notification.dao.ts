import { pool } from "../config/db";

export class NotificationDao {
  static async saveInAppNotification(payload: any) {
    const query = `
        INSERT into in_app_notifications (
        recipient_id,
        recipient_type,
        title,
        message,
        action_url,
        metadata,
        is_read
        ) 
        VALUES (
        $1,$2,$3,$4,$5,$6,$7)`;
    const values = [
      payload.recipient_id,
      payload.recipient_type,
      payload.title,
      payload.message,
      payload.action_url,
      payload.metadata,
      payload.is_read,
    ];
    const result = await pool.query(query, values);
  }
  static async saveDeliveryLogs(payload: any) {
    const query = `
        INSERT into notification_delivery_logs (
        event_id,
        recipient_id,
        channel,
        template_code,
        status,
        error_reason
        ) 
        VALUES (
        $1,$2,$3,$4,$5,$6)`;
    const values = [
      payload.event_id,
      payload.recipient_id,
      payload.channel,
      payload.template_code,
      payload.status,
      payload.error_reason,
    ];
    const result = await pool.query(query, values);
  }
}
