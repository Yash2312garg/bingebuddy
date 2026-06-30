import amqp, { ChannelModel, Channel } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const MAX_RETRIES   = 5;
const RETRY_DELAY_MS = 5_000;

class RabbitMQClient {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;

  // ─── Public API ────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.channel || this.isConnecting) return;
    await this.connectWithRetry();
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not ready — call connect() first');
    }
    return this.channel;
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.channel = null;
      this.connection = null;
      console.log(' RabbitMQ connection closed gracefully');
    } catch (err) {
      console.error('RabbitMQ close error:', err);
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private async connectWithRetry(attempt = 1): Promise<void> {
    this.isConnecting = true;

    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      this.connection = conn;

      const ch = await conn.createChannel();
      this.channel = ch;
      this.isConnecting = false;

      console.log('✅ RabbitMQ connected');

      // Reconnect automatically if the connection drops unexpectedly
      conn.on('error', (err) => {
        console.error('RabbitMQ connection error:', err.message);
        this.scheduleReconnect();
      });

      conn.on('close', () => {
        console.warn('⚠️  RabbitMQ connection closed — reconnecting...');
        this.scheduleReconnect();
      });

    } catch (err) {
      this.isConnecting = false;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ RabbitMQ connection attempt ${attempt}/${MAX_RETRIES} failed: ${message}`);

      if (attempt >= MAX_RETRIES) {
        console.error('RabbitMQ: max retries reached — exiting');
        process.exit(1);
      }

      await this.delay(RETRY_DELAY_MS);
      await this.connectWithRetry(attempt + 1);
    }
  }

  private scheduleReconnect(): void {
    this.channel = null;
    this.connection = null;

    setTimeout(() => {
      this.connectWithRetry().catch((err) =>
        console.error('RabbitMQ reconnect failed:', err)
      );
    }, RETRY_DELAY_MS);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton — one connection shared across the entire app
const rabbitMQClient = new RabbitMQClient();

// Graceful shutdown — close the connection before the process exits
process.on('SIGTERM', () => rabbitMQClient.close());
process.on('SIGINT',  () => rabbitMQClient.close());

export default rabbitMQClient;
