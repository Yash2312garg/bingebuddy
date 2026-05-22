import { Router } from "express";
import { addMenu,
    // addCategory,
    getAllMenu,
    deleteMenu,
    changeMenuStatus,
    editMenu

} from "../../controllers/restaurant/menu";
import { isRestaurantAutheticated } from "../../middleware/restaurantAuth";




const router = Router()

router.post("/addMenu",isRestaurantAutheticated,addMenu)
router.post("/deleteMenu",isRestaurantAutheticated,deleteMenu)
router.post("/changeStatus",isRestaurantAutheticated,changeMenuStatus)
router.put("/editMenu", isRestaurantAutheticated,editMenu);
router.get("/getAllMenu",isRestaurantAutheticated,getAllMenu)
// router.post("/addCategory",addCategory)



export default router