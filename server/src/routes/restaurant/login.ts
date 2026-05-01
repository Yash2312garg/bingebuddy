import { Router } from "express";
import { login,verifyOtp,resendOtp,checkPreLoginSession } from "../../controllers/restaurant/login";
import { preLoginInfo,prelogin_presignedUploadURL,confirm_upload,generatedownloadURL,createReferenceID } from "../../controllers/restaurant/prelogin";

const router = Router();


router.post("/login",login)
router.post("/verifyOtp",verifyOtp)
router.post("/resendOtp",resendOtp)
router.post("/upload_pre_login_images",prelogin_presignedUploadURL)
router.post("/confirm_upload",confirm_upload)
router.get("/generate_download_URL",generatedownloadURL)
router.post("/preloginInfo",preLoginInfo)
router.get("/checkSession",checkPreLoginSession)
router.post("/createReferenceID",createReferenceID)

export default router