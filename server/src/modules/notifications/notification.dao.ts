// src/modules/notifications/notification.dao.ts

import { TriggerNotificationPayload, Notification } from "./notification.types";
import { pool } from "../../database/db";

export class NotificationPostgresDao {
  /**
   * Commits a new notification directly into the PostgreSQL tracking table
   */
  static async create(payload: TriggerNotificationPayload): Promise<Notification> {
    const {
      recipientId,
      recipientType,
      eventType,
      title,
      message,
      actionUrl,
      metadata,
      priority,
    } = payload;

    const query = `
      INSERT INTO notifications (
        recipient_id, 
        recipient_type, 
        event_type, 
        title, 
        message, 
        action_url, 
        metadata, 
        priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      recipientId,
      recipientType,
      eventType,
      title,
      message,
      actionUrl || null,
      metadata ? JSON.stringify(metadata) : '{}',
      priority || 'LOW'
    ];

    const result = await pool.query(query, values);
    
    if (result.rows && result.rowCount > 0) {
      return result.rows[0] as Notification;
    }
    
    throw new Error("Failed to insert notification row into PostgreSQL.");
  }
}