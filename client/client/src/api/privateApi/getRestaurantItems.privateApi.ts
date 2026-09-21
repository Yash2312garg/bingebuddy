import type { SelectedCategoryFilterInterface } from "../../slices/itemSlice";
import { privateApi } from "../../utils/api";

export const getRestaurantItemsData = async (
  restaurant_id: string,
  page: number = 1,
  limit: number = 6,
  query?: string,
  selectedCategory?: SelectedCategoryFilterInterface,
  is_available?: boolean,
  min_price?: number,
  max_price?: number,
  sort_by: "price" | "updated_at" = "updated_at",
  sort_order: "ASC" | "DESC" = "DESC"
) => {
  try {
    const response = await privateApi.get("/restaurant/items/v1/getAllItems", {
      params: {
        restaurant_id,
        limit,
        page,
        search: query && query.trim() !== "" ? query : undefined,
        category_id:
          selectedCategory && selectedCategory.id !== -1
            ? selectedCategory.id
            : undefined,
        is_available,
        min_price,
        max_price,
        sort_by,
        sort_order,
      },
      withCredentials: true,
    });

    if (response.status === 200) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Error fetching items:", e);
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