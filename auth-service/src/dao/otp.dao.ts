import { redisClient } from "../database/redis";

export class OtpDao {
  static getOTPKey = (identifier: string): string => `otp:${identifier}`;
  static getAttemptsKey = (identifier: string): string => `otp:attempts:${identifier}`;
  static getCooldownKey = (identifier: string): string => `otp:cooldown:${identifier}`;
  static getResendsKey = (identifier: string): string => `otp:resends:${identifier}`;

  static async checkCoolDown(identifier: string): Promise<number | boolean> {
    return await redisClient.exists(this.getCooldownKey(identifier));
  }

  static async getCoolDownTTL(identifier: string): Promise<number> {
    const ttl = await redisClient.ttl(this.getCooldownKey(identifier));
    return ttl > 0 ? ttl : 0;
  }

  static async storeOTP(
    hashed_otp: string,
    identifier: string,
    ttl: number,
    attempts: number,
    cooldown: number
  ): Promise<void> {
    const multi = redisClient.multi();
    multi.setEx(this.getOTPKey(identifier), ttl, hashed_otp);
    multi.setEx(this.getAttemptsKey(identifier), ttl, attempts.toString());
    multi.setEx(this.getCooldownKey(identifier), cooldown, "1");
    await multi.exec();
  }

  static async getResendCount(identifier: string): Promise<number> {
    const count = await redisClient.get(this.getResendsKey(identifier));
    return count ? parseInt(count, 10) : 0;
  }

  static async incrementResendCount(identifier: string, ttl: number): Promise<number> {
    const multi = redisClient.multi();
    multi.incr(this.getResendsKey(identifier));
    multi.expire(this.getResendsKey(identifier), ttl);
    const results = await multi.exec();
    const newCount = results && results[0] ? Number(results[0]) : 1;
    return newCount;
  }

  static async getOtpTTL(identifier: string): Promise<number> {
    const ttl = await redisClient.ttl(this.getOTPKey(identifier));
    return ttl > 0 ? ttl : 0;
  }

  static async getOTP(identifier: string): Promise<string | null> {
    return await redisClient.get(this.getOTPKey(identifier));
  }

  static async getRemainingAttempts(identifier: string): Promise<string | null> {
    return await redisClient.get(this.getAttemptsKey(identifier));
  }

  static async decrement_attempt(identifier: string): Promise<number> {
    return await redisClient.decr(this.getAttemptsKey(identifier));
  }

  static async deleteCooldown(identifier: string): Promise<void> {
    await redisClient.del(this.getCooldownKey(identifier));
  }

  static async deleteHashedOtp(identifier: string): Promise<void> {
    await redisClient.del(this.getOTPKey(identifier));
  }

  static async deleteAttempts(identifier: string): Promise<void> {
    await redisClient.del(this.getAttemptsKey(identifier));
  }

  static async clearAll(identifier: string): Promise<void> {
    await Promise.all([
      redisClient.del(this.getOTPKey(identifier)),
      redisClient.del(this.getAttemptsKey(identifier)),
      redisClient.del(this.getCooldownKey(identifier)),
      redisClient.del(this.getResendsKey(identifier)),
    ]);
  }
}
