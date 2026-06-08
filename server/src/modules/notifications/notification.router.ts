// src/modules/notifications/notification.router.ts

import { Router } from "express";
import { NotificationController } from "./notification.controller";

const notificationRouter = Router();

notificationRouter.get("/stream", NotificationController.streamNotification);

export default notificationRouter;