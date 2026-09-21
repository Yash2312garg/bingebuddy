import { Router } from "express";
import { addCategory, changeCategoryStatus, changeCategoryOrder, deleteCategory, editCategory, getAllCategories } from "../../controllers/restaurant/categories.controller";
import { isRestaurantAutheticated } from "../../middleware/restaurantAuth";

const router = Router()
router.post("/addCategory",isRestaurantAutheticated,addCategory);
router.get("/getAllCategories",isRestaurantAutheticated,getAllCategories);
router.post("/deleteCategory", isRestaurantAutheticated, deleteCategory);
router.post("/editCategory",isRestaurantAutheticated,editCategory);
router.post("/changeOrder",isRestaurantAutheticated, changeCategoryOrder);
router.post("/changeStatus",isRestaurantAutheticated, changeCategoryStatus);

export default router;