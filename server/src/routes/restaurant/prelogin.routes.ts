import { Router } from "express";
import { preLoginInfo,prelogin_presignedUploadURL,confirm_upload,generatedownloadURL,createReferenceID } from "../../controllers/restaurant/prelogin.controller";
import { requireGatewaySessionAuth } from "../../middleware/getewaySessionAuth.middleware";

const router = Router();


router.post("/createReferenceID",createReferenceID)
router.post("/upload_pre_login_images",requireGatewaySessionAuth,prelogin_presignedUploadURL)
router.post("/confirm_upload",requireGatewaySessionAuth,confirm_upload)
router.get("/generate_download_URL",requireGatewaySessionAuth,generatedownloadURL)
router.post("/addPreloginInfo",requireGatewaySessionAuth,preLoginInfo)


export default router