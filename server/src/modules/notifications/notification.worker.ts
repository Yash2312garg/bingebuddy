// src/modules/notifications/notification.worker.ts

import * as os from "os";
import { redisStreamClient } from "./redis.config";
import { redisClient } from "../../database/redis";
import { TriggerNotificationPayload, Notification } from "./notification.types";
import { NotificationPostgresDao } from "./notification.dao";
import { EmailProvider } from "./providers/email.provider";
import { SmsProvider } from "./providers/sms.provider";

export class RedisConsumer {
  static getKey = () => "global_notifications";
  static getGroupName = () => "notification_processing_group";
  static getMaxRetries = () => 3;
  static getMinIdleTimeForClaim = () => 60000;

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
        return;
      }
      throw err;
    }
  }

  static async startWorkerLoop(): Promise<void> {
    const streamKey = this.getKey();
    const groupName = this.getGroupName();

    const consumerName = `notification-worker:${os.hostname()}:${process.pid}`;

    await this.createConsumerGroup();
    // console.log(`[Worker Started] Listening as consumer: ${consumerName}`);

    while (true) {
      // console.log("inside the worker loop ");
      try {
        let messagesToProcess: any[] = [];
        // let isClaimedMessage: boolean = false;
        // =================================================================
        // Step 5: Active Failover (XAUTOCLAIM)
        // Check for messages abandoned by dead workers that have been idle
        // =================================================================

        const claimResult = (await redisStreamClient.XAUTOCLAIM(
          streamKey,
          groupName,
          consumerName,
          this.getMinIdleTimeForClaim(),
          "0-0",
          { COUNT: 1 },
          // Start scanning from the absolute beginning of the PEL
        )) as any;
        if (
          claimResult &&
          claimResult.messages &&
          claimResult.messages.length > 0
        ) {
          messagesToProcess = claimResult.messages;
          // isClaimedMessage = true;
          console.log(
            `[Failover] Rescued abandoned message [${messagesToProcess[0].id}] from a dead worker.`,
          );
        }
        if (messagesToProcess.length === 0) {
          const response = (await redisStreamClient.xReadGroup(
            groupName,
            consumerName,
            { key: streamKey, id: ">" },
            { BLOCK: 1000, COUNT: 1 },
          )) as any[];
          if (response && response.length > 0) {
            messagesToProcess = response[0].messages;
          }
        }
        if (!messagesToProcess || messagesToProcess.length === 0) {
          continue;
        }
        const rawMessage = messagesToProcess[0]; // FIXED: Plural 'messages' mapping
        if (!rawMessage) continue;

        const redisMessageId = rawMessage.id;
        const stringifiedPayload = rawMessage.message.payload;
        const parsedPayload: TriggerNotificationPayload =
          JSON.parse(stringifiedPayload);
        console.log(
          `[Processing] Active Node Handling Event [${redisMessageId}] for ${parsedPayload.recipientType} ID: ${parsedPayload.recipientId}`,
        );
        console.log(
          `[Worker] Intercepted event [${redisMessageId}] for ${parsedPayload.recipientType} ID: ${parsedPayload.recipientId}`,
        );

        try {
          await this.routeNotification(parsedPayload);
          await redisStreamClient.xAck(streamKey, groupName, redisMessageId);
          console.log(
            `[Success] Cleared Event [${redisMessageId}] from active tracking ledger.`,
          );
        } catch (processingError: any) {
          console.error(
            `[Execution Error] Processing broken on [${redisMessageId}]:`,
            processingError.message,
          );

          // Trigger the Dead Letter Queue tracking assessment
          await this.handleMessageFailure(
            streamKey,
            groupName,
            redisMessageId,
            stringifiedPayload,
            processingError.message,
          );
        }
      } catch (loopError) {
        console.error(
          "[Worker Loop Error] Pipeline failure encountered. Evading crash, retrying in 1s...",
          loopError,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private static async handleMessageFailure(
    streamKey: string,
    groupName: string,
    messageId: string,
    rawPayload: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      const pendingInfo = (await redisStreamClient.xPendingRange(
        streamKey,
        groupName,
        messageId,
        messageId,
        1,
      )) as any[];
      const deliveryCount = pendingInfo[0]?.deliveryCount || 1;
      if (deliveryCount >= this.getMaxRetries()) {
        const dlqStreamKey = `${streamKey}_dlq`;
        console.error(
          ` [DLQ EXTRUCTION] Message [${messageId}] reached poison threshold (${deliveryCount}/${this.getMaxRetries()}). Evicting...`,
        );


        // Log the structural corpse to the DLQ stream for admin autopsy
        await redisClient.xAdd(dlqStreamKey, "*", {
          originalMessageId: messageId,
          evictionTime: new Date().toISOString(),
          errorReason: errorMessage,
          payload: rawPayload,
        });
        await redisStreamClient.xAck(streamKey, groupName, messageId);
        console.log(
          `[DLQ] Active stream unlogged. Poison event [${messageId}] isolated cleanly.`,
        );
      } else {
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
  static async routeNotification(
    payload: TriggerNotificationPayload,
  ): Promise<void> {
    switch (payload.eventType) {
      case "IN_APP":
        // Persist to relational storage
        const savedNotification: Notification =
          await NotificationPostgresDao.create(payload);

        // Broadcast downstream to real-time client windows
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
