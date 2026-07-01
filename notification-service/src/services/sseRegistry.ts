import type { Response } from "express";
import { NotificationConsumer } from "./consumers/notification.consumer";

interface SseClient {
  res: Response;
  connectedAt: Date;
}
interface SseEvent {
  type: string; // maps to EventSource's `addEventListener('type', ...)`
  data: unknown;
}

// ─── Config ─────────────────────────────────────────────────────────────────

// NGINX / AWS ALB / most proxies kill idle HTTP connections after ~60s.
// A heartbeat comment every 30s keeps the connection alive.
const HEARTBEAT_INTERVAL_MS = 30_000;

export class SseRegistry {
  private static clients = new Map<string, Map<string, SseClient>>();
    private static heartbeatTimer:ReturnType<typeof setInterval>|null = null;

  /*---------------------------------------------------------------------------
    adding new client connections into the map initialised
    if the new user starts the connections a new map will be initialized and then new connections are
    added in the map generated. any single client can have multiple connections across  different 
    tabs and browsers
  ---------------------------------------------------------------------------*/

  static async addClient(userId: string, connectionId: string, res: Response) {
    if (!this.clients.has(userId)) {

      this.clients.set(userId, new Map());
      await NotificationConsumer.bindUser(userId).catch(console.error);
    }
    this.clients
      .get(userId)!
      .set(connectionId, { res, connectedAt: new Date() });

    this.ensureHeartbeat();
    console.log(
      `📡 [SSE] Connected   user=${userId} conn=${connectionId} ` +
        `| user-tabs=${this.clients.get(userId)!.size} | total-users=${this.clients.size}`,
    );
  }

  /* 
  cleaanyup function when a single connection closes of a perticular user 
  to prevent the memory leaks
  */
  static removeClient(userId: string, connectionId: string): void {
    const userConnections = this.clients.get(userId);
    if (!userConnections) return;
    userConnections.delete(connectionId);
    if (userConnections.size === 0) {
      this.clients.delete(userId);
    }
    console.log(
      `🔌 [SSE] Disconnected user=${userId} conn=${connectionId} ` +
        `| total-users=${this.clients.size}`,
    );
     if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
  }

  static sendToUser(userId: string, event: SseEvent) {
    const userConnections = this.clients.get(userId);
    if (!userConnections || userConnections.size === 0) {
      console.log(`⚠️  [SSE] User offline: ${userId}`);
      return;
    }
    const payload = this.formatEvent(event);

    for (const [connectionId, client] of userConnections) {
      try {
        client.res.write(payload);
      } catch (e) {
        console.error(
          `[SSE] Dead socket for user=${userId} conn=${connectionId} — removing`,
        );
        this.removeClient(userId, connectionId);
      }
    }
  }

  static broadcast(event:SseEvent){
    for(const userId of this.clients.keys()){
      this.sendToUser(userId,event)
    }
  }

  static isOnline(userId:string){
    return this.clients.has(userId);
  }
  private static formatEvent(event: SseEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  }
  static stats() {
    return {
      totalUsers:       this.clients.size,
      totalConnections: [...this.clients.values()].reduce((sum, m) => sum + m.size, 0),
    };
  }
private static sendHeartbeat(): void {
    const ping = ':  ping\n\n';
    for (const [userId, connections] of this.clients) {
      for (const [connectionId, client] of connections) {
        try {
          client.res.write(ping);
        } catch {
          this.removeClient(userId, connectionId);
        }
      }
    }
  }
 
  private static ensureHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    // Don't let this timer prevent Node from exiting
    this.heartbeatTimer.unref();
  }
 
  private static stopHeartbeat(): void {
    if (!this.heartbeatTimer) return;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}
