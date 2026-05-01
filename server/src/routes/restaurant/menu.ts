import { Router } from "express";
import { addMenu,
    addCategory

} from "../../controllers/restaurant/menu";



const router = Router()

router.post("/addMenu",addMenu)
router.post("/addCategory",addCategory)



export default router