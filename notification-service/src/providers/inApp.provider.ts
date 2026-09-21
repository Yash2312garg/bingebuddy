import { SseRegistry } from "../services/sseRegistry";
import { NotificationDao } from "../dao/notification.dao";
// Assuming you have a DeliveryLogDao for your saveDeliveryLogs function
import crypto from "crypto"; // To generate a fallback event_id

export async function IN_APP_provider(targetUserId: string, eventType: string, data: any) {
  const eventId = data.event_id || crypto.randomUUID();

  try {
    // 1. ALWAYS save to the user's inbox, whether they are online or not!
    await NotificationDao.saveInAppNotification({
      recipient_id: targetUserId,
      recipient_type: data.recipientType,
      title: data.title,
      message: data.message,
      action_url: data.action_url,
      metadata: {},
      is_read: false
    });

    // 2. Check if we can push it live via SSE
    if (SseRegistry.isOnline(targetUserId)) {
      SseRegistry.sendToUser(targetUserId, { type: eventType, data });
      console.log(`✅ [Consumer] Delivered live SSE to user ${targetUserId}`);
      
      // 3. LOG SUCCESS: Live push worked
      await NotificationDao.saveDeliveryLogs({
        event_id: eventId,
        recipient_id: targetUserId,
        channel: "IN_APP",
        template_code: "SYSTEM_ALERT", // Or whatever fits your enums
        status: "DELIVERED",
        error_reason: null,
      }).catch(console.error); // Fire and forget so a log error doesn't crash the app
    } else {
       // LOG QUEUED/SKIPPED: They were offline, but it's safe in their DB inbox
       await NotificationDao.saveDeliveryLogs({
        event_id: eventId,
        recipient_id: targetUserId,
        channel: "IN_APP",
        template_code: "SYSTEM_ALERT",
        status: "QUEUED", // Or "OFFLINE_SAVED" if you add that to your enum
        error_reason: "User offline, saved to DB inbox",
      }).catch(console.error);
    }
  } catch (err) {
    console.error(`❌ [Consumer] In-App flow failed for ${targetUserId}:`, err);
    
    // 4. LOG FAILURE: Something crashed!
    await NotificationDao.saveDeliveryLogs({
      event_id: eventId,
      recipient_id: targetUserId,
      channel: "IN_APP",
      template_code: "SYSTEM_ALERT",
      status: "FAILED",
      error_reason: err instanceof Error ? err.message : "Unknown error",
    }).catch(console.error);
  }
}