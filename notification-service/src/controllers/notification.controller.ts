// src/modules/notifications/notification.controller.ts

import { Request, Response } from "express";
import { SseRegistry } from "../services/sseRegistry";
// import

export class NotificationController {
  static async streamNotification(req: Request, res: Response): Promise<void> {
    const recipientId = req.query.recipientId as string;
    // const recipientType = req.query.recipientType as RecipientType;

    if (!recipientId) {
      res.status(400).json({
        error: "Missing recipientId or recipientType query parameters.",
      });
      return;
    }
    const connectionId = crypto.randomUUID();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.write("retry: 10000\n");
    res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);

    SseRegistry.addClient(recipientId, connectionId, res);
    req.on("close", () => {
      SseRegistry.removeClient(recipientId, connectionId);
    });
  }
}
