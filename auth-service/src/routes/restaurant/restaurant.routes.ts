import { Router } from "express";
import { isRestaurantAutheticated } from "../../middlewares/restaurantAuth";
import { getRestaurantInformation } from "../../controllers/user/user.controller";

const router = Router()


router.get("/getInfo",isRestaurantAutheticated,getRestaurantInformation)

export default router;