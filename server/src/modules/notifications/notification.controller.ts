import { Request,Response } from "express";
import { RecipientType } from "./notification.types";
import { createClient } from "redis";
const REDIS_URL = process.env.REDIS_URL
export class NotificationController{

    static async streamNotification(req:Request, res:Response):Promise<void>{
        const recipientId = req.query.recipientId as string;
        const recipientType = req.query.recipientType as RecipientType;
        if (!recipientId || !recipientType) {
            res.status(400).json({ error: "Missing recipientId or recipientType query parameters." });
            return;
        }
        console.log(`[SSE] New connection attempt from ${recipientType} ID: ${recipientId}`);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.write("retry: 10000\n");
        res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);
        // 3. Spawning a DEDICATED, independent Redis Subscriber Client instance
        // Remember the rule: Once a client runs .subscribe(), it is LOCKED and cannot do anything else.
        if(!REDIS_URL){
            return 
        }
        const subscriberClient = createClient({
            url: REDIS_URL
        });
        try {
            await subscriberClient.connect();
            // Construct the exact channel namespace matching what the worker publishes to
            const channel = `notifications:${recipientType.toLowerCase()}:${recipientId}`;
            await subscriberClient.subscribe(channel, (message: string) => {
                console.log(`[SSE] Intercepted broadcast on channel [${channel}]. Forwarding to client window...`);
                
                // CRITICAL SSE FORMATTING RULE: 
                // Every message sent over SSE MUST begin with "data: " and end with a double newline "\n\n"
                res.write(`data: ${message}\n\n`);
            });
            console.log(`[SSE] Connection active. Subscriber client successfully locked into channel: ${channel}`);
        }catch (redisError) {
            console.error("[SSE Redis Error] Failed to spin up subscriber pipeline:", redisError);
            res.end();
            return;
        }
        req.on('close', async () => {
            console.log(`[SSE] Client disconnected (${recipientType} ID: ${recipientId}). Commencing resource teardown...`);
            
            try {
                // Safely unsubscribe and cleanly close the network socket connection to Redis
                await subscriberClient.unsubscribe();
                await subscriberClient.quit();
                console.log(`[SSE Teardown] Dedicated Redis client successfully terminated for ${recipientId}.`);
            } catch (teardownError) {
                console.error("[SSE Teardown Error] Failed to cleanly shut down dynamic subscriber client:", teardownError);
            }
        });
    }
}