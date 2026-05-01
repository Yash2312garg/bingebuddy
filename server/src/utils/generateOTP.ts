const crypto = require('crypto')
import { redisClient } from "../database/redis";
import type {  CreateLimiterConfig, OTPConfig, RateLimitConfigs } from './Types';

import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt"


export const OTP_CONFIG: OTPConfig = {
    LENGTH: 6,
    TTL: 10 * 60, // 5 minutes in seconds
    MAX_ATTEMPTS: 3,
    RESEND_COOLDOWN: 60 // 1 minute in seconds
};

export const RATE_LIMIT_CONFIG: RateLimitConfigs = {
    GENERATE_OTP: {
        window: 60, // 1 minute window
        max: 3 // max 3 OTP generations per minute per IP
    },
    VERIFY_OTP: {
        window: 60, // 1 minute window
        max: 5 // max 5 verification attempts per minute per IP
    }
}
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

export const createRateLimiter = (config: CreateLimiterConfig) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const key = getClientKey(req, config.type);
            const current = await redisClient.get(key);
            
            if (current && parseInt(current) >= config.config.max) {
                res.status(429).json({
                    success: false,
                    message: `Too many requests. Try again in ${config.config.window} seconds.`,
                    retryAfter: config.config.window
                });
                return;
            }
            
            const multi = redisClient.multi();
            multi.incr(key);
            multi.expire(key, config.config.window);
            await multi.exec();
            
            next();
        } catch (error) {
            console.error('Rate limiting error:', error);
            next(); // Continue on rate limiter failure
        }
    };
};

export const generateOTPLimiter = createRateLimiter({
    type: 'generate',
    config: RATE_LIMIT_CONFIG.GENERATE_OTP
});


export const verifyOTPLimiter = createRateLimiter({
    type: 'verify',
    config: RATE_LIMIT_CONFIG.VERIFY_OTP
});


export class OTPService {
    static async generateAndStore(identifier: string): Promise<string> {
        const cooldownKey = getCooldownKey(identifier);
        const cooldownExists = await redisClient.exists(cooldownKey);
        
        if (cooldownExists) {
            const ttl = await redisClient.ttl(cooldownKey);
            throw new Error(`Please wait ${ttl} seconds before requesting a new OTP`);
        }
        
        const otp = createOTP();
        const hashedOTP = await bcrypt.hash(otp, 10);
        
        const otpKey = getOTPKey(identifier);
        const attemptsKey = getAttemptsKey(identifier);
        
        const multi = redisClient.multi();
        multi.setEx(otpKey, OTP_CONFIG.TTL, hashedOTP);
        multi.setEx(attemptsKey, OTP_CONFIG.TTL, OTP_CONFIG.MAX_ATTEMPTS.toString());
        multi.setEx(cooldownKey, OTP_CONFIG.RESEND_COOLDOWN, '1');
        
        await multi.exec();
        
        return otp;
    }
    static async verify(identifier: string, otp: string): Promise<boolean> {
        console.log(otp,typeof otp)

        const otpKey = getOTPKey(identifier);
        const attemptsKey = getAttemptsKey(identifier);
        console.log("otpKey",otpKey)
        // Check if OTP exists
        const storedHashedOTP = await redisClient.get(otpKey);

        if (!storedHashedOTP) {
            throw new Error('OTP expired or not found');
        }
        
        const remainingAttempts = await redisClient.get(attemptsKey);
        if (!remainingAttempts || parseInt(remainingAttempts) <= 0) {
            await redisClient.del(otpKey);
            await redisClient.del(attemptsKey);
            throw new Error('Maximum verification attempts exceeded');
        }
        
        const isValid = await bcrypt.compare(otp.toString(), storedHashedOTP);
        
        if (!isValid) {
            await redisClient.decr(attemptsKey);
            const newAttempts = parseInt(await redisClient.get(attemptsKey) || '0');
            throw new Error(`Invalid OTP. ${newAttempts} attempts remaining`);
        }
        
        await redisClient.del(otpKey);
        await redisClient.del(attemptsKey);
        await redisClient.del(getCooldownKey(identifier));
        
        return true;
    }
    static async getRemainingAttempts(identifier: string): Promise<number> {
        const attemptsKey = getAttemptsKey(identifier);
        const attempts = await redisClient.get(attemptsKey);
        return attempts ? parseInt(attempts) : 0;
    }
    static async getOTPTTL(identifier: string): Promise<number> {
        const otpKey = getOTPKey(identifier);
        return await redisClient.ttl(otpKey);
    }
    static async clear(identifier:string):Promise<void>{
        await redisClient.del(getOTPKey(identifier));
        await redisClient.del(getAttemptsKey(identifier));
        await redisClient.del(getCooldownKey(identifier));
    }

}