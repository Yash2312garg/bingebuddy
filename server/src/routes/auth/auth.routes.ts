import { Router } from "express"
import { checkPreLoginSession, getOtpStatus, login, resendOtp, verifyOtp } from "../../controllers/restaurant/login";
import { createReferenceID } from "../../controllers/restaurant/prelogin";
import { refreshToken } from "../../controllers/restaurant/refresh";
import { logout } from "../../controllers/restaurant/logout";

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