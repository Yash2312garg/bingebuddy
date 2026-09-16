import type { SelectedCategoryFilterInterface } from "../../slices/itemSlice";
import { privateApi } from "../../utils/api";

export const getRestaurantItemsData = async (
  restaurant_id: string,
  page: number,
  limit: number,
  query: string,
  selectedCategory: SelectedCategoryFilterInterface
) => {
  try {
    const response = await privateApi.get("/restaurant/items/v1/getAllItems", {
      params: {
        restaurant_id,
        limit,
        page,
        search:query,
        category_id: selectedCategory.id ===-1 ?null :selectedCategory.id
      },
      withCredentials: true,
    });
    if (response.status === 200) {
      return response.data
    } else {
      return null;
    }
  } catch (e) {
    throw new Error("error while fetching restaurant Items information");
  }
};

export const deleteRestaurantItems = async(item_id: number)=>{
  try{
    const response = await privateApi.post("/restaurant/items/v1/deleteItem",{item_id},{withCredentials: true})
    if (response.status ===201){
      return true
    }
    throw new Error("error while deleting Items")
  }catch(e){
    throw new Error("error while deleting Items");
  }

}

export interface AddRestaurantItems {
  category_id: number;
  name: string;
  short_desc: string ;
  long_desc: string ;
  base_price: number;
  is_available: boolean;
  is_veg: boolean;
  spice_level: string;
  prep_time: number ;
  tags: Record<string, any> | null;
  img_url: Record<string, any> | null;
}

export const createRestaurantItems = async(data:AddRestaurantItems)=>{
  try {
    const response = await privateApi.post("/restaurant/items/v1/createItem",{
      data
    })
    if (response.status ===201){
      return response.data
    }
    throw new Error("error while creating item")
  }catch(e){
    console.log("error while creating an item")
  }
}


export const changeItemStatus = async (item_id: number, status: boolean) => {
  try {
    const response = await privateApi.post("/restaurant/items/v1/changeStatus", {
      item_id,
      status,
    });
    
    if (response.status === 200 || response.status === 201) {
      return true;
    }
    return false;
  } catch (e) {
    console.error("Error changing item status:", e);
    return false;
  }
};


export const deleteItemApi = async (item_id: number): Promise<boolean> => {
  try {
    const response = await privateApi.post("/restaurant/items/v1/deleteItem", {
      item_id,
    });

    return response.status === 200 || response.status === 201;
  } catch (e) {
    console.error("Error deleting item:", e);
    return false;
  }
};

export const editRestaurantItem = async (
  item_id: number,
  data: AddRestaurantItems
) => {
  try {
    const response = await privateApi.put(
      `/restaurant/items/v1/editItem/${item_id}`,
      { data },
      { withCredentials: true }
    );

    if (response.status === 200) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Error editing item:", e);
    return null;
  }
};