// src/modules/notifications/notification.controller.ts

import { Request, Response } from "express";
import { RecipientType } from "./notification.types";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

export class NotificationController {

    /**
     * Spawns a persistent Server-Sent Events (SSE) connection to stream 
     * real-time notifications directly to a user's web or mobile window.
     */
    static async streamNotification(req: Request, res: Response): Promise<void> {
        const recipientId = req.query.recipientId as string;
        const recipientType = req.query.recipientType as RecipientType;

        // 1. Validate Query Parameters
        // SSE requires unique targeting information up front to bind to the correct user channel.
        if (!recipientId || !recipientType) {
            res.status(400).json({ error: "Missing recipientId or recipientType query parameters." });
            return;
        }

        console.log(`[SSE] New connection attempt from ${recipientType} ID: ${recipientId}`);

        // 2. Initialize SSE HTTP Headers
        // These headers tell the client's browser and intermediary proxies (like Nginx) 
        // to keep the connection permanently open instead of closing it after a typical response.
        res.setHeader('Content-Type', 'text/event-stream'); // Sets the protocol to SSE
        res.setHeader('Cache-Control', 'no-cache');         // Disables client-side caching of stream data
        res.setHeader('Connection', 'keep-alive');          // Forces the underlying TCP socket to stay open
        res.setHeader('X-Accel-Buffering', 'no');           // CRITICAL: Disables buffering in reverse proxies (like Nginx) 
                                                            // so messages flush to the UI instantly without lag.

        // Configure client reconnection threshold (Instructs the browser to auto-reconnect if dropped after 10s)
        res.write("retry: 10000\n");
        // Send a baseline connection handshake payload to verify the pipeline is healthy
        res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);

        // Safeguard to ensure Redis configuration is active
        if (!REDIS_URL) {
            console.error("[SSE Setup Error] REDIS_URL environment variable is missing.");
            res.end();
            return;
        }

        // 3. Spawning a DEDICATED, independent Redis Subscriber Client instance
        // GOLDEN RULE REVISITED: Once a Redis connection executes a .subscribe() command, 
        // that connection drops into a read-only subscription state. It is LOCKED and cannot 
        // perform regular database operations (like GET or SET). Therefore, every active user 
        // SSE connection MUST spin up its own dedicated subscriber socket.
        const subscriberClient = createClient({
            url: REDIS_URL
        });

        try {
            await subscriberClient.connect();

            // Construct the exact channel namespace matching what your notification worker publishes to
            const channel = `notifications:${recipientType.toLowerCase()}:${recipientId}`;

            // Attach the callback handler to intercept broadcasts
            await subscriberClient.subscribe(channel, (message: string) => {
                console.log(`[SSE] Intercepted broadcast on channel [${channel}]. Forwarding to client window...`);
                
                // CRITICAL SSE FORMATTING RULE: 
                // The browser's EventSource API expects streaming text chunk packets to strictly 
                // begin with the keyword "data: " and terminate with a double newline character sequence ("\n\n").
                res.write(`data: ${message}\n\n`);
            });

            console.log(`[SSE] Connection active. Subscriber client successfully locked into channel: ${channel}`);
            
        } catch (redisError) {
            console.error("[SSE Redis Error] Failed to spin up subscriber pipeline:", redisError);
            res.end(); // Cleanly close the HTTP response to avoid leaking dangling client sockets
            return;
        }

        // 4. Resource Cleanup / Connection Teardown
        // If a user closes their tab, loses cell service, or refreshes the page, Express triggers the 'close' event.
        req.on('close', async () => {
            console.log(`[SSE] Client disconnected (${recipientType} ID: ${recipientId}). Commencing resource teardown...`);
            
            try {
                // EXTREMELY CRITICAL FOR PRODUCTION HEALTH:
                // If you forget to close the Redis subscriber client here, every user disconnection 
                // will leave a dead, orphaned connection lingering inside Redis. Over time, your 
                // Redis instance will hit its `maxclients` ceiling and stop accepting new traffic entirely.
                await subscriberClient.unsubscribe(); // Stop listening to the channel
                await subscriberClient.quit();        // Gracefully close the underlying Redis socket connection
                console.log(`[SSE Teardown] Dedicated Redis client successfully terminated for ${recipientId}.`);
            } catch (teardownError) {
                console.error("[SSE Teardown Error] Failed to cleanly shut down dynamic subscriber client:", teardownError);
            }
        });
    }
}