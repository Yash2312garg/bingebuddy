// src/modules/notifications/notification.worker.ts

import * as os from "os";
import { redisStreamClient } from "./redis.config";
import { redisClient } from "../../database/redis";
import { TriggerNotificationPayload, Notification } from "./notification.types";
import { NotificationPostgresDao } from "./notification.dao";
import { EmailProvider } from "./providers/email.provider";
import { SmsProvider } from "./providers/sms.provider";

/**
 * RedisConsumer handles background processing of notification events.
 * Implements an advanced lifecycle including self-healing (XAUTOCLAIM) 
 * and poison pill isolation via a Dead Letter Queue (DLQ).
 */
export class RedisConsumer {
  // Main ingress stream key name
  static getKey = () => "global_notifications";
  
  // Consumer group name sharing the workload
  static getGroupName = () => "notification_processing_group";
  
  // Maximum number of times a message can fail and be retried before eviction
  static getMaxRetries = () => 3;
  
  // Minimum time (1 minute) a message must sit unacknowledged in a dead worker's 
  // queue before this instance is allowed to rescue it.
  static getMinIdleTimeForClaim = () => 60000;

  /**
   * Initializes the consumer group on the Redis stream if it doesn't already exist.
   */
  static async createConsumerGroup(): Promise<void> {
    const streamKey = this.getKey();
    const groupName = this.getGroupName();

    try {
      await redisClient.xGroupCreate(streamKey, groupName, "$", {
        MKSTREAM: true,
      });
      console.log(
        `[Worker Init] Consumer group ${groupName} successfully validated.`,
      );
    } catch (err: any) {
      if (err.message && err.message.includes("BUSYGROUP")) {
        return; // Safe catch: group already created by another node running parallel code
      }
      throw err;
    }
  }

  /**
   * Main infinite processing engine executing self-healing lookups and event routing.
   */
  static async startWorkerLoop(): Promise<void> {
    const streamKey = this.getKey();
    const groupName = this.getGroupName();

    // Unique name structure for tracking health: notification-worker:hostname:processId
    const consumerName = `notification-worker:${os.hostname()}:${process.pid}`;

    await this.createConsumerGroup();

    while (true) {
      try {
        let messagesToProcess: any[] = [];

        // --- STEP 1: FAILOVER LOOKUP (XAUTOCLAIM) ---
        // Before pulling brand-new tasks, proactively check if another worker crashed.
        // "0-0" is the stream cursor, telling Redis to scan the Pending Entries List (PEL) from the beginning.
        const claimResult = (await redisStreamClient.XAUTOCLAIM(
          streamKey,
          groupName,
          consumerName,
          this.getMinIdleTimeForClaim(), // Only claim tasks left abandoned for > 60s
          "0-0", 
          { COUNT: 1 },                  // Claim 1 abandoned message at a time to keep loops lean
        )) as any;

        // If an abandoned message was found, it's moved to this worker's PEL and returned here
        if (
          claimResult &&
          claimResult.messages &&
          claimResult.messages.length > 0
        ) {
          messagesToProcess = claimResult.messages;
          console.log(
            `[Failover] Rescued abandoned message [${messagesToProcess[0].id}] from a dead worker.`,
          );
        }

        // --- STEP 2: STANDARD CONSUMPTION (XREADGROUP) ---
        // If there were no abandoned messages to rescue, pull a normal new message from the stream.
        if (messagesToProcess.length === 0) {
          const response = (await redisStreamClient.xReadGroup(
            groupName,
            consumerName,
            { key: streamKey, id: ">" }, // ">" tells Redis: "Give me new tasks that have never been delivered"
            { BLOCK: 1000, COUNT: 1 },    // Long poll for up to 1s if stream is dead silent
          )) as any[];

          if (response && response.length > 0) {
            messagesToProcess = response[0].messages;
          }
        }

        // Base case: If both XAUTOCLAIM and XREADGROUP return empty, reset loop and listen again
        if (!messagesToProcess || messagesToProcess.length === 0) {
          continue;
        }

        // Safely pull the active target message payload
        const rawMessage = messagesToProcess[0]; 
        if (!rawMessage) continue;

        const redisMessageId = rawMessage.id;
        const stringifiedPayload = rawMessage.message.payload;
        const parsedPayload: TriggerNotificationPayload = JSON.parse(stringifiedPayload);

        console.log(
          `[Processing] Active Node Handling Event [${redisMessageId}] for ${parsedPayload.recipientType} ID: ${parsedPayload.recipientId}`,
        );

        // --- STEP 3: WORK EXECUTION ENGINE ---
        try {
          // Route data through the required channel (EMAIL, SMS, IN_APP)
          await this.routeNotification(parsedPayload);
          
          // Success: Clear message from the active tracking PEL ledger permanently
          await redisStreamClient.xAck(streamKey, groupName, redisMessageId);
          console.log(
            `[Success] Cleared Event [${redisMessageId}] from active tracking ledger.`,
          );
        } catch (processingError: any) {
          console.error(
            `[Execution Error] Processing broken on [${redisMessageId}]:`,
            processingError.message,
          );

          // If routing fails (network down, bad data structure), trigger the safety handler 
          // to calculate retry counts and potentially quarantine the message.
          await this.handleMessageFailure(
            streamKey,
            groupName,
            redisMessageId,
            stringifiedPayload,
            processingError.message,
          );
        }
      } catch (loopError) {
        // High-level system stabilizer: keeps the core loop running if an internal 
        // network exception disrupts Redis connectivity completely.
        console.error(
          "[Worker Loop Error] Pipeline failure encountered. Evading crash, retrying in 1s...",
          loopError,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Tracks delivery attempts of a failing message to safely process retries 
   * or quarantine poison pill structures directly into a Dead Letter Queue (DLQ).
   */
  private static async handleMessageFailure(
    streamKey: string,
    groupName: string,
    messageId: string,
    rawPayload: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      // Use xPendingRange to query metadata specifically for this single failing message ID
      const pendingInfo = (await redisStreamClient.xPendingRange(
        streamKey,
        groupName,
        messageId,
        messageId,
        1,
      )) as any[];

      // Every time a message is fetched via XREADGROUP or claimed via XAUTOCLAIM, 
      // Redis auto-increments its internal counter. We extract that number here.
      const deliveryCount = pendingInfo[0]?.deliveryCount || 1;

      // Check if the delivery counter has crossed our maximum threshold (3 attempts)
      if (deliveryCount >= this.getMaxRetries()) {
        const dlqStreamKey = `${streamKey}_dlq`; // Target key becomes: "global_notifications_dlq"
        
        console.error(
          ` [DLQ EXTRUCTION] Message [${messageId}] reached poison threshold (${deliveryCount}/${this.getMaxRetries()}). Evicting...`,
        );

        // Append the dead message alongside diagnostic error reasons to the independent DLQ stream.
        // This isolates the poison pill so engineers can debug it without stalling live traffic.
        await redisClient.xAdd(dlqStreamKey, "*", {
          originalMessageId: messageId,
          evictionTime: new Date().toISOString(),
          errorReason: errorMessage,
          payload: rawPayload,
        });

        // CRITICAL ACK: Once logged to the DLQ, we acknowledge the message on the *main* stream.
        // This drops it out of the active PEL, stopping the infinite error crash loop entirely.
        await redisStreamClient.xAck(streamKey, groupName, messageId);
        
        console.log(
          `[DLQ] Active stream unlogged. Poison event [${messageId}] isolated cleanly.`,
        );
      } else {
        // If max retries are not hit, we execute zero actions. The message naturally stays 
        // in the active PEL. Once its idle time crosses 60 seconds, XAUTOCLAIM will pick it up 
        // and trigger a retry attempt automatically.
        console.warn(
          `[Retry Loop] Event [${messageId}] returned to group pool. Counter state: ${deliveryCount}/${this.getMaxRetries()}`,
        );
      }
    } catch (dlqError) {
      console.error(
        "[Critical Guard Error] Failure executing internal DLQ diagnostic checks:",
        dlqError,
      );
    }
  }

  /**
   * Processes the structured payload and handles downstream routing mechanics.
   */
  static async routeNotification(
    payload: TriggerNotificationPayload,
  ): Promise<void> {
    switch (payload.eventType) {
      case "IN_APP":
        const savedNotification: Notification =
          await NotificationPostgresDao.create(payload);

        const channel = `notifications:${payload.recipientType.toLowerCase()}:${payload.recipientId}`;
        await redisClient.publish(channel, JSON.stringify(savedNotification));
        break;

      case "EMAIL":
        await EmailProvider.send(payload);
        break;

      case "SMS":
        await SmsProvider.send(payload);
        break;

      default:
        console.warn(
          `[Router] Unhandled delivery channel detected: ${payload.eventType}`,
        );
        break;
    }
  }
}