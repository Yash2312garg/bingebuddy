import { Router } from "express";
import { logout } from "../../controllers/logout.controller";
import { refreshToken } from "../../controllers/refresh.controller";
import { getOtpStatus, login, verifyOtp, resendOtp, checkPreLoginSession, validateSessionGateway } from "../../controllers/login.controller";
import { Throttle } from "../../apiThrottler";

const router = Router();

// 1. Strict Leaky Bucket Throttler for CPU-intensive login (smooths to 8 req/sec, burst buffer of 10)
const loginThrottler = Throttle.leakyBucket({
  capacity: 10,
  leakRate: 8,
  keyGenerator: (req) =>
    `login:${req.body?.email || req.session?.otpIdentifier || Throttle.getClientIp(req)}`,
  message: {
    success: false,
    message: "Too many login attempts. Please wait a moment before trying again.",
  },
});

// 2. Sliding Window Counter for OTP verification (max 5 attempts per minute per IP)
const verifyOtpThrottler = Throttle.slidingWindowCounter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyGenerator: (req) => `verify:${Throttle.getClientIp(req)}`,
  message: {
    success: false,
    message: "Too many verification attempts. Please wait 1 minute.",
  },
});

// 3. Token Bucket for frequent session checks (allows bursts of 30, refills 10/sec)
const sessionThrottler = Throttle.tokenBucket({
  capacity: 30,
  refillRate: 10,
  keyGenerator: (req) => `session:${Throttle.getClientIp(req)}`,
});

router.get("/checkSession", sessionThrottler, checkPreLoginSession);
router.get("/validate-session", validateSessionGateway);
router.get("/otp/status", getOtpStatus);
router.post("/login", loginThrottler, login);
router.post("/verifyOtp", verifyOtpThrottler, verifyOtp);
router.post("/resendOtp", loginThrottler, resendOtp);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;