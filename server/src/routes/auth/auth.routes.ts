import { Router } from "express"
import { checkPreLoginSession, getOtpStatus, login, resendOtp, verifyOtp } from "../../controllers/restaurant/login.controller";
import { createReferenceID } from "../../controllers/restaurant/prelogin.controller";
import { refreshToken } from "../../controllers/restaurant/refresh.controller";
import { logout } from "../../controllers/restaurant/logout.controller";

const router = Router();


router.get("/checkSession",checkPreLoginSession)
router.post("/createReferenceID",createReferenceID)
router.get("/otp/status",getOtpStatus)
router.post("/login",login)
router.post("/verifyOtp",verifyOtp)
router.post("/resendOtp",resendOtp)
router.post("/refresh",refreshToken)
router.post("/logout",logout)



export default router;