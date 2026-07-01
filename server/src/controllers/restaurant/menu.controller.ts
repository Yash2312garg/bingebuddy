import { Request,Response } from "express"
import { MenueRequestBody,
    // CategoryRequestData,
    MenueItemsRequestData,
    EditMenuBody,
    // ComboItemsRequestData
 } from "../../types/Restaurant/Menue.types"
import { Menu } from "../../models/restaurant/restaurant_menu.model"
import { SignAccessArguments } from "../../services/restaurant/createwebtokens"
import { EventPublisher } from "../../services/rabbitmq/eventPublisher"

export const addMenu =async (req:Request, res:Response)=>{
    try{
            const data:MenueRequestBody = req.body
            const result = await Menu.addNewMenue(data)
            if(result){
            const user = req.user as SignAccessArguments;

            EventPublisher.emitInAppNotification(user.reference_id, "IN_APP", {
            recipientType: "RESTAURANT",
            title: "New Menu Created",
            message: `The menu "${result.id}" has been created successfully and is now available.`,
            action_url: "",
            metadata: {
                menu_id: result.id,
                menu_name: result.name,
            },
            is_read: false,
            });
                return res.status(201).json({msg:"created",data: result})
            }else{
                return res.status(400).json({msg:"unable to add new Menu"})
            }
  
    }catch(e){
        // console.log(e)
        return res.status(500).json({msg:'Internal Server Error'})
    }
}

export const deleteMenu = async (req:Request, res:Response)=>{
    try{
        const menu_id:string = req.query.menu_id as string;
        console.log(menu_id)
        const success:boolean = await Menu.deleteMenu(Number(menu_id));
        if(success){
            const user = req.user as SignAccessArguments;

            EventPublisher.emitInAppNotification(user.reference_id, "IN_APP", {
            recipientType: "RESTAURANT",
            title: "Menu Deleted",
            message: `The menu "${menu_id}" has been deleted successfully.`,
            action_url: "",
            metadata: {
                menu_id: Number(menu_id),
            },
            is_read: false,
            });
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
        const success:boolean = await Menu.changeMenuStatus(Boolean(data.status),data.menu_id);
        if(success){
            const user = req.user as SignAccessArguments;
            EventPublisher.emitInAppNotification(user.reference_id, "IN_APP", {
            recipientType: "RESTAURANT",
            title: data.status ? "Menu Enabled" : "Menu Disabled",
            message: data.status
                ? "The menu has been enabled and is now visible to customers."
                : "The menu has been disabled and is no longer visible to customers.",
            action_url: "",
            metadata: {
                menu_id: data.menu_id,
                status: data.status,
            },

            is_read: false,
            });
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
        const user = req.user as SignAccessArguments;

        EventPublisher.emitInAppNotification(user.reference_id, "IN_APP", {
        recipientType: "RESTAURANT",
        title: "Menu Information Updated",
        message: `The menu "${updatedMenu.name}" has been updated successfully. Your changes are now live.`,
        action_url: "",

        metadata: {
            menu_id: updatedMenu.menu_id,
            menu_name: updatedMenu.name,
        },

        is_read: false,
        });
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
