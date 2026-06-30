import express from "express";
import type { Response, Request } from "express";
import { pool } from "./database/db";
import { redisClient } from "./database/redis";
import { RestaurantLoginSession } from "./sessions/RestaurantLoginSession";
import restaurantPreLoginRoutes from "./routes/restaurant/prelogin.routes";
import restaurantMenuRoutes from "./routes/restaurant/menu.routes";
import restaurantCategoryRoutes from "./routes/restaurant/categories.routes";
import restaurantAuthRoutes from "./routes/auth/auth.routes";
import restaurantInfoRoutes from "./routes/restaurant/restaurant.routes";
import cookieParser from "cookie-parser";
import "dotenv/config";
import "./types/express-session";
import helmet from "helmet";
import cors from "cors";
import rabbitMQClient from "./config/rabbitmq";
import { EventPublisher } from "./services/rabbitmq/eventPublisher";

const app = express();

// ===== IMPORTANT: Track service readiness =====
(app as any).isReady = false;

app.use(RestaurantLoginSession);
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use("/restaurant/prelogin", restaurantPreLoginRoutes);
app.use("/restaurant/menu", restaurantMenuRoutes);
app.use("/restaurant/categories", restaurantCategoryRoutes);
app.use("/auth", restaurantAuthRoutes);
app.use("/restaurant/info", restaurantInfoRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json("Hello World!");
});

// ===== IMPORTANT: Updated Health Check =====
app.get('/health', (_req: Request, res: Response) => {
  const isReady = (app as any).isReady;

  // If still initializing, return 503 Service Unavailable
  if (!isReady) {
    return res.status(503).json({
      status: 'starting',
      message: 'Server is initializing, please wait...',
    });
  }

  // Fully initialized
  return res.status(200).json({
    status: 'ok',
    message: 'Main API server is healthy and running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Initialize all dependencies in correct order:
 * 1. Connect to Redis
 * 2. Connect to RabbitMQ
 * 3. Initialize Event Publisher
 * 4. Connect to PostgreSQL
 * 5. Start HTTP server
 * 6. Mark service as ready
 */
const startServer = async () => {
  try {
    console.log('🔄 Initializing Main Server...');

    // Step 1: Redis
    console.log('📍 Connecting to Redis...');
    await redisClient.connect();
    console.log('✅ Redis connected');

    // Step 2: RabbitMQ
    console.log('📡 Connecting to RabbitMQ...');
    await rabbitMQClient.connect();
    console.log('✅ RabbitMQ connected');
    
    // Step 3: Event Publisher
    console.log('📢 Initializing Event Publisher...');
    await EventPublisher.initialize();
    console.log('✅ Exchanges "bingebuddy_events" & "bingebuddy_sse_direct" ready');

    // Step 4: PostgreSQL
    console.log('🗄️ Connecting to PostgreSQL...');
    const Client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');
    Client.release();

    // Step 5: Start HTTP server
    // Use Promise wrapper to ensure server is ACTUALLY listening before resolving
    return new Promise<void>((resolve, reject) => {
      const server = app.listen(process.env.PORT || 3000, () => {
        const port = process.env.PORT || 3000;
        console.log(`✅ HTTP server listening on port ${port}`);
        
        // ===== CRITICAL: Mark service as ready ONLY after server is listening =====
        (app as any).isReady = true;
        
        console.log(`🚀 Main Server fully initialized and ready`);
        resolve();
      });

      // Handle server errors
      server.on('error', (error: Error) => {
        console.error('❌ Server failed to start:', error);
        (app as any).isReady = false;
        reject(error);
      });

      // Timeout protection: if server doesn't start within 10 seconds, fail
      const startupTimeout = setTimeout(() => {
        server.close();
        console.error('❌ Server startup timeout (10s)');
        reject(new Error('Server startup timeout'));
      }, 10000);

      // Clear timeout if server successfully started
      server.once('listening', () => {
        clearTimeout(startupTimeout);
      });
    });

  } catch (error) {
    console.error('❌ Failed to initialize Main Server:', error);
    (app as any).isReady = false;
    process.exit(1);
  }
};

// Start server initialization
startServer().catch((error) => {
  console.error('❌ Fatal error during initialization:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  (app as any).isReady = false;
  
  try {
    await redisClient.disconnect?.();
    console.log('✅ Redis disconnected');
  } catch (error) {
    console.error('⚠️ Error disconnecting from Redis:', error);
  }

  try {
    await rabbitMQClient.close?.();
    console.log('✅ RabbitMQ disconnected');
  } catch (error) {
    console.error('⚠️ Error disconnecting from RabbitMQ:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  (app as any).isReady = false;
  
  try {
    await redisClient.disconnect?.();
    console.log('✅ Redis disconnected');
  } catch (error) {
    console.error('⚠️ Error disconnecting from Redis:', error);
  }

  try {
    await rabbitMQClient.close?.();
    console.log('✅ RabbitMQ disconnected');
  } catch (error) {
    console.error('⚠️ Error disconnecting from RabbitMQ:', error);
  }
  
  process.exit(0);
});