// src/modules/notifications/notification.router.ts

import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";


const notificationRouter = Router();

notificationRouter.get("/stream", NotificationController.streamNotification);
notificationRouter.post("/trigger", async (req, res) => {
  try {
    const { recipientId, recipientType, eventType, title, message, priority } = req.body;
    
    // Pass the payload directly to your Redis Stream producer logic
    await NotificationService.triggerNotification({
      recipientId,
      recipientType,
      eventType,
      title,
      message,
      priority
    });

    // Respond back to your test script with a clean 200 OK
    res.status(200).json({ success: true, message: "Notification safely added to Redis Stream log." });
  } catch (error: any) {
    console.error("Error in test trigger route:", error.message);
    res.status(500).json({ error: error.message });
  }
});
export default notificationRouter;