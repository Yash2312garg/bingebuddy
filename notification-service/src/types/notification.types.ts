// src/modules/notifications/notification.types.ts
export type RecipientType = 'USER' | 'RESTAURANT' | 'ADMIN';
export type EventType = 'SMS' | 'EMAIL' | 'IN_APP';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';


export interface TriggerNotificationPayload {
    recipientId: string; // Using string to hold Ints, UUIDs, etc.
    recipientType: RecipientType;
    eventType: EventType;
    title: string;
    message: string;
    actionUrl?: string; // Optional (?)
    metadata?: Record<string, any>; // Flexible JSON object
    priority?: Priority; // Optional, will default to LOW in DB
}

export interface Notification {
    id: string; 
    recipient_id: string; 
    recipient_type: RecipientType; 
    event_type: EventType; 
    title: string; 
    message: string; 
    action_url: string | null; 
    metadata: Record<string, any>;
    is_read: boolean; 
    priority: Priority; 
    created_at: Date; 
    updated_at: Date;
}

export interface NotificationDocument extends TriggerNotificationPayload {
    id: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}