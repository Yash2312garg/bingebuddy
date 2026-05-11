import { Router } from "express";
import { preLoginInfo,prelogin_presignedUploadURL,confirm_upload,generatedownloadURL } from "../../controllers/restaurant/prelogin";

const router = Router();


router.post("/upload_pre_login_images",prelogin_presignedUploadURL)
router.post("/confirm_upload",confirm_upload)
router.get("/generate_download_URL",generatedownloadURL)
router.post("/addPreloginInfo",preLoginInfo)


export default router