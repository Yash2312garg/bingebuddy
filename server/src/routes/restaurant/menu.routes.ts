import { Router } from "express";
import { addMenu,
    addCategory

} from "../../controllers/restaurant/menu";
import { isRestaurantAutheticated } from "../../middleware/restaurantAuth";




const router = Router()

router.post("/menu/addMenu",isRestaurantAutheticated,addMenu)
router.post("/menu/addCategory",addCategory)



export default router