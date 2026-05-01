import { Request, Response } from "express";
import { return_response } from "../../utils/errorRespone";
import { isValidEmail } from "../../utils/validations";
import { sendEmail } from "../../services/email/sendEmail";
import { getOtpEmailContent } from "../../services/email/getOTPEmailcontent";
import {
  checkReferenceID,
  getAccountInformation,
} from "../../models/restaurant/restaurant_accounts";
import { OTPService } from "../../utils/generateOTP";
import { Restaurant_JWT } from "../../services/restaurant/createwebtokens";
import { redisClient } from "../../database/redis";
import { OtpDao } from "../../dao/otp.dao";

export const login = async (req: Request, res: Response) => {
  const { email, reference_id, phone_number } = req.body;

  if (!email && !reference_id && !phone_number) {
    const newError = new Error(
      "Request body is empty or missing required fields"
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
      const data = getOtpEmailContent(otp, 10);
      const emailStatus = await sendEmail(
        email,
        "OTP Verification",
        data.text,
        data.html
      );
      req.session.otpIdentifier = identifier;
      req.session.otpGeneratedAt = Date.now();
      req.session.identifierType = identifier_type;
      if (emailStatus) {
        console.log(req.session);
        return res.status(200).json({
          success: true,
          message: "OTP sent successfully to your email.",
          user: { email },
        });
      } else {
        const err = new Error("Failed to send email");
        return return_response(
          err,
          "Error sending verification email.",
          500,
          res
        );
      }
    } catch (error) {
      console.error("Error in sendEmail service:", error);
      return return_response(
        error as Error,
        "An unexpected error occurred while sending the email.",
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
    console.log(req.session);
    if (!identifier) {
      return res.status(404).json({ message: "session expired" });
    }
    console.log(otp, typeof otp);
    try {
      const status = await OTPService.verify(identifier, otp);
      if (status) {
        const userAuthStatus = await getAccountInformation(identifier);
        console.log(userAuthStatus)
        if (userAuthStatus) {
          if (userAuthStatus.auth_status === "PENDING") {
            //remove  the ongoing session
            await OTPService.clear(identifier);
          } else if (userAuthStatus.auth_status === "REJECTED") {
            //remove the ongoing session
            await OTPService.clear(identifier);
          } else if (userAuthStatus.auth_status === "APPROVED") {
            const deviceId = crypto.randomUUID();
            const accessToken = Restaurant_JWT.signAccessToken(
              {
                email: userAuthStatus.email,
                phone: userAuthStatus.phone,
                reference_id: userAuthStatus.reference_id,
              },
              "15m"
            );
            const refreshToken = Restaurant_JWT.signRefreshToken(
              {
                email: userAuthStatus.email,
                phone: userAuthStatus.phone,
                reference_id: userAuthStatus.reference_id,
              },
              deviceId
            );
            await redisClient.set(
              `refresh:${userAuthStatus.reference_id}:${deviceId}`,
              refreshToken,
              "EX",
              60 * 60 * 24 * 7
            );
            res.cookie("accessToken", accessToken, {
              httpOnly: true,
              secure: false,
              sameSite: "strict",
              maxAge: 1000 * 60 * 15,
            });

            res.cookie("refreshToken", refreshToken, {
              httpOnly: true,
              sameSite: "strict",
              maxAge: 1000 * 60 * 60 * 24 * 7,
            });
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
        const data = getOtpEmailContent(otp, 10);
        const emailStatus = await sendEmail(
          identifier,
          "OTP Verification",
          data.text,
          data.html
        );
        req.session.otpGeneratedAt = Date.now();
        if (emailStatus) {
          console.log(req.session);
          return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your email.",
            user: { identifier },
          });
        } else {
          const err = new Error("Failed to send email");
          return return_response(
            err,
            "Error sending verification email.",
            500,
            res
          );
        }
      } catch (error) {
        console.error("Error in sendEmail service:", error);
        return return_response(
          error as Error,
          "An unexpected error occurred while sending the email.",
          500,
          res
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
        const isSessionActive = req.session.otpIdentifier
        if (isSessionActive || isSessionActive !==undefined){
            return res.status(200).json({isActive: true,session: req.session.otpIdentifier})
        }else{
            return res.status(200).json({isActive: false})

        }
} catch (err) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err });
  }
};

export const getOtpStatus = async (req: Request, res:Response) =>{

  try{
    const identifier = req.session.otpIdentifier;
    console.log("helo")
    if(!identifier){
      return res.status(400).json({
        message: "Session Expired"
      })
    }

    const ttl = await OTPService.getOTPTTL(identifier);
    const cooldownTTL = await OtpDao.getCoolDownTTL(identifier);

    return res.status(200).json({
            otpExpiresIn: ttl,          // remaining OTP validity
      cooldownRemaining: cooldownTTL > 0 ? cooldownTTL : 0
    })
  }catch(err){
    return res.status(500).json({message:"Internal Server Error"})
  }
}