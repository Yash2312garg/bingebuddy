import { Router } from "express"
// import { checkPreLoginSession, getOtpStatus, login, resendOtp, verifyOtp } from "../../controllers/restaurant/login.controller";
import { logout } from "../../controllers/logout.controller";
import { refreshToken } from "../../controllers/refresh.controller";
import { getOtpStatus,login,verifyOtp,resendOtp ,checkPreLoginSession, validateSessionGateway} from "../../controllers/login.controller";
const router = Router();


router.get("/checkSession",checkPreLoginSession)
router.get('/validate-session', validateSessionGateway);
// router.post("/createReferenceID",createReferenceID)
router.get("/otp/status",getOtpStatus)
router.post("/login",login)
router.post("/verifyOtp",verifyOtp)
router.post("/resendOtp",resendOtp)
router.post("/refresh",refreshToken)
router.post("/logout",logout)



export default router;