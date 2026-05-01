import type { Request, Response } from "express";


export interface ReturnResponseArguments {
    code: number
    message: number
    res: Response
    err: Error
}

export interface OTPRequest extends Request {
    session: Request['session'] & {
        otpIdentifier?: string;
        otpGeneratedAt?: number;
        isOTPVerified?: boolean;
        verifiedIdentifier?: string;
        verifiedAt?: number;
    };
}

export interface GenerateOTPBody {
    email?: string;
    phone_number?: string;
    reference_id?: string;
}

export interface VerifyOTPBody {
    identifier: string;
    otp: string;
}

export interface RateLimitConfig {
    window: number;
    max: number;
}

export interface RateLimitConfigs {
    GENERATE_OTP: RateLimitConfig;
    VERIFY_OTP: RateLimitConfig;
}

export interface CreateLimiterConfig {
    type: 'generate' | 'verify';
    config: RateLimitConfig;
}

export interface OTPConfig {
    LENGTH: number;
    TTL: number;
    MAX_ATTEMPTS: number;
    RESEND_COOLDOWN: number;
}