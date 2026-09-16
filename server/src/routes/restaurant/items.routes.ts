import { Router } from "express";
import { createItems, deleteItems, getAllItems, toggleStatus } from "../../controllers/restaurant/items.controller";
import { isRestaurantAutheticated } from "../../middleware/restaurantAuth";

const router = Router()

router.get("/getAllItems",isRestaurantAutheticated,getAllItems);
router.post("/deleteItem",isRestaurantAutheticated,deleteItems);
router.post("/createItem", isRestaurantAutheticated,createItems);
router.post("/changeStatus", isRestaurantAutheticated, toggleStatus)
// router.put("/editItem/:item_id?", isRestaurantAutheticated, editItems);
export default router;