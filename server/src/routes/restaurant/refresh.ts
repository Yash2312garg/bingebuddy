import { Router } from "express";
import { refreshToken } from "../../controllers/restaurant/refresh";


const router = Router();

router.post("/refresh",refreshToken)

export default router