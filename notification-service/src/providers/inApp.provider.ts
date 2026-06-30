import { SseRegistry } from "../services/sseRegistry";

export function IN_APP_provider(targetUserId:string, eventType:string, data:any){
    if (SseRegistry.isOnline(targetUserId)) {
        try {
          SseRegistry.sendToUser(targetUserId, { type: eventType, data });
          console.log(`✅ [Consumer] Delivered to user ${targetUserId}`);
        } catch (err) {
          console.error(
            `[Consumer] SSE write failed for ${targetUserId}:`,
            err,
          );
        }
      }
}