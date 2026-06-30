import app from './app';
import rabbitMQClient from './config/rabbitmq';
import { NotificationConsumer } from './services/notificationConsumer';
import { EmailConsumer } from './services/emailConsumer';

const PORT = process.env.PORT || 3001;

// Global flag to track if service is fully initialized
let isServiceReady = false;

async function bootstrap() {
  try {
    console.log('🔄 Starting Notification Service bootstrap...');

    // 1. Connect to RabbitMQ
    console.log('📡 Connecting to RabbitMQ...');
    await rabbitMQClient.connect();
    console.log('✅ RabbitMQ connected');

    // 2. Initialize consumer
    console.log('🎧 Initializing notification consumer...');
    await NotificationConsumer.initialize();
    await EmailConsumer.initialize();
    console.log('✅ Consumer initialized');

    // 3. Start the HTTP server and wait for it to listen
    return new Promise<void>((resolve, reject) => {
      const server = app.listen(PORT, () => {
        console.log(`✅ HTTP server listening on port ${PORT}`);
        isServiceReady = true; // ← Mark as ready ONLY when server listens
        console.log(`🚀 Notification Service fully initialized and ready`);
        resolve();
      });

      server.on('error', (error) => {
        console.error('❌ Server error:', error);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Failed to bootstrap Notification Service:', error);
    isServiceReady = false;
    process.exit(1);
  }
}

// Start bootstrap and handle promises
bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});

// Export isServiceReady for use in app
export { isServiceReady };