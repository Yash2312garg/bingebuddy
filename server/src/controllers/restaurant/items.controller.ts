import { Request, Response } from "express";
import { RestaurantItemModel } from "../../models/restaurant/restaurant_items.model";
import { AddRestaurantItems, RestaurantItem } from "../../types/Restaurant/Items.types";

export const getAllItems = async (req: Request, res: Response) => {
  try {
    const restaurant_id = req.query.restaurant_id as string;

    if (!restaurant_id) {
      return res.status(400).json({
        msg: "restaurant_id is required",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    // console.log(limit)
    const search = req.query.search as string;

    const category_id = req.query.category_id
      ? Number(req.query.category_id)
      : undefined;

    const is_available =
      req.query.is_available !== undefined
        ? req.query.is_available === "true"
        : undefined;

    const min_price = req.query.min_price
      ? Number(req.query.min_price)
      : undefined;

    const max_price = req.query.max_price
      ? Number(req.query.max_price)
      : undefined;

    const sort_by: "price" | "updated_at" =
      req.query.sort_by === "price" ? "price" : "updated_at";

    const sort_order: "ASC" | "DESC" =
      req.query.sort_order === "ASC" ? "ASC" : "DESC";

    const filters = {
      restaurant_id,
      limit,
      offset,
      search,
      category_id,
      is_available,
      min_price,
      max_price,
      sort_by,
      sort_order,
    };

    const items: RestaurantItem[] = await RestaurantItemModel.getItems(filters);

    const total = await RestaurantItemModel.getTotalItems(filters);

    return res.status(200).json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        search,
        category_id,
        is_available,
        min_price,
        max_price,
        sort_by,
        sort_order,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      msg: "internal server error",
    });
  }
};


export const deleteItems = async (req: Request, res: Response) => {
  const item_id = req.body.item_id ?? req.params.item_id;

  if (!item_id) {
    return res.status(400).json({ msg: "Missing item_id in request payload" });
  }

  try {
    const result = await RestaurantItemModel.deleteItems(Number(item_id));
    
    if (result) {
      return res.status(200).json({ msg: "Item successfully deleted" });
    }
    
    return res.status(404).json({ msg: "Item not found" });
  } catch (e) {
    console.error("Error deleting item:", e);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

export const createItems = async (req: Request, res: Response) => {
  const data: AddRestaurantItems = req.body.data;
  console.log("Items data", data)
  if (!data) {
    return res.status(400).json({
      msg: "Incorrect payload provided",
    });
  }

  try {
    const item = await RestaurantItemModel.createItem(data);

    return res.status(201).json({
      msg: "Item created",
      data: item,
    });
  } catch (e) {
    console.error("Error creating item:", e);

    return res.status(500).json({
      msg: "Internal server error",
    });
  }
};

export const toggleStatus = async(req:Request, res:Response)=>{
  try{
    const {item_id,status} = req.body
    console.log(item_id)
    const result = await RestaurantItemModel.changeItemAvailability(item_id, status)
    if(result){
      return res.status(200).json({msg:"Status changed sucessfully"})
      
    }return res.status(404).json({msg:"404 "}) 
  }catch(e){
    return res.status(500).json({msg:"Internal Server Error"})
  }
}
// export const editItems = async (req: Request, res: Response) => {
//   const item_id = req.params.item_id ? Number(req.params.item_id) : req.body.item_id;
//   const data: AddRestaurantItems = req.body.data;

//   if (!item_id || isNaN(Number(item_id))) {
//     return res.status(400).json({
//       msg: "Valid item_id is required",
//     });
//   }

//   if (!data) {
//     return res.status(400).json({
//       msg: "Incorrect payload provided",
//     });
//   }

//   try {
//     const updatedItem = await RestaurantItemModel.editItem(Number(item_id), data);

//     if (updatedItem) {
//       return res.status(200).json({
//         msg: "Item successfully updated",
//         data: updatedItem,
//       });
//     }

//     return res.status(404).json({
//       msg: "Item not found",
//     });
//   } catch (e) {
//     console.error("Error updating item:", e);
//     return res.status(500).json({
//       msg: "Internal server error",
//     });
//   }
// };