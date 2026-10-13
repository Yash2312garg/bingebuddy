const crypto = require('crypto');
import type { OTPConfig, RateLimitConfigs } from './Types';
import { OtpDao } from "../dao/otp.dao";
import type { Request } from "express";
import bcrypt from "bcryptjs";

export const OTP_CONFIG: OTPConfig = {
  LENGTH: 6,
  TTL: 10 * 60,         // 10 minutes in seconds
  MAX_ATTEMPTS: 3,      // Max failed verification attempts per session
  RESEND_COOLDOWN: 60,  // 1 minute cooldown between requests
  MAX_RESENDS: 3,       // Max times user can resend OTP per session
};

export const RATE_LIMIT_CONFIG: RateLimitConfigs = {
  GENERATE_OTP: {
    window: 60, // 1 minute window
    max: 3,     // max 3 OTP generations per minute per IP
  },
  VERIFY_OTP: {
    window: 60, // 1 minute window
    max: 5,     // max 5 verification attempts per minute per IP
  },
};

export const createOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const getClientKey = (req: Request, type: string): string => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `rate_limit:${type}:${ip}`;
};

export const getOTPKey = (identifier: string): string => `otp:${identifier}`;
export const getAttemptsKey = (identifier: string): string => `attempts:${identifier}`;
export const getCooldownKey = (identifier: string): string => `cooldown:${identifier}`;

export class OTPService {
  /**
   * Generates, hashes, and stores an OTP in Redis.
   *
   * @param identifier - Email or phone identifier
   * @param isResend - When true, verifies resend quota and preserves remaining verification attempts
   */
  static async generateAndStore(identifier: string, isResend: boolean = false): Promise<string> {
    // 1. Check if 60-second cooldown is still active
    const cooldownExists = await OtpDao.checkCoolDown(identifier);
    if (cooldownExists) {
      const ttl = await OtpDao.getCoolDownTTL(identifier);
      throw new Error(`Please wait ${ttl} seconds before requesting a new OTP`);
    }

    let attemptsToSet = OTP_CONFIG.MAX_ATTEMPTS;

    if (isResend) {
      // 2. Check maximum resends limit
      const resendCount = await OtpDao.getResendCount(identifier);
      if (resendCount >= OTP_CONFIG.MAX_RESENDS) {
        throw new Error(
          `Maximum OTP resend limit reached (${OTP_CONFIG.MAX_RESENDS}). Please wait for the session to expire.`
        );
      }

      // 3. Preserve existing verification attempts (prevent attacker from resetting attempts)
      const existingAttemptsStr = await OtpDao.getRemainingAttempts(identifier);
      const existingAttempts = existingAttemptsStr
        ? parseInt(existingAttemptsStr, 10)
        : OTP_CONFIG.MAX_ATTEMPTS;

      if (existingAttempts <= 0) {
        throw new Error("Maximum verification attempts exceeded for this session.");
      }

      attemptsToSet = existingAttempts;

      // 4. Increment the resend counter
      await OtpDao.incrementResendCount(identifier, OTP_CONFIG.TTL);
    }

    // 5. Generate and hash the OTP with bcrypt
    const otp = createOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // 6. Atomically store in Redis with appropriate attempts count and 60s cooldown
    await OtpDao.storeOTP(
      hashedOTP,
      identifier,
      OTP_CONFIG.TTL,
      attemptsToSet,
      OTP_CONFIG.RESEND_COOLDOWN
    );

    return otp;
  }

  static async verify(identifier: string, otp: string): Promise<boolean> {
    const storedHashedOTP = await OtpDao.getOTP(identifier);
    if (!storedHashedOTP) {
      throw new Error('OTP expired or not found');
    }

    const remainingAttempts = await this.getRemainingAttempts(identifier);
    if (!remainingAttempts || remainingAttempts <= 0) {
      await OtpDao.deleteHashedOtp(identifier);
      await OtpDao.deleteAttempts(identifier);
      throw new Error('Maximum verification attempts exceeded');
    }

    const isValid = await bcrypt.compare(otp.toString(), storedHashedOTP);

    if (!isValid) {
      await OtpDao.decrement_attempt(identifier);
      const newAttempts = (await this.getRemainingAttempts(identifier)) || 0;
      throw new Error(`Invalid OTP. ${newAttempts} attempts remaining`);
    }

    // Clear OTP, attempts, cooldown, and resends on successful verification
    await OtpDao.clearAll(identifier);
    return true;
  }

  static async getRemainingAttempts(identifier: string): Promise<number> {
    const attempts = await OtpDao.getRemainingAttempts(identifier);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  static async getOTPTTL(identifier: string): Promise<number> {
    return await OtpDao.getOtpTTL(identifier);
  }

  static async clear(identifier: string): Promise<void> {
    await OtpDao.clearAll(identifier);
  }
}