import { Request,Response } from "express"
import { MenueRequestBody,
    CategoryRequestData,
    MenueItemsRequestData,
    EditMenuBody,
    // ComboItemsRequestData
 } from "../../types/Restaurant/Menue.types"
import { Menu } from "../../models/restaurant/restaurant_menu.model"

export const addMenu =async (req:Request, res:Response)=>{
    try{
            const data:MenueRequestBody = req.body
            const result = await Menu.addNewMenue(data)
            if(result){
                return res.status(201).json({msg:"created",data: result})
            }else{
                return res.status(400).json({msg:"unable to add new Menu"})
            }
  
    }catch(e){
        console.log(e)
        return res.status(500).json({msg:'Internal Server Error'})
    }
}

export const deleteMenu = async (req:Request, res:Response)=>{
    try{
        const menu_id:string = req.query.menu_id as string;
        console.log(menu_id)
        const success:boolean = await Menu.deleteMenu(Number(menu_id));
        if(success){
            return res.status(201).json({"msg": "succesfully deleted"})
        }
        return res.status(503).json({"msg": "service unavailable"})
    }catch(e){
        console.log("error while deleting menu", e)
        return res.status(500).json({msg:'Internal Server Error'})
    }
}

interface MenuStatusBody{
    menu_id: number;
    status: boolean;
}
export const changeMenuStatus = async (req:Request, res:Response)=>{
    try{    
        const data:MenuStatusBody = req.body;
        console.log("changeMenuStatus",data)
        const success:boolean = await Menu.changeMenuStatus(Boolean(data.status),data.menu_id);
        if(success){
            return res.status(200).json({"msg": "succesfully changed the status"})   
        }
        return res.status(503).json({"msg": "service unavailable"})

    }catch(e){
        console.log(e)
        return res.status(500).json({msg:'Internal Server Error'})
    }

}
export const editMenu = async (
  req: Request,
  res: Response
) => {
  try {
    const data: EditMenuBody = req.body;
    console.log("editMenu",data)
    const updatedMenu = await Menu.editMenu(data);
    if (updatedMenu) {
      return res.status(200).json({
        msg: "Successfully updated menu",
        data: updatedMenu,
      });
    }

    return res.status(404).json({
      msg: "Menu not found",
    });

  } catch (e) {
    console.log("Error while editing menu", e);

    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }
};
export const getAllMenu = async(req:Request,res:Response)=>{
    try{
        const restaurant_id = req.query.restaurant_id as string;
        if(restaurant_id){
            const AllMenus = await Menu.getAllMenu(Number(restaurant_id))
            return res.status(200).json({msg:'Menus',data: AllMenus})

        }
        return res.status(400).json({msg:'Bad Request'})

    }catch(e){
        return res.status(500).json({msg:'Internal Server Error'})
        
    }
}
export const addCategory = async (req:Request, res:Response)=>{
    try{
        const data: CategoryRequestData= req.body;
        const check =await  Menu.checkExistingMenuByid(data.menue_id)
        if(!check){
            return res.status(400).json({msg:`Menu with id: ${data.menue_id} not found`})
        }
        const add_data = Menu.addNewCategory(data)
        if(!add_data){
              return res.status(404).json({msg:`Database Error Occured `})
        }
        return res.status(201).json({msg: "new Category added", data: add_data})
    }catch(e){
        console.log(e)
        return res.status(500).json({msg:'Internal Server Error'})

    }
}

export const addMenuItems = async (req:Request, res:Response)=>{
    try{
        const data:MenueItemsRequestData = req.body;
        const check =await  Menu.checkExistingCategoryByid(data.category_id)
        if(!check){
            return res.status(400).json({msg:`Category with id: ${data.category_id} not found`})
        }
        const result = Menu.addNewMenueItems(data)
        if(!result){
            return  res.status(400).json({msg:'Database Error Occured'})
        }
        return res.status(201).json({msg: "new Category added", data: result})
    }catch(e){
        return res.status(500).json({msg:'Internal Server Error'})
    }
}
// export const addComboItems = async(req: Request, res: Response)=>{  

//     try{
//         const data: ComboItemsRequestData = req.body;
        
//         const result = Menu.createNewCombos(data)
//     }catch(e){
//         console.log(e)
//         return res.status(500).json({msg: "Internal Server Error"})
//     }
// }

// export const add_AddonsItems = async (req:Request, res: Response)=>{
//     try{
//         const data: AddonsItemsRequestData = req.body;
//         const check = await Menu.checkExistingCategoryByid(data.category_id)
//         if(!check){
//             return res.status(400).json({msg:`Category with id: ${data.category_id} not found`})
//         }
        

//     }catch(e){
//         console.log(e)
//         return res.status(500).json({msg: "Internal Server Error"})
//     }
// }
