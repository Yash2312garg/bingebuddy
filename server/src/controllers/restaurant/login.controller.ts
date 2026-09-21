//server/src/controllers/restaurant/login.controller.ts
import { Request, Response } from "express";
import { return_response } from "../../utils/errorRespone";
import { isValidEmail } from "../../utils/validations";
import {
  checkReferenceID,
  getAccountInformation,
} from "../../models/restaurant/restaurant_accounts.model";
import { OTPService } from "../../utils/generateOTP";
import { Restaurant_JWT } from "../../services/restaurant/createwebtokens";
import { OtpDao } from "../../dao/otp.dao";
import { DeviceIdCookie } from "../../services/restaurant/getDeviceIdFromCookie";
import { refreshTokenDao } from "../../dao/refreshToken.dao";
import { AuthCookies } from "../../cookies/auth.cookies";
import { EventPublisher } from "../../services/rabbitmq/eventPublisher";
import { Notification_Templates_ENUM } from "../../types/notificationTemplate.types";

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
      
      // Generate OTP
      let otp = null;
      try {
        otp = await OTPService.generateAndStore(identifier);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Failed to generate OTP:", err.message);
          return res.status(400).json({ message: err.message });
        }
      }
      
      if (!otp) {
        return res.status(404).json({ message: "failed to generate OTP" });
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
        return return_response(
          publishError as Error,
          "Error queueing email notification.",
          500,
          res
        );
      }

    } catch (error) {
      console.error("Error in login:", error);
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
    const otpGeneratedAt = req.session.otpGeneratedAt;
    const identifier_type = req.session.identifierType;
    if (!identifier || !otpGeneratedAt || !identifier_type) {
      return res.status(400).json({ message: "session Expired" });
    }
    if (identifier_type === "email") {
      if (!isValidEmail(identifier)) {
        const err = new Error("Email format is not valid");
        return return_response(err, "Email is not valid", 400, res);
      }

      try {
        let otp = null;
        try {
          otp = await OTPService.generateAndStore(identifier);
        } catch (err) {
          if (err instanceof Error) {
            console.error("Failed to generate OTP:", err.message);
            return res.status(400).json({ message: err.message });
          } else {
            console.error("Unknown error:", err);
          }
        }
        if (!otp) {
          return res.send(404).json({ message: "failed to generate OTP" });
        }
        await EventPublisher.emitEmailNotification(
          identifier,
         Notification_Templates_ENUM.Auth_Otp_Request,
          {
            otp,
            identifier,
            company_name: "BingeBuddy",
            minutes: "10", // OTP expiry in minutes
          }
        );
        req.session.otpGeneratedAt = Date.now();
      } catch (error) {
        console.error("Error in sendEmail service:", error);
        return return_response(
          error as Error,
          "An unexpected error occurred while sending the email.",
          500,
          res,
        );
      }
    } else if (identifier_type === "phone_number") {
      req.session.identifierType = "phone";
      return res
        .status(501)
        .json({ message: "OTP via phone number is not yet implemented." });
    } else if (identifier_type === "reference_id") {
      const userAccountData = await checkReferenceID(identifier);
      const identifier_type = "reference_id";
      try {
        if (userAccountData) {
          req.session.identifierType = identifier_type;

          return res.status(200);
        } else {
          return res.status(404).json({ message: "Not Found" });
        }
      } catch (e) {
        return res.status(500).json({ message: "Internal Server Error" });
      }
    }

    return res.status(200).json({ message: "under construction " });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err });
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
    console.log("helo");
    if (!identifier) {
      return res.status(400).json({
        message: "Session Expired",
      });
    }

    const ttl = await OTPService.getOTPTTL(identifier);
    const cooldownTTL = await OtpDao.getCoolDownTTL(identifier);

    return res.status(200).json({
      otpExpiresIn: ttl, // remaining OTP validity
      cooldownRemaining: cooldownTTL > 0 ? cooldownTTL : 0,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
