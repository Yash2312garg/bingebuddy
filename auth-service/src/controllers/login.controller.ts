//server/src/controllers/restaurant/login.controller.ts
import { Request, Response } from "express";
import { return_response} from "../utils/errorRespone";
import { isValidEmail } from "../utils/validations";
import { checkReferenceID,getAccountInformation, } from "../models/restaurant/restaurant_accounts.model";
import { OTPService, OTP_CONFIG } from "../utils/generateOTP";

import { Restaurant_JWT } from "../serivces/restaurant/createwebtokens";
import { OtpDao } from "../dao/otp.dao";
import { DeviceIdCookie } from "../serivces/restaurant/getDeviceIdFromCookie";
import {refreshTokenDao} from "../dao/refreshToken.dao";
import { AuthCookies } from "../cookies/auth.cookies";
import { Notification_Templates_ENUM } from "../types/notificationTemplate.types";
import { EventPublisher } from "../serivces/rabbitmq/eventPublisher";

export const login = async (req: Request, res: Response) => {
  const { email, reference_id, phone_number } = req.body;

  if (!email && !reference_id && !phone_number) {
    const newError = new Error(
      "Request body is empty or missing required field"
    );
    return return_response(
      newError,
      "email, reference_id, or phone_number is required.",
      400,
      res
    );
  }

  let identifier: string;
  
  if (email) {
    if (!isValidEmail(email)) {
      const err = new Error("Email format is not valid");
      return return_response(err, "Email is not valid", 400, res);
    }

    try {
      identifier = email;
      const identifier_type = "email";
      
      // Generate OTP (initial request, not a resend)
      let otp = null;
      try {
        otp = await OTPService.generateAndStore(identifier, false);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Failed to generate OTP:", err.message);
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      
      if (!otp) {
        return res.status(400).json({ success: false, message: "failed to generate OTP" });
      }

      // ===== CHANGED: Publish to RabbitMQ instead of sending directly =====
      try {
        await EventPublisher.emitEmailNotification(
          email,
          Notification_Templates_ENUM.Auth_Otp_Request,
          {
            otp,
            email,
            company_name: "BingeBuddy",
            minutes: "10", // OTP expiry in minutes
          }
        );

        // Assume email was queued successfully
        req.session.otpIdentifier = identifier;
        req.session.otpGeneratedAt = Date.now();
        req.session.identifierType = identifier_type;

        return res.status(200).json({
          success: true,
          message: "OTP sent successfully to your email.",
          user: { email },
        });

      } catch (publishError) {
        console.error("Failed to publish email event:", publishError);
        // Rollback OTP and cooldown in Redis so user isn't stuck with a ghost cooldown
        await OTPService.clear(identifier);
        if (req.session) {
          req.session.destroy((err) => {
            if (err) console.error("Error destroying session:", err);
          });
        }
        return return_response(
          publishError as Error,
          "Error queueing email notification.",
          500,
          res
        );
      }

    } catch (error) {
      console.error("Error in login:", error);
      if (req.session) {
          req.session.destroy((err) => {
            if (err) console.error("Error destroying session:", err);
          });
        }

      return return_response(
        error as Error,
        "An unexpected error occurred.",
        500,
        res
      );
    }

  } else if (phone_number) {
    req.session.identifierType = "phone";
    return res
      .status(501)
      .json({ message: "OTP via phone number is not yet implemented." });

  } else if (reference_id) {
    const userAccountData = await checkReferenceID(reference_id);
    try {
      if (userAccountData) {
        req.session.identifierType = "reference_id";
        return res.status(200).json({ message: "Login via reference_id" });
      } else {
        return res.status(404).json({ message: "Not Found" });
      }
    } catch (e) {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  return return_response(
    new Error("Invalid request"),
    "No valid identifier provided.",
    400,
    res
  );
};
export const verifyOtp = async (req: Request, res: Response) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ message: "Cannot find OTP" });
  }

  try {
    const identifier = req.session.otpIdentifier;
    if (!identifier) {
      return res.status(404).json({ message: "session expired" });
    }
    try {
      const status = await OTPService.verify(identifier, otp);
      if (status) {
        const userAuthStatus = await getAccountInformation(identifier);
        if (userAuthStatus) {
          if (userAuthStatus.auth_status === "PENDING") {
            //remove  the ongoing session
            await OTPService.clear(identifier);
          } else if (userAuthStatus.auth_status === "REJECTED") {
            //remove the ongoing session
            await OTPService.clear(identifier);
          } else if (userAuthStatus.auth_status === "APPROVED") {
            const deviceId = DeviceIdCookie.getOrCreateDeviceId(req, res);
            const accessToken = Restaurant_JWT.signAccessToken(
              {
                email: userAuthStatus.email,
                phone: userAuthStatus.phone,
                reference_id: userAuthStatus.reference_id,
              },
              "15m",
            );
            const refreshToken = Restaurant_JWT.signRefreshToken(
              {
                email: userAuthStatus.email,
                phone: userAuthStatus.phone,
                reference_id: userAuthStatus.reference_id,
                deviceId,
              },
              deviceId,
            );

            await refreshTokenDao.storeToken(
              userAuthStatus.reference_id,
              deviceId,
              refreshToken,
            );
            AuthCookies.setAccessTokenCookies(res, accessToken);
            AuthCookies.setRefreshTokenCookies(res, refreshToken);
            await OTPService.clear(identifier);
          }
          return res.status(200).json({
            message: "Otp Verified sucessfully",
            auth_status: userAuthStatus.auth_status,
          });
        } else {
          return res
            .status(200)
            .json({ message: "Otp Verified sucessfully", auth_status: null });
        }
      } else {
        return res.status(404).json({ message: "Otp Verification failed" });
      }
    } catch (err) {
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      } else {
        return res.status(404).json({ message: "unexpected error occured" });
      }
    }
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const identifier = req.session.otpIdentifier;
    const identifier_type = req.session.identifierType;
    if (!identifier || !identifier_type) {
      return res.status(400).json({ success: false, message: "Session expired. Please log in again." });
    }
    if (identifier_type === "email") {
      if (!isValidEmail(identifier)) {
        const err = new Error("Email format is not valid");
        return return_response(err, "Email is not valid", 400, res);
      }

      let otp: string | null = null;
      try {
        otp = await OTPService.generateAndStore(identifier, true);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Failed to generate OTP on resend:", err.message);
          return res.status(400).json({ success: false, message: err.message });
        }
        return res.status(500).json({ success: false, message: "Error generating OTP" });
      }

      if (!otp) {
        return res.status(400).json({ success: false, message: "Failed to generate OTP" });
      }

      try {
        await EventPublisher.emitEmailNotification(
          identifier,
          Notification_Templates_ENUM.Auth_Otp_Request,
          {
            otp,
            email: identifier,
            company_name: "BingeBuddy",
            minutes: "10", // OTP expiry in minutes
          }
        );
        req.session.otpGeneratedAt = Date.now();

        const resendsUsed = await OtpDao.getResendCount(identifier);
        return res.status(200).json({
          success: true,
          message: "OTP resent successfully to your email.",
          cooldownSeconds: OTP_CONFIG.RESEND_COOLDOWN,
          resendsRemaining: Math.max(0, OTP_CONFIG.MAX_RESENDS - resendsUsed),
        });
      } catch (error) {
        console.error("Error in publish email on resend:", error);
        // Rollback cooldown in Redis so user isn't penalized when email service fails
        await OtpDao.deleteCooldown(identifier);
        return return_response(
          error as Error,
          "An unexpected error occurred while sending the email.",
          500,
          res,
        );
      }
    } else if (identifier_type === "phone" || identifier_type === "phone_number") {
      return res
        .status(501)
        .json({ success: false, message: "OTP via phone number is not yet implemented." });
    } else if (identifier_type === "reference_id") {
      const userAccountData = await checkReferenceID(identifier);
      if (userAccountData) {
        req.session.identifierType = "reference_id";
        return res.status(200).json({ success: true, message: "Login via reference_id is active." });
      } else {
        return res.status(404).json({ success: false, message: "Reference ID not found" });
      }
    }

    return res.status(400).json({ success: false, message: "Invalid identifier type." });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err });
  }
};

export const checkPreLoginSession = async (req: Request, res: Response) => {
  try {
    const isSessionActive = req.session.otpIdentifier;
    if (isSessionActive || isSessionActive !== undefined) {
      return res
        .status(200)
        .json({ isActive: true, session: req.session.otpIdentifier });
    } else {
      return res.status(200).json({ isActive: false });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err });
  }
};

export const getOtpStatus = async (req: Request, res: Response) => {
  try {
    const identifier = req.session.otpIdentifier;
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Session Expired",
      });
    }

    const ttl = await OTPService.getOTPTTL(identifier);
    const cooldownTTL = await OtpDao.getCoolDownTTL(identifier);
    const resendsUsed = await OtpDao.getResendCount(identifier);

    return res.status(200).json({
      otpExpiresIn: ttl > 0 ? ttl : 0,
      cooldownRemaining: cooldownTTL > 0 ? cooldownTTL : 0,
      resendsRemaining: Math.max(0, OTP_CONFIG.MAX_RESENDS - resendsUsed),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



export const validateSessionGateway = (req: Request, res: Response) => {
  // 1. Check if the session exists in Redis
  if (req.session && req.session.otpIdentifier) {
    
    // 2. Map your Redis session data to HTTP Headers
    res.set("X-Session-Identifier", req.session.otpIdentifier);
    res.set("X-Session-Type", req.session.identifierType as string);
    res.set("X-Session-Generated-At", req.session.otpGeneratedAt?.toString());
    
    // 3. Return 200 OK to tell NGINX to let the user through!
    return res.status(200).send("Authorized");
  } 

  // If the session is missing or expired in Redis, block them
  return res.status(401).send("Unauthorized");
};