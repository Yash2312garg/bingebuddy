import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import notificationRouter from './routes/notification.router'
import cors from 'cors';
// Load environment variables
import { isServiceReady } from './server';
dotenv.config();
// declare module 'nodemailer-html-to-text';
const app: Application = express();

// Middleware to parse incoming JSON requests
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use('/api/v1/notifications', notificationRouter); // <-- Router mounted

// A simple health check route to verify the microservice is up
app.get('/health', (req: Request, res: Response) => {
  // Only return 200 if fully initialized
  if (!isServiceReady) {
    return res.status(503).json({
      status: 'starting',
      message: 'Service is starting up, please wait...',
    });
  }

  res.status(200).json({
    status: 'ok',
    message: 'Notification service is healthy and running',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});



export default app;