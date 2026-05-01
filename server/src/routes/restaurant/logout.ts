import { Router } from "express";
import { logout } from "../../controllers/restaurant/logout";


const router = Router();

router.post("/logout",logout)

export default router